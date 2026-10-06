import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';

import { config } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';

import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import itemsRoutes from './routes/items.routes.js';
import requestsRoutes from './routes/requests.routes.js';
import activitiesRoutes from './routes/activities.routes.js';
import messagesRoutes from './routes/messages.routes.js';
import geocodeRoutes from './routes/geocode.routes.js';
import uploadRoutes from './routes/upload.routes.js';

const app = express();

// Security headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// CORS configuration using CLIENT_ORIGIN (supporting comma-separated origins, stripping trailing slashes)
const configuredOrigins = (config.clientOrigin || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const isProduction = config.env === 'production';
export const allowedOrigins = isProduction
  ? configuredOrigins
  : Array.from(
      new Set([
        ...configuredOrigins,
        'http://localhost:5173',
        'http://127.0.0.1:5173'
      ])
    );

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, '');
      if (
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(normalizedOrigin) ||
        allowedOrigins.length === 0 ||
        (!isProduction && (normalizedOrigin.includes('localhost') || normalizedOrigin.includes('127.0.0.1')))
      ) {
        return callback(null, true);
      }
      callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body parsing with size limit
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Request logging
app.use(requestLogger);

// Static uploads directory
const uploadDir = path.resolve(process.cwd(), config.uploadDir);
app.use('/uploads', express.static(uploadDir));

// Health and Readiness
app.use('/', healthRoutes);

// Root informational endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'RentIt P2P Daily Item Rental API',
    status: 'Running',
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/conversations', messagesRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/api/upload', uploadRoutes);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `API endpoint '${req.method} ${req.originalUrl}' not found.`
    }
  });
});

// Global error handler
app.use(errorHandler);

export default app;
