/**
 * server/index.ts
 * Entry point for the Birthday Tracker Express API.
 */

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes     from './routes/auth';
import friendRoutes   from './routes/friends';
import settingsRoutes from './routes/settings';
import adminRoutes    from './routes/admin';
import groupRoutes    from './routes/groups';
import requireAuth    from './middleware/requireAuth';
import { errorHandler, notFound } from './middleware/errorHandler';
import { startScheduler } from './services/scheduler';

const app      = express();
const PORT      = process.env.PORT     || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/many_balloons';

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
app.use('/api/groups',   requireAuth, groupRoutes);
app.use('/api/admin',    requireAuth, adminRoutes);

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

// Temporary - print all registered routes
// `_router` is an undocumented Express internal not covered by @types/express,
// so it isn't possible to type this without `any`.
// TODO: replace with a supported route-introspection approach (or remove) —
// this is debug-only output left over from the original JS codebase.
(app as any)._router.stack
  .filter((r: any) => r.regexp)
  .forEach((r: any) => console.log('[route]', r.regexp));

// ── Database + server start ───────────────────────────────────────────────────
// serverSelectionTimeoutMS keeps this from hanging silently for 30s (mongoose's
// default) when MongoDB isn't running/reachable — fail fast and say so.
mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log(`✅  MongoDB connected → ${MONGO_URI}`);
    startScheduler();
    app.listen(PORT, () => console.log(`🚀  Server running on http://localhost:${PORT}`));
  })
  .catch((err: Error) => {
    console.error('❌  MongoDB connection error:', err.message);
    process.exit(1);
  });
