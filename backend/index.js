const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

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

// ---------------------------------------------------------------
// Database
// ---------------------------------------------------------------
mongoose
  .connect(process.env.DB_URI)
  .then(() => console.log('MongoDB connected'.bgGreen))
  .catch((err) => console.error('MongoDB connection error:'.bgRed, err));

// ---------------------------------------------------------------
// CORS
// The dashboard (a normal website) needs an explicit origin allow-list.
// The Chrome extension's popup/background always sends a
// "chrome-extension://<id>" origin, and that ID is different on every
// machine for an unpacked/dev install, so we allow any chrome-extension
// origin rather than trying to hardcode one.
// ---------------------------------------------------------------
const allowedOrigins = (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // curl/postman/no-origin requests
      if (origin.startsWith('chrome-extension://')) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
  })
);

app.use(morgan('dev'));
app.use(express.json());

// ---------------------------------------------------------------
// Routes
// ---------------------------------------------------------------
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/user', userRoutes);

// 404 for anything else under /api
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`.bgMagenta);
});
