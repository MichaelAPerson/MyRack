export default function UsageBar({ percent, color = 'var(--amber)' }) {
  const pct = Math.max(0, Math.min(100, percent ?? 0));
  return (
    <div className="usage-bar">
      <div className="usage-bar__fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
