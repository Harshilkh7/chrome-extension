const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const http = require('http');
const { initSocket } = require('./socket');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const colors = require('colors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const consentRoutes = require('./routes/consentRoutes');
const userRoutes = require('./routes/userRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

if (!process.env.JWT_SECRET || !process.env.DB_URI) {
  console.error(
    'Missing required environment variables. Copy .env.example to .env and fill it in.'.bgRed
  );
  process.exit(1);
}

mongoose
  .connect(process.env.DB_URI)
  .then(() => console.log('MongoDB connected'.bgGreen))
  .catch((err) => console.error('MongoDB connection error:'.bgRed, err));

const allowedOrigins = (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (origin.startsWith('chrome-extension://')) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // The extension's content scripts make API requests from the
      // website page context, so the browser Origin can be the site
      // being visited (for example https://meet.google.com).
      // Authentication is still enforced by JWT middleware.
      if (origin.startsWith('http://') || origin.startsWith('https://')) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(morgan('dev'));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/user', userRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 8000;
const server = http.createServer(app);

initSocket(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`.bgMagenta);
});
