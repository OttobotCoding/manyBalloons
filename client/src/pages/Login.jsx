/**
 * client/src/pages/Login.jsx
 * Handles both the first-run Setup screen and the regular Login screen.
 * Detects which mode to show by calling /api/auth/setup (POST with no body
 * will 403 if setup is already done, which tells us an account exists).
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { checkSetupNeeded, setupAccount } from '../services/api';
import styles from './Login.module.css';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [isSetup,      setIsSetup]      = useState(false); // true = first-run setup mode
  const [checking,     setChecking]     = useState(true);  // checking setup status
  const [checkError,   setCheckError]   = useState(null);  // couldn't reach the API
  const [submitting,   setSubmitting]   = useState(false);
  const [showPass,     setShowPass]     = useState(false);

  const [form, setForm] = useState({
    username:        '',
    password:        '',
    confirmPassword: '',
    rememberMe:      false,
  });
  const [errors, setErrors] = useState({});

  // Determine whether to show setup or login screen
  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/auth/setup-status');
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        const data = await res.json();
        console.log('[Login] setup-status:', data);
        setIsSetup(data.needsSetup);
      } catch (err) {
        // Don't silently assume "login mode" here — a failed check usually
        // means the API server isn't running or can't reach MongoDB, and
        // defaulting to the login form hides that from the user entirely.
        console.error('[Login] error:', err);
        setCheckError('Could not reach the server. Make sure the API server is running and connected to MongoDB.');
      } finally {
        setChecking(false);
      }
    }
    check();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(e => ({ ...e, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.username.trim())  errs.username = 'Username is required';
    if (!form.password)         errs.password = 'Password is required';
    if (isSetup) {
      if (form.password.length < 8)
        errs.password = 'Password must be at least 8 characters';
      if (form.password !== form.confirmPassword)
        errs.confirmPassword = 'Passwords do not match';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      if (isSetup) {
        await setupAccount({
          username:        form.username,
          password:        form.password,
          confirmPassword: form.confirmPassword,
        });
        toast.success('Account created — welcome to Many Balloons!');
      } else {
        await login(form.username, form.password, form.rememberMe);
        toast.success(`Welcome back, ${form.username}!`);
      }
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <p className={styles.checking}>🎂 Loading…</p>
        </div>
      </div>
    );
  }

  if (checkError) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.logo}>🎈 Many Balloons</h1>
          </div>
          <p className={styles.error}>{checkError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.logo}>🎈 Many Balloons</h1>
          <p className={styles.subtitle}>
            {isSetup
              ? 'Create your admin account to get started'
              : 'Sign in to your account'}
          </p>
        </div>

        {isSetup && (
          <div className={styles.setupBanner}>
            🎉 First time setup — create your admin account below.
          </div>
        )}

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
                autoComplete={isSetup ? 'new-password' : 'current-password'}
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

          {/* Confirm password — setup only */}
          {isSetup && (
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
          )}

          {/* Remember me — login only */}
          {!isSetup && (
            <label className={styles.rememberRow}>
              <input
                type="checkbox"
                name="rememberMe"
                checked={form.rememberMe}
                onChange={handleChange}
              />
              <span>Remember me for 30 days</span>
            </label>
          )}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={submitting}
          >
            {submitting
              ? (isSetup ? 'Creating account…' : 'Signing in…')
              : (isSetup ? 'Create account'    : 'Sign in')}
          </button>
        </form>
      </div>
    </div>
  );
}
