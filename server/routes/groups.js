/**
 * server/routes/groups.js
 * CRUD for sharing groups.
 *
 * GET    /api/groups        → list groups the current user belongs to
 * POST   /api/groups        → create a group
 * PUT    /api/groups/:id    → update group name/description/members
 * DELETE /api/groups/:id    → delete group (owner only)
 */

const express     = require('express');
const router      = express.Router();
const Group       = require('../models/Group');
const User        = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

const getIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '';

// ── GET /api/groups ───────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    // Return groups where the user is owner or member
    const groups = await Group.find({
      $or: [{ owner: req.userId }, { members: req.userId }],
    })
      .populate('owner',   'username displayName')
      .populate('members', 'username displayName')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: groups.length, data: groups });
  } catch (err) { next(err); }
});

// ── GET /api/groups/all ───────────────────────────────────────────────────────
// Admin only — all groups
router.get('/all', async (req, res, next) => {
  try {
    const groups = await Group.find()
      .populate('owner',   'username displayName')
      .populate('members', 'username displayName')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: groups.length, data: groups });
  } catch (err) { next(err); }
});

// ── POST /api/groups ──────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { name, description, memberUsernames = [] } = req.body;

    if (!name || !name.trim())
      return res.status(422).json({ success: false, message: 'Group name is required' });

    // Resolve usernames to IDs
    const memberUsers = await User.find({
      username: { $in: memberUsernames.map(u => u.toLowerCase().trim()) },
    });
    const memberIds = memberUsers.map(u => u._id);

    // Always include the creator as a member
    if (!memberIds.some(id => id.equals(req.userId))) {
      memberIds.push(req.userId);
    }

    const group = await Group.create({
      name:        name.trim(),
      description: description?.trim() || '',
      owner:       req.userId,
      members:     memberIds,
    });

    await group.populate(['owner', 'members']);

    await ActivityLog.log({
      user:        req.userId,
      username:    req.user?.username || 'unknown',
      action:      'group_created',
      description: `Group "${group.name}" created`,
      meta:        { groupId: group._id, groupName: group.name },
      ip:          getIp(req),
    });

    res.status(201).json({ success: true, data: group });
  } catch (err) { next(err); }
});

// ── PUT /api/groups/:id ───────────────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    // Only owner or admin can edit
    const isOwner = group.owner.equals(req.userId);
    const isAdmin = req.user?.role === 'admin';
    if (!isOwner && !isAdmin)
      return res.status(403).json({ success: false, message: 'Only the group owner can edit this group' });

    const { name, description, memberUsernames = [] } = req.body;

    if (name)        group.name        = name.trim();
    if (description !== undefined) group.description = description.trim();

    if (memberUsernames.length > 0) {
      const memberUsers = await User.find({
        username: { $in: memberUsernames.map(u => u.toLowerCase().trim()) },
      });
      const memberIds = memberUsers.map(u => u._id);
      // Always keep the owner as a member
      if (!memberIds.some(id => id.equals(group.owner))) memberIds.push(group.owner);
      group.members = memberIds;
    }

    await group.save();
    await group.populate([
      { path: 'owner',   select: 'username displayName' },
      { path: 'members', select: 'username displayName' },
    ]);

    await ActivityLog.log({
      user:        req.userId,
      username:    req.user?.username || 'unknown',
      action:      'group_updated',
      description: `Group "${group.name}" updated`,
      meta:        { groupId: group._id },
      ip:          getIp(req),
    });

    res.json({ success: true, data: group });
  } catch (err) { next(err); }
});

// ── DELETE /api/groups/:id ────────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const isOwner = group.owner.equals(req.userId);
    const isAdmin = req.user?.role === 'admin';
    if (!isOwner && !isAdmin)
      return res.status(403).json({ success: false, message: 'Only the group owner can delete this group' });

    const groupName = group.name;
    await group.deleteOne();

    await ActivityLog.log({
      user:        req.userId,
      username:    req.user?.username || 'unknown',
      action:      'group_deleted',
      description: `Group "${groupName}" deleted`,
      meta:        { groupId: req.params.id, groupName },
      ip:          getIp(req),
    });

    res.json({ success: true, message: `Group "${groupName}" deleted` });
  } catch (err) { next(err); }
});

module.exports = router;