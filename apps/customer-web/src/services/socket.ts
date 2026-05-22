import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://server.bhojantech.lfvs.in';

let socket: Socket | null = null;

export const getSocket = () => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 10,
        });
    }
    return socket;
};

export const joinOrderRoom = (orderId: string) => {
    const s = getSocket();
    s.emit('join_order', orderId);
};
