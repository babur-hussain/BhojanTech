// ⚠️ Sentry MUST be imported/initialised before any other modules
import { initSentry, Sentry } from './config/sentry';
initSentry();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import dotenv from 'dotenv';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db';
import logger from './utils/logger';
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://bhojantech.com', 'https://pos.bhojantech.com']
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));
app.use(express.json({ limit: '50kb' }));
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
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, message: 'Too many auth requests' });
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
connectDB();

import { verifyToken } from './utils/jwt';

// Socket.io for Real-time
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    const decoded = verifyToken(token as string);
    (socket as any).user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_restaurant', (data: any) => {
    let restaurantId;
    let branchId;
    if (typeof data === 'string') {
      restaurantId = data;
    } else {
      restaurantId = data.restaurantId;
      branchId = data.branchId;
    }

    const user = (socket as any).user;
    if (!user || (user.role !== 'SUPER_OWNER' && user.restaurantId !== restaurantId)) {
      return socket.emit('error', 'Unauthorized to join this restaurant');
    }

    socket.join(`restaurant_${restaurantId}`);
    if (branchId) {
      if (user.role !== 'SUPER_OWNER' && user.role !== 'BRANCH_MANAGER' && user.branchId !== branchId) {
        return; // Only join allowed branches
      }
      socket.join(`restaurant_${restaurantId}_branch_${branchId}`);
      console.log(`Socket ${socket.id} joined room restaurant_${restaurantId}_branch_${branchId}`);
    } else {
      console.log(`Socket ${socket.id} joined room restaurant_${restaurantId} (SUPER_OWNER or Legacy)`);
    }
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
import aiRoutes from './routes/aiRoutes';
import qrRoutes from './routes/qr.routes';
import onlineOrderRoutes from './routes/onlineOrder.routes';
import integrationRoutes from './routes/integration.routes';
import accountingRoutes from './routes/accounting.routes';
import expenseRoutes from './routes/expense.routes';
import tdsRoutes from './routes/tds.routes';
import customerRoutes from './routes/customer.routes';
import branchRoutes from './routes/branch.routes';

app.use('/api/restaurant', restaurantRoutes);
import { initCronJobs } from './utils/cronJobs';
import './services/menuSync.service'; // Start Bull Queue Worker
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
