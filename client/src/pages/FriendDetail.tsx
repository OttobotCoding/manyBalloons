/**
 * client/src/pages/FriendDetail.tsx
 * Full profile page for a single friend with all stored fields.
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getFriendById, deleteFriend } from '../services/api';
import Avatar from '../components/Avatar';
import Spinner from '../components/Spinner';
import styles from './FriendDetail.module.css';
import { Relationship } from '../types';

// Human-readable relationship labels
const REL_LABELS: Record<Relationship, string> = {
  friend: '👫 Friend',
  family: '👨‍👩‍👧 Family',
  colleague: '💼 Colleague',
  acquaintance: '🤝 Acquaintance',
  other: '❓ Other',
};

export default function FriendDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: res, isLoading, isError, error } = useQuery({
    queryKey: ['friend', id],
    queryFn: () => getFriendById(id as string),
  });

  const { mutate: doDelete, isPending: isDeleting } = useMutation({
    mutationFn: () => deleteFriend(id as string),
    onSuccess: () => {
      toast.success('Friend deleted');
      qc.invalidateQueries({ queryKey: ['friends'] });
      qc.invalidateQueries({ queryKey: ['upcoming'] });
      navigate('/');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <Spinner />;

  if (isError) {
    return (
      <div className={styles.error}>
        <p>⚠️ {(error as Error).message}</p>
        <Link to="/">← Back to dashboard</Link>
      </div>
    );
  }

    const f = res!.data;
    // Use UTC-based formatting to avoid timezone-shift "Invalid time value" errors
    const safeFormat = (dateVal: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions): string => {
        if (!dateVal) return '-';
        try {
            const d = new Date(dateVal);
            if (isNaN(d.getTime())) return '-';
            return d.toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });
        } catch {
            return '-';
        }
    };

    const birthdayFormatted = safeFormat(f.birthday, {
        month: 'long', day: 'numeric', year: 'numeric'
    });

  const countdownLabel =
    f.daysUntilBirthday === 0
      ? '🎉 Birthday is today!'
      : f.daysUntilBirthday === 1
      ? '🎂 Birthday is tomorrow!'
      : `🗓 ${f.daysUntilBirthday} days until next birthday`;

  return (
    <div className={styles.page}>
      {/* ── Breadcrumb ── */}
      <nav className={styles.breadcrumb}>
        <Link to="/">Dashboard</Link> / <span>{f.name}</span>
      </nav>

      {/* ── Profile header ── */}
      <div className={styles.profileHeader}>
        <Avatar name={f.name} photo={f.photo} size={90} />
        <div className={styles.headerInfo}>
          <h1 className={styles.name}>{f.name}</h1>
          <p className={styles.rel}>{REL_LABELS[f.relationship] || f.relationship}</p>
          <div
            className={`${styles.countdown} ${f.daysUntilBirthday! <= 30 ? styles.countdownSoon : ''}`}
          >
            {countdownLabel}
          </div>
        </div>
        <div className={styles.headerActions}>
          <Link to={`/friends/${id}/edit`} className={styles.editBtn}>✏️ Edit</Link>
          <button className={styles.deleteBtn} onClick={() => setConfirmDelete(true)}>
            🗑 Delete
          </button>
        </div>
      </div>

      {/* ── Info grid ── */}
      <div className={styles.infoGrid}>

        {/* Birthday card */}
        <div className={styles.infoCard}>
          <h2 className={styles.cardTitle}>Birthday</h2>
          <table className={styles.infoTable}>
            <tbody>
              <tr>
                <td className={styles.label}>Date</td>
                <td>{birthdayFormatted}</td>
              </tr>
              <tr>
                <td className={styles.label}>Age</td>
                <td>{f.age} years old</td>
              </tr>
              <tr>
                <td className={styles.label}>Next birthday</td>
                              <td>{safeFormat(f.nextBirthday, { month: 'long', day: 'numeric', year: 'numeric' })}
                              </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Contact card */}
        <div className={styles.infoCard}>
          <h2 className={styles.cardTitle}>Contact</h2>
          <table className={styles.infoTable}>
            <tbody>
              <tr>
                <td className={styles.label}>📞 Phone</td>
                <td>{f.phone || <span className={styles.empty}>Not provided</span>}</td>
              </tr>
              <tr>
                <td className={styles.label}>✉️ Email</td>
                <td>
                  {f.email
                    ? <a href={`mailto:${f.email}`}>{f.email}</a>
                    : <span className={styles.empty}>Not provided</span>}
                </td>
              </tr>
              <tr>
                <td className={styles.label}>📍 Address</td>
                <td>{f.address || <span className={styles.empty}>Not provided</span>}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Notes card — full width */}
        {f.notes && (
          <div className={`${styles.infoCard} ${styles.fullWidth}`}>
            <h2 className={styles.cardTitle}>Notes</h2>
            <p className={styles.notes}>{f.notes}</p>
          </div>
        )}

        {/* Metadata */}
        <div className={`${styles.infoCard} ${styles.fullWidth} ${styles.meta}`}>
                  <p>Added {safeFormat(f.createdAt, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          {f.updatedAt !== f.createdAt && (
                      <p>Last updated {safeFormat(f.updatedAt, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          )}
        </div>
      </div>

      {/* ── Delete confirmation modal ── */}
      {confirmDelete && (
        <div className={styles.overlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2>Delete {f.name}?</h2>
            <p>This cannot be undone. All their data will be permanently removed.</p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button
                className={styles.confirmBtn}
                disabled={isDeleting}
                onClick={() => doDelete()}
              >
                {isDeleting ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
