/**
 * client/src/pages/UpcomingList.jsx
 * Full list of all friends sorted by days until their next birthday.
 * Groups entries by month for easy scanning.
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getFriends } from '../services/api';
import Avatar from '../components/Avatar';
import Spinner from '../components/Spinner';
import styles from './UpcomingList.module.css';

// Month name lookup
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// Return the 0-indexed month of the next birthday for a friend record
function nextBirthdayMonth(friend) {
  if (!friend.nextBirthday) return null;
  return new Date(friend.nextBirthday).getMonth();
}

export default function UpcomingList() {
  const { data: res, isLoading, isError, error } = useQuery({
    queryKey: ['friends', {}],
    queryFn: () => getFriends({}),
  });

  const friends = res?.data ?? [];

  // Sort all friends by daysUntilBirthday ascending
  const sorted = [...friends].sort(
    (a, b) => (a.daysUntilBirthday ?? 999) - (b.daysUntilBirthday ?? 999)
  );

  // Group by the calendar month of their NEXT birthday
  const groups = sorted.reduce((acc, friend) => {
    const month = nextBirthdayMonth(friend);
    if (month === null) return acc;
    if (!acc[month]) acc[month] = [];
    acc[month].push(friend);
    return acc;
  }, {});

  // Order the month keys starting from the current month
  const currentMonth = new Date().getMonth();
  const orderedMonths = [
    ...Array.from({ length: 12 }, (_, i) => (currentMonth + i) % 12),
  ].filter(m => groups[m]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>
          Upcoming Birthdays
          <span className={styles.count}>{friends.length}</span>
        </h1>
        <p className={styles.subtitle}>All friends sorted by their next birthday</p>
      </div>

      {isLoading && <Spinner />}

      {isError && (
        <div className={styles.error}>⚠️ Failed to load: {error.message}</div>
      )}

      {!isLoading && !isError && friends.length === 0 && (
        <div className={styles.empty}>
          No friends yet. <Link to="/friends/new">Add your first one!</Link>
        </div>
      )}

      {orderedMonths.map(month => (
        <div key={month} className={styles.monthGroup}>
          <h2 className={styles.monthHeading}>
            <span className={styles.monthName}>{MONTHS[month]}</span>
            <span className={styles.monthCount}>{groups[month].length}</span>
          </h2>

          <div className={styles.list}>
            {groups[month].map(friend => {
              const isToday   = friend.daysUntilBirthday === 0;
              const isTomorrow = friend.daysUntilBirthday === 1;
              const isThisWeek = friend.daysUntilBirthday <= 7;
              const isThisMonth = friend.daysUntilBirthday <= 30;

              const countdownLabel =
                isToday    ? '🎉 Today!'    :
                isTomorrow ? '🎂 Tomorrow!' :
                `${friend.daysUntilBirthday} days`;

              const countdownClass =
                isToday    ? styles.chipToday    :
                isTomorrow ? styles.chipSoon     :
                isThisWeek ? styles.chipSoon     :
                isThisMonth ? styles.chipMonth   :
                styles.chip;

              // Birthday date display using UTC to avoid timezone shift
              const bday = new Date(friend.birthday);
              const birthdayStr = bday.toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', timeZone: 'UTC',
              });

              return (
                <Link
                  key={friend._id}
                  to={`/friends/${friend._id}`}
                  className={`${styles.row} ${isToday ? styles.rowToday : ''}`}
                >
                  <Avatar name={friend.name} photo={friend.photo} size={44} />

                  <div className={styles.info}>
                    <span className={styles.name}>{friend.name}</span>
                    <span className={styles.detail}>
                      {birthdayStr} · Turns {friend.age + 1}
                    </span>
                  </div>

                  <div className={styles.right}>
                    <span className={countdownClass}>{countdownLabel}</span>
                    <span className={styles.rel}>{friend.relationship}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}