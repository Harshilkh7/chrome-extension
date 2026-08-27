let io;

function getAllowedOrigins() {
  return (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function initSocket(server) {
  const { Server } = require('socket.io');

  const allowedOrigins = getAllowedOrigins();

  io = new Server(server, {
    cors: {
      origin(origin, callback) {
        // Allow requests without an Origin header
        // (curl, Postman, server-to-server, etc.)
        if (!origin) {
          return callback(null, true);
        }

        // Allow Chrome extensions
        if (origin.startsWith('chrome-extension://')) {
          return callback(null, true);
        }

        // Allow configured frontend origins
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        console.log(`Socket origin rejected: ${origin}`);
        return callback(new Error(`Socket origin ${origin} not allowed`));
      },

      methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Dashboard connected:', socket.id);

    socket.on('join-user-room', (userId) => {
      if (!userId) {
        console.log(`Socket ${socket.id} attempted to join without userId`);
        return;
      }

      const room = `user:${userId}`;

      socket.join(room);

      console.log(`Socket ${socket.id} joined ${room}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(
        `Dashboard disconnected: ${socket.id} (${reason})`
      );
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.IO has not been initialized');
  }

  return io;
}

module.exports = {
  initSocket,
  getIO,
};