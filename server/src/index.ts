import express from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

// Routes
import authRoutes from './routes/auth';
import eventsRoutes from './routes/events';
import splitsRoutes from './routes/splits';
import paymentsRoutes from './routes/payments';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Heroku (needed for rate limiting and secure cookies)
app.set('trust proxy', 1);

// Security middleware with relaxed CSP for production
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [
          "'self'",
          'https://api.ledgersplit.com',
          'https://ledgersplit.com',
          'https://*.google.com',
          'https://*.googleapis.com',
          'https://*.google-analytics.com',
          'https://*.analytics.google.com',
          'https://*.googletagmanager.com',
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://www.googletagmanager.com',
          'https://static.cloudflareinsights.com',
        ],
        imgSrc: ["'self'", 'data:', 'https:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      },
    },
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit for development
});
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 100, // 5 attempts per 15 minutes in production
  skipSuccessfulRequests: true, // Don't count successful requests
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// CORS - allow multiple origins
const allowedOrigins = [
  'http://localhost:5173',
  'https://ledgersplit.com',
  'https://www.ledgersplit.com',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session management
if (!process.env.SESSION_SECRET) {
  console.error('CRITICAL: SESSION_SECRET environment variable is not set!');
  process.exit(1);
}

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true, // Required for OAuth state to persist
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-site OAuth
    },
  })
);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/splits', splitsRoutes);
app.use('/api/payments', paymentsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientPath));

  // Handle client-side routing - serve index.html for all non-API routes
  app.use((req, res, next) => {
    // If not an API route and file doesn't exist, serve index.html
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(clientPath, 'index.html'));
    } else {
      next();
    }
  });
}

// Start cleanup scheduler for expired tokens
import { startCleanupScheduler } from './utils/cleanup';
startCleanupScheduler();

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});