/**
 * server/routes/settings.js
 * GET  /api/settings        → fetch current settings
 * PUT  /api/settings        → update settings
 * POST /api/settings/test   → send a test email immediately
 */

const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { sendBirthdayEmail, sendTestEmail } = require('../services/emailService');

// ── GET /api/settings ─────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    // Return existing settings or a default document
    let settings = await Settings.findById('app');
    if (!settings) {
      settings = await Settings.create({ _id: 'app' });
    }
    // Never expose the SMTP password to the client
    const safe = settings.toObject();
    if (safe.smtpPass) safe.smtpPass = '••••••••';
    res.json({ success: true, data: safe });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/settings ─────────────────────────────────────────────────────────
router.put('/', async (req, res, next) => {
  try {
    const {
      notificationEmail,
      notifyDaysBefore,
      notificationsEnabled,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFrom,
    } = req.body;

    // Build update payload — only include smtpPass if it was actually changed
    const update = {
      notificationEmail:    notificationEmail    ?? '',
      notifyDaysBefore:     Number(notifyDaysBefore) || 1,
      notificationsEnabled: Boolean(notificationsEnabled),
      smtpHost:             smtpHost             ?? 'smtp.gmail.com',
      smtpPort:             Number(smtpPort)      || 587,
      smtpUser:             smtpUser              ?? '',
      smtpFrom:             smtpFrom              ?? '',
    };

    // Only update the password if the client sent a real value (not the masked placeholder)
    if (smtpPass && smtpPass !== '••••••••') {
      update.smtpPass = smtpPass;
    }

    const settings = await Settings.findByIdAndUpdate(
      'app',
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    );

    const safe = settings.toObject();
    if (safe.smtpPass) safe.smtpPass = '••••••••';
    res.json({ success: true, data: safe });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/settings/test ───────────────────────────────────────────────────
router.post('/test', async (req, res, next) => {
  try {
    const settings = await Settings.findById('app');
    if (!settings || !settings.notificationEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please save a notification email address first',
      });
    }
    if (!settings.smtpUser || !settings.smtpPass) {
      return res.status(400).json({
        success: false,
        message: 'SMTP credentials are not configured',
      });
    }

    await sendTestEmail(settings);
    res.json({ success: true, message: 'Test email sent successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;