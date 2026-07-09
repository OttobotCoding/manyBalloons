/**
 * client/src/pages/admin/ActivityLog.jsx
 * Paginated, filterable activity log viewer.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getActivityLogs } from '../../services/api';
import Spinner from '../../components/Spinner';
import styles  from './ActivityLog.module.css';

const ACTION_LABELS = {
  login_success:       { label: 'Login',           color: '#27ae60' },
  login_failed:        { label: 'Login failed',     color: '#e74c3c' },
  logout:              { label: 'Logout',           color: '#7f8c8d' },
  password_changed:    { label: 'Password changed', color: '#8e44ad' },
  setup_completed:     { label: 'Setup',            color: '#2980b9' },
  friend_created:      { label: 'Friend added',     color: '#27ae60' },
  friend_updated:      { label: 'Friend updated',   color: '#f39c12' },
  friend_deleted:      { label: 'Friend deleted',   color: '#e74c3c' },
  user_created:        { label: 'User created',     color: '#27ae60' },
  user_deleted:        { label: 'User deleted',     color: '#e74c3c' },
  user_role_changed:   { label: 'Role changed',     color: '#8e44ad' },
  user_password_reset: { label: 'Password reset',   color: '#e67e22' },
  group_created:       { label: 'Group created',    color: '#27ae60' },
  group_updated:       { label: 'Group updated',    color: '#f39c12' },
  group_deleted:       { label: 'Group deleted',    color: '#e74c3c' },
  settings_updated:    { label: 'Settings updated', color: '#2980b9' },
  notification_sent:   { label: 'Email sent',       color: '#27ae60' },
  notification_failed: { label: 'Email failed',     color: '#e74c3c' },
};

const ALL_ACTIONS = Object.keys(ACTION_LABELS);

function formatDate(d) {
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function ActivityLog() {
  const [page,       setPage]       = useState(1);
  const [action,     setAction]     = useState('');
  const [search,     setSearch]     = useState('');

  const { data: res, isLoading, isError } = useQuery({
    queryKey: ['admin-logs', { page, action }],
    queryFn:  () => getActivityLogs({ page, limit: 25, action: action || undefined }),
    keepPreviousData: true,
  });

  const logs       = res?.data        ?? [];
  const pagination = res?.pagination  ?? {};

  // Client-side filter by description search
  const filtered = search.trim()
    ? logs.filter(l =>
        l.description.toLowerCase().includes(search.toLowerCase()) ||
        l.username.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div>
      <h1 className={styles.title}>Activity Log</h1>

      {/* ── Filters ── */}
      <div className={styles.filters}>
        <input
          className={styles.search}
          type="search"
          placeholder="Search description or username…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className={styles.select}
          value={action}
          onChange={e => { setAction(e.target.value); setPage(1); }}
        >
          <option value="">All actions</option>
          {ALL_ACTIONS.map(a => (
            <option key={a} value={a}>{ACTION_LABELS[a]?.label ?? a}</option>
          ))}
        </select>
      </div>

      {isLoading && <Spinner />}
      {isError   && <p className={styles.error}>Failed to load logs</p>}

      {/* ── Log table ── */}
      {!isLoading && !isError && (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Description</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className={styles.empty}>No log entries found</td></tr>
                )}
                {filtered.map(log => {
                  const meta = ACTION_LABELS[log.action];
                  return (
                    <tr key={log._id}>
                      <td className={styles.time}>{formatDate(log.createdAt)}</td>
                      <td className={styles.user}>{log.username}</td>
                      <td>
                        <span
                          className={styles.actionBadge}
                          style={{ background: meta?.color + '22', color: meta?.color, borderColor: meta?.color + '55' }}
                        >
                          {meta?.label ?? log.action}
                        </span>
                      </td>
                      <td className={styles.desc}>{log.description}</td>
                      <td className={styles.ip}>{log.ip || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {pagination.pages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                ← Prev
              </button>
              <span className={styles.pageInfo}>
                Page {pagination.page} of {pagination.pages} · {pagination.total} entries
              </span>
              <button
                className={styles.pageBtn}
                disabled={page >= pagination.pages}
                onClick={() => setPage(p => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}