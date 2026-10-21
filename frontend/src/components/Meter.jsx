import UsageBar from './UsageBar';

// Labelled horizontal usage bar - the original MyRack gauge style.
export default function Meter({ label, value, percent, color, extra = false, dim = false }) {
  return (
    <div className={`meter ${extra ? 'meter--extra' : ''}`} style={dim ? { opacity: 0.5 } : undefined}>
      <div className="meter__head">
        <span className="meter__label">{label}</span>
        <span className="meter__value">{value}</span>
      </div>
      <UsageBar percent={percent} color={color} />
    </div>
  );
}
