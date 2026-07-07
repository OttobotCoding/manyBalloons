/**
 * client/src/pages/CalendarView.jsx
 * Monthly calendar grid showing birthday dots on the correct days.
 * Navigate between months with prev/next arrows.
 * Clicking a day with birthdays shows a popover list of friends.
 */

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getFriends } from '../services/api';
import Avatar from '../components/Avatar';
import Spinner from '../components/Spinner';
import styles from './CalendarView.module.css';

const DAYS_OF_WEEK = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// Build a 6-row × 7-col grid of Date objects for the given year/month
function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();

  const cells = [];

  // Leading days from previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrev - i), current: false });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), current: true });
  }
  // Trailing days to fill 6 rows (42 cells)
  let trail = 1;
  while (cells.length < 42) {
    cells.push({ date: new Date(year, month + 1, trail++), current: false });
  }

  return cells;
}

// Map friends to a lookup: "MM-DD" → [friend, ...]
function buildBirthdayMap(friends) {
  const map = {};
  friends.forEach(f => {
    if (!f.birthday) return;
    const d = new Date(f.birthday);
    // Use UTC month/day to avoid timezone shift
    const key = `${String(d.getUTCMonth() + 1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
    if (!map[key]) map[key] = [];
    map[key].push(f);
  });
  return map;
}

function cellKey(date) {
  return `${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

export default function CalendarView() {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected,  setSelected]  = useState(null); // { date, friends }
  const popoverRef = useRef(null);

  const { data: res, isLoading, isError, error } = useQuery({
    queryKey: ['friends', {}],
    queryFn: () => getFriends({}),
  });

  const friends = res?.data ?? [];
  const birthdayMap = buildBirthdayMap(friends);
  const cells = buildCalendarGrid(viewYear, viewMonth);

  // Close popover when clicking outside
  useEffect(() => {
    function handle(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setSelected(null);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelected(null);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelected(null);
  }

  function goToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelected(null);
  }

  function handleCellClick(cell, cellFriends) {
    if (!cellFriends.length) return;
    setSelected({ date: cell.date, friends: cellFriends });
  }

  const isToday = (date) =>
    date.getDate()     === today.getDate()     &&
    date.getMonth()    === today.getMonth()    &&
    date.getFullYear() === today.getFullYear();

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Birthday Calendar</h1>
        <p className={styles.subtitle}>
          {friends.length} friend{friends.length !== 1 ? 's' : ''} ·{' '}
          {Object.keys(birthdayMap).length} unique birthday dates
        </p>
      </div>

      {isLoading && <Spinner />}
      {isError && (
        <div className={styles.error}>⚠️ Failed to load: {error.message}</div>
      )}

      {!isLoading && !isError && (
        <div className={styles.calendarCard}>
          {/* ── Month navigation ── */}
          <div className={styles.nav}>
            <button className={styles.navBtn} onClick={prevMonth} aria-label="Previous month">‹</button>
            <div className={styles.navCenter}>
              <span className={styles.monthLabel}>
                {MONTHS[viewMonth]} {viewYear}
              </span>
              {(viewMonth !== today.getMonth() || viewYear !== today.getFullYear()) && (
                <button className={styles.todayBtn} onClick={goToday}>Today</button>
              )}
            </div>
            <button className={styles.navBtn} onClick={nextMonth} aria-label="Next month">›</button>
          </div>

          {/* ── Day-of-week headers ── */}
          <div className={styles.grid}>
            {DAYS_OF_WEEK.map(d => (
              <div key={d} className={styles.dayHeader}>{d}</div>
            ))}

            {/* ── Calendar cells ── */}
            {cells.map((cell, i) => {
              const key = cellKey(cell.date);
              const cellFriends = birthdayMap[key] ?? [];
              const hasBirthday = cellFriends.length > 0;
              const todayCell   = isToday(cell.date);

              return (
                <div
                  key={i}
                  className={[
                    styles.cell,
                    !cell.current   ? styles.cellOtherMonth : '',
                    hasBirthday     ? styles.cellHasBirthday : '',
                    todayCell       ? styles.cellToday : '',
                    hasBirthday     ? styles.cellClickable : '',
                  ].join(' ')}
                  onClick={() => handleCellClick(cell, cellFriends)}
                  role={hasBirthday ? 'button' : undefined}
                  tabIndex={hasBirthday ? 0 : undefined}
                  onKeyDown={e => e.key === 'Enter' && handleCellClick(cell, cellFriends)}
                  aria-label={hasBirthday
                    ? `${cell.date.getDate()} — ${cellFriends.map(f => f.name).join(', ')}`
                    : undefined}
                >
                  <span className={styles.dateNum}>{cell.date.getDate()}</span>

                  {/* Show up to 2 avatar dots, then overflow count */}
                  {hasBirthday && (
                    <div className={styles.avatars}>
                      {cellFriends.slice(0, 2).map(f => (
                        <div key={f._id} className={styles.avatarWrap} title={f.name}>
                          <Avatar name={f.name} photo={f.photo} size={22} />
                        </div>
                      ))}
                      {cellFriends.length > 2 && (
                        <div className={styles.overflow}>+{cellFriends.length - 2}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Legend ── */}
          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: 'var(--accent)' }} />
              Has birthday
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendToday} />
              Today
            </span>
          </div>
        </div>
      )}

      {/* ── Birthday popover ── */}
      {selected && (
        <div className={styles.popoverBackdrop}>
          <div className={styles.popover} ref={popoverRef} role="dialog" aria-modal="true">
            <div className={styles.popoverHeader}>
              <h2 className={styles.popoverTitle}>
                🎂 {selected.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </h2>
              <button
                className={styles.popoverClose}
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className={styles.popoverList}>
              {selected.friends.map(f => (
                <Link
                  key={f._id}
                  to={`/friends/${f._id}`}
                  className={styles.popoverRow}
                  onClick={() => setSelected(null)}
                >
                  <Avatar name={f.name} photo={f.photo} size={40} />
                  <div className={styles.popoverInfo}>
                    <span className={styles.popoverName}>{f.name}</span>
                    <span className={styles.popoverMeta}>
                      Turns {f.age + 1} · {f.relationship}
                    </span>
                  </div>
                  <span className={styles.popoverArrow}>›</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}