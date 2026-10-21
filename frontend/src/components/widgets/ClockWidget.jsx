import MiniCard from './MiniCard';
import { useNow } from '../../lib/useNow';

export default function ClockWidget({ config, onConfigChange, editMode, onRemove }) {
  const now = useNow(1000);
  const hour12 = config.hour12 !== false;
  const raw = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12 });
  const match = raw.match(/^(.*?)\s*([AP]M)$/i);
  const time = match ? match[1] : raw;
  const suffix = match ? match[2] : '';
  const date = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <MiniCard bare editMode={editMode} onRemove={onRemove} label="Clock">
      <div className="clock">
        <button
          type="button"
          className="clock__time"
          onClick={() => onConfigChange({ ...config, hour12: !hour12 })}
          title="Click to switch 12h / 24h"
        >
          {time}
          {suffix && <span className="clock__suffix">{suffix}</span>}
        </button>
        <span className="clock__date">{date}</span>
      </div>
    </MiniCard>
  );
}
