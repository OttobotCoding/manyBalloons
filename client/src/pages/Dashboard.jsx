/**
 * client/src/pages/Dashboard.jsx
 * Main view: upcoming birthdays banner + searchable/filterable friend list.
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getFriends, getUpcomingBirthdays, deleteFriend } from '../services/api';
import FriendCard from '../components/FriendCard';
import UpcomingBanner from '../components/UpcomingBanner';
import Spinner from '../components/Spinner';
import styles from './Dashboard.module.css';

const RELATIONSHIPS = ['all', 'friend', 'family', 'colleague', 'acquaintance', 'other'];
const SORTS = [
  { value: 'name', label: 'Name A–Z' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'createdAt', label: 'Recently added' },
];

export default function Dashboard() {
  const [search, setSearch] = useState('');
  const [relationship, setRelationship] = useState('all');
  const [sort, setSort] = useState('name');
  const [deleteId, setDeleteId] = useState(null); // id awaiting confirmation

  const qc = useQueryClient();

  // ── Fetch all friends (query key includes filters so it re-fetches on change)
  const { data: friendsRes, isLoading, isError, error } = useQuery({
    queryKey: ['friends', { search, relationship, sort }],
    queryFn: () => getFriends({ search, relationship, sort }),
  });

  // ── Fetch upcoming birthdays (within 30 days) ────────────────────────────
  const { data: upcomingRes } = useQuery({
    queryKey: ['upcoming'],
    queryFn: () => getUpcomingBirthdays(30),
  });

  // ── Delete mutation ───────────────────────────────────────────────────────
  const { mutate: doDelete, isPending: isDeleting } = useMutation({
    mutationFn: deleteFriend,
    onSuccess: () => {
      toast.success('Friend deleted');
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['friends'] });
      qc.invalidateQueries({ queryKey: ['upcoming'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const friends = friendsRes?.data ?? [];
  const upcoming = upcomingRes?.data ?? [];

  // Filter upcoming to exclude friends already in the search result (cosmetic)
  const upcomingHighlight = useMemo(
    () => upcoming.filter((u) => u.daysUntilBirthday <= 30),
    [upcoming]
  );

  return (
    <div>
      {/* ── Upcoming birthdays banner ── */}
      {upcomingHighlight.length > 0 && (
        <UpcomingBanner friends={upcomingHighlight} />
      )}

      {/* ── Page header ── */}
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>All Friends <span className={styles.count}>{friends.length}</span></h1>
        <Link to="/friends/new" className={styles.addBtn}>+ Add Friend</Link>
      </div>

      {/* ── Filters bar ── */}
      <div className={styles.filters}>
        <input
          className={styles.search}
          type="search"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search friends"
        />

        <select
          className={styles.select}
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          aria-label="Filter by relationship"
        >
          {RELATIONSHIPS.map((r) => (
            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>

        <select
          className={styles.select}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sort friends"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* ── Content ── */}
      {isLoading && <Spinner />}

      {isError && (
        <div className={styles.error}>
          ⚠️ Failed to load friends: {error.message}
        </div>
      )}

      {!isLoading && !isError && friends.length === 0 && (
        <div className={styles.empty}>
          <p>No friends found. <Link to="/friends/new">Add your first one!</Link></p>
        </div>
      )}

      {/* ── Friend cards grid ── */}
      {!isLoading && friends.length > 0 && (
        <div className={styles.grid}>
          {friends.map((friend) => (
            <FriendCard
              key={friend._id}
              friend={friend}
              isUpcoming={upcoming.some((u) => u._id === friend._id)}
              onDeleteRequest={() => setDeleteId(friend._id)}
            />
          ))}
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteId && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Confirm deletion">
          <div className={styles.modal}>
            <h2>Delete friend?</h2>
            <p>This action cannot be undone.</p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button
                className={styles.confirmBtn}
                disabled={isDeleting}
                onClick={() => doDelete(deleteId)}
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