import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:8000';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
});

function getUserIdFromToken() {
  const token = localStorage.getItem('token');

  if (!token) {
    return null;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id;
  } catch {
    return null;
  }
}

export function connectSocket() {
  const token = localStorage.getItem('token');

  if (!token) {
    return;
  }

  if (!socket.connected) {
    socket.connect();
  }

  const userId = getUserIdFromToken();

  if (userId) {
    socket.emit('join-user-room', userId);
  }
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect();
  }
}