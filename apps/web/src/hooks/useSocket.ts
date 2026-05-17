import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

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

/**
 * Provides a single shared Socket.io connection per browser session.
 * Automatically joins the restaurant's room on connect.
 * Call subscribe() to listen to events; the returned cleanup fn is
 * stable across re-renders so it's safe to use in useEffect deps.
 */
export function useSocket() {
  const { user, accessToken } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());

  useEffect(() => {
    if (!user?.restaurantId || !accessToken) return;

    const socket = io(BACKEND_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_restaurant', {
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
      socket.on(event, (data: any) => {
        handlersRef.current.get(event)?.forEach(h => h(data));
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.restaurantId, accessToken]);

  const subscribe = useCallback(
    (event: SocketEvent, handler: EventHandler): (() => void) => {
      if (!handlersRef.current.has(event)) {
        handlersRef.current.set(event, new Set());
      }
      handlersRef.current.get(event)!.add(handler);

      return () => {
        handlersRef.current.get(event)?.delete(handler);
      };
    },
    []
  );

  const emit = useCallback((event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { subscribe, emit };
}
