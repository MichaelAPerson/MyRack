const R = 42;
const CIRC = 2 * Math.PI * R;

// Circular gauge in the style of UmbrelOS' system widgets.
// Turns amber/red as usage climbs so trouble is visible at a glance.
export default function Ring({ percent, color, label, detail, dim = false }) {
  const has = percent != null && !Number.isNaN(percent);
  const pct = has ? Math.max(0, Math.min(100, percent)) : 0;
  const stroke = pct >= 90 ? 'var(--red)' : pct >= 75 ? 'var(--amber)' : color;

  return (
    <div className={`ring ${dim ? 'ring--dim' : ''}`}>
      <div className="ring__dial">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className="ring__track" cx="50" cy="50" r={R} />
          <circle
            className="ring__bar"
            cx="50"
            cy="50"
            r={R}
            stroke={stroke}
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - pct / 100)}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <span className="ring__value">
          {has ? Math.round(pct) : '—'}
          {has && <small>%</small>}
        </span>
      </div>
      <span className="ring__label">{label}</span>
      <span className="ring__detail">{detail}</span>
    </div>
  );
}
