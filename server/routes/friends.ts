/**
 * server/routes/friends.ts
 * CRUD routes with per-user ownership and group/user sharing.
 * A friend is visible to: its owner, users in sharedWith,
 * members of sharedWithGroups, and admins.
 */

import express, { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import Friend, { IFriend } from '../models/Friend';
import Group from '../models/Group';
import User from '../models/User';
import ActivityLog from '../models/ActivityLog';
import { validateFriend } from '../middleware/validation';

const router = express.Router();

// ── Multer setup ──────────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb: FileFilterCallback) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Only image files are allowed'));
  },
});

const getIp = (req: Request): string =>
  (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0] || req.socket.remoteAddress || '';

// ── Helper: build visibility filter ──────────────────────────────────────────
// Returns a MongoDB filter that matches friends the current user can see
async function visibilityFilter(userId: string | undefined, isAdmin: boolean): Promise<Record<string, unknown>> {
  if (isAdmin) return {}; // admins see everything

  // Find groups the user belongs to
  const groups = await Group.find({ members: userId }).select('_id');
  const groupIds = groups.map(g => g._id);

  return {
    $or: [
      { owner:            userId   },
      { sharedWith:       userId   },
      { sharedWithGroups: { $in: groupIds } },
    ],
  };
}

// ── Helper: check if user can modify a friend ─────────────────────────────────
function canModify(friend: IFriend, userId: string | undefined, isAdmin: boolean): boolean {
  return isAdmin || (!!userId && friend.owner.equals(userId));
}

// Parses JSON-string-encoded sharing arrays sent via multipart/form-data.
function parseSharingArrays(payload: Record<string, unknown>): void {
  if (payload.sharedWith && typeof payload.sharedWith === 'string') {
    try { payload.sharedWith = JSON.parse(payload.sharedWith); } catch { payload.sharedWith = []; }
  }
  if (payload.sharedWithGroups && typeof payload.sharedWithGroups === 'string') {
    try { payload.sharedWithGroups = JSON.parse(payload.sharedWithGroups); } catch { payload.sharedWithGroups = []; }
  }
}

// ── GET /api/friends ──────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, relationship, sort = 'name' } = req.query as {
      search?: string;
      relationship?: string;
      sort?: string;
    };
    const user    = await User.findById(req.userId);
    const isAdmin = user?.role === 'admin';

    const filter = await visibilityFilter(req.userId, isAdmin);
    if (search?.trim())                   filter.name         = { $regex: search.trim(), $options: 'i' };
    if (relationship && relationship !== 'all') filter.relationship = relationship;

    const allowedSorts: Record<string, string> = { name: 'name', birthday: 'birthday', createdAt: '-createdAt' };
    const sortField    = allowedSorts[sort] || 'name';

    const docs    = await Friend.find(filter).sort(sortField).populate('owner', 'username displayName');
    const friends = docs.map(d => d.toJSON());
    res.json({ success: true, count: friends.length, data: friends });
  } catch (err) { next(err); }
});

// ── GET /api/friends/upcoming ─────────────────────────────────────────────────
router.get('/upcoming', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days    = parseInt(req.query.days as string, 10) || 30;
    const user    = await User.findById(req.userId);
    const isAdmin = user?.role === 'admin';
    const filter  = await visibilityFilter(req.userId, isAdmin);

    const docs    = await Friend.find(filter);
    const all     = docs.map(d => d.toJSON() as unknown as { daysUntilBirthday: number | null; [key: string]: unknown });
    const upcoming = all
      .filter(f => f.daysUntilBirthday !== null && f.daysUntilBirthday <= days)
      .sort((a, b) => (a.daysUntilBirthday as number) - (b.daysUntilBirthday as number));

    res.json({ success: true, count: upcoming.length, data: upcoming });
  } catch (err) { next(err); }
});

// ── GET /api/friends/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user    = await User.findById(req.userId);
    const isAdmin = user?.role === 'admin';
    const filter  = await visibilityFilter(req.userId, isAdmin);
    filter._id    = req.params.id;

    const doc = await Friend.findOne(filter).populate('owner', 'username displayName');
    if (!doc) return res.status(404).json({ success: false, message: 'Friend not found' });
    res.json({ success: true, data: doc.toJSON() });
  } catch (err) { next(err); }
});

// ── POST /api/friends ─────────────────────────────────────────────────────────
router.post('/', upload.single('photo'), validateFriend, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload: Record<string, unknown> = { ...req.body, owner: req.userId };
    if (req.file) payload.photo = `/uploads/${req.file.filename}`;

    // Parse sharing arrays if sent as JSON strings
    parseSharingArrays(payload);

    const created = await Friend.create(payload);
    const doc     = await Friend.findById(created._id).populate('owner', 'username displayName');

    await ActivityLog.log({
      user:        req.userId,
      username:    (await User.findById(req.userId))?.username || 'unknown',
      action:      'friend_created',
      description: `Friend "${created.name}" added`,
      meta:        { friendId: created._id, friendName: created.name },
      ip:          getIp(req),
    });

    res.status(201).json({ success: true, data: doc?.toJSON() });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    next(err);
  }
});

// ── PUT /api/friends/:id ──────────────────────────────────────────────────────
router.put('/:id', upload.single('photo'), validateFriend, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user     = await User.findById(req.userId);
    const isAdmin  = user?.role === 'admin';
    const existing = await Friend.findById(req.params.id);

    if (!existing)
      return res.status(404).json({ success: false, message: 'Friend not found' });
    if (!canModify(existing, req.userId, isAdmin))
      return res.status(403).json({ success: false, message: 'You do not have permission to edit this friend' });

    const payload: Record<string, unknown> = { ...req.body };
    if (req.file) {
      if (existing.photo?.startsWith('/uploads/'))
        fs.unlink(path.join(__dirname, '..', existing.photo), () => {});
      payload.photo = `/uploads/${req.file.filename}`;
    }

    parseSharingArrays(payload);

    const updated = await Friend.findByIdAndUpdate(
      req.params.id, payload, { new: true, runValidators: true }
    ).populate('owner', 'username displayName');

    if (!updated) return res.status(404).json({ success: false, message: 'Friend not found' });

    await ActivityLog.log({
      user:        req.userId,
      username:    user?.username || 'unknown',
      action:      'friend_updated',
      description: `Friend "${updated.name}" updated`,
      meta:        { friendId: updated._id, friendName: updated.name },
      ip:          getIp(req),
    });

    res.json({ success: true, data: updated.toJSON() });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    next(err);
  }
});

// ── DELETE /api/friends/:id ───────────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user    = await User.findById(req.userId);
    const isAdmin = user?.role === 'admin';
    const friend  = await Friend.findById(req.params.id);

    if (!friend)
      return res.status(404).json({ success: false, message: 'Friend not found' });
    if (!canModify(friend, req.userId, isAdmin))
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this friend' });

    if (friend.photo?.startsWith('/uploads/'))
      fs.unlink(path.join(__dirname, '..', friend.photo), () => {});

    const friendName = friend.name;
    await friend.deleteOne();

    await ActivityLog.log({
      user:        req.userId,
      username:    user?.username || 'unknown',
      action:      'friend_deleted',
      description: `Friend "${friendName}" deleted`,
      meta:        { friendId: req.params.id, friendName },
      ip:          getIp(req),
    });

    res.json({ success: true, message: 'Friend deleted successfully' });
  } catch (err) { next(err); }
});

export default router;
