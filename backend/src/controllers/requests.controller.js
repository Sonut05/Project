import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError
} from '../utils/errors.js';
import {
  parseStrictDateOnly,
  getTodayString,
  calculateRentalDays
} from '../utils/dateUtils.js';

function formatRequest(req) {
  if (!req) return req;
  return {
    ...req,
    rentalAmount: Number(req.rentalAmount),
    depositAmount: Number(req.depositAmount),
    totalAmount: Number(req.totalAmount),
    item: req.item
      ? {
          ...req.item,
          lenderId: req.item.lenderId,
          dailyPrice: req.item.dailyPrice !== undefined ? Number(req.item.dailyPrice) : undefined,
          depositAmount: req.item.depositAmount !== undefined ? Number(req.item.depositAmount) : undefined
        }
      : undefined
  };
}

export async function createRequest(req, res, next) {
  try {
    const borrowerId = req.user.id;
    const { itemId, startDate, endDate, message } = req.body;

    if (!itemId) {
      throw new ValidationError('Item ID is required.');
    }

    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required.');
    }

    // Strict date-only validation (rejects impossible dates like 2026-02-31)
    const parsedStart = parseStrictDateOnly(startDate, 'Start date');
    const parsedEnd = parseStrictDateOnly(endDate, 'End date');

    const today = getTodayString();
    if (parsedStart.dateStr < today) {
      throw new ValidationError('Start date cannot be in the past.');
    }

    if (parsedEnd.dateStr < parsedStart.dateStr) {
      throw new ValidationError('End date cannot be earlier than start date.');
    }

    // Fetch authoritative item details from database
    const item = await prisma.item.findUnique({
      where: { id: itemId }
    });

    if (!item || item.listingStatus !== 'Active') {
      throw new NotFoundError('Item listing is no longer available.');
    }

    // Prevent renting own item
    if (item.lenderId === borrowerId) {
      throw new ValidationError('You cannot rent your own item.');
    }

    // Check for conflicting Accepted bookings
    const conflictingBookings = await prisma.rentalRequest.findMany({
      where: {
        itemId,
        status: 'Accepted',
        startDate: { lte: parsedEnd.dateStr },
        endDate: { gte: parsedStart.dateStr }
      }
    });

    if (conflictingBookings.length > 0) {
      throw new ConflictError('This item is already booked for the selected dates.');
    }

    // Authoritative calculation using Prisma.Decimal
    const totalDays = calculateRentalDays(parsedStart.dateStr, parsedEnd.dateStr);
    const dailyPriceDec = new Prisma.Decimal(item.dailyPrice);
    const depositAmountDec = new Prisma.Decimal(item.depositAmount);
    const rentalAmountDec = dailyPriceDec.mul(totalDays);
    const totalAmountDec = rentalAmountDec.add(depositAmountDec);

    // Transactional creation: Request + Activity atomically
    const newRequest = await prisma.$transaction(async (tx) => {
      const created = await tx.rentalRequest.create({
        data: {
          itemId,
          lenderId: item.lenderId,
          borrowerId,
          startDate: parsedStart.dateStr,
          endDate: parsedEnd.dateStr,
          totalDays,
          rentalAmount: rentalAmountDec,
          depositAmount: depositAmountDec,
          totalAmount: totalAmountDec,
          status: 'Pending',
          message: message ? message.trim() : ''
        },
        include: {
          item: true,
          borrower: {
            select: { id: true, name: true, avatarUrl: true, city: true }
          },
          lender: {
            select: { id: true, name: true, avatarUrl: true, city: true }
          }
        }
      });

      // Notify lender with activity
      await tx.activity.create({
        data: {
          userId: item.lenderId,
          type: 'REQUEST_RECEIVED',
          message: `New rental request from ${created.borrower.name} for ${item.name}`,
          entityType: 'request',
          entityId: created.id
        }
      });

      return created;
    });

    res.status(201).json({
      message: 'Rental request submitted successfully',
      request: formatRequest(newRequest)
    });
  } catch (err) {
    next(err);
  }
}

export async function getIncomingRequests(req, res, next) {
  try {
    const lenderId = req.user.id;
    const pageNum = req.query.page ? Math.max(1, parseInt(req.query.page, 10) || 1) : null;
    const limitNum = req.query.limit ? Math.max(1, parseInt(req.query.limit, 10) || 20) : null;

    const total = await prisma.rentalRequest.count({ where: { lenderId } });

    const findOptions = {
      where: { lenderId },
      include: {
        item: true,
        borrower: {
          select: { id: true, name: true, avatarUrl: true, city: true }
        },
        reviews: true
      },
      orderBy: { createdAt: 'desc' }
    };

    if (pageNum || limitNum) {
      const p = pageNum || 1;
      const l = limitNum || 20;
      findOptions.skip = (p - 1) * l;
      findOptions.take = l;

      const requests = await prisma.rentalRequest.findMany(findOptions);
      return res.json({
        requests: requests.map(formatRequest),
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l)
      });
    }

    const requests = await prisma.rentalRequest.findMany(findOptions);
    res.json(requests.map(formatRequest));
  } catch (err) {
    next(err);
  }
}

export async function getOutgoingRequests(req, res, next) {
  try {
    const borrowerId = req.user.id;
    const pageNum = req.query.page ? Math.max(1, parseInt(req.query.page, 10) || 1) : null;
    const limitNum = req.query.limit ? Math.max(1, parseInt(req.query.limit, 10) || 20) : null;

    const total = await prisma.rentalRequest.count({ where: { borrowerId } });

    const findOptions = {
      where: { borrowerId },
      include: {
        item: true,
        lender: {
          select: { id: true, name: true, avatarUrl: true, city: true }
        },
        reviews: true
      },
      orderBy: { createdAt: 'desc' }
    };

    if (pageNum || limitNum) {
      const p = pageNum || 1;
      const l = limitNum || 20;
      findOptions.skip = (p - 1) * l;
      findOptions.take = l;

      const requests = await prisma.rentalRequest.findMany(findOptions);
      return res.json({
        requests: requests.map(formatRequest),
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l)
      });
    }

    const requests = await prisma.rentalRequest.findMany(findOptions);
    res.json(requests.map(formatRequest));
  } catch (err) {
    next(err);
  }
}

export async function acceptRequest(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Use a transaction with PostgreSQL advisory lock on itemId to prevent concurrency race conditions
    const updated = await prisma.$transaction(async (tx) => {
      const request = await tx.rentalRequest.findUnique({
        where: { id },
        include: { item: true, borrower: true }
      });

      if (!request) {
        throw new NotFoundError('Rental request not found.');
      }

      if (request.lenderId !== userId) {
        throw new ForbiddenError('Only the lender can accept this request.');
      }

      if (request.status !== 'Pending') {
        throw new ValidationError(`Cannot accept request with status "${request.status}". Only Pending requests can be accepted.`);
      }

      // Concurrency protection: Acquire PostgreSQL advisory transaction lock on item ID
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('rental_item'), hashtext(${request.itemId}))`;

      // Check conflict inside locked transaction
      const conflicts = await tx.rentalRequest.findMany({
        where: {
          itemId: request.itemId,
          status: 'Accepted',
          id: { not: id },
          startDate: { lte: request.endDate },
          endDate: { gte: request.startDate }
        }
      });

      if (conflicts.length > 0) {
        throw new ConflictError('Cannot accept: item already has an overlapping accepted booking.');
      }

      const updatedRequest = await tx.rentalRequest.update({
        where: { id },
        data: {
          status: 'Accepted',
          acceptedAt: new Date()
        },
        include: {
          item: true,
          borrower: {
            select: { id: true, name: true, avatarUrl: true, city: true }
          },
          lender: {
            select: { id: true, name: true, avatarUrl: true, city: true }
          }
        }
      });

      // Activity for borrower
      await tx.activity.create({
        data: {
          userId: request.borrowerId,
          type: 'REQUEST_ACCEPTED',
          message: `Your request for ${request.item.name} was accepted!`,
          entityType: 'request',
          entityId: id
        }
      });

      return updatedRequest;
    });

    res.json({
      message: 'Rental request accepted',
      request: formatRequest(updated)
    });
  } catch (err) {
    next(err);
  }
}

export async function rejectRequest(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const updated = await prisma.$transaction(async (tx) => {
      const request = await tx.rentalRequest.findUnique({
        where: { id },
        include: { item: true }
      });

      if (!request) {
        throw new NotFoundError('Rental request not found.');
      }

      if (request.lenderId !== userId) {
        throw new ForbiddenError('Only the lender can reject this request.');
      }

      if (request.status !== 'Pending') {
        throw new ValidationError(`Cannot reject request with status "${request.status}".`);
      }

      const updatedReq = await tx.rentalRequest.update({
        where: { id },
        data: {
          status: 'Rejected',
          rejectedAt: new Date()
        },
        include: {
          item: true,
          borrower: {
            select: { id: true, name: true, avatarUrl: true, city: true }
          },
          lender: {
            select: { id: true, name: true, avatarUrl: true, city: true }
          }
        }
      });

      await tx.activity.create({
        data: {
          userId: request.borrowerId,
          type: 'REQUEST_REJECTED',
          message: `Your rental request for ${request.item.name} was declined.`,
          entityType: 'request',
          entityId: id
        }
      });

      return updatedReq;
    });

    res.json({
      message: 'Rental request rejected',
      request: formatRequest(updated)
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelRequest(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const updated = await prisma.$transaction(async (tx) => {
      const request = await tx.rentalRequest.findUnique({
        where: { id },
        include: { item: true, borrower: true }
      });

      if (!request) {
        throw new NotFoundError('Rental request not found.');
      }

      if (request.borrowerId !== userId) {
        throw new ForbiddenError('Only the borrower can cancel this request.');
      }

      if (request.status !== 'Pending') {
        throw new ValidationError(`Cannot cancel request with status "${request.status}".`);
      }

      const updatedReq = await tx.rentalRequest.update({
        where: { id },
        data: {
          status: 'Cancelled',
          cancelledAt: new Date()
        },
        include: {
          item: true,
          borrower: {
            select: { id: true, name: true, avatarUrl: true, city: true }
          },
          lender: {
            select: { id: true, name: true, avatarUrl: true, city: true }
          }
        }
      });

      await tx.activity.create({
        data: {
          userId: request.lenderId,
          type: 'REQUEST_CANCELLED',
          message: `Rental request from ${request.borrower.name} for ${request.item.name} was cancelled.`,
          entityType: 'request',
          entityId: id
        }
      });

      return updatedReq;
    });

    res.json({
      message: 'Rental request cancelled',
      request: formatRequest(updated)
    });
  } catch (err) {
    next(err);
  }
}

export async function returnRequest(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const updated = await prisma.$transaction(async (tx) => {
      const request = await tx.rentalRequest.findUnique({
        where: { id },
        include: { item: true, borrower: true, lender: true }
      });

      if (!request) {
        throw new NotFoundError('Rental request not found.');
      }

      // Participant check: either lender or borrower can complete return
      if (request.lenderId !== userId && request.borrowerId !== userId) {
        throw new ForbiddenError('You are not a participant in this rental.');
      }

      if (request.status !== 'Accepted') {
        throw new ValidationError(`Cannot return request with status "${request.status}". Must be Accepted.`);
      }

      // Return rule: rental must have started before it can be completed (today >= startDate)
      const today = getTodayString();
      if (today < request.startDate) {
        throw new ValidationError('Cannot complete return: the rental period has not started yet.');
      }

      const updatedReq = await tx.rentalRequest.update({
        where: { id },
        data: {
          status: 'Completed',
          completedAt: new Date()
        },
        include: {
          item: true,
          borrower: {
            select: { id: true, name: true, avatarUrl: true, city: true }
          },
          lender: {
            select: { id: true, name: true, avatarUrl: true, city: true }
          }
        }
      });

      // Create atomic activity records for both participants
      await tx.activity.createMany({
        data: [
          {
            userId: request.borrowerId,
            type: 'ITEM_RETURNED',
            message: `Rental completed for ${request.item.name}. Please leave a review!`,
            entityType: 'request',
            entityId: id
          },
          {
            userId: request.lenderId,
            type: 'ITEM_RETURNED',
            message: `${request.item.name} has been returned by ${request.borrower.name}.`,
            entityType: 'request',
            entityId: id
          }
        ]
      });

      return updatedReq;
    });

    res.json({
      message: 'Item marked as returned and rental completed',
      request: formatRequest(updated)
    });
  } catch (err) {
    next(err);
  }
}
