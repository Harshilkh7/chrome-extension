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
        if (!origin) return callback(null, true);
        if (origin.startsWith('chrome-extension://')) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Socket origin ${origin} not allowed`));
      },
      methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Dashboard connected:', socket.id);

    socket.on('join-user-room', (userId) => {
      if (!userId) return;

      socket.join(`user:${userId}`);

      console.log(
        `Socket ${socket.id} joined user:${userId}`
      );
    });

    socket.on('disconnect', () => {
      console.log('Dashboard disconnected:', socket.id);
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
