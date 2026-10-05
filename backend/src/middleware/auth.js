import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { UnauthorizedError } from '../utils/errors.js';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Authentication token missing or invalid'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.jwtAccessSecret);
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Token expired'));
    }
    return next(new UnauthorizedError('Invalid authentication token'));
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.jwtAccessSecret);
    req.user = payload;
  } catch (err) {
    // Silently ignore for optional auth
  }
  next();
}

export function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    config.jwtAccessSecret,
    { expiresIn: config.jwtAccessExpiry }
  );
}

export function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, jti: crypto.randomUUID() },
    config.jwtRefreshSecret,
    { expiresIn: config.jwtRefreshExpiry }
  );
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwtRefreshSecret);
}
