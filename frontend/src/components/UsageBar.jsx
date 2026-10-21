export default function UsageBar({ percent, color = 'var(--accent)' }) {
  const pct = Math.max(0, Math.min(100, percent ?? 0));
  const fill = pct >= 90 ? 'var(--red)' : pct >= 75 ? 'var(--amber)' : color;
  return (
    <div className="usage-bar">
      <div className="usage-bar__fill" style={{ width: `${pct}%`, background: fill }} />
    </div>
  );
}
