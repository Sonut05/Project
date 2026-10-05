import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { getTodayString } from '../utils/dateUtils.js';

// Calculate Haversine distance in km between two lat/lon points
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const ALLOWED_CONDITIONS = ['New', 'Good', 'Fair'];
const ALLOWED_STATUSES = ['Active', 'Archived'];

function validateItemFields(data, isCreate = true) {
  const result = {};

  if (isCreate || data.name !== undefined) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
      throw new ValidationError('Item name is required and must be at least 2 characters long.');
    }
    if (data.name.trim().length > 100) {
      throw new ValidationError('Item name cannot exceed 100 characters.');
    }
    result.name = data.name.trim();
  }

  if (isCreate || data.description !== undefined) {
    if (data.description !== undefined && data.description !== null) {
      if (typeof data.description !== 'string') {
        throw new ValidationError('Description must be a string.');
      }
      if (data.description.length > 2000) {
        throw new ValidationError('Description cannot exceed 2000 characters.');
      }
      result.description = data.description.trim();
    } else if (isCreate) {
      result.description = '';
    }
  }

  if (isCreate || data.category !== undefined) {
    if (!data.category || typeof data.category !== 'string' || data.category.trim().length < 2) {
      throw new ValidationError('Category is required and must be at least 2 characters long.');
    }
    if (data.category.trim().length > 50) {
      throw new ValidationError('Category cannot exceed 50 characters.');
    }
    result.category = data.category.trim();
  }

  if (isCreate || data.condition !== undefined) {
    const cond = data.condition || 'Good';
    if (!ALLOWED_CONDITIONS.includes(cond)) {
      throw new ValidationError(`Condition must be one of: ${ALLOWED_CONDITIONS.join(', ')}.`);
    }
    result.condition = cond;
  }

  if (isCreate || data.dailyPrice !== undefined) {
    const num = Number(data.dailyPrice);
    if (!Number.isFinite(num) || isNaN(num) || num <= 0) {
      throw new ValidationError('Daily price must be a valid positive finite number.');
    }
    if (num > 1000000) {
      throw new ValidationError('Daily price exceeds maximum allowed value.');
    }
    result.dailyPrice = new Prisma.Decimal(num.toFixed(2));
  }

  if (isCreate || data.depositAmount !== undefined) {
    const depVal = data.depositAmount !== undefined && data.depositAmount !== null ? data.depositAmount : 0;
    const num = Number(depVal);
    if (!Number.isFinite(num) || isNaN(num) || num < 0) {
      throw new ValidationError('Deposit amount must be a valid non-negative finite number.');
    }
    if (num > 10000000) {
      throw new ValidationError('Deposit amount exceeds maximum allowed value.');
    }
    result.depositAmount = new Prisma.Decimal(num.toFixed(2));
  }

  if (isCreate || data.latitude !== undefined) {
    const num = Number(data.latitude);
    if (!Number.isFinite(num) || isNaN(num) || num < -90 || num > 90) {
      throw new ValidationError('Latitude must be a valid finite number between -90 and 90.');
    }
    result.latitude = num;
  }

  if (isCreate || data.longitude !== undefined) {
    const num = Number(data.longitude);
    if (!Number.isFinite(num) || isNaN(num) || num < -180 || num > 180) {
      throw new ValidationError('Longitude must be a valid finite number between -180 and 180.');
    }
    result.longitude = num;
  }

  if (isCreate || data.locationLabel !== undefined) {
    result.locationLabel = data.locationLabel ? String(data.locationLabel).trim() : 'Local Area';
  }

  if (isCreate || data.images !== undefined) {
    if (data.images !== undefined) {
      if (!Array.isArray(data.images)) {
        throw new ValidationError('Images must be an array of image URL strings.');
      }
      if (data.images.length > 10) {
        throw new ValidationError('Cannot upload more than 10 images.');
      }
      for (const img of data.images) {
        if (typeof img !== 'string' || img.trim().length === 0) {
          throw new ValidationError('Each image must be a valid non-empty string.');
        }
      }
      result.images = data.images;
    } else if (isCreate) {
      result.images = [];
    }
  }

  if (data.listingStatus !== undefined) {
    if (!ALLOWED_STATUSES.includes(data.listingStatus)) {
      throw new ValidationError(`Listing status must be one of: ${ALLOWED_STATUSES.join(', ')}.`);
    }
    result.listingStatus = data.listingStatus;
  } else if (isCreate) {
    result.listingStatus = 'Active';
  }

  return result;
}

export async function getItems(req, res, next) {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      minRating,
      availableOnly,
      lenderId,
      excludeLenderId,
      lat,
      lng,
      radius
    } = req.query;

    const where = {
      listingStatus: 'Active'
    };

    if (category && category !== 'All' && category !== 'All Categories') {
      where.category = category;
    }

    if (lenderId) {
      where.lenderId = lenderId;
    }

    if (excludeLenderId) {
      where.lenderId = { not: excludeLenderId };
    }

    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { locationLabel: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }

    if (minPrice || maxPrice) {
      where.dailyPrice = {};
      if (minPrice) {
        const minP = Number(minPrice);
        if (!isNaN(minP)) where.dailyPrice.gte = new Prisma.Decimal(minP.toFixed(2));
      }
      if (maxPrice) {
        const maxP = Number(maxPrice);
        if (!isNaN(maxP)) where.dailyPrice.lte = new Prisma.Decimal(maxP.toFixed(2));
      }
    }

    const items = await prisma.item.findMany({
      where,
      include: {
        lender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            city: true
          }
        },
        rentalRequests: {
          where: {
            status: 'Accepted'
          },
          select: {
            startDate: true,
            endDate: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const today = getTodayString();

    const itemIds = items.map((i) => i.id);
    const lenderIds = [...new Set(items.map((i) => i.lenderId))];

    // Optimize N+1 queries: aggregate ratings in grouped database queries instead of loading full collections
    const [itemRatingAggs, userRatingAggs] = await Promise.all([
      itemIds.length > 0
        ? prisma.review.groupBy({
            by: ['targetId'],
            where: {
              targetType: 'item',
              targetId: { in: itemIds }
            },
            _avg: { rating: true },
            _count: { rating: true }
          })
        : [],
      lenderIds.length > 0
        ? prisma.review.groupBy({
            by: ['targetId'],
            where: {
              targetType: 'user',
              targetId: { in: lenderIds }
            },
            _avg: { rating: true },
            _count: { rating: true }
          })
        : []
    ]);

    const itemRatingMap = {};
    for (const agg of itemRatingAggs) {
      itemRatingMap[agg.targetId] = {
        avg: agg._avg.rating !== null ? Number(Number(agg._avg.rating).toFixed(1)) : null,
        count: agg._count.rating || 0
      };
    }

    const userRatingMap = {};
    for (const agg of userRatingAggs) {
      userRatingMap[agg.targetId] = {
        avg: agg._avg.rating !== null ? Number(Number(agg._avg.rating).toFixed(1)) : null,
        count: agg._count.rating || 0
      };
    }

    let processedItems = items.map((item) => {
      // Check if currently rented today
      const isCurrentlyRented = item.rentalRequests.some(
        (req) => req.startDate <= today && req.endDate >= today
      );

      const lenderStats = userRatingMap[item.lenderId] || { avg: null, count: 0 };
      const itemStats = itemRatingMap[item.id] || { avg: null, count: 0 };

      return {
        id: item.id,
        lenderId: item.lenderId,
        name: item.name,
        description: item.description,
        category: item.category,
        dailyPrice: Number(item.dailyPrice),
        depositAmount: Number(item.depositAmount),
        condition: item.condition,
        locationLabel: item.locationLabel,
        latitude: item.latitude,
        longitude: item.longitude,
        images: item.images,
        listingStatus: item.listingStatus,
        createdAt: item.createdAt,
        availability: isCurrentlyRented ? 'Rented Out' : 'Available',
        rating: itemStats.avg,
        reviewsCount: itemStats.count,
        lender: {
          id: item.lender.id,
          name: item.lender.name,
          avatarUrl: item.lender.avatarUrl,
          city: item.lender.city,
          rating: lenderStats.avg,
          reviewsCount: lenderStats.count
        }
      };
    });

    // Filter by availableOnly if requested
    if (availableOnly === 'true' || availableOnly === true) {
      processedItems = processedItems.filter((item) => item.availability === 'Available');
    }

    // Filter by minimum lender rating if requested
    // POLICY: Unrated lenders have rating === null (0 reviews). When a positive minRating filter is set,
    // only lenders with an established average rating matching or exceeding minRating are returned.
    // Unrated lenders are not given a fake 5.0 rating and are excluded only when minRating > 0 is selected.
    if (minRating) {
      const minRatNum = parseFloat(minRating);
      if (!isNaN(minRatNum) && minRatNum > 0) {
        processedItems = processedItems.filter(
          (item) => item.lender.rating !== null && item.lender.rating >= minRatNum
        );
      }
    }

    // Filter by geo radius if coordinates provided
    if (lat && lng) {
      const targetLat = parseFloat(lat);
      const targetLng = parseFloat(lng);
      const isAnywhere = !radius || radius === 'anywhere' || radius === 'all';
      const maxDist = !isAnywhere ? parseFloat(radius) : null;
      if (!isNaN(targetLat) && !isNaN(targetLng)) {
        processedItems = processedItems
          .map((item) => {
            const dist = haversineDistance(targetLat, targetLng, item.latitude, item.longitude);
            return {
              ...item,
              distanceKm: Number(dist.toFixed(1))
            };
          })
          .filter((item) => {
            if (maxDist !== null && !isNaN(maxDist) && maxDist > 0) {
              return item.distanceKm <= maxDist;
            }
            return true;
          });
      }
    }

    const pageNum = req.query.page ? Math.max(1, parseInt(req.query.page, 10) || 1) : null;
    const limitNum = req.query.limit ? Math.max(1, parseInt(req.query.limit, 10) || 20) : null;

    if (pageNum || limitNum) {
      const p = pageNum || 1;
      const l = limitNum || 20;
      const total = processedItems.length;
      const startIndex = (p - 1) * l;
      const paginatedItems = processedItems.slice(startIndex, startIndex + l);
      return res.json({
        items: paginatedItems,
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l)
      });
    }

    res.json(processedItems);
  } catch (err) {
    next(err);
  }
}

export async function getItemById(req, res, next) {
  try {
    const { id } = req.params;

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        lender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            city: true,
            createdAt: true
          }
        },
        rentalRequests: {
          where: {
            status: { in: ['Accepted', 'Completed'] }
          },
          select: {
            id: true,
            startDate: true,
            endDate: true,
            status: true
          }
        }
      }
    });

    if (!item) {
      throw new NotFoundError('Item not found.');
    }

    const today = getTodayString();
    const isCurrentlyRented = item.rentalRequests.some(
      (r) => r.status === 'Accepted' && r.startDate <= today && r.endDate >= today
    );

    // Reviews for this item
    const itemReviews = await prisma.review.findMany({
      where: { targetType: 'item', targetId: id },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const reviewsCount = itemReviews.length;
    const avgRating = reviewsCount > 0
      ? Number((itemReviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount).toFixed(1))
      : null;

    // Lender rating
    const lenderReviews = await prisma.review.findMany({
      where: { targetType: 'user', targetId: item.lenderId }
    });
    const lenderReviewsCount = lenderReviews.length;
    const lenderAvgRating = lenderReviewsCount > 0
      ? Number((lenderReviews.reduce((sum, r) => sum + r.rating, 0) / lenderReviewsCount).toFixed(1))
      : null;

    // Active accepted bookings to return for calendar collision check
    const bookedRanges = item.rentalRequests
      .filter((r) => r.status === 'Accepted' && r.endDate >= today)
      .map((r) => ({
        startDate: r.startDate,
        endDate: r.endDate
      }));

    res.json({
      id: item.id,
      lenderId: item.lenderId,
      name: item.name,
      description: item.description,
      category: item.category,
      dailyPrice: Number(item.dailyPrice),
      depositAmount: Number(item.depositAmount),
      condition: item.condition,
      locationLabel: item.locationLabel,
      latitude: item.latitude,
      longitude: item.longitude,
      images: item.images,
      listingStatus: item.listingStatus,
      createdAt: item.createdAt,
      availability: isCurrentlyRented ? 'Rented Out' : 'Available',
      rating: avgRating,
      reviewsCount,
      bookedRanges,
      reviews: itemReviews,
      lender: {
        id: item.lender.id,
        name: item.lender.name,
        avatarUrl: item.lender.avatarUrl,
        city: item.lender.city,
        createdAt: item.lender.createdAt,
        rating: lenderAvgRating,
        reviewsCount: lenderReviewsCount
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function createItem(req, res, next) {
  try {
    const lenderId = req.user.id;
    const validatedData = validateItemFields(req.body, true);

    // Atomically create item + LISTING_CREATED activity in a single transaction
    const newItem = await prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          ...validatedData,
          lenderId
        },
        include: {
          lender: {
            select: { id: true, name: true, avatarUrl: true, city: true }
          }
        }
      });

      await tx.activity.create({
        data: {
          userId: lenderId,
          type: 'LISTING_CREATED',
          message: `Listed item "${item.name}"`,
          entityType: 'item',
          entityId: item.id
        }
      });

      return item;
    });

    res.status(201).json({
      message: 'Item listed successfully',
      item: {
        ...newItem,
        lenderId: newItem.lenderId,
        dailyPrice: Number(newItem.dailyPrice),
        depositAmount: Number(newItem.depositAmount)
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function updateItem(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Item not found.');
    }

    if (existing.lenderId !== userId) {
      throw new ForbiddenError('You are not authorized to edit this listing.');
    }

    const dataToUpdate = validateItemFields(req.body, false);

    const updated = await prisma.item.update({
      where: { id },
      data: dataToUpdate,
      include: {
        lender: {
          select: { id: true, name: true, avatarUrl: true, city: true }
        }
      }
    });

    res.json({
      message: 'Item updated successfully',
      item: {
        ...updated,
        lenderId: updated.lenderId,
        dailyPrice: Number(updated.dailyPrice),
        depositAmount: Number(updated.depositAmount)
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteItem(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await prisma.item.findUnique({
      where: { id },
      include: {
        rentalRequests: true
      }
    });

    if (!existing) {
      throw new NotFoundError('Item not found.');
    }

    if (existing.lenderId !== userId) {
      throw new ForbiddenError('You are not authorized to delete this listing.');
    }

    // If item has rental history, soft delete / archive to preserve integrity
    if (existing.rentalRequests.length > 0) {
      await prisma.item.update({
        where: { id },
        data: { listingStatus: 'Archived' }
      });
      return res.json({ message: 'Listing archived to preserve rental history.' });
    }

    // If no rentals attached, can permanently delete
    await prisma.item.delete({ where: { id } });
    res.json({ message: 'Listing deleted successfully.' });
  } catch (err) {
    next(err);
  }
}
