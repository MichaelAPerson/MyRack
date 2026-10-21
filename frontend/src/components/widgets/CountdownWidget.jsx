import { useState } from 'react';
import MiniCard from './MiniCard';
import { useNow } from '../../lib/useNow';

// 'YYYY-MM-DD' -> local midnight (new Date('YYYY-MM-DD') would parse as UTC and be off by a day)
function parseLocal(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function CountdownWidget({ config, onConfigChange, editMode, onRemove }) {
  const now = useNow(60000);
  const [editing, setEditing] = useState(!config.date);
  const [label, setLabel] = useState(config.label || '');
  const [date, setDate] = useState(config.date || '');

  const save = (e) => {
    e.preventDefault();
    if (!date) return;
    onConfigChange({ ...config, label: label.trim(), date });
    setEditing(false);
  };

  if (editing) {
    return (
      <MiniCard label="Countdown" editMode={editMode} onRemove={onRemove}>
        <form className="cd-form" onSubmit={save}>
          <input className="input input--sm" placeholder="What are you counting to?" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} />
          <input className="input input--sm" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <button type="submit" className="btn btn--small btn--primary" disabled={!date}>
            Save
          </button>
        </form>
      </MiniCard>
    );
  }

  const target = parseLocal(config.date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((target - today) / 86400000);
  const big = days === 0 ? 'Today' : Math.abs(days);
  const unit = days === 0 ? '' : `${Math.abs(days) === 1 ? 'day' : 'days'} ${days > 0 ? 'to go' : 'ago'}`;

  return (
    <MiniCard
      label="Countdown"
      editMode={editMode}
      onRemove={onRemove}
      aside={
        <button type="button" className="link-btn" onClick={() => setEditing(true)}>
          Edit
        </button>
      }
    >
      <div className="cd">
        <div className="cd__num">{big}</div>
        {unit && <div className="cd__unit">{unit}</div>}
        <div className="cd__label">
          {config.label || 'Event'} · {target.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    </MiniCard>
  );
}
