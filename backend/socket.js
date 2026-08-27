let io;

function initSocket(server) {
  const { Server } = require('socket.io');

  io = new Server(server, {
    cors: {
      origin: 'http://localhost:5173',
      methods: ['GET', 'POST', 'PUT'],
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

    socket.on('consent-updated', (updatedConsent) => {
        setConsents((prev) => {
            const exists = prev.some(
            (consent) => consent._id === updatedConsent._id
            );

            if (exists) {
            return prev.map((consent) =>
                consent._id === updatedConsent._id
                ? updatedConsent
                : consent
            );
            }

            return [updatedConsent, ...prev];
        });
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