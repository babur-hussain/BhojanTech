import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://server.bhojantech.lfvs.in';

type SocketEvent =
  | 'kot_created'
  | 'kot_update'
  | 'order_update'
  | 'table_update'
  | 'menu_update'
  | 'waiter_notification'
  | 'delivery_order_placed'
  | 'delivery_order_cancelled';

type EventHandler = (data: any) => void;

// GLOBAL SINGLETON STATE
let globalSocket: Socket | null = null;
let globalHandlers: Map<string, Set<EventHandler>> = new Map();
let activeUsers = 0;

/**
 * Provides a single shared Socket.io connection per browser session.
 * Automatically joins the restaurant's room on connect.
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
      });

      globalSocket.on('connect', () => {
        globalSocket?.emit('join_restaurant', {
          restaurantId: user.restaurantId,
          branchId: user.branchId,
        });
      });

      // Forward all tracked events to registered handlers
      const EVENTS: SocketEvent[] = [
        'kot_created', 'kot_update', 'order_update',
        'table_update', 'menu_update', 'waiter_notification',
        'delivery_order_placed', 'delivery_order_cancelled'
      ];

      EVENTS.forEach(event => {
        globalSocket?.on(event, (data: any) => {
          globalHandlers.get(event)?.forEach(h => h(data));
        });
      });
    }

    socketRef.current = globalSocket;

    return () => {
      activeUsers--;
      if (activeUsers === 0 && globalSocket) {
        // Only disconnect if no components are using the socket anymore
        // Actually, for a POS SPA, it's safer to just leave the socket alive globally
        // but if we logout, we should probably destroy it.
        // For robustness, we will let it live as long as the window lives.
      }
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
