/**
 * server/routes/auth.ts
 * Public auth endpoints — login, logout, setup, session check, password change.
 */

import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import ActivityLog from '../models/ActivityLog';
import Settings from '../models/Settings';
import requireAuth from '../middleware/requireAuth';
import { sendPendingApprovalEmail, sendAdminSignupAlert } from '../services/emailService';

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

    const { username, password, confirmPassword, email } = req.body as {
      username?: string;
      password?: string;
      confirmPassword?: string;
      email?: string;
    };
    if (!username || !password)
      return res.status(422).json({ success: false, message: 'Username and password are required' });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(422).json({ success: false, message: 'Enter a valid email address' });
    if (password !== confirmPassword)
      return res.status(422).json({ success: false, message: 'Passwords do not match' });
    if (password.length < 8)
      return res.status(422).json({ success: false, message: 'Password must be at least 8 characters' });

    // First user is always admin. Email is optional here (unlike self-
    // registration) but recommended — without one, this admin won't receive
    // new-signup alerts until they set an email from the Users page.
    const user = await User.create({ username, password, email, role: 'admin' });

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

// ── POST /api/auth/register ───────────────────────────────────────────────────
// Self-signup. Creates a 'pending' account — no session is issued, the user
// must wait for an admin to approve them before they can log in.
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, confirmPassword, displayName, email } = req.body as {
      username?: string;
      password?: string;
      confirmPassword?: string;
      displayName?: string;
      email?: string;
    };
    if (!username || !password)
      return res.status(422).json({ success: false, message: 'Username and password are required' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(422).json({ success: false, message: 'A valid email address is required' });
    if (password !== confirmPassword)
      return res.status(422).json({ success: false, message: 'Passwords do not match' });
    if (password.length < 8)
      return res.status(422).json({ success: false, message: 'Password must be at least 8 characters' });

    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing)
      return res.status(409).json({ success: false, message: 'Username already taken' });

    const user = await User.create({ username, password, displayName, email, status: 'pending' });

    await ActivityLog.log({
      user:        user._id,
      username:    user.username,
      action:      'user_registered',
      description: `"${user.username}" self-registered — awaiting admin approval`,
      ip:          getIp(req),
    });

    // Let the user know by email that their account needs admin approval.
    // This never blocks the registration response — a delivery failure is
    // logged but the account still exists and the HTTP response still
    // succeeds either way.
    const settings = await Settings.findById('app');
    if (settings?.smtpUser && settings?.smtpPass) {
      try {
        await sendPendingApprovalEmail(settings, {
          username:    user.username,
          email:       user.email,
          displayName: user.displayName,
        });
        await ActivityLog.log({
          user:        user._id,
          username:    user.username,
          action:      'notification_sent',
          description: `Pending-approval email sent to "${user.username}" <${user.email}>`,
          ip:          getIp(req),
        });
      } catch (err) {
        console.error('❌  Pending-approval email error:', (err as Error).message);
        await ActivityLog.log({
          user:        user._id,
          username:    user.username,
          action:      'notification_failed',
          description: `Failed to send pending-approval email to "${user.username}": ${(err as Error).message}`,
          ip:          getIp(req),
        });
      }

      // Also alert admins that a new account needs review. Independent of
      // the user-facing email above — one failing doesn't affect the other.
      try {
        const admins = await User.find({ role: 'admin', email: { $ne: '' } });
        const adminEmails = admins.map(a => a.email).filter(Boolean);
        if (adminEmails.length) {
          await sendAdminSignupAlert(settings, adminEmails, {
            username:    user.username,
            email:       user.email,
            displayName: user.displayName,
          });
          await ActivityLog.log({
            user:        user._id,
            username:    user.username,
            action:      'notification_sent',
            description: `Admin signup alert sent to ${adminEmails.join(', ')} for "${user.username}"`,
            ip:          getIp(req),
          });
        } else {
          console.log('   No admin has an email on file — skipping admin signup alert.');
        }
      } catch (err) {
        console.error('❌  Admin signup alert error:', (err as Error).message);
        await ActivityLog.log({
          user:        user._id,
          username:    user.username,
          action:      'notification_failed',
          description: `Failed to send admin signup alert for "${user.username}": ${(err as Error).message}`,
          ip:          getIp(req),
        });
      }
    } else {
      console.log('   SMTP not configured — skipping pending-approval email and admin alert.');
    }

    res.status(201).json({
      success: true,
      message: 'Registration received — an admin will review your account shortly',
    });
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

    if (user.status !== 'approved') {
      const message = user.status === 'pending'
        ? 'Your account is awaiting admin approval'
        : 'Your account request was rejected. Contact an administrator for details.';
      await ActivityLog.log({
        user:        user._id,
        username:    user.username,
        action:      'login_blocked_unapproved',
        description: `Login blocked for "${user.username}" — status is "${user.status}"`,
        ip:          getIp(req),
      });
      return res.status(403).json({ success: false, message });
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