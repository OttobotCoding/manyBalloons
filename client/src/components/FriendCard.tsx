/**
 * client/src/components/FriendCard.tsx
 * Card shown in the dashboard grid for each friend.
 * Highlighted with a birthday ribbon when the birthday is within 30 days.
 */

import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import styles from './FriendCard.module.css';
import { Friend, Relationship } from '../types';

// Relationship label colours
const REL_COLORS: Record<Relationship, { bg: string; text: string }> = {
  friend:       { bg: '#ede9ff', text: '#6c47ff' },
  family:       { bg: '#fde8f4', text: '#c0397e' },
  colleague:    { bg: '#e8f4fd', text: '#2980b9' },
  acquaintance: { bg: '#fdf6e8', text: '#c87a17' },
  other:        { bg: '#f0f0f0', text: '#666' },
};

interface FriendCardProps {
  friend: Friend;
  isUpcoming: boolean;
  onDeleteRequest: () => void;
}

export default function FriendCard({ friend, isUpcoming, onDeleteRequest }: FriendCardProps) {
  const {
    _id, name, birthday, age, daysUntilBirthday,
    phone, email, relationship, photo,
  } = friend;

  const relColor = REL_COLORS[relationship] || REL_COLORS.other;

    // Parse birthday using UTC values explicitly to avoid tomezone shifting
    let birthdayStr = '-';
    if (birthday) {
        const d = new Date(birthday);
        if (!isNaN(d.getTime())) {
            // Pull UTC month/day directly - avoids the date shifting back one day
            // when the local timezone is behind UTC (e.g. US timezones)
            const month = d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
            const day = d.getUTCDate();
            birthdayStr = month + ' ' + day;
        }
    }

    // Safe display values - never show "undefined" or "null"
    const ageDisplay = (age !== null && age !== undefined) ? age : '-';
    const daysDisplay = (daysUntilBirthday !== null && daysUntilBirthday !== undefined)
        ? daysUntilBirthday
        : null;

  // Label for the countdown chip
  const countdownLabel =
      daysDisplay === null ? '-' :
      daysDisplay === 0    ? '🎉 Today!' :
      daysDisplay === 1 ? '🎂 Tomorrow!' :
      isUpcoming ? `🎂 ${daysDisplay} days` :
                   `${daysDisplay} days`;

  return (
    <div className={`${styles.card} ${isUpcoming ? styles.upcoming : ''}`}>
      {/* Upcoming ribbon */}
      {isUpcoming && <div className={styles.ribbon}>Upcoming 🎈</div>}

      {/* Card header: avatar + name + relationship */}
      <div className={styles.header}>
        <Avatar name={name} photo={photo} size={52} />
        <div className={styles.nameBlock}>
          <Link to={`/friends/${_id}`} className={styles.name}>{name}</Link>
          <span
            className={styles.relBadge}
            style={{ background: relColor.bg, color: relColor.text }}
          >
            {relationship}
          </span>
        </div>
      </div>

      {/* Birthday info */}
      <div className={styles.birthdayRow}>
        <span className={styles.birthdayDate}>🗓 {birthdayStr} · Age {ageDisplay}</span>
        <span
          className={`${styles.countdown} ${daysDisplay !== null && daysDisplay <= 7 ? styles.soon : ''}`}
        >
          {countdownLabel}
        </span>
      </div>

      {/* Contact snippets */}
      <div className={styles.contacts}>
        {email && <p className={styles.contact}>✉️ {email}</p>}
        {phone && <p className={styles.contact}>📞 {phone}</p>}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <Link to={`/friends/${_id}`} className={styles.viewBtn}>View</Link>
        <Link to={`/friends/${_id}/edit`} className={styles.editBtn}>Edit</Link>
        <button className={styles.deleteBtn} onClick={onDeleteRequest} aria-label={`Delete ${name}`}>
          Delete
        </button>
      </div>
    </div>
  );
}
