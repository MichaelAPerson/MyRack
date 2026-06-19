// A minimal inline sparkline. Deliberately not pulling in a charting
// library for one line per widget - keeps each widget cheap to render
// when there are many of them on the board.
export default function Sparkline({ values, max = 100, color = 'var(--amber)', height = 36 }) {
  const width = 200;
  if (!values || values.length < 2) {
    return <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height }} />;
  }
  const step = width / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - (Math.min(v, max) / max) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      <polygon points={areaPoints} fill={color} opacity="0.12" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
