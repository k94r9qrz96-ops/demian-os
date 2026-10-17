import { STATUS_HEX } from '../lib.jsx';

const HAIR = {
  short: (c) => <path d="M-8.5 -3 C-9 -12 9 -12 8.5 -3 C6 -7 -6 -7 -8.5 -3 Z" fill={c} />,
  long: (c) => <path d="M-9 -2 C-10 -13 10 -13 9 -2 L9.5 9 L6 9 L6 -2 C3 -6 -3 -6 -6 -2 L-6 9 L-9.5 9 Z" fill={c} />,
  bun: (c) => <g fill={c}><circle cx="0" cy="-11" r="4" /><path d="M-8.5 -2 C-9 -11 9 -11 8.5 -2 C6 -6 -6 -6 -8.5 -2 Z" /></g>,
  curly: (c) => <g fill={c}>{[-7, -3.5, 0, 3.5, 7].map((dx) => <circle key={dx} cx={dx} cy={-6 - (Math.abs(dx) < 4 ? 2 : 0)} r="3.6" />)}</g>,
  bald: () => null,
  pony: (c) => <g fill={c}><path d="M-8.5 -2 C-9 -11 9 -11 8.5 -2 C6 -6 -6 -6 -8.5 -2 Z" /><path d="M7 -4 Q14 2 10 10 Q9 3 6 0 Z" /></g>,
  side: (c) => <path d="M-8.6 -1 C-9 -12 9 -12 8.6 -3 C4 -8 -2 -5 -8.6 -1 Z" fill={c} />,
};

export function Avatar({ a, size = 40, status }) {
  const av = a?.avatar || {};
  const st = status || a?.status;
  return (
    <svg width={size} height={size} viewBox="-20 -22 40 40" style={{ flex: 'none' }} aria-hidden="true">
      <circle cx="0" cy="-2" r="19" fill="#20242c" stroke={STATUS_HEX[st] || '#2a303b'} strokeWidth={st && st !== 'available' ? 2 : 1} />
      <clipPath id={`c-${a?.slug}`}><circle cx="0" cy="-2" r="18" /></clipPath>
      <g clipPath={`url(#c-${a?.slug})`}>
        <path d="M-15 20 C-15 8 -9 5 0 5 C9 5 15 8 15 20 Z" fill={av.shirt || '#3d5a80'} />
        <g transform="translate(0,-5)">
          <ellipse rx="8.2" ry="9" fill={av.skin || '#e1b48f'} />
          {HAIR[av.hair || 'short']?.(av.hairColor || '#2b1e16')}
          <circle cx="-3" cy="1" r="1.1" fill="#1b1b1f" /><circle cx="3" cy="1" r="1.1" fill="#1b1b1f" />
          {av.glasses && <g fill="none" stroke="#1b1b1f" strokeWidth=".9"><circle cx="-3" cy="1" r="2.5" /><circle cx="3" cy="1" r="2.5" /></g>}
        </g>
      </g>
    </svg>
  );
}
