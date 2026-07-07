/**
 * client/src/components/Layout.jsx
 * Persistent shell with top nav, theme toggle, and page outlet.
 */

import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import styles from './Layout.module.css';

const NAV_LINKS = [
  { to: '/',          label: 'Dashboard', end: true },
  { to: '/calendar',  label: 'Calendar',  end: false },
  { to: '/upcoming',  label: 'Upcoming',  end: false },
  { to: '/settings',  label: 'Settings',  end: false },
];

export default function Layout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>🎂 Birthday Tracker</Link>
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
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <Link to="/friends/new" className={styles.addBtn}>+ Add Friend</Link>
        </nav>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} Many Balloons — never miss a birthday.</p>
      </footer>
    </div>
  );
}