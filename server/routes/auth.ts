/**
 * server/routes/auth.ts
 * Public auth endpoints — login, logout, setup, session check, password change.
 */

import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import ActivityLog from '../models/ActivityLog';
import requireAuth from '../middleware/requireAuth';

const router = express.Router();

const COOKIE_NAME = 'bt_token';
const JWT_SECRET  = process.env.JWT_SECRET || 'change_this_secret_in_production';

// Helper: get client IP
const getIp = (req: Request): string =>
  (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0] || req.socket.remoteAddress || '';

// Helper: sign JWT and set httpOnly cookie
function issueToken(res: Response, userId: unknown, rememberMe = false): void {
  const expiresIn = rememberMe ? '30d' : '1d';
  const maxAge    = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
  });
}

// ── GET /api/auth/setup-status ────────────────────────────────────────────────
router.get('/setup-status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await User.findOne();
    res.json({ success: true, needsSetup: !existing });
  } catch (err) { next(err); }
});

// ── POST /api/auth/setup ──────────────────────────────────────────────────────
router.post('/setup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await User.findOne();
    if (existing) {
      return res.status(403).json({
        success: false,
        message: 'Setup already complete',
      });
    }

    const { username, password, confirmPassword } = req.body as {
      username?: string;
      password?: string;
      confirmPassword?: string;
    };
    if (!username || !password)
      return res.status(422).json({ success: false, message: 'Username and password are required' });
    if (password !== confirmPassword)
      return res.status(422).json({ success: false, message: 'Passwords do not match' });
    if (password.length < 8)
      return res.status(422).json({ success: false, message: 'Password must be at least 8 characters' });

    // First user is always admin
    const user = await User.create({ username, password, role: 'admin' });

    await ActivityLog.log({
      user:        user._id,
      username:    user.username,
      action:      'setup_completed',
      description: `Admin account "${user.username}" created`,
      ip:          getIp(req),
    });

    issueToken(res, user._id, false);
    res.status(201).json({ success: true, data: user.toJSON() });
  } catch (err) { next(err); }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  console.log('[login] body:', req.body);
  try {
    const { username, password, rememberMe } = req.body as {
      username?: string;
      password?: string;
      rememberMe?: boolean;
    };
    if (!username || !password)
      return res.status(422).json({ success: false, message: 'Username and password are required' });

    const user = await User.findOne({ username: username.toLowerCase().trim() });

    if (!user) {
      await ActivityLog.log({
        username:    username.toLowerCase().trim(),
        action:      'login_failed',
        description: `Failed login attempt for unknown user "${username}"`,
        ip:          getIp(req),
      });
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      await ActivityLog.log({
        user:        user._id,
        username:    user.username,
        action:      'login_failed',
        description: `Failed login attempt for "${user.username}"`,
        ip:          getIp(req),
      });
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    await ActivityLog.log({
      user:        user._id,
      username:    user.username,
      action:      'login_success',
      description: `"${user.username}" logged in`,
      ip:          getIp(req),
    });

    issueToken(res, user._id, Boolean(rememberMe));
    res.json({ success: true, data: user.toJSON() });
  } catch (err) { next(err); }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.userId);
    if (user) {
      await ActivityLog.log({
        user:        user._id,
        username:    user.username,
        action:      'logout',
        description: `"${user.username}" logged out`,
        ip:          getIp(req),
      });
    }
    res.clearCookie(COOKIE_NAME);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) { next(err); }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user.toJSON() });
  } catch (err) { next(err); }
});

// ── PUT /api/auth/password ────────────────────────────────────────────────────
router.put('/password', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    if (!currentPassword || !newPassword || !confirmPassword)
      return res.status(422).json({ success: false, message: 'All password fields are required' });
    if (newPassword.length < 8)
      return res.status(422).json({ success: false, message: 'New password must be at least 8 characters' });
    if (newPassword !== confirmPassword)
      return res.status(422).json({ success: false, message: 'New passwords do not match' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    const valid = await user.comparePassword(currentPassword);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    await ActivityLog.log({
      user:        user._id,
      username:    user.username,
      action:      'password_changed',
      description: `"${user.username}" changed their password`,
      ip:          getIp(req),
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) { next(err); }
});

export default router;
