import { useTheme } from '../lib/themeContext';

// Flat themes get the original rack-unit mark; glass themes get a gradient tile
// tinted with the theme's accent colour.
export default function Logo({ size = 32 }) {
  const { ui } = useTheme();

  if (ui === 'solid') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo">
        <rect width="32" height="32" rx="4" style={{ fill: 'var(--bg-base)', stroke: 'var(--border-strong)' }} strokeWidth="1" />
        <rect x="6" y="6" width="20" height="4" rx="1" style={{ fill: 'var(--glass-border)' }} />
        <circle cx="22" cy="8" r="1" style={{ fill: 'var(--accent)' }} />
        <rect x="6" y="13" width="20" height="4" rx="1" style={{ fill: 'var(--glass-border)' }} />
        <circle cx="22" cy="15" r="1" style={{ fill: 'var(--green)' }} />
        <rect x="6" y="20" width="20" height="4" rx="1" style={{ fill: 'var(--glass-border)' }} />
        <circle cx="22" cy="22" r="1" style={{ fill: 'var(--green)' }} />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo">
      <defs>
        <linearGradient id="myrack-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--logo-a)' }} />
          <stop offset="1" style={{ stopColor: 'var(--logo-b)' }} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#myrack-logo-g)" />
      <g style={{ fill: 'var(--logo-bar)' }}>
        <rect x="14" y="15" width="36" height="9" rx="3" opacity=".95" />
        <rect x="14" y="27.5" width="36" height="9" rx="3" opacity=".8" />
        <rect x="14" y="40" width="36" height="9" rx="3" opacity=".65" />
      </g>
      <g style={{ fill: 'var(--logo-b)' }}>
        <circle cx="19.5" cy="19.5" r="1.6" />
        <circle cx="19.5" cy="32" r="1.6" />
        <circle cx="19.5" cy="44.5" r="1.6" />
      </g>
    </svg>
  );
}
