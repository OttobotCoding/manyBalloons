/**
 * client/src/components/AdminLayout.tsx
 * Shell for all admin pages — sidebar nav + content area.
 */

import { NavLink, Outlet, Link } from 'react-router-dom';
import styles from './AdminLayout.module.css';

interface AdminNavItem {
  to: string;
  label: string;
  end: boolean;
}

const ADMIN_NAV: AdminNavItem[] = [
  { to: '/admin',          label: '📊 Overview',        end: true  },
  { to: '/admin/users',    label: '👥 User Management',  end: false },
  { to: '/admin/logs',     label: '📋 Activity Log',     end: false },
];

export default function AdminLayout() {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>Admin</span>
          <Link to="/" className={styles.backLink}>← App</Link>
        </div>
        <nav className={styles.nav}>
          {ADMIN_NAV.map(({ to, label, end }) => (
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
        </nav>
      </aside>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
