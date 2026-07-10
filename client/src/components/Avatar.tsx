/**
 * client/src/components/Avatar.tsx
 * Circular avatar: shows photo if provided, else renders initials.
 */

import { CSSProperties, SyntheticEvent } from 'react';

interface AvatarProps {
  name?: string;
  photo?: string;
  size?: number;
}

// ─────────── Avatar.tsx ───────────────────────────────────────────────────────
export function Avatar({ name = '', photo, size = 44 }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Deterministic background colour from name
  const COLORS = ['#6c47ff','#c0397e','#2980b9','#c87a17','#27ae60','#e74c3c','#8e44ad'];
  const idx = name.charCodeAt(0) % COLORS.length;
  const bg = COLORS[idx];

  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: bg,
    color: '#fff',
    fontWeight: 700,
    fontSize: size * 0.36,
  };

  if (photo) {
    return (
      <div style={style}>
        <img
          src={photo}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e: SyntheticEvent<HTMLImageElement>) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>
    );
  }

  return <div style={style}>{initials}</div>;
}

export default Avatar;
