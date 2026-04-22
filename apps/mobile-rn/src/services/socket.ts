import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../constants/api';
import { SocketEvents } from '../constants/socketEvents';

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000; // 30s cap

export function connectSocket(token: string, restaurantId: string) {
    if (socket?.connected) return;

    socket = io(API_BASE_URL, {
        transports: ['websocket'],
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: MAX_RECONNECT_DELAY,
    });

    socket.on('connect', () => {
        reconnectAttempts = 0;
        socket?.emit(SocketEvents.JOIN_RESTAURANT, restaurantId);
        console.log('[Socket] Connected & joined restaurant room');
    });

    socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
        console.log(`[Socket] Reconnect attempt ${reconnectAttempts}, next in ${delay}ms`);
    });
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
        reconnectAttempts = 0;
    }
}

export function getSocket(): Socket | null {
    return socket;
}

export function onSocketEvent(event: string, handler: (...args: any[]) => void) {
    socket?.on(event, handler);
    return () => { socket?.off(event, handler); };
}
