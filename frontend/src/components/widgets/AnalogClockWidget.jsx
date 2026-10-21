import MiniCard from './MiniCard';
import { useNow } from '../../lib/useNow';

export default function AnalogClockWidget({ editMode, onRemove }) {
  const now = useNow(1000);
  const s = now.getSeconds();
  const m = now.getMinutes() + s / 60;
  const h = (now.getHours() % 12) + m / 60;

  const ticks = Array.from({ length: 60 }, (_, i) => i);

  return (
    <MiniCard bare editMode={editMode} onRemove={onRemove} label="Analog clock">
      <div className="analog">
        <svg viewBox="-50 -50 100 100" role="img" aria-label={now.toLocaleTimeString()}>
          <circle r="47" className="analog__face" />
          {ticks.map((i) => {
            const major = i % 5 === 0;
            return (
              <line
                key={i}
                className={major ? 'analog__tick analog__tick--major' : 'analog__tick'}
                y1={-41}
                y2={major ? -35 : -38.5}
                transform={`rotate(${i * 6})`}
              />
            );
          })}
          <line className="analog__hand analog__hand--hour" y1="4" y2="-22" transform={`rotate(${h * 30})`} />
          <line className="analog__hand analog__hand--min" y1="5" y2="-33" transform={`rotate(${m * 6})`} />
          <g transform={`rotate(${s * 6})`}>
            <line className="analog__hand analog__hand--sec" y1="10" y2="-37" />
          </g>
          <circle r="2.6" className="analog__pin" />
        </svg>
      </div>
    </MiniCard>
  );
}
