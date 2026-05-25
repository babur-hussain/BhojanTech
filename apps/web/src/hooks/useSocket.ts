import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://server.bhojantech.lfvs.in';

// How often to check the socket health and re-join rooms (ms)
const HEALTH_CHECK_INTERVAL = 20_000;

type SocketEvent =
  | 'kot_created'
  | 'kot_update'
  | 'order_update'
  | 'table_update'
  | 'menu_update'
  | 'waiter_notification'
  | 'delivery_order_placed'
  | 'delivery_order_cancelled'
  | 'bill_requested';

type EventHandler = (data: any) => void;

// ─── GLOBAL SINGLETON STATE ──────────────────────────────────────────────────
let globalSocket: Socket | null = null;
let globalHandlers: Map<string, Set<EventHandler>> = new Map();
let activeUsers = 0;
let healthCheckTimer: ReturnType<typeof setInterval> | null = null;
let visibilityHandler: (() => void) | null = null;
let cachedRestaurantId: string | null = null;
let cachedUserBranchId: string | undefined = undefined;
let lastJoinTimestamp = 0;

const ALL_EVENTS: SocketEvent[] = [
  'kot_created', 'kot_update', 'order_update',
  'table_update', 'menu_update', 'waiter_notification',
  'delivery_order_placed', 'delivery_order_cancelled',
  'bill_requested',
];

// ─── ROOM JOINING ────────────────────────────────────────────────────────────

/**
 * Joins the restaurant's general room AND every branch-specific room.
 * Triple-layer defense:
 *  1. Backend auto-joins for OWNER (belt)
 *  2. Frontend explicitly joins each branch (suspenders)
 *  3. Periodic health check re-runs this (safety net)
 *
 * socket.io's socket.join() is idempotent on the server side,
 * so calling this multiple times is completely safe.
 */
async function joinAllRooms(socket: Socket, restaurantId: string, userBranchId?: string) {
  if (!socket.connected) {
    console.warn('[Socket] Cannot join rooms — socket not connected');
    return;
  }

  // Always join the general restaurant room
  socket.emit('join_restaurant', { restaurantId });

  // If the user is scoped to a single branch, join that explicitly
  if (userBranchId) {
    socket.emit('join_restaurant', { restaurantId, branchId: userBranchId });
  }

  // Fetch ALL branches and join each room explicitly.
  // This is the bulletproof fix: even if the backend doesn't auto-join
  // branch rooms for owners, the frontend forces it.
  try {
    const res = await api.get('/branches');
    const branches: { _id: string }[] = res.data;
    for (const branch of branches) {
      socket.emit('join_restaurant', { restaurantId, branchId: branch._id });
    }
    lastJoinTimestamp = Date.now();
    console.log(`[Socket] ✅ Joined ${branches.length} branch rooms for restaurant ${restaurantId}`);
  } catch (err) {
    console.warn('[Socket] ⚠️ Could not fetch branches for room join:', err);
    // Even if branches API fails, the backend's auto-join for OWNER will still work
  }
}

/**
 * Periodic health check:
 *  - If socket is disconnected, force reconnect
 *  - If socket is connected, re-join rooms to handle silent room drops
 */
function startHealthCheck() {
  if (healthCheckTimer) return; // Already running

  healthCheckTimer = setInterval(() => {
    if (!globalSocket || !cachedRestaurantId) return;

    if (!globalSocket.connected) {
      console.log('[Socket] ❌ Health check: disconnected — forcing reconnect');
      globalSocket.connect();
    } else {
      // Re-join rooms silently every cycle (idempotent, no cost)
      joinAllRooms(globalSocket, cachedRestaurantId, cachedUserBranchId);
    }
  }, HEALTH_CHECK_INTERVAL);
}

function stopHealthCheck() {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
}

/**
 * When the browser tab becomes visible again (e.g. POS tablet wakes up),
 * immediately force reconnect + re-join rooms.
 */
function setupVisibilityHandler() {
  if (visibilityHandler) return; // Already set up

  visibilityHandler = () => {
    if (document.visibilityState === 'visible' && globalSocket && cachedRestaurantId) {
      console.log('[Socket] 👀 Tab became visible — checking connection');
      if (!globalSocket.connected) {
        console.log('[Socket] 🔌 Reconnecting after tab wake-up');
        globalSocket.connect();
      } else {
        // Re-join rooms in case they were dropped while tab was hidden
        joinAllRooms(globalSocket, cachedRestaurantId, cachedUserBranchId);
      }
    }
  };

  document.addEventListener('visibilitychange', visibilityHandler);
}

function cleanupVisibilityHandler() {
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
}

// ─── HOOK ────────────────────────────────────────────────────────────────────

/**
 * Provides a single shared Socket.io connection per browser session.
 * Automatically joins ALL restaurant branch rooms on connect, reconnect,
 * tab wake-up, and periodic health checks.
 *
 * Call subscribe() to listen to events; the returned cleanup fn is
 * stable across re-renders so it's safe to use in useEffect deps.
 */
export function useSocket() {
  const { user, accessToken } = useAuth();

  const socketRef = useRef<Socket | null>(globalSocket);

  useEffect(() => {
    if (!user?.restaurantId || !accessToken) return;

    activeUsers++;
    cachedRestaurantId = user.restaurantId;
    cachedUserBranchId = user.branchId;

    if (!globalSocket) {
      console.log('[Socket] 🚀 Creating new connection to', BACKEND_URL);

      globalSocket = io(BACKEND_URL, {
        auth: { token: accessToken },
        transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      const restaurantId = user.restaurantId!;
      const userBranchId = user.branchId;

      // ── Connection lifecycle events ──────────────────────────────────────

      globalSocket.on('connect', () => {
        console.log('[Socket] ✅ Connected:', globalSocket?.id);
        joinAllRooms(globalSocket!, restaurantId, userBranchId);
      });

      globalSocket.io.on('reconnect', (attempt: number) => {
        console.log(`[Socket] 🔄 Reconnected after ${attempt} attempt(s) — re-joining all rooms`);
        joinAllRooms(globalSocket!, restaurantId, userBranchId);
      });

      globalSocket.on('disconnect', (reason) => {
        console.warn('[Socket] ⚠️ Disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server forcibly disconnected us — reconnect manually
          console.log('[Socket] 🔌 Server disconnected us — reconnecting');
          globalSocket?.connect();
        }
        // For other reasons (transport close, ping timeout), socket.io auto-reconnects
      });

      globalSocket.on('connect_error', (err) => {
        console.error('[Socket] ❌ Connection error:', err.message);
      });

      // ── Forward all tracked events to registered handlers ───────────────

      ALL_EVENTS.forEach(event => {
        globalSocket?.on(event, (data: any) => {
          globalHandlers.get(event)?.forEach(h => h(data));
        });
      });

      // ── Start defensive systems ─────────────────────────────────────────

      startHealthCheck();
      setupVisibilityHandler();
    }

    socketRef.current = globalSocket;

    return () => {
      activeUsers--;
      // Keep socket alive for the lifetime of the POS SPA
    };
  }, [user?.restaurantId, accessToken]);

  const subscribe = useCallback(
    (event: SocketEvent, handler: EventHandler): (() => void) => {
      if (!globalHandlers.has(event)) {
        globalHandlers.set(event, new Set());
      }
      globalHandlers.get(event)!.add(handler);

      return () => {
        globalHandlers.get(event)?.delete(handler);
      };
    },
    []
  );

  const emit = useCallback((event: string, data?: any) => {
    if (globalSocket) {
      globalSocket.emit(event, data);
    }
  }, []);

  return { subscribe, emit };
}
