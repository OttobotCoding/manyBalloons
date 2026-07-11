/**
 * client/src/pages/Register.tsx
 * Self-signup form. Creates an account with status 'pending' — the user is
 * told an admin needs to approve them before they can sign in, is emailed a
 * pending-approval notice, and is sent back to the login screen (no session
 * is created on registration).
 */

import { useState, ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { registerAccount } from '../services/api';
import styles from './Login.module.css';

interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}

type RegisterFormErrors = Partial<Record<keyof RegisterForm, string>>;

const EMPTY_FORM: RegisterForm = {
  username:        '',
  email:           '',
  password:        '',
  confirmPassword: '',
  displayName:     '',
};

export default function Register() {
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [form,       setForm]       = useState<RegisterForm>(EMPTY_FORM);
  const [errors,     setErrors]     = useState<RegisterFormErrors>({});

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name as keyof RegisterForm]) setErrors(er => ({ ...er, [name]: '' }));
  };

  const validate = (): RegisterFormErrors => {
    const errs: RegisterFormErrors = {};
    if (!form.username.trim()) errs.username = 'Username is required';
    if (!form.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = 'Enter a valid email address';
    }
    if (!form.password) {
      errs.password = 'Password is required';
    } else if (form.password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const res = await registerAccount({
        username:        form.username,
        email:           form.email,
        password:        form.password,
        confirmPassword: form.confirmPassword,
        displayName:     form.displayName || undefined,
      });
      toast.success(res.message || 'Registration received — awaiting admin approval', { duration: 6000 });
      navigate('/login');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.logo}>🎈 Many Balloons</h1>
          <p className={styles.subtitle}>Create an account</p>
        </div>

        <div className={styles.setupBanner}>
          🕒 New accounts are reviewed by an admin before you can sign in.
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {/* Username */}
          <div className={styles.field}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              placeholder="your_username"
              autoComplete="username"
              autoFocus
              className={errors.username ? styles.inputError : ''}
            />
            {errors.username && <span className={styles.error}>{errors.username}</span>}
          </div>

          {/* Email */}
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              className={errors.email ? styles.inputError : ''}
            />
            {errors.email && <span className={styles.error}>{errors.email}</span>}
            <span style={{ fontSize: '0.75rem', color: '#888' }}>
              We'll email you to confirm your account is pending approval.
            </span>
          </div>

          {/* Display name */}
          <div className={styles.field}>
            <label htmlFor="displayName">Display name (optional)</label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              value={form.displayName}
              onChange={handleChange}
              placeholder="Jane Smith"
              autoComplete="name"
            />
          </div>

          {/* Password */}
          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <div className={styles.passRow}>
              <input
                id="password"
                name="password"
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="new-password"
                className={errors.password ? styles.inputError : ''}
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
            {errors.password && <span className={styles.error}>{errors.password}</span>}
          </div>

          {/* Confirm password */}
          <div className={styles.field}>
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPass ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="new-password"
              className={errors.confirmPassword ? styles.inputError : ''}
            />
            {errors.confirmPassword && (
              <span className={styles.error}>{errors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Create account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
