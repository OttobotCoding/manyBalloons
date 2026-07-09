/**
 * server/routes/friends.js
 * CRUD routes with per-user ownership and group/user sharing.
 * A friend is visible to: its owner, users in sharedWith,
 * members of sharedWithGroups, and admins.
 */

const express      = require('express');
const router       = express.Router();
const multer       = require('multer');
const path         = require('path');
const fs           = require('fs');
const Friend       = require('../models/Friend');
const Group        = require('../models/Group');
const User         = require('../models/User');
const ActivityLog  = require('../models/ActivityLog');
const { validateFriend } = require('../middleware/validation');

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
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Only image files are allowed'));
  },
});

const getIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '';

// ── Helper: build visibility filter ──────────────────────────────────────────
// Returns a MongoDB filter that matches friends the current user can see
async function visibilityFilter(userId, isAdmin) {
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
function canModify(friend, userId, isAdmin) {
  return isAdmin || friend.owner.equals(userId);
}

// ── GET /api/friends ──────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { search, relationship, sort = 'name' } = req.query;
    const user    = await User.findById(req.userId);
    const isAdmin = user?.role === 'admin';

    const filter = await visibilityFilter(req.userId, isAdmin);
    if (search?.trim())                   filter.name         = { $regex: search.trim(), $options: 'i' };
    if (relationship && relationship !== 'all') filter.relationship = relationship;

    const allowedSorts = { name: 'name', birthday: 'birthday', createdAt: '-createdAt' };
    const sortField    = allowedSorts[sort] || 'name';

    const docs    = await Friend.find(filter).sort(sortField).populate('owner', 'username displayName');
    const friends = docs.map(d => d.toJSON());
    res.json({ success: true, count: friends.length, data: friends });
  } catch (err) { next(err); }
});

// ── GET /api/friends/upcoming ─────────────────────────────────────────────────
router.get('/upcoming', async (req, res, next) => {
  try {
    const days    = parseInt(req.query.days, 10) || 30;
    const user    = await User.findById(req.userId);
    const isAdmin = user?.role === 'admin';
    const filter  = await visibilityFilter(req.userId, isAdmin);

    const docs    = await Friend.find(filter);
    const all     = docs.map(d => d.toJSON());
    const upcoming = all
      .filter(f => f.daysUntilBirthday !== null && f.daysUntilBirthday <= days)
      .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);

    res.json({ success: true, count: upcoming.length, data: upcoming });
  } catch (err) { next(err); }
});

// ── GET /api/friends/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
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
router.post('/', upload.single('photo'), validateFriend, async (req, res, next) => {
  try {
    const payload = { ...req.body, owner: req.userId };
    if (req.file) payload.photo = `/uploads/${req.file.filename}`;

    // Parse sharing arrays if sent as JSON strings
    if (payload.sharedWith && typeof payload.sharedWith === 'string') {
      try { payload.sharedWith = JSON.parse(payload.sharedWith); } catch { payload.sharedWith = []; }
    }
    if (payload.sharedWithGroups && typeof payload.sharedWithGroups === 'string') {
      try { payload.sharedWithGroups = JSON.parse(payload.sharedWithGroups); } catch { payload.sharedWithGroups = []; }
    }

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

    res.status(201).json({ success: true, data: doc.toJSON() });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    next(err);
  }
});

// ── PUT /api/friends/:id ──────────────────────────────────────────────────────
router.put('/:id', upload.single('photo'), validateFriend, async (req, res, next) => {
  try {
    const user     = await User.findById(req.userId);
    const isAdmin  = user?.role === 'admin';
    const existing = await Friend.findById(req.params.id);

    if (!existing)
      return res.status(404).json({ success: false, message: 'Friend not found' });
    if (!canModify(existing, req.userId, isAdmin))
      return res.status(403).json({ success: false, message: 'You do not have permission to edit this friend' });

    const payload = { ...req.body };
    if (req.file) {
      if (existing.photo?.startsWith('/uploads/'))
        fs.unlink(path.join(__dirname, '..', existing.photo), () => {});
      payload.photo = `/uploads/${req.file.filename}`;
    }

    if (payload.sharedWith && typeof payload.sharedWith === 'string') {
      try { payload.sharedWith = JSON.parse(payload.sharedWith); } catch { payload.sharedWith = []; }
    }
    if (payload.sharedWithGroups && typeof payload.sharedWithGroups === 'string') {
      try { payload.sharedWithGroups = JSON.parse(payload.sharedWithGroups); } catch { payload.sharedWithGroups = []; }
    }

    const updated = await Friend.findByIdAndUpdate(
      req.params.id, payload, { new: true, runValidators: true }
    ).populate('owner', 'username displayName');

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
router.delete('/:id', async (req, res, next) => {
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

module.exports = router;