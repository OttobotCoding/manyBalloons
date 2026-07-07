/**
 * server/routes/friends.js
 * RESTful CRUD routes for the /api/friends resource.
 * Uses .toJSON() instead of .lean() so Mongoose virtuals (age,
 * daysUntilBirthday, nextBirthday) are alwways included in responses.
 *
 * GET    /api/friends          → list all (supports ?search=, ?relationship=)
 * GET    /api/friends/upcoming → friends with birthdays in the next 30 days
 * GET    /api/friends/:id      → get one
 * POST   /api/friends          → create
 * PUT    /api/friends/:id      → full update
 * DELETE /api/friends/:id      → delete
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Friend = require('../models/Friend');
const { validateFriend } = require('../middleware/validation');

// ── Multer photo upload setup ─────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${path.extname(file.originalname)}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 4 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
        }
    },
});

// ── GET /api/friends ──────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
    try {
        const { search, relationship, sort = 'name' } = req.query;

        const filter = {};
        if (search && search.trim()) {
            filter.name = { $regex: search.trim(), $options: 'i' };
        }
        if (relationship && relationship !== 'all') {
            filter.relationship = relationship;
        }

        const allowedSorts = { name: 'name', birthday: 'birthday', createdAt: '-createdAt' };
        const sortField = allowedSorts[sort] || 'name';

        // Use toJSON() so virtuals (age, daysUntilBirthday, nextBirthday) are included
        const docs = await Friend.find(filter).sort(sortField);
        const friends = docs.map(doc => doc.toJSON());

        res.json({ success: true, count: friends.length, data: friends });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/friends/upcoming ─────────────────────────────────────────────────
router.get('/upcoming', async (req, res, next) => {
    try {
        const days = parseInt(req.query.days, 10) || 30;

        const docs = await Friend.find();
        const all = docs.map(doc => doc.toJSON());

        const upcoming = all
            .filter(f => f.daysUntilBirthday !== null && f.daysUntilBirthday <= days)
            .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);

        res.json({ success: true, count: upcoming.length, data: upcoming });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/friends/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
    try {
        const doc = await Friend.findById(req.params.id);
        if (!doc) return res.status(404).json({ success: false, message: 'Friend not found' });
        res.json({ success: true, data: doc.toJSON() });
    } catch (err) {
        next(err);
    }
});

// ── POST /api/friends ─────────────────────────────────────────────────────────
router.post('/', upload.single('photo'), validateFriend, async (req, res, next) => {
    try {
        const payload = { ...req.body };
        if (req.file) payload.photo = `/uploads/${req.file.filename}`;

        const created = await Friend.create(payload);
        const doc = await Friend.findById(created._id);
        res.status(201).json({ success: true, data: doc.toJSON() });
    } catch (err) {
        if (req.file) fs.unlink(req.file.path, () => { });
        next(err);
    }
});

// ── PUT /api/friends/:id ──────────────────────────────────────────────────────
router.put('/:id', upload.single('photo'), validateFriend, async (req, res, next) => {
    try {
        const existing = await Friend.findById(req.params.id);
        if (!existing) return res.status(404).json({ success: false, message: 'Friend not found' });

        const payload = { ...req.body };

        if (req.file) {
            if (existing.photo && existing.photo.startsWith('/uploads/')) {
                fs.unlink(path.join(__dirname, '..', existing.photo), () => { });
            }
            payload.photo = `/uploads/${req.file.filename}`;
        }

        const updatedDoc = await Friend.findByIdAndUpdate(
            req.params.id,
            payload,
            { new: true, runValidators: true }
        );

        res.json({ success: true, data: updatedDoc.toJSON() });
    } catch (err) {
        if (req.file) fs.unlink(req.file.path, () => { });
        next(err);
    }
});

// ── DELETE /api/friends/:id ───────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
    try {
        const friend = await Friend.findById(req.params.id);
        if (!friend) return res.status(404).json({ success: false, message: 'Friend not found' });

        if (friend.photo && friend.photo.startsWith('/uploads/')) {
            fs.unlink(path.join(__dirname, '..', friend.photo), () => { });
        }

        await friend.deleteOne();
        res.json({ success: true, message: 'Friend deleted successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;