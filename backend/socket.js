let io;
const jwt = require('jsonwebtoken');
const RefreshSession = require('./models/RefreshSession');
const { parseCookies, ACCESS_COOKIE } = require('./controllers/authController');

function getAllowedOrigins() {
  return (process.env.CLIENT_ORIGINS || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean);
}

function initSocket(server) {
  const { Server } = require('socket.io');
  const allowedOrigins = getAllowedOrigins();
  io = new Server(server, {
    cors: { origin(origin, callback) {
      if (!origin || origin.startsWith('chrome-extension://') || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Socket origin ${origin} not allowed`));
    }, credentials: true, methods: ['GET', 'POST', 'PUT', 'OPTIONS'] },
  });

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies({ headers: { cookie: socket.handshake.headers.cookie || '' } });
      const token = cookies[ACCESS_COOKIE];
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET);
      if (decoded.type !== 'access' || !decoded.id || !decoded.sid) return next(new Error('Invalid access token'));
      const session = await RefreshSession.findOne({ jtiHash: decoded.sid, userId: decoded.id, revokedAt: null });
      if (!session || session.expiresAt <= new Date()) return next(new Error('Session revoked or expired'));
      socket.userId = decoded.id;
      next();
    } catch (error) { next(new Error('Authentication failed')); }
  });

  io.on('connection', (socket) => {
    console.log('Dashboard connected:', socket.id);
    socket.join(`user:${socket.userId}`);
    socket.on('disconnect', (reason) => console.log(`Dashboard disconnected: ${socket.id} (${reason})`));
  });
  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO has not been initialized');
  return io;
}
module.exports = { initSocket, getIO };
