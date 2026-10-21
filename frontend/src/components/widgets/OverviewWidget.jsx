import WidgetFrame from '../WidgetFrame';
import Ring from '../Ring';
import Meter from '../Meter';
import { useTheme } from '../../lib/themeContext';

// Fleet-wide averages across every device that is currently reporting.
export default function OverviewWidget({ devices, editMode, onRemove }) {
  const { meters } = useTheme();
  const live = devices.filter((d) => d.online && d.latest);
  const total = devices.length;

  const cpus = live.map((d) => d.latest.cpu).filter((v) => v != null);
  const cpu = cpus.length ? cpus.reduce((a, b) => a + b, 0) / cpus.length : null;

  const memDevices = live.filter((d) => d.latest.mem?.total);
  const mem = memDevices.length
    ? (memDevices.reduce((a, d) => a + d.latest.mem.used, 0) / memDevices.reduce((a, d) => a + d.latest.mem.total, 0)) * 100
    : null;

  const disks = live.flatMap((d) => d.latest.disks || []).filter((k) => k.total);
  const disk = disks.length ? (disks.reduce((a, k) => a + k.used, 0) / disks.reduce((a, k) => a + k.total, 0)) * 100 : null;

  return (
    <WidgetFrame
      title="Rack overview"
      eyebrow={`${live.length} of ${total} device${total === 1 ? '' : 's'} online`}
      status={live.length > 0 ? 'online' : 'offline'}
      editMode={editMode}
      onRemove={onRemove}
    >
      <div className={`stats ${meters === 'bars' ? 'stats--bars' : ''}`}>
        {meters === 'bars' ? (
          <div className="meters">
            <Meter label="Avg CPU" value={cpu != null ? `${cpu.toFixed(1)}%` : 'no data'} percent={cpu} color="var(--blue)" />
            <Meter label="Memory" value={mem != null ? `${mem.toFixed(0)}%` : 'no data'} percent={mem} color="var(--purple)" />
            <Meter label="Storage" value={disk != null ? `${disk.toFixed(0)}%` : 'no data'} percent={disk} color="var(--green)" />
          </div>
        ) : (
          <div className="rings">
            <Ring label="Avg CPU" percent={cpu} detail={cpu != null ? `${cpu.toFixed(1)}%` : 'no data'} color="var(--blue)" />
            <Ring label="Memory" percent={mem} detail="all devices" color="var(--purple)" />
            <Ring label="Storage" percent={disk} detail="all disks" color="var(--green)" />
          </div>
        )}
      </div>
    </WidgetFrame>
  );
}
