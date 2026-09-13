import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';
export const socket = io(SOCKET_URL, { autoConnect: false, withCredentials: true, transports: ['websocket', 'polling'] });

socket.on('connect', () => console.log('Socket connected:', socket.id));
socket.on('disconnect', (reason) => console.log('Socket disconnected:', reason));
socket.on('connect_error', (error) => console.error('Socket connection error:', error.message));

export function connectSocket() {
  if (!socket.connected) socket.connect();
}
export function disconnectSocket() {
  if (socket.connected) socket.disconnect();
}
