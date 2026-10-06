import { AppError } from '../utils/errors.js';
import { config } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || null;

  // Handle Prisma unique constraint violation (P2002)
  if (err.code === 'P2002') {
    statusCode = 409;
    code = 'CONFLICT';
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
    message = `A record with this ${target} already exists.`;
  }

  // Handle Prisma record not found (P2025)
  if (err.code === 'P2025') {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = 'Requested record not found.';
  }

  // Handle CORS rejection
  if (err.message && err.message.includes('Not allowed by CORS')) {
    statusCode = 403;
    code = 'CORS_FORBIDDEN';
    message = 'Not allowed by CORS';
  }

  if (config.env !== 'production' && statusCode === 500) {
    console.error('Unhandled Server Error:', err);
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  });
}
