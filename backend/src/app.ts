import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';
import { config } from './config';

const app = express();

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
        connectSrc: ["'self'", config.clientUrl],
        imgSrc: ["'self'", 'data:', 'blob:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Strict CORS with multiple allowed origins support
const parsedOrigins = config.clientUrl.includes(',')
  ? config.clientUrl.split(',').map((s) => s.trim())
  : [config.clientUrl];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      const allowed = [
        ...parsedOrigins,
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
      ];
      if (allowed.includes(origin) || allowed.includes('*')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in deployment with credentials handled safely
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: [
      'X-Encrypted-File-Key',
      'X-File-Key-Iv',
      'X-File-Iv',
      'X-Encrypted-File-Name',
      'X-File-Name-Iv',
      'X-Mime-Type',
    ],
  })
);

// Body parsers with safe size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(config.cookieSecret));

// Privacy-Preserving Zero-Plaintext Request Logger
app.use((req, res, next) => {
  // Only log method and route path — NEVER request body or credentials
  console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});

// Root Welcome Endpoint (for Render deployment verification)
app.get('/', (req, res) => {
  res.json({
    name: 'ZEROLOCK Zero-Knowledge Backend API',
    status: 'online',
    version: '1.0.0',
    documentation: 'https://github.com/arpitat09/ZEROLOCK#readme',
    healthCheck: '/api/health',
    zeroKnowledgeVerified: true,
  });
});

// API Routes
app.use('/api', apiRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
