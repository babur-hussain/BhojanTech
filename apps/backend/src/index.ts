// ⚠️ Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import { initSentry, Sentry } from './config/sentry';
initSentry();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import { connectDB } from './config/db';
import logger from './utils/logger';
import { errorHandler } from './middleware/error.middleware';

const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? [
          'https://bhojantech.com',
          'https://pos.bhojantech.com',
          'http://localhost:3000',
          'http://localhost:5173',
          'https://bhojan-tech-web.vercel.app',
          'https://restaurantos.lfvs.in',
          'http://restaurantos.lfvs.in',
          'https://restaurantsos.lfvs.in',
          'http://restaurantsos.lfvs.in',
          'https://customer.lfvs.in',
          'http://customer.lfvs.in'
        ]
      : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ─── CORS & Middleware Setup ──────────────────────────────────────────────────
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? [
      'https://bhojantech.com',
      'https://pos.bhojantech.com',
      'http://localhost:3000',
      'http://localhost:5173',
      'https://bhojan-tech-web.vercel.app',
      'https://restaurantos.lfvs.in',
      'http://restaurantos.lfvs.in',
      'https://restaurantsos.lfvs.in',
      'http://restaurantsos.lfvs.in',
      'https://customer.lfvs.in',
      'http://customer.lfvs.in'
    ]
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'];

// CORS MUST come BEFORE helmet and all other middleware.
// This ensures OPTIONS preflight responses always include the right headers.
app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'x-branch-id'],
}));

// Explicitly handle preflight so no other middleware can interfere
app.options('*', cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'x-branch-id'],
}));

// Helmet — security headers (AFTER cors so it doesn't stomp on preflight)
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP — we serve an API, not HTML pages
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false, // Disable — was causing "window.closed" warnings
  crossOriginResourcePolicy: false, // Allow cross-origin resource loading
}));

app.use(express.json({ limit: '2mb' })); // Support base64 images in menu items
app.use(cookieParser());
app.use(mongoSanitize());
app.use(compression());

const morganFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
app.set('etag', 'strong');
app.use(morgan(morganFormat, {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, message: 'Too many auth requests' });
const orderLimiter = rateLimit({ windowMs: 1 * 60 * 1000, limit: 30, message: 'Too many order requests' });
const aiLimiter = rateLimit({ windowMs: 1 * 60 * 1000, limit: 20, message: 'Too many AI requests' });

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500, // General IP max limit
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  })
);

// Database Connection
import mongoose from 'mongoose';
connectDB();

// Request ID middleware — attach a unique ID to every request for log correlation
app.use((req, _res, next) => {
  const reqId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  (req as any).requestId = reqId;
  next();
});

// Log Mongoose connection lifecycle events
mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected — will attempt to reconnect...'));
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected ✅'));
mongoose.connection.on('error', (err) => console.error('MongoDB connection error:', err.message));

import { verifyToken } from './utils/jwt';

// Socket.io for Real-time
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required — no token provided'));
    }
    const decoded = verifyToken(token as string);
    if (!decoded) {
      return next(new Error('Authentication failed — invalid token'));
    }
    (socket as any).user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_restaurant', (data: any) => {
    let restaurantId: string | undefined;
    let branchId: string | undefined;

    if (typeof data === 'string') {
      restaurantId = data;
    } else if (data && typeof data === 'object') {
      restaurantId = data.restaurantId;
      branchId = data.branchId;
    }

    if (!restaurantId) {
      return socket.emit('error', 'restaurantId is required');
    }

    const user = (socket as any).user;
    if (!user || (user.role !== 'SUPER_OWNER' && user.restaurantId !== restaurantId)) {
      return socket.emit('error', 'Unauthorized to join this restaurant');
    }

    socket.join(`restaurant_${restaurantId}`);
    if (branchId && branchId !== 'all') {
      // OWNER and SUPER_OWNER can join any branch
      if (user.role !== 'SUPER_OWNER' && user.role !== 'OWNER' && user.role !== 'BRANCH_MANAGER' && user.branchId !== branchId) {
        return; // Only join allowed branches
      }
      socket.join(`restaurant_${restaurantId}_branch_${branchId}`);
      console.log(`Socket ${socket.id} joined room restaurant_${restaurantId}_branch_${branchId}`);
    } else {
      console.log(`Socket ${socket.id} joined room restaurant_${restaurantId} (SUPER_OWNER or Legacy)`);
      // Auto-join all branches for owners who want a consolidated view
      if (user.role === 'SUPER_OWNER' || user.role === 'OWNER') {
        import('./models/Branch').then(({ Branch }) => {
          Branch.find({ restaurantId }).then(branches => {
            branches.forEach(b => {
              socket.join(`restaurant_${restaurantId}_branch_${b._id}`);
              console.log(`Socket ${socket.id} auto-joined branch room restaurant_${restaurantId}_branch_${b._id}`);
            });
          });
        });
      }
    }
  });

  socket.on('join_order', (orderId: unknown) => {
    const user = (socket as any).user;
    if (!user) {
      return socket.emit('error', 'Unauthorized');
    }
    // Validate orderId is a valid MongoDB ObjectId string
    if (typeof orderId !== 'string' || !/^[a-fA-F0-9]{24}$/.test(orderId)) {
      return socket.emit('error', 'Invalid orderId format');
    }
    // Only allow joining order rooms for authenticated users
    socket.join(`order_${orderId}`);
    console.log(`Socket ${socket.id} joined order room order_${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
import restaurantRoutes from './routes/restaurant.routes';
import authRoutes from './routes/auth.routes';
import menuRoutes from './routes/menu.routes';
import tableRoutes from './routes/table.routes';
import orderRoutes from './routes/order.routes';
import kotRoutes from './routes/kot.routes';
import billingRoutes from './routes/billing.routes';
import inventoryRoutes from './routes/inventory.routes';
import staffRoutes from './routes/staff.routes';
import analyticsRoutes from './routes/analytics.routes';
import aiRoutes from './routes/ai.routes';
import qrRoutes from './routes/qr.routes';
import onlineOrderRoutes from './routes/onlineOrder.routes';
import integrationRoutes from './routes/integration.routes';
import accountingRoutes from './routes/accounting.routes';
import expenseRoutes from './routes/expense.routes';
import tdsRoutes from './routes/tds.routes';
import customerRoutes from './routes/customer.routes';
import branchRoutes from './routes/branch.routes';
import retailItemRoutes from './routes/retailItem.routes';
import bookingRoutes from './routes/bookingRoutes';

app.use('/api/restaurant', restaurantRoutes);
import { initCronJobs } from './utils/cronJobs';
import './services/menuSync.service'; // Start Bull Queue Worker for single item
import './workers/menuSync.worker'; // Start Bull Queue Worker for full menu sync
// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderLimiter, orderRoutes);
app.use('/api/kots', kotRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/online-orders', orderLimiter, onlineOrderRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/tds', tdsRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/retail-items', retailItemRoutes);
app.use('/api/bookings', bookingRoutes);
import whatsappWebhookRoutes from './routes/whatsapp.routes';
app.use('/api/whatsapp', whatsappWebhookRoutes);

// Initialize scheduled tasks
initCronJobs();
import healthRoutes from './routes/health.routes';

// ... other imports and setup ...

app.use('/health', healthRoutes);

// Sentry error handler must come BEFORE custom error handler
Sentry.setupExpressErrorHandler(app);

app.use(errorHandler);

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// ─── Graceful Shutdown ─────────────────────────────────────────────────────────
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed.');
    } catch (err) {
      console.error('Error closing MongoDB:', err);
    }
    try {
      const { redis: redisClient } = await import('./config/redis');
      await redisClient.quit();
      console.log('Redis connection closed.');
    } catch (err) {
      console.error('Error closing Redis:', err);
    }
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

