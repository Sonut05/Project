import crypto from 'crypto';

export function requestLogger(req, res, next) {
  const start = Date.now();
  const requestId = crypto.randomUUID().slice(0, 8);
  req.id = requestId;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const userPart = req.user ? ` [user:${req.user.id}]` : '';
    // Redact sensitive headers
    console.log(`[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms${userPart}`);
  });

  next();
}
