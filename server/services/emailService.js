/**
 * server/services/emailService.js
 * Nodemailer-based email sending for birthday notifications.
 * Called by the scheduler and the test endpoint.
 */

const nodemailer = require('nodemailer');

/**
 * Build a Nodemailer transporter from the saved settings document.
 */
function createTransporter(settings) {
  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465, // true for 465, STARTTLS for 587
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass,
    },
  });
}

/**
 * Format a birthday date for display using UTC values.
 */
function formatBirthday(birthday) {
  const d = new Date(birthday);
  return d.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}

/**
 * Build the HTML email body for one or more upcoming birthdays.
 */
function buildEmailHtml(friends, daysBefore) {
  const rows = friends.map(f => {
    const turnsAge = (f.age ?? 0) + 1;
    const countdown =
      f.daysUntilBirthday === 0 ? '🎉 Today!'
      : f.daysUntilBirthday === 1 ? '🎂 Tomorrow!'
      : `📅 In ${f.daysUntilBirthday} days`;

    return `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #eee;">
          <strong style="font-size:16px;color:#1a1a2e;">${f.name}</strong><br/>
          <span style="color:#666;font-size:14px;">
            🗓 ${formatBirthday(f.birthday)} · Turns ${turnsAge}
          </span>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #eee;text-align:right;">
          <span style="
            background:${f.daysUntilBirthday === 0 ? '#6c47ff' : '#fff3e0'};
            color:${f.daysUntilBirthday === 0 ? '#fff' : '#e65100'};
            padding:4px 12px;border-radius:999px;font-size:13px;font-weight:600;
          ">${countdown}</span>
        </td>
      </tr>
    `;
  }).join('');

  const heading = friends.length === 1
    ? `You have 1 upcoming birthday!`
    : `You have ${friends.length} upcoming birthdays!`;

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"/></head>
    <body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <div style="background:linear-gradient(90deg,#6c47ff,#a37bff);padding:24px 32px;">
          <h1 style="margin:0;color:#fff;font-size:22px;">🎂 BirthdayTracker</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
            Your birthday reminder for today
          </p>
        </div>

        <!-- Body -->
        <div style="padding:24px 32px;">
          <p style="margin:0 0 20px;font-size:16px;color:#1a1a2e;font-weight:600;">
            ${heading}
          </p>
          <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden;">
            ${rows}
          </table>
          <p style="margin:20px 0 0;font-size:13px;color:#aaa;text-align:center;">
            Sent by BirthdayTracker · Notifications are set to ${daysBefore} day(s) before each birthday
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send birthday notification emails for the given list of friends.
 * @param {object} settings  — the Settings mongoose document
 * @param {Array}  friends   — friend objects with virtuals (age, daysUntilBirthday)
 */
async function sendBirthdayEmail(settings, friends) {
  if (!friends.length) return;

  const transporter = createTransporter(settings);
  const from = settings.smtpFrom || settings.smtpUser;

  const subject = friends.length === 1
    ? `🎂 Birthday reminder: ${friends[0].name}`
    : `🎂 ${friends.length} upcoming birthdays`;

  await transporter.sendMail({
    from: `"BirthdayTracker" <${from}>`,
    to: settings.notificationEmail,
    subject,
    html: buildEmailHtml(friends, settings.notifyDaysBefore),
  });

  console.log(`✉️  Birthday email sent to ${settings.notificationEmail} for: ${friends.map(f => f.name).join(', ')}`);
}

/**
 * Send a test email to confirm SMTP settings are working.
 */
async function sendTestEmail(settings) {
  const transporter = createTransporter(settings);
  const from = settings.smtpFrom || settings.smtpUser;

  await transporter.sendMail({
    from: `"BirthdayTracker" <${from}>`,
    to: settings.notificationEmail,
    subject: '✅ BirthdayTracker — test email',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:32px auto;padding:24px;background:#fff;border-radius:12px;border:1px solid #eee;">
        <h2 style="color:#6c47ff;">🎂 BirthdayTracker</h2>
        <p>Your email notifications are configured correctly!</p>
        <p style="color:#666;font-size:14px;">
          You will receive reminders ${settings.notifyDaysBefore} day(s) before each birthday.
        </p>
      </div>
    `,
  });

  console.log(`✉️  Test email sent to ${settings.notificationEmail}`);
}

module.exports = { sendBirthdayEmail, sendTestEmail };