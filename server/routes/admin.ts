/**
 * server/routes/admin.ts
 * Admin-only endpoints. All routes require requireAuth + requireAdmin.
 *
 * GET  /api/admin/stats          → system overview stats
 * GET  /api/admin/users          → list all users
 * POST /api/admin/users          → create a new user
 * PUT  /api/admin/users/:id/role → change a user's role
 * PUT  /api/admin/users/:id/password → reset a user's password
 * DELETE /api/admin/users/:id    → delete a user
 * GET  /api/admin/logs           → activity log (paginated)
 */

import express, { Request, Response, NextFunction } from 'express';
import User, { UserRole } from '../models/User';
import Friend from '../models/Friend';
import Group from '../models/Group';
import Settings from '../models/Settings';
import ActivityLog from '../models/ActivityLog';
import requireAdmin from '../middleware/requireAdmin';

const router = express.Router();

// All admin routes require admin role (requireAuth already applied in index.ts)
router.use(requireAdmin);

const getIp = (req: Request): string =>
  (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0] || req.socket.remoteAddress || '';

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalUsers,
      totalFriends,
      totalGroups,
      settings,
      recentFriends,
      birthdayThisMonth,
      usersByRole,
    ] = await Promise.all([
      User.countDocuments(),
      Friend.countDocuments(),
      Group.countDocuments(),
      Settings.findById('app'),
      Friend.find().sort({ createdAt: -1 }).limit(5).populate('owner', 'username'),
      Friend.find().then(docs => {
        const now   = new Date();
        const month = now.getMonth();
        return docs.filter(d => {
          if (!d.birthday) return false;
          return d.birthday.getUTCMonth() === month;
        }).length;
      }),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    ]);

    // Friends by relationship
    const friendsByRelationship = await Friend.aggregate([
      { $group: { _id: '$relationship', count: { $sum: 1 } } },
      { $sort:  { count: -1 } },
    ]);

    // Uptime in seconds
    const uptime = Math.floor(process.uptime());

    res.json({
      success: true,
      data: {
        totalUsers,
        totalFriends,
        totalGroups,
        birthdayThisMonth,
        notificationsEnabled: settings?.notificationsEnabled ?? false,
        smtpConfigured: !!(settings?.smtpUser && settings?.smtpPass),
        recentFriends: recentFriends.map(f => f.toJSON()),
        friendsByRelationship,
        usersByRole,
        uptime,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
      },
    });
  } catch (err) { next(err); }
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users.map(u => u.toJSON()) });
  } catch (err) { next(err); }
});

// ── POST /api/admin/users ─────────────────────────────────────────────────────
router.post('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, role = 'user', displayName } = req.body as {
      username?: string;
      password?: string;
      role?: UserRole;
      displayName?: string;
    };

    if (!username || !password)
      return res.status(422).json({ success: false, message: 'Username and password are required' });
    if (password.length < 8)
      return res.status(422).json({ success: false, message: 'Password must be at least 8 characters' });

    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing)
      return res.status(409).json({ success: false, message: 'Username already taken' });

    const user = await User.create({ username, password, role, displayName });

    await ActivityLog.log({
      user:        req.userId,
      username:    req.user?.username,
      action:      'user_created',
      description: `Admin created user "${user.username}" with role "${role}"`,
      meta:        { newUserId: user._id, newUsername: user.username, role },
      ip:          getIp(req),
    });

    res.status(201).json({ success: true, data: user.toJSON() });
  } catch (err) { next(err); }
});

// ── PUT /api/admin/users/:id/role ─────────────────────────────────────────────
router.put('/users/:id/role', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.body as { role?: UserRole };
    if (!role || !['admin', 'user'].includes(role))
      return res.status(422).json({ success: false, message: 'Role must be "admin" or "user"' });

    // Prevent removing your own admin role
    if (req.params.id === req.userId?.toString() && role !== 'admin')
      return res.status(400).json({ success: false, message: 'You cannot remove your own admin role' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const oldRole = user.role;
    user.role = role;
    await user.save({ validateBeforeSave: false });

    await ActivityLog.log({
      user:        req.userId,
      username:    req.user?.username,
      action:      'user_role_changed',
      description: `Role for "${user.username}" changed from "${oldRole}" to "${role}"`,
      meta:        { targetUserId: user._id, targetUsername: user.username, oldRole, newRole: role },
      ip:          getIp(req),
    });

    res.json({ success: true, data: user.toJSON() });
  } catch (err) { next(err); }
});

// ── PUT /api/admin/users/:id/password ────────────────────────────────────────
router.put('/users/:id/password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { newPassword } = req.body as { newPassword?: string };
    if (!newPassword || newPassword.length < 8)
      return res.status(422).json({ success: false, message: 'Password must be at least 8 characters' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.password = newPassword;
    await user.save();

    await ActivityLog.log({
      user:        req.userId,
      username:    req.user?.username,
      action:      'user_password_reset',
      description: `Admin reset password for "${user.username}"`,
      meta:        { targetUserId: user._id, targetUsername: user.username },
      ip:          getIp(req),
    });

    res.json({ success: true, message: `Password reset for ${user.username}` });
  } catch (err) { next(err); }
});

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────────
router.delete('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.params.id === req.userId?.toString())
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await user.deleteOne();

    await ActivityLog.log({
      user:        req.userId,
      username:    req.user?.username,
      action:      'user_deleted',
      description: `Admin deleted user "${user.username}"`,
      meta:        { deletedUserId: user._id, deletedUsername: user.username },
      ip:          getIp(req),
    });

    res.json({ success: true, message: `User "${user.username}" deleted` });
  } catch (err) { next(err); }
});

// ── GET /api/admin/logs ───────────────────────────────────────────────────────
router.get('/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page as string,  10) || 1);
    const limit  = Math.min(100, parseInt(req.query.limit as string, 10) || 25);
    const skip   = (page - 1) * limit;
    const action = (req.query.action as string) || null;
    const userId = (req.query.userId as string) || null;

    const filter: Record<string, unknown> = {};
    if (action) filter.action = action;
    if (userId) filter.user   = userId;

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'username role'),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data:    logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) { next(err); }
});

export default router;
