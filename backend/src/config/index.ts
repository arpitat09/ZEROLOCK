import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'zerolock_dev_super_secret_jwt_key_32bytes_min',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieSecret: process.env.COOKIE_SECRET || 'zerolock_dev_cookie_signing_key_32bytes',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMaxRequests: 100, // 100 requests per window
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
};
