import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma.js';
import { ValidationError, UnauthorizedError, ConflictError } from '../utils/errors.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../middleware/auth.js';
import { config } from '../config/env.js';

const isProduction = config.env === 'production';

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function register(req, res, next) {
  try {
    const { name, email, password, confirmPassword, phone, city } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw new ValidationError('Name must be at least 2 characters long.');
    }

    if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      throw new ValidationError('A valid email address is required.');
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters long.');
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      throw new ValidationError('Passwords do not match.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ConflictError('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        phone: phone ? phone.trim() : null,
        city: city ? city.trim() : null,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`
      }
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Track refresh session server-side
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    const { passwordHash: _, privateAddress: __, ...safeUser } = user;

    res.status(201).json({
      message: 'Account created successfully',
      user: safeUser,
      accessToken
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Email and password are required.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Track refresh session server-side
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    const { passwordHash: _, ...safeUser } = user;

    res.json({
      message: 'Logged in successfully',
      user: safeUser,
      accessToken
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      throw new UnauthorizedError('Refresh token missing');
    }

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const tokenHash = hashToken(token);
    const session = await prisma.refreshSession.findUnique({
      where: { tokenHash }
    });

    if (!session) {
      throw new UnauthorizedError('Refresh session not found');
    }

    if (session.revokedAt) {
      // Replay attack detected! Invalidate all active sessions for this user for security
      await prisma.refreshSession.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() }
      });
      res.clearCookie('refreshToken', { ...COOKIE_OPTIONS, maxAge: 0 });
      throw new UnauthorizedError('Revoked refresh token presented: session terminated for security');
    }

    if (new Date() > session.expiresAt) {
      throw new UnauthorizedError('Refresh session expired');
    }

    // Revoke old session (Rotation)
    await prisma.refreshSession.update({
      where: { id: session.id },
      data: {
        revokedAt: new Date(),
        lastUsedAt: new Date()
      }
    });

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Issue new pair
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    const newTokenHash = hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt: newExpiresAt
      }
    });

    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);

    const { passwordHash: _, ...safeUser } = user;

    res.json({
      accessToken: newAccessToken,
      user: safeUser
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      const tokenHash = hashToken(token);
      await prisma.refreshSession.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    }
    res.clearCookie('refreshToken', { ...COOKIE_OPTIONS, maxAge: 0 });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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
      throw new UnauthorizedError('User not found');
    }

    const { passwordHash: _, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    next(err);
  }
}
