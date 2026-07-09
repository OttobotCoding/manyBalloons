/**
 * client/src/components/Layout.jsx
 * Persistent shell: sticky nav, theme toggle, user display, logout, page outlet.
 */

import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';
import { useAuth }  from '../context/AuthContext';
import styles from './Layout.module.css';

const NAV_LINKS = [
  { to: '/',         label: 'Dashboard', end: true  },
  { to: '/calendar', label: 'Calendar',  end: false },
  { to: '/upcoming', label: 'Upcoming',  end: false },
  { to: '/settings', label: 'Settings',  end: false },
];

export default function Layout() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout }       = useAuth();
  const navigate               = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>🎂 BirthdayTracker</Link>

        <nav className={styles.nav}>
          {NAV_LINKS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
              }
            >
              {label}
            </NavLink>
          ))}

          <button
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          <Link to="/friends/new" className={styles.addBtn}>+ Add Friend</Link>

          {user && (
            <div className={styles.userArea}>
              <span className={styles.username}>👤 {user.username}</span>
              {user.role === 'admin' && (
                <Link to="/admin" className={styles.adminLink}>Admin</Link>
              )}
              <button className={styles.logoutBtn} onClick={handleLogout}>
                Sign out
              </button>
            </div>
          )}
        </nav>
      </header>

      <main className={styles.main}><Outlet /></main>

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} Many Balloons — never miss a birthday.</p>
      </footer>
    </div>
  );
}