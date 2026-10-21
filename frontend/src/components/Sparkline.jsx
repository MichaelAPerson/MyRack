import { useId } from 'react';

// Minimal inline area sparkline - no charting library needed for one line per widget.
export default function Sparkline({ values, max = 100, color = 'var(--accent)', height = 40 }) {
  const gradId = useId();
  const width = 200;
  if (!values || values.length < 2) {
    return <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height }} />;
  }
  const step = width / (values.length - 1);
  const pad = 3;
  const points = values.map((v, i) => {
    const x = i * step;
    const y = pad + (height - pad * 2) - (Math.min(v, max) / max) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = points.join(' ');
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.45" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradId})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
