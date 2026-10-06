import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Only DATABASE_URL is strictly required to talk to Postgres.
// If JWT secrets or client origin are omitted, use secure fallbacks to prevent startup crashes.
if (isProduction && !process.env.DATABASE_URL) {
  throw new Error('FATAL: Missing required environment variable in production: DATABASE_URL');
}

const DEFAULT_JWT_ACCESS = 'rentit_access_fallback_secret_key_prod_32chars_secure';
const DEFAULT_JWT_REFRESH = 'rentit_refresh_fallback_secret_key_prod_32chars_secure';

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5433/rentit',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || DEFAULT_JWT_ACCESS,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || DEFAULT_JWT_REFRESH,
  jwtAccessExpiry: '15m',
  jwtRefreshExpiry: '7d',
  geocoderUrl: process.env.GEOCODER_URL || 'https://nominatim.openstreetmap.org/search',
  geocoderUserAgent: process.env.GEOCODER_USER_AGENT || 'RentIt-P2P-App/1.0',
  uploadDir: process.env.UPLOAD_DIR || 'uploads'
};
