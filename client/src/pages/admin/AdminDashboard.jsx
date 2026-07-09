/**
 * client/src/pages/admin/AdminDashboard.jsx
 * System overview — stats, recent activity, database breakdown.
 */

import { useQuery } from '@tanstack/react-query';
import { Link }     from 'react-router-dom';
import { getAdminStats } from '../../services/api';
import Spinner from '../../components/Spinner';
import styles  from './AdminDashboard.module.css';

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={styles.statCard} style={ accent ? { borderTop: `3px solid var(--accent)` } : {} }>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statLabel}>{label}</p>
      {sub && <p className={styles.statSub}>{sub}</p>}
    </div>
  );
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function AdminDashboard() {
  const { data: res, isLoading, isError } = useQuery({
    queryKey: ['admin-stats'],
    queryFn:  getAdminStats,
    refetchInterval: 30000, // refresh every 30s
  });

  if (isLoading) return <Spinner />;
  if (isError)   return <p className={styles.error}>Failed to load stats</p>;

  const s = res.data;

  return (
    <div>
      <h1 className={styles.title}>System Overview</h1>

      {/* ── Key stats ── */}
      <div className={styles.statsGrid}>
        <StatCard label="Total Users"      value={s.totalUsers}      accent />
        <StatCard label="Total Friends"    value={s.totalFriends}             />
        <StatCard label="Groups"           value={s.totalGroups}              />
        <StatCard label="Birthdays This Month" value={s.birthdayThisMonth}    />
      </div>

      {/* ── System status ── */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>System Status</h2>
        <div className={styles.statusGrid}>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Notifications</span>
            <span className={`${styles.badge} ${s.notificationsEnabled ? styles.badgeGreen : styles.badgeGray}`}>
              {s.notificationsEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>SMTP</span>
            <span className={`${styles.badge} ${s.smtpConfigured ? styles.badgeGreen : styles.badgeYellow}`}>
              {s.smtpConfigured ? 'Configured' : 'Not configured'}
            </span>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Environment</span>
            <span className={styles.badge}>{s.environment}</span>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Node.js</span>
            <span className={styles.badge}>{s.nodeVersion}</span>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Server uptime</span>
            <span className={styles.badge}>{formatUptime(s.uptime)}</span>
          </div>
        </div>
      </div>

      <div className={styles.twoCol}>
        {/* ── Friends by relationship ── */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Friends by Relationship</h2>
          {s.friendsByRelationship.length === 0 ? (
            <p className={styles.empty}>No friends yet</p>
          ) : (
            <div className={styles.barList}>
              {s.friendsByRelationship.map(r => (
                <div key={r._id} className={styles.barRow}>
                  <span className={styles.barLabel}>{r._id}</span>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${Math.round((r.count / s.totalFriends) * 100)}%` }}
                    />
                  </div>
                  <span className={styles.barCount}>{r.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Users by role ── */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Users by Role</h2>
          {s.usersByRole.map(r => (
            <div key={r._id} className={styles.statusRow}>
              <span className={styles.statusLabel} style={{ textTransform: 'capitalize' }}>{r._id}</span>
              <span className={styles.badge}>{r.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recently added friends ── */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Recently Added Friends</h2>
        {s.recentFriends.length === 0 ? (
          <p className={styles.empty}>No friends yet</p>
        ) : (
          <div className={styles.recentList}>
            {s.recentFriends.map(f => (
              <Link key={f._id} to={`/friends/${f._id}`} className={styles.recentRow}>
                <span className={styles.recentName}>{f.name}</span>
                <span className={styles.recentMeta}>
                  Added by {f.owner?.username ?? 'unknown'} · {f.relationship}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}