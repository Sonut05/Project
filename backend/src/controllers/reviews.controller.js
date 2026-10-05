import { prisma } from '../db/prisma.js';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError
} from '../utils/errors.js';

export async function createReview(req, res, next) {
  try {
    const { id: requestId } = req.params;
    const authorId = req.user.id;
    const { targetType, rating, comment } = req.body;

    if (!targetType || !['item', 'user'].includes(targetType)) {
      throw new ValidationError('targetType must be either "item" or "user".');
    }

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      throw new ValidationError('Rating must be an integer between 1 and 5.');
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length < 2) {
      throw new ValidationError('Review comment must be at least 2 characters long.');
    }

    if (comment.length > 1000) {
      throw new ValidationError('Review comment cannot exceed 1000 characters.');
    }

    // Fetch request
    const request = await prisma.rentalRequest.findUnique({
      where: { id: requestId },
      include: { item: true }
    });

    if (!request) {
      throw new NotFoundError('Rental request not found.');
    }

    if (request.status !== 'Completed') {
      throw new ValidationError('Reviews can only be submitted for completed rentals.');
    }

    // Verify authorship and determine server-authoritative target
    const isBorrower = request.borrowerId === authorId;
    const isLender = request.lenderId === authorId;

    if (!isBorrower && !isLender) {
      throw new ForbiddenError('Only rental participants can submit a review.');
    }

    let determinedTargetId;
    if (targetType === 'item') {
      if (!isBorrower) {
        throw new ForbiddenError('Only the borrower can review the rented item.');
      }
      determinedTargetId = request.itemId;
    } else if (targetType === 'user') {
      // If borrower, review lender; if lender, review borrower
      determinedTargetId = isBorrower ? request.lenderId : request.borrowerId;
    }

    // Server must determine the actual target from the rental relationship.
    // Reject arbitrary client-supplied targetId
    if (req.body.targetId && req.body.targetId !== determinedTargetId) {
      throw new ValidationError('Client cannot supply an arbitrary targetId for this rental.');
    }

    // Check if review already exists using the updated compound unique constraint (requestId, targetType, authorId)
    const existing = await prisma.review.findUnique({
      where: {
        requestId_targetType_authorId: {
          requestId,
          targetType,
          authorId
        }
      }
    });

    if (existing) {
      throw new ConflictError(`You have already reviewed this ${targetType} for this rental.`);
    }

    // Determine recipient user for notification activity
    const recipientUserId = targetType === 'item' ? request.lenderId : determinedTargetId;

    // Transactional creation: Review + Activity atomically
    const review = await prisma.$transaction(async (tx) => {
      const createdReview = await tx.review.create({
        data: {
          requestId,
          targetType,
          targetId: determinedTargetId,
          authorId,
          rating: ratingNum,
          comment: comment.trim()
        },
        include: {
          author: {
            select: { id: true, name: true, avatarUrl: true, city: true }
          }
        }
      });

      // Create activity for the recipient user
      await tx.activity.create({
        data: {
          userId: recipientUserId,
          type: 'REVIEW_RECEIVED',
          message: `Received a ${ratingNum}★ review from ${createdReview.author.name} for ${targetType === 'item' ? request.item.name : 'you'}`,
          entityType: 'review',
          entityId: createdReview.id
        }
      });

      return createdReview;
    });

    res.status(201).json({
      message: 'Review submitted successfully',
      review
    });
  } catch (err) {
    next(err);
  }
}

export async function getItemReviews(req, res, next) {
  try {
    const { id } = req.params;
    const pageNum = req.query.page ? Math.max(1, parseInt(req.query.page, 10) || 1) : null;
    const limitNum = req.query.limit ? Math.max(1, parseInt(req.query.limit, 10) || 20) : null;

    const total = await prisma.review.count({ where: { targetType: 'item', targetId: id } });

    const findOptions = {
      where: { targetType: 'item', targetId: id },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true, city: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    };

    if (pageNum || limitNum) {
      const p = pageNum || 1;
      const l = limitNum || 20;
      findOptions.skip = (p - 1) * l;
      findOptions.take = l;

      const reviews = await prisma.review.findMany(findOptions);
      return res.json({
        reviews,
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l)
      });
    }

    const reviews = await prisma.review.findMany(findOptions);

    res.json(reviews);
  } catch (err) {
    next(err);
  }
}
