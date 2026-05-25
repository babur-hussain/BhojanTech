import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://server.bhojantech.lfvs.in';

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

// GLOBAL SINGLETON STATE
let globalSocket: Socket | null = null;
let globalHandlers: Map<string, Set<EventHandler>> = new Map();
let activeUsers = 0;

const ALL_EVENTS: SocketEvent[] = [
  'kot_created', 'kot_update', 'order_update',
  'table_update', 'menu_update', 'waiter_notification',
  'delivery_order_placed', 'delivery_order_cancelled',
  'bill_requested',
];

/**
 * Joins the restaurant's general room AND every branch-specific room.
 * This guarantees events emitted to `restaurant_X_branch_Y` are always received,
 * even for OWNER users whose `user.branchId` is undefined.
 */
async function joinAllRooms(socket: Socket, restaurantId: string, userBranchId?: string) {
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
    console.log(`[Socket] Joined ${branches.length} branch rooms for restaurant ${restaurantId}`);
  } catch (err) {
    console.warn('[Socket] Could not fetch branches for room join:', err);
  }
}

/**
 * Provides a single shared Socket.io connection per browser session.
 * Automatically joins ALL restaurant branch rooms on connect & reconnect.
 * Call subscribe() to listen to events; the returned cleanup fn is
 * stable across re-renders so it's safe to use in useEffect deps.
 */
export function useSocket() {
  const { user, accessToken } = useAuth();

  // We still use refs to expose emit safely without breaking deps
  const socketRef = useRef<Socket | null>(globalSocket);

  useEffect(() => {
    if (!user?.restaurantId || !accessToken) return;

    activeUsers++;

    if (!globalSocket) {
      globalSocket = io(BACKEND_URL, {
        auth: { token: accessToken },
        transports: ['websocket'],
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      const restaurantId = user.restaurantId!;
      const userBranchId = user.branchId;

      // Join all rooms on initial connect
      globalSocket.on('connect', () => {
        console.log('[Socket] Connected:', globalSocket?.id);
        joinAllRooms(globalSocket!, restaurantId, userBranchId);
      });

      // Re-join all rooms on reconnect (socket.io auto-clears rooms on disconnect)
      globalSocket.on('reconnect', () => {
        console.log('[Socket] Reconnected — re-joining all rooms');
        joinAllRooms(globalSocket!, restaurantId, userBranchId);
      });

      // Forward all tracked events to registered handlers
      ALL_EVENTS.forEach(event => {
        globalSocket?.on(event, (data: any) => {
          globalHandlers.get(event)?.forEach(h => h(data));
        });
      });
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
