import { useState } from 'react';
import MiniCard from './MiniCard';
import Icon from '../Icons';
import { useNow } from '../../lib/useNow';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarWidget({ editMode, onRemove }) {
  const now = useNow(60000);
  const [offset, setOffset] = useState(0); // months away from the current one

  const view = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const lead = view.getDay();
  const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const isThisMonth = offset === 0;

  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const title = view.toLocaleDateString([], { month: 'long', year: 'numeric' });

  return (
    <MiniCard
      label={now.toLocaleDateString([], { weekday: 'long' })}
      editMode={editMode}
      onRemove={onRemove}
      aside={
        <span className="cal__nav">
          <button type="button" className="icon-btn icon-btn--sm" onClick={() => setOffset((o) => o - 1)} aria-label="Previous month">
            <Icon name="chevron-left" size={14} strokeWidth={2.4} />
          </button>
          <button type="button" className="icon-btn icon-btn--sm" onClick={() => setOffset((o) => o + 1)} aria-label="Next month">
            <Icon name="chevron-right" size={14} strokeWidth={2.4} />
          </button>
        </span>
      }
    >
      <div className="cal">
        <button type="button" className="cal__title" onClick={() => setOffset(0)} title="Jump to today">
          {title}
        </button>
        <div className="cal__grid">
          {DOW.map((d, i) => (
            <span key={i} className="cal__dow">
              {d}
            </span>
          ))}
          {cells.map((d, i) => (
            <span key={i} className="cal__cell">
              {d && <span className={`cal__day ${isThisMonth && d === now.getDate() ? 'cal__day--today' : ''}`}>{d}</span>}
            </span>
          ))}
        </div>
      </div>
    </MiniCard>
  );
}
