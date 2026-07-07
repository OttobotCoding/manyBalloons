/**
 * server/index.js
 * Entry point for the Birthday Tracker Express API.
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const friendRoutes = require('./routes/friends');
const settingsRoutes = require('./routes/settings');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { startScheduler } = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/birthday_tracker';

// ── Basic middleware ───────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Uploaded photos ───────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API routes (registered before static so /api/* is never caught by React) ──
app.use('/api/friends', friendRoutes);
app.use('/api/settings', settingsRoutes);
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── Serve React build ─────────────────────────────────────────────────────────
const buildPath = path.join(__dirname, '..', 'client', 'build');

console.log(`[startup] __dirname     : ${__dirname}`);
console.log(`[startup] buildPath     : ${buildPath}`);
console.log(`[startup] build exists  : ${fs.existsSync(buildPath)}`);
console.log(`[startup] index.html    : ${fs.existsSync(path.join(buildPath, 'index.html'))}`);

if (fs.existsSync(path.join(buildPath, 'index.html'))) {
  // Serve static assets (JS, CSS, images, etc.)
  app.use(express.static(buildPath));

  // Catch-all: any route not matched above returns the React app
  app.get('*', (_req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });

  console.log('[startup] React static serving: ENABLED');
} else {
  console.warn('[startup] React build not found — static serving DISABLED');

  // Without the build, still register notFound so API errors are clear
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