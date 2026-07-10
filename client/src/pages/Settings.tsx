/**
 * client/src/pages/Settings.tsx
 * Email notification preferences, SMTP config, and change password.
 */

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getSettings, updateSettings, sendTestEmail, changePassword } from '../services/api';
import Spinner from '../components/Spinner';
import styles from './Settings.module.css';
import { Settings as SettingsType } from '../types';

const EMPTY_SETTINGS: SettingsType = {
  _id:                  'app',
  notificationEmail:    '',
  notifyDaysBefore:     1,
  notificationsEnabled: false,
  smtpHost:             'smtp.gmail.com',
  smtpPort:             587,
  smtpUser:             '',
  smtpPass:             '',
  smtpFrom:             '',
  createdAt:            '',
  updatedAt:            '',
};

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const EMPTY_PASSWORD: PasswordForm = {
  currentPassword: '',
  newPassword:     '',
  confirmPassword: '',
};

type PasswordFormErrors = Partial<Record<keyof PasswordForm, string>>;

export default function Settings() {
  const qc = useQueryClient();
  const [form,      setForm]      = useState<SettingsType>(EMPTY_SETTINGS);
  const [passForm,  setPassForm]  = useState<PasswordForm>(EMPTY_PASSWORD);
  const [passErrors, setPassErrors] = useState<PasswordFormErrors>({});
  const [showPass,  setShowPass]  = useState(false);

  const { data: res, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn:  getSettings,
  });

  useEffect(() => {
    if (res?.data) setForm(f => ({ ...f, ...res.data }));
  }, [res]);

  // ── Save notification settings ────────────────────────────────────────────
  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      toast.success('Settings saved');
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Send test email ───────────────────────────────────────────────────────
  const { mutate: testEmail, isPending: isTesting } = useMutation({
    mutationFn: sendTestEmail,
    onSuccess: () => toast.success('Test email sent — check your inbox'),
    onError:   (err: Error) => toast.error(err.message),
  });

  // ── Change password ───────────────────────────────────────────────────────
  const { mutate: doChangePassword, isPending: isChangingPass } = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPassForm(EMPTY_PASSWORD);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handlePassChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPassForm(f => ({ ...f, [name]: value }));
    if (passErrors[name as keyof PasswordForm]) setPassErrors(er => ({ ...er, [name]: '' }));
  };

  const handleSettingsSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (form.notificationsEnabled && !form.notificationEmail) {
      toast.error('Please enter a notification email address');
      return;
    }
    save(form);
  };

  const handlePasswordSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs: PasswordFormErrors = {};
    if (!passForm.currentPassword) errs.currentPassword = 'Current password is required';
    if (!passForm.newPassword)     errs.newPassword     = 'New password is required';
    else if (passForm.newPassword.length < 8)
      errs.newPassword = 'Password must be at least 8 characters';
    if (passForm.newPassword !== passForm.confirmPassword)
      errs.confirmPassword = 'Passwords do not match';

    if (Object.keys(errs).length) { setPassErrors(errs); return; }
    doChangePassword(passForm);
  };

  if (isLoading) return <Spinner />;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>

      {/* ── Notification preferences ── */}
      <form onSubmit={handleSettingsSubmit} className={styles.form} noValidate>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📧 Email Notifications</h2>
          <p className={styles.sectionDesc}>
            Receive an email reminder before your friends' birthdays.
          </p>

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
            <div className={styles.field}>
              <label htmlFor="notificationEmail">Send notifications to</label>
              <input
                id="notificationEmail" name="notificationEmail" type="email"
                value={form.notificationEmail} onChange={handleChange}
                placeholder="you@example.com"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="notifyDaysBefore">Days before birthday to notify</label>
              <select
                id="notifyDaysBefore" name="notifyDaysBefore"
                value={form.notifyDaysBefore} onChange={handleChange}
              >
                {[1,2,3,4,5,6,7].map(d => (
                  <option key={d} value={d}>
                    {d === 1 ? '1 day before (day of is included)' : `${d} days before`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ── SMTP configuration ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>⚙️ SMTP Configuration</h2>
          <p className={styles.sectionDesc}>
            For Gmail use an{' '}
            <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noreferrer">
              App Password
            </a>{' '}
            rather than your regular password.
          </p>

          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="smtpHost">SMTP host</label>
              <input id="smtpHost" name="smtpHost" type="text"
                value={form.smtpHost} onChange={handleChange}
                placeholder="smtp.gmail.com" />
            </div>
            <div className={styles.field}>
              <label htmlFor="smtpPort">SMTP port</label>
              <select id="smtpPort" name="smtpPort" value={form.smtpPort} onChange={handleChange}>
                <option value={587}>587 (STARTTLS — recommended)</option>
                <option value={465}>465 (SSL)</option>
                <option value={25}>25 (plain)</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="smtpUser">SMTP username</label>
              <input id="smtpUser" name="smtpUser" type="text"
                value={form.smtpUser} onChange={handleChange}
                placeholder="you@gmail.com" autoComplete="username" />
            </div>
            <div className={styles.field}>
              <label htmlFor="smtpPass">SMTP password</label>
              <div className={styles.passRow}>
                <input id="smtpPass" name="smtpPass"
                  type={showPass ? 'text' : 'password'}
                  value={form.smtpPass} onChange={handleChange}
                  placeholder="••••••••" autoComplete="current-password" />
                <button type="button" className={styles.showPassBtn}
                  onClick={() => setShowPass(s => !s)}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label htmlFor="smtpFrom">From address (optional)</label>
              <input id="smtpFrom" name="smtpFrom" type="text"
                value={form.smtpFrom} onChange={handleChange}
                placeholder="BirthdayTracker <you@gmail.com>" />
              <span className={styles.hint}>Defaults to SMTP username if blank.</span>
            </div>
          </div>
        </section>

        <div className={styles.actions}>
          <button type="button" className={styles.testBtn}
            disabled={isTesting || isSaving} onClick={() => testEmail()}>
            {isTesting ? 'Sending…' : '📨 Send test email'}
          </button>
          <button type="submit" className={styles.saveBtn} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>

      {/* ── Change password ── */}
      <form onSubmit={handlePasswordSubmit} className={styles.form} noValidate>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>🔒 Change Password</h2>
          <p className={styles.sectionDesc}>
            Update your admin account password.
          </p>

          <div className={styles.fields}>
            <div className={styles.field}>
              <label htmlFor="currentPassword">Current password</label>
              <input
                id="currentPassword" name="currentPassword"
                type="password" value={passForm.currentPassword}
                onChange={handlePassChange} placeholder="••••••••"
                autoComplete="current-password"
                className={passErrors.currentPassword ? styles.inputError : ''}
              />
              {passErrors.currentPassword && (
                <span className={styles.error}>{passErrors.currentPassword}</span>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="newPassword">New password</label>
              <input
                id="newPassword" name="newPassword"
                type="password" value={passForm.newPassword}
                onChange={handlePassChange} placeholder="Min 8 characters"
                autoComplete="new-password"
                className={passErrors.newPassword ? styles.inputError : ''}
              />
              {passErrors.newPassword && (
                <span className={styles.error}>{passErrors.newPassword}</span>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="confirmPassword">Confirm new password</label>
              <input
                id="confirmPassword" name="confirmPassword"
                type="password" value={passForm.confirmPassword}
                onChange={handlePassChange} placeholder="••••••••"
                autoComplete="new-password"
                className={passErrors.confirmPassword ? styles.inputError : ''}
              />
              {passErrors.confirmPassword && (
                <span className={styles.error}>{passErrors.confirmPassword}</span>
              )}
            </div>
          </div>
        </section>

        <div className={styles.actions}>
          <button type="submit" className={styles.saveBtn} disabled={isChangingPass}>
            {isChangingPass ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  );
}
