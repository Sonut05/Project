import app from './app.js';
import { config } from './config/env.js';
import { prisma } from './db/prisma.js';

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log('==================================================');
  console.log(`✨ RentIt API Server running at: http://localhost:${PORT}`);
  console.log(`📡 Health check available at:   http://localhost:${PORT}/health`);
  console.log(`🔌 Readiness check at:          http://localhost:${PORT}/ready`);
  console.log(`🌍 Environment:                 ${config.env}`);
  console.log('==================================================');
});

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await prisma.$disconnect();
      console.log('Database connection disconnected.');
    } catch (err) {
      console.error('Error during database disconnect:', err);
    }
    process.exit(0);
  });

  // Force shutdown if taking too long
  setTimeout(() => {
    console.error('Forcefully terminating process after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
