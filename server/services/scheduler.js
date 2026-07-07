/**
 * server/services/scheduler.js
 * Uses node-cron to run a birthday check every morning at 8:00 AM server time.
 * Reads settings from MongoDB so changes take effect without a restart.
 */

const cron = require('node-cron');
const Friend = require('../models/Friend');
const Settings = require('../models/Settings');
const { sendBirthdayEmail } = require('./emailService');

/**
 * Core check: load settings + friends, filter by threshold, send email.
 */
async function checkAndNotify() {
  console.log('⏰  Running birthday notification check...');

  try {
    const settings = await Settings.findById('app');

    // Bail out if notifications are disabled or not configured
    if (!settings || !settings.notificationsEnabled) {
      console.log('   Notifications disabled — skipping.');
      return;
    }
    if (!settings.notificationEmail) {
      console.log('   No notification email set — skipping.');
      return;
    }
    if (!settings.smtpUser || !settings.smtpPass) {
      console.log('   SMTP credentials missing — skipping.');
      return;
    }

    const days = settings.notifyDaysBefore ?? 1;

    // Fetch all friends and compute virtuals
    const docs = await Friend.find();
    const friends = docs.map(d => d.toJSON());

    // Filter to friends whose birthday falls exactly on the threshold day
    // e.g. if notifyDaysBefore = 1, only send when daysUntilBirthday === 1 or 0
    const toNotify = friends.filter(f =>
      f.daysUntilBirthday !== null && f.daysUntilBirthday <= days
    );

    if (!toNotify.length) {
      console.log(`   No birthdays within ${days} day(s) — no email sent.`);
      return;
    }

    await sendBirthdayEmail(settings, toNotify);
  } catch (err) {
    console.error('❌  Birthday notification error:', err.message);
  }
}

/**
 * Start the cron job. Called once from index.js after DB connects.
 * Runs at 08:00 every morning. Adjust the cron expression to change the time:
 *   '0 8 * * *'  = 8:00 AM daily
 *   '0 9 * * *'  = 9:00 AM daily
 *   '* * * * *'  = every minute (useful for testing)
 */
function startScheduler() {
  cron.schedule('0 8 * * *', checkAndNotify, {
    timezone: process.env.TZ || 'America/New_York',
  });
  console.log('⏰  Birthday notification scheduler started (runs daily at 8:00 AM)');
}

// Export checkAndNotify so the test endpoint can trigger it manually
module.exports = { startScheduler, checkAndNotify };