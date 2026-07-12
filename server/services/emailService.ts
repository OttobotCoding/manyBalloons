/**
 * server/services/emailService.ts
 * Nodemailer-based email sending for birthday and account notifications.
 * Called by the scheduler, the test endpoint, and the auth routes.
 */

import nodemailer, { Transporter } from 'nodemailer';
import { ISettings } from '../models/Settings';

// A friend record after `.toJSON()` — includes the computed virtuals.
export interface FriendNotification {
  _id: unknown;
  name: string;
  birthday: Date;
  age: number | null;
  daysUntilBirthday: number | null;
  [key: string]: unknown;
}

// The subset of a user record needed to notify them about their account.
export interface PendingUserNotification {
  username: string;
  email: string;
  displayName?: string;
}

// The outcome of an admin's review of a pending account.
export type AccountDecision = 'approved' | 'rejected';

/**
 * Build a Nodemailer transporter from the saved settings document.
 */
function createTransporter(settings: ISettings): Transporter {
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
function formatBirthday(birthday: Date): string {
  const d = new Date(birthday);
  return d.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}

/**
 * Build the HTML email body for one or more upcoming birthdays.
 */
function buildEmailHtml(friends: FriendNotification[], daysBefore: number): string {
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
          <h1 style="margin:0;color:#fff;font-size:22px;">🎈 Many Balloons</h1>
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
            Sent by Many Ballons · Notifications are set to ${daysBefore} day(s) before each birthday
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send birthday notification emails for the given list of friends.
 */
export async function sendBirthdayEmail(settings: ISettings, friends: FriendNotification[]): Promise<void> {
  if (!friends.length) return;

  const transporter = createTransporter(settings);
  const from = settings.smtpFrom || settings.smtpUser;

  const subject = friends.length === 1
    ? `🎂 Birthday reminder: ${friends[0].name}`
    : `🎂 ${friends.length} upcoming birthdays`;

  await transporter.sendMail({
    from: `"Many Balloons" <${from}>`,
    to: settings.notificationEmail,
    subject,
    html: buildEmailHtml(friends, settings.notifyDaysBefore),
  });

  console.log(`✉️  Birthday email sent to ${settings.notificationEmail} for: ${friends.map(f => f.name).join(', ')}`);
}

/**
 * Build the HTML email body sent to a newly self-registered user, letting
 * them know their account is awaiting admin approval.
 */
function buildPendingApprovalHtml(user: PendingUserNotification): string {
  const name = user.displayName || user.username;

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"/></head>
    <body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <div style="background:linear-gradient(90deg,#6c47ff,#a37bff);padding:24px 32px;">
          <h1 style="margin:0;color:#fff;font-size:22px;">🎈 Many Balloons</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
            Account registration received
          </p>
        </div>

        <!-- Body -->
        <div style="padding:24px 32px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1a1a2e;">
            Hi ${name},
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.5;">
            Thanks for signing up for <strong>Many Balloons</strong>. Your account
            (<strong>${user.username}</strong>) has been created and is currently
          </p>
          <p style="margin:0 0 20px;text-align:center;">
            <span style="
              display:inline-block;background:#fff3e0;color:#e65100;
              padding:6px 16px;border-radius:999px;font-size:14px;font-weight:600;
            ">🕒 Awaiting admin approval</span>
          </p>
          <p style="margin:0;font-size:15px;color:#333;line-height:1.5;">
            You won't be able to sign in until an administrator reviews and approves
            your account. No action is needed from you — we'll send a follow-up
            once a decision has been made.
          </p>
          <p style="margin:20px 0 0;font-size:13px;color:#aaa;text-align:center;">
            Sent by Many Balloons · You're receiving this because you registered an account
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Notify a newly self-registered user that their account is pending
 * admin approval. Called from POST /api/auth/register right after the
 * user document is created with status 'pending'.
 */
export async function sendPendingApprovalEmail(settings: ISettings, user: PendingUserNotification): Promise<void> {
  if (!user.email) return;

  const transporter = createTransporter(settings);
  const from = settings.smtpFrom || settings.smtpUser;

  await transporter.sendMail({
    from: `"Many Balloons" <${from}>`,
    to: user.email,
    subject: '🎈 Your Many Balloons account is pending approval',
    html: buildPendingApprovalHtml(user),
  });

  console.log(`✉️  Pending-approval email sent to ${user.email} for "${user.username}"`);
}

/**
 * Build the HTML email body that alerts admins to a newly self-registered
 * account waiting on their review.
 */
function buildAdminSignupAlertHtml(newUser: PendingUserNotification): string {
  const name = newUser.displayName || newUser.username;

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"/></head>
    <body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <div style="background:linear-gradient(90deg,#6c47ff,#a37bff);padding:24px 32px;">
          <h1 style="margin:0;color:#fff;font-size:22px;">🎈 Many Balloons</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
            New account awaiting your review
          </p>
        </div>

        <!-- Body -->
        <div style="padding:24px 32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.5;">
            Someone just requested an account on your Many Balloons instance:
          </p>
          <table style="width:100%;border-collapse:collapse;margin:0 0 20px;border:1px solid #eee;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:10px 16px;background:#f8f9fa;color:#666;font-size:13px;width:120px;">Username</td>
              <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;font-weight:600;">${newUser.username}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;background:#f8f9fa;color:#666;font-size:13px;">Display name</td>
              <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;">${name}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;background:#f8f9fa;color:#666;font-size:13px;">Email</td>
              <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;">${newUser.email}</td>
            </tr>
          </table>
          <p style="margin:0;font-size:15px;color:#333;line-height:1.5;">
            Log in and open <strong>Admin → Users</strong> to approve or reject this
            request — they can't sign in until you do.
          </p>
          <p style="margin:20px 0 0;font-size:13px;color:#aaa;text-align:center;">
            Sent by Many Balloons · You're receiving this because your account has admin access
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Notify all admins with an email on file that a new self-registered
 * account is waiting for review. Called from POST /api/auth/register
 * alongside sendPendingApprovalEmail — one email to the new user, one to
 * the admins. Failure here never blocks registration.
 */
export async function sendAdminSignupAlert(settings: ISettings, adminEmails: string[], newUser: PendingUserNotification): Promise<void> {
  if (!adminEmails.length) return;

  const transporter = createTransporter(settings);
  const from = settings.smtpFrom || settings.smtpUser;

  await transporter.sendMail({
    from: `"Many Balloons" <${from}>`,
    to: adminEmails.join(', '),
    subject: `🎈 New account pending approval: ${newUser.username}`,
    html: buildAdminSignupAlertHtml(newUser),
  });

  console.log(`✉️  Admin signup alert sent to ${adminEmails.join(', ')} for new user "${newUser.username}"`);
}

/**
 * Build the HTML email body sent to a user once an admin has approved or
 * rejected their account request.
 */
function buildAccountDecisionHtml(user: PendingUserNotification, decision: AccountDecision): string {
  const name = user.displayName || user.username;
  const isApproved = decision === 'approved';

  const badge = isApproved
    ? `<span style="display:inline-block;background:#e8f8ef;color:#1e7e45;padding:6px 16px;border-radius:999px;font-size:14px;font-weight:600;">✅ Account approved</span>`
    : `<span style="display:inline-block;background:#fdecea;color:#c0392b;padding:6px 16px;border-radius:999px;font-size:14px;font-weight:600;">⛔ Account not approved</span>`;

  const message = isApproved
    ? `Good news — your account (<strong>${user.username}</strong>) has been approved. You can now sign in with the username and password you registered with.`
    : `Your account request (<strong>${user.username}</strong>) was not approved. Contact an administrator if you believe this was a mistake or would like more details.`;

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"/></head>
    <body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <div style="background:linear-gradient(90deg,#6c47ff,#a37bff);padding:24px 32px;">
          <h1 style="margin:0;color:#fff;font-size:22px;">🎈 Many Balloons</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
            An update on your account request
          </p>
        </div>

        <!-- Body -->
        <div style="padding:24px 32px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1a1a2e;">
            Hi ${name},
          </p>
          <p style="margin:0 0 20px;text-align:center;">
            ${badge}
          </p>
          <p style="margin:0;font-size:15px;color:#333;line-height:1.5;">
            ${message}
          </p>
          <p style="margin:20px 0 0;font-size:13px;color:#aaa;text-align:center;">
            Sent by Many Balloons · You're receiving this because you registered an account
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Notify a user that an admin has approved or rejected their account.
 * Called from PUT /api/admin/users/:id/status right after the status
 * change is saved. Failure here never blocks the status change itself.
 */
export async function sendAccountDecisionEmail(settings: ISettings, user: PendingUserNotification, decision: AccountDecision): Promise<void> {
  if (!user.email) return;

  const transporter = createTransporter(settings);
  const from = settings.smtpFrom || settings.smtpUser;

  const subject = decision === 'approved'
    ? '🎈 Your Many Balloons account has been approved'
    : 'Your Many Balloons account request was not approved';

  await transporter.sendMail({
    from: `"Many Balloons" <${from}>`,
    to: user.email,
    subject,
    html: buildAccountDecisionHtml(user, decision),
  });

  console.log(`✉️  Account ${decision} email sent to ${user.email} for "${user.username}"`);
}

/**
 * Send a test email to confirm SMTP settings are working.
 */
export async function sendTestEmail(settings: ISettings): Promise<void> {
  const transporter = createTransporter(settings);
  const from = settings.smtpFrom || settings.smtpUser;

  await transporter.sendMail({
    from: `"Many Balloons" <${from}>`,
    to: settings.notificationEmail,
    subject: '✅ BirthdayTracker — test email',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:32px auto;padding:24px;background:#fff;border-radius:12px;border:1px solid #eee;">
        <h2 style="color:#6c47ff;">🎈 Many Balloons</h2>
        <p>Your email notifications are configured correctly!</p>
        <p style="color:#666;font-size:14px;">
          You will receive reminders ${settings.notifyDaysBefore} day(s) before each birthday.
        </p>
      </div>
    `,
  });

  console.log(`✉️  Test email sent to ${settings.notificationEmail}`);
}