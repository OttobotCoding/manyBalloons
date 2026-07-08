/**
 * server/index.js
 * Entry point for the Birthday Tracker Express API.
 */

const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const path       = require('path');
const fs         = require('fs');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes     = require('./routes/auth');
const friendRoutes   = require('./routes/friends');
const settingsRoutes = require('./routes/settings');
const requireAuth    = require('./middleware/requireAuth');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { startScheduler } = require('./services/scheduler');

const app      = express();
const PORT     = process.env.PORT     || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/birthday_tracker';

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin:      process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  credentials: true, // required for cookies to be sent cross-origin
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// ── Static uploads ────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Public routes (no auth required) ─────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── Protected routes (JWT required) ──────────────────────────────────────────
app.use('/api/friends',  requireAuth, friendRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);

// ── Serve React build ─────────────────────────────────────────────────────────
const buildPath = path.join(__dirname, '..', 'client', 'build');

console.log(`[startup] __dirname    : ${__dirname}`);
console.log(`[startup] buildPath    : ${buildPath}`);
console.log(`[startup] build exists : ${fs.existsSync(buildPath)}`);
console.log(`[startup] index.html   : ${fs.existsSync(path.join(buildPath, 'index.html'))}`);

if (fs.existsSync(path.join(buildPath, 'index.html'))) {
  app.use(express.static(buildPath));
  app.get('*', (_req, res) => res.sendFile(path.join(buildPath, 'index.html')));
  console.log('[startup] React static serving: ENABLED');
} else {
  console.warn('[startup] React build not found — static serving DISABLED');
  app.use(notFound);
}

// ── Error handling ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Database + server start ───────────────────────────────────────────────────
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(`✅  MongoDB connected → ${MONGO_URI}`);
    startScheduler();
    app.listen(PORT, () => console.log(`🚀  Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('❌  MongoDB connection error:', err.message);
    process.exit(1);
  });