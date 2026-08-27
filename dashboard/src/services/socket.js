import { io } from 'socket.io-client';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  'http://localhost:8000';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

function getUserIdFromToken() {
  const token = localStorage.getItem('token');

  if (!token) {
    return null;
  }

  try {
    const payload = JSON.parse(
      atob(token.split('.')[1])
    );

    return payload.id;
  } catch (error) {
    console.error(
      'Failed to decode token:',
      error
    );

    return null;
  }
}

/*
 * Join the room whenever the socket successfully connects.
 *
 * This is the important part.
 *
 * DO NOT emit join-user-room immediately after
 * socket.connect(), because the connection may not
 * have been established yet.
 */
socket.on('connect', () => {
  console.log(
    'Socket connected:',
    socket.id
  );

  const userId = getUserIdFromToken();

  if (!userId) {
    console.error(
      'Cannot join socket room: user ID not found'
    );
    return;
  }

  console.log(
    'Joining user room:',
    `user:${userId}`
  );

  socket.emit(
    'join-user-room',
    userId
  );
});

socket.on('disconnect', (reason) => {
  console.log(
    'Socket disconnected:',
    reason
  );
});

socket.on('connect_error', (error) => {
  console.error(
    'Socket connection error:',
    error.message
  );
});

export function connectSocket() {
  const token = localStorage.getItem('token');

  if (!token) {
    console.log(
      'No authentication token. Socket not connected.'
    );
    return;
  }

  if (!socket.connected) {
    console.log(
      'Connecting socket to:',
      SOCKET_URL
    );

    socket.connect();
  } else {
    /*
     * Socket is already connected.
     * Make sure we are in the correct room.
     */
    const userId = getUserIdFromToken();

    if (userId) {
      socket.emit(
        'join-user-room',
        userId
      );
    }
  }
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect();
  }
}