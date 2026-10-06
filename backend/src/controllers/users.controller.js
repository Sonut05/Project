import { prisma } from '../db/prisma.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

function validateCoordinate(val, min, max, name) {
  if (val === null || val === undefined) return null;
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num) || isNaN(num)) {
    throw new ValidationError(`Invalid ${name}: must be a finite number.`);
  }
  if (num < min || num > max) {
    throw new ValidationError(`${name} must be between ${min} and ${max}.`);
  }
  return num;
}

export async function getUserProfile(req, res, next) {
  try {
    const { id } = req.params;
    const isSelf = req.user && req.user.id === id;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            listedItems: { where: { listingStatus: 'Active' } },
            borrowerRequests: { where: { status: 'Completed' } },
            lenderRequests: { where: { status: 'Completed' } }
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundError(`User not found.`);
    }

    // Calculate rating for this user from reviews
    const userReviews = await prisma.review.findMany({
      where: { targetType: 'user', targetId: id }
    });

    const reviewsCount = userReviews.length;
    const averageRating = reviewsCount > 0
      ? Number((userReviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount).toFixed(1))
      : null;

    if (isSelf) {
      const { passwordHash: _, ...safeSelf } = user;
      return res.json({
        ...safeSelf,
        stats: {
          itemsCount: user._count.listedItems,
          completedBorrows: user._count.borrowerRequests,
          completedLends: user._count.lenderRequests,
          rating: averageRating,
          reviewsCount
        }
      });
    }

    // Public profile: strictly hide private address and phone
    return res.json({
      id: user.id,
      name: user.name,
      city: user.city,
      avatarUrl: user.avatarUrl,
      onboardingUseMode: user.onboardingUseMode,
      createdAt: user.createdAt,
      stats: {
        itemsCount: user._count.listedItems,
        completedBorrows: user._count.borrowerRequests,
        completedLends: user._count.lenderRequests,
        rating: averageRating,
        reviewsCount
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserListings(req, res, next) {
  try {
    const { id } = req.params;
    const listings = await prisma.item.findMany({
      where: {
        lenderId: id,
        listingStatus: 'Active'
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(
      listings.map((item) => ({
        ...item,
        dailyPrice: Number(item.dailyPrice),
        depositAmount: Number(item.depositAmount)
      }))
    );
  } catch (err) {
    next(err);
  }
}

export async function getUserReviews(req, res, next) {
  try {
    const { id } = req.params;
    const pageNum = req.query.page ? Math.max(1, parseInt(req.query.page, 10) || 1) : null;
    const limitNum = req.query.limit ? Math.max(1, parseInt(req.query.limit, 10) || 20) : null;

    const total = await prisma.review.count({ where: { targetType: 'user', targetId: id } });

    const findOptions = {
      where: { targetType: 'user', targetId: id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            city: true
          }
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

export async function updateMe(req, res, next) {
  try {
    const userId = req.user.id;
    const {
      name,
      phone,
      city,
      privateAddress,
      avatarUrl,
      latitude,
      longitude,
      onboardingUseMode
    } = req.body;

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      throw new NotFoundError('User not found.');
    }

    const dataToUpdate = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        throw new ValidationError('Name must be at least 2 characters long.');
      }
      dataToUpdate.name = name.trim();
    }
    if (phone !== undefined) dataToUpdate.phone = phone ? phone.trim() : null;
    if (city !== undefined) dataToUpdate.city = city ? city.trim() : null;
    if (privateAddress !== undefined) dataToUpdate.privateAddress = privateAddress ? privateAddress.trim() : null;
    if (avatarUrl !== undefined) dataToUpdate.avatarUrl = avatarUrl;

    if (latitude !== undefined) {
      dataToUpdate.latitude = validateCoordinate(latitude, -90, 90, 'Latitude');
    }
    if (longitude !== undefined) {
      dataToUpdate.longitude = validateCoordinate(longitude, -180, 180, 'Longitude');
    }

    // Changing city without selecting location coordinates is rejected
    if (city !== undefined && city) {
      if (dataToUpdate.latitude === null || dataToUpdate.longitude === null) {
        throw new ValidationError('Updating your city or neighborhood requires selecting a location from suggestions.');
      }
      if (
        currentUser.city &&
        city.toLowerCase() !== currentUser.city.toLowerCase() &&
        dataToUpdate.latitude === undefined &&
        dataToUpdate.longitude === undefined
      ) {
        try {
          const { config } = await import('../config/env.js');
          const geocodeUrl = new URL(config.geocoderUrl);
          geocodeUrl.searchParams.set('q', city.trim());
          geocodeUrl.searchParams.set('format', 'json');
          geocodeUrl.searchParams.set('limit', '1');
          const geoRes = await fetch(geocodeUrl.toString(), {
            headers: { 'User-Agent': config.geocoderUserAgent, Accept: 'application/json' },
            signal: AbortSignal.timeout(3000)
          });
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (Array.isArray(geoData) && geoData.length > 0) {
              dataToUpdate.latitude = parseFloat(geoData[0].lat);
              dataToUpdate.longitude = parseFloat(geoData[0].lon);
            }
          }
        } catch (geoErr) {
          console.warn('[updateMe] Auto-geocode fallback skipped:', geoErr.message);
        }
        if (dataToUpdate.latitude === undefined || dataToUpdate.longitude === undefined) {
          throw new ValidationError('Updating your city or neighborhood requires selecting a location from suggestions.');
        }
      }
    }

    const effectiveName = dataToUpdate.name !== undefined ? dataToUpdate.name : currentUser.name;
    const effectiveCity = dataToUpdate.city !== undefined ? dataToUpdate.city : currentUser.city;
    const effectiveLat = dataToUpdate.latitude !== undefined ? dataToUpdate.latitude : currentUser.latitude;
    const effectiveLng = dataToUpdate.longitude !== undefined ? dataToUpdate.longitude : currentUser.longitude;

    if (onboardingUseMode !== undefined) {
      const allowedModes = ['borrow', 'lend', 'both'];
      if (!allowedModes.includes(onboardingUseMode)) {
        throw new ValidationError('onboardingUseMode must be one of: borrow, lend, both.');
      }
      dataToUpdate.onboardingUseMode = onboardingUseMode;

      if (effectiveLat === null || effectiveLat === undefined || effectiveLng === null || effectiveLng === undefined) {
        throw new ValidationError('latitude and longitude are required to complete onboarding.');
      }
    }

    const effectiveMode = dataToUpdate.onboardingUseMode !== undefined ? dataToUpdate.onboardingUseMode : currentUser.onboardingUseMode;

    if (
      !currentUser.onboardingCompletedAt &&
      effectiveName &&
      effectiveCity &&
      effectiveLat !== null &&
      effectiveLat !== undefined &&
      effectiveLng !== null &&
      effectiveLng !== undefined &&
      effectiveMode
    ) {
      dataToUpdate.onboardingCompletedAt = new Date();
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate
    });

    const { passwordHash: _, ...safeUser } = updatedUser;
    res.json({
      message: 'Profile updated successfully',
      user: safeUser
    });
  } catch (err) {
    next(err);
  }
}
