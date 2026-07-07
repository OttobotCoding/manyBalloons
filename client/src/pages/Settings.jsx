/**
 * client/src/pages/Settings.jsx
 * Lets the user configure email notification preferences and SMTP credentials.
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getSettings, updateSettings, sendTestEmail } from '../services/api';
import Spinner from '../components/Spinner';
import styles from './Settings.module.css';

const EMPTY = {
  notificationEmail:    '',
  notifyDaysBefore:     1,
  notificationsEnabled: false,
  smtpHost:             'smtp.gmail.com',
  smtpPort:             587,
  smtpUser:             'msmigiel22@gmail.com',
  smtpPass:             'zeolnxsbxpduffiy',
  smtpFrom:             'noreply@birthdaytracker.com',
};

export default function Settings() {
  const qc = useQueryClient();

  const [form, setForm] = useState(EMPTY);
  const [showPass, setShowPass] = useState(false);

  const { data: res, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  // Populate form when data loads
  useEffect(() => {
    if (res?.data) {
      setForm(f => ({ ...f, ...res.data }));
    }
  }, [res]);

  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      toast.success('Settings saved');
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: testEmail, isPending: isTesting } = useMutation({
    mutationFn: sendTestEmail,
    onSuccess: () => toast.success('Test email sent — check your inbox'),
    onError:   (err) => toast.error(err.message),
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.notificationsEnabled && !form.notificationEmail) {
      toast.error('Please enter a notification email address');
      return;
    }
    save(form);
  };

  if (isLoading) return <Spinner />;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>

        {/* ── Notification preferences ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📧 Email Notifications</h2>
          <p className={styles.sectionDesc}>
            Receive an email reminder before your friends' birthdays.
          </p>

          {/* Master toggle */}
          <div className={styles.toggleRow}>
            <div>
              <p className={styles.toggleLabel}>Enable email notifications</p>
              <p className={styles.toggleHint}>
                An email will be sent each morning at 8:00 AM when a birthday is approaching.
              </p>
            </div>
            <label className={styles.switch} aria-label="Enable notifications">
              <input
                type="checkbox"
                name="notificationsEnabled"
                checked={form.notificationsEnabled}
                onChange={handleChange}
              />
              <span className={styles.slider} />
            </label>
          </div>

          <div className={styles.fields}>
            {/* Recipient email */}
            <div className={styles.field}>
              <label htmlFor="notificationEmail">Send notifications to</label>
              <input
                id="notificationEmail"
                name="notificationEmail"
                type="email"
                value={form.notificationEmail}
                onChange={handleChange}
                placeholder="you@example.com"
              />
            </div>

            {/* Days before */}
            <div className={styles.field}>
              <label htmlFor="notifyDaysBefore">Days before birthday to notify</label>
              <select
                id="notifyDaysBefore"
                name="notifyDaysBefore"
                value={form.notifyDaysBefore}
                onChange={handleChange}
              >
                {[1,2,3,4,5,6,7].map(d => (
                  <option key={d} value={d}>
                    {d === 1 ? '1 day before (day of is included)' : `${d} days before`}
                  </option>
                ))}
              </select>
              <span className={styles.hint}>
                You'll get one email per day for each friend whose birthday falls within this window.
              </span>
            </div>
          </div>
        </section>

        {/* ── SMTP configuration ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>⚙️ SMTP Configuration</h2>
          <p className={styles.sectionDesc}>
            Enter your outgoing mail server details. For Gmail, use an{' '}
            <a
              href="https://support.google.com/accounts/answer/185833"
              target="_blank"
              rel="noreferrer"
            >
              App Password
            </a>{' '}
            rather than your regular password.
          </p>

          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="smtpHost">SMTP host</label>
              <input
                id="smtpHost"
                name="smtpHost"
                type="text"
                value={form.smtpHost}
                onChange={handleChange}
                placeholder="smtp.gmail.com"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="smtpPort">SMTP port</label>
              <select
                id="smtpPort"
                name="smtpPort"
                value={form.smtpPort}
                onChange={handleChange}
              >
                <option value={587}>587 (STARTTLS — recommended)</option>
                <option value={465}>465 (SSL)</option>
                <option value={25}>25 (plain — not recommended)</option>
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="smtpUser">SMTP username / email</label>
              <input
                id="smtpUser"
                name="smtpUser"
                type="text"
                value={form.smtpUser}
                onChange={handleChange}
                placeholder="you@gmail.com"
                autoComplete="username"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="smtpPass">SMTP password / app password</label>
              <div className={styles.passRow}>
                <input
                  id="smtpPass"
                  name="smtpPass"
                  type={showPass ? 'text' : 'password'}
                  value={form.smtpPass}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.showPassBtn}
                  onClick={() => setShowPass(s => !s)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label htmlFor="smtpFrom">From name / address (optional)</label>
              <input
                id="smtpFrom"
                name="smtpFrom"
                type="text"
                value={form.smtpFrom}
                onChange={handleChange}
                placeholder="BirthdayTracker <you@gmail.com>"
              />
              <span className={styles.hint}>
                Defaults to your SMTP username if left blank.
              </span>
            </div>
          </div>
        </section>

        {/* ── Actions ── */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.testBtn}
            disabled={isTesting || isSaving}
            onClick={() => testEmail()}
          >
            {isTesting ? 'Sending…' : '📨 Send test email'}
          </button>
          <button
            type="submit"
            className={styles.saveBtn}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  );
}