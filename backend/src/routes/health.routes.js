import express from 'express';
import { prisma } from '../db/prisma.js';

const router = express.Router();

// Liveness check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Readiness check (checks database connectivity)
router.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch {
    res.status(503).json({
      status: 'unready',
      database: 'disconnected'
    });
  }
});

export default router;
