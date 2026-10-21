import { useMemo } from 'react';
import { buildTokens } from '../lib/themes';

// Miniature of a theme: its background, a panel, and its accent. Variables are scoped to the
// preview only, so it shows the *theme's* look while the label keeps the current theme's.
export function ThemeSwatch({ spec, className = '' }) {
  const vars = useMemo(() => buildTokens(spec).vars, [spec]);
  return (
    <div className={`theme-card__preview ${className}`} style={vars}>
      <div className="theme-card__preview-bg" style={{ background: 'var(--wallpaper)' }} />
      <div className="theme-card__mini">
        <span className="theme-card__line" />
        <span className="theme-card__line theme-card__line--short" />
        <span className="theme-card__bar" />
      </div>
      <span className="theme-card__dot" />
    </div>
  );
}

export default function ThemeCard({ spec, active, onSelect, children }) {
  return (
    <div className="theme-card-wrap">
      <button
        type="button"
        className={`theme-card ${active ? 'theme-card--active' : ''}`}
        onClick={onSelect}
        aria-pressed={active}
        title={spec.name}
      >
        <ThemeSwatch spec={spec} />
        <span className="theme-card__name">
          {spec.name}
          {!spec.builtIn && <span className="theme-card__tag">Custom</span>}
        </span>
      </button>
      {active && (
        <span className="theme-card__check" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7" />
          </svg>
        </span>
      )}
      {children}
    </div>
  );
}
