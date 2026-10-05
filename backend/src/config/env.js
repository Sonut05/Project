import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  const missing = [];
  if (!process.env.JWT_ACCESS_SECRET) missing.push('JWT_ACCESS_SECRET');
  if (!process.env.JWT_REFRESH_SECRET) missing.push('JWT_REFRESH_SECRET');
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!process.env.CLIENT_ORIGIN) missing.push('CLIENT_ORIGIN');

  if (missing.length > 0) {
    throw new Error(
      `FATAL: Missing required environment variables in production: ${missing.join(', ')}`
    );
  }
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5433/rentit',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  jwtAccessSecret: isProduction
    ? process.env.JWT_ACCESS_SECRET
    : (process.env.JWT_ACCESS_SECRET || 'rentit_access_fallback_secret_key_32chars'),
  jwtRefreshSecret: isProduction
    ? process.env.JWT_REFRESH_SECRET
    : (process.env.JWT_REFRESH_SECRET || 'rentit_refresh_fallback_secret_key_32chars'),
  jwtAccessExpiry: '15m',
  jwtRefreshExpiry: '7d',
  geocoderUrl: process.env.GEOCODER_URL || 'https://nominatim.openstreetmap.org/search',
  geocoderUserAgent: process.env.GEOCODER_USER_AGENT || 'RentIt-P2P-App/1.0',
  uploadDir: process.env.UPLOAD_DIR || 'uploads'
};
