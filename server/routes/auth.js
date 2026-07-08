/**
 * server/routes/auth.js
 *
 * POST /api/auth/setup    → create the admin account (first-run only)
 * POST /api/auth/login    → authenticate and issue JWT cookie
 * POST /api/auth/logout   → clear the JWT cookie
 * GET  /api/auth/me       → return current user (validates cookie)
 * PUT  /api/auth/password → change password (requires current password)
 */

const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const requireAuth = require('../middleware/requireAuth');

const COOKIE_NAME = 'bt_token';
const JWT_SECRET  = process.env.JWT_SECRET || 'change_this_secret_in_production';

// Helper: sign a JWT and set it as an httpOnly cookie
function issueToken(res, userId, rememberMe = false) {
  const expiresIn = rememberMe ? '30d' : '1d';
  const maxAge    = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

  const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,   // not accessible via JS — prevents XSS theft
    secure:   process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'lax',
    maxAge,
  });
}

// ── GET /api/auth/setup-status ────────────────────────────────────────────────
// Public endpoint — tells the client whether first-run setup is needed
router.get('/setup-status', async (req, res, next) => {
  try {
    const existing = await User.findOne();
    res.json({ success: true, needsSetup: !existing });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/setup ──────────────────────────────────────────────────────
// Creates the first (and only) admin account. Blocked if one already exists.
router.post('/setup', async (req, res, next) => {
  try {
    const existing = await User.findOne();
    if (existing) {
      return res.status(403).json({
        success: false,
        message: 'Setup already complete. An admin account already exists.',
      });
    }

    const { username, password, confirmPassword } = req.body;

    if (!username || !password) {
      return res.status(422).json({
        success: false,
        message: 'Username and password are required',
      });
    }
    if (password !== confirmPassword) {
      return res.status(422).json({
        success: false,
        message: 'Passwords do not match',
      });
    }
    if (password.length < 8) {
      return res.status(422).json({
        success: false,
        message: 'Password must be at least 8 characters',
      });
    }

    const user = await User.create({ username, password });
    issueToken(res, user._id, false);
    res.status(201).json({ success: true, data: user.toJSON() });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { username, password, rememberMe } = req.body;

    if (!username || !password) {
      return res.status(422).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      // Generic message — don't reveal whether username exists
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    issueToken(res, user._id, Boolean(rememberMe));
    res.json({ success: true, data: user.toJSON() });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ success: true, message: 'Logged out successfully' });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
// Used by the client on load to check if the cookie is still valid
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user.toJSON() });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/auth/password ────────────────────────────────────────────────────
router.put('/password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(422).json({
        success: false,
        message: 'All password fields are required',
      });
    }
    if (newPassword.length < 8) {
      return res.status(422).json({
        success: false,
        message: 'New password must be at least 8 characters',
      });
    }
    if (newPassword !== confirmPassword) {
      return res.status(422).json({
        success: false,
        message: 'New passwords do not match',
      });
    }

    const user = await User.findById(req.userId);
    const valid = await user.comparePassword(currentPassword);
    if (!valid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword; // pre-save hook re-hashes automatically
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;