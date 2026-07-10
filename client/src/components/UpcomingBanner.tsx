/**
 * client/src/components/UpcomingBanner.tsx
 * Horizontal scrollable strip of friends with upcoming birthdays.
 */

import { Link } from 'react-router-dom';
import { Friend } from '../types';

interface UpcomingBannerProps {
  friends: Friend[];
}

export function UpcomingBanner({ friends }: UpcomingBannerProps) {
  return (
    <div style={{
      background: 'linear-gradient(90deg, #6c47ff 0%, #a37bff 100%)',
      borderRadius: 12,
      padding: '1rem 1.25rem',
      marginBottom: '1.5rem',
      color: '#fff',
    }}>
      <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.95rem' }}>
        🎂 Upcoming birthdays in the next 30 days
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {friends.map((f) => (
          <Link
            key={f._id}
            to={`/friends/${f._id}`}
            style={{
              background: 'rgba(255,255,255,0.18)',
              borderRadius: 8,
              padding: '0.5rem 0.9rem',
              textDecoration: 'none',
              color: '#fff',
              flexShrink: 0,
              fontSize: '0.82rem',
              fontWeight: 600,
              backdropFilter: 'blur(4px)',
            }}
          >
            <div>{f.name}</div>
            <div style={{ fontWeight: 400, opacity: 0.85, marginTop: 2 }}>
              {f.daysUntilBirthday === 0
                ? '🎉 Today!'
                : f.daysUntilBirthday === 1
                ? 'Tomorrow'
                : `In ${f.daysUntilBirthday} days`}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default UpcomingBanner;
