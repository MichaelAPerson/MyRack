import { useEffect, useState } from 'react';
import WidgetFrame from '../WidgetFrame';
import Sparkline from '../Sparkline';
import UsageBar from '../UsageBar';
import Ring from '../Ring';
import Meter from '../Meter';
import { useTheme } from '../../lib/themeContext';
import { formatBytes, formatUptime, formatRelativeTime } from '../../lib/format';
import { api } from '../../lib/api';
import { socket } from '../../lib/socket';

function pickPrimaryDisk(disks) {
  if (!disks?.length) return null;
  return disks.find((d) => d.mount === '/') || disks[0];
}

export default function StatsWidget({ device, editMode, onRemove }) {
  const [history, setHistory] = useState([]);
  const { meters } = useTheme();
  const deviceId = device?.id;

  // Backfill recent history once, then ride live socket updates from then on.
  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
    api
      .getMetrics(deviceId, 40)
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  useEffect(() => {
    if (!deviceId) return;
    const onUpdate = (payload) => {
      if (payload.deviceId !== deviceId) return;
      setHistory((prev) => [...prev.slice(-59), payload.metric]);
    };
    socket.on('metrics:update', onUpdate);
    return () => socket.off('metrics:update', onUpdate);
  }, [deviceId]);

  if (!device) {
    return (
      <WidgetFrame title="Unknown device" status="offline" editMode={editMode} onRemove={onRemove}>
        <p className="empty-note">This device was removed. Delete this widget or pick another device.</p>
      </WidgetFrame>
    );
  }

  const latest = history[history.length - 1] || device.latest;
  const cpuHistory = history.map((m) => m.cpu ?? 0);
  const memPercent = latest?.mem?.total ? (latest.mem.used / latest.mem.total) * 100 : null;
  const disks = latest?.disks || [];
  const primary = pickPrimaryDisk(disks);
  const diskPercent = primary?.total ? (primary.used / primary.total) * 100 : null;
  const extraDisks = disks.filter((d) => d !== primary).slice(0, 3);
  const dim = !device.online;

  return (
    <WidgetFrame
      title={device.name}
      eyebrow={device.os || 'unknown os'}
      status={device.online ? 'online' : 'offline'}
      editMode={editMode}
      onRemove={onRemove}
    >
      {!latest ? (
        <p className="empty-note">No data reported yet. Make sure the agent is running on this device.</p>
      ) : (
        <div className={`stats ${meters === 'bars' ? 'stats--bars' : ''}`}>
          {meters === 'bars' ? (
            <div className="meters">
              <Meter
                label="CPU"
                value={latest.cpu != null ? `${latest.cpu.toFixed(1)}%` : '—'}
                percent={latest.cpu}
                color="var(--blue)"
                dim={dim}
              />
              <Meter
                label="Memory"
                value={`${formatBytes(latest.mem?.used)} / ${formatBytes(latest.mem?.total)}`}
                percent={memPercent}
                color="var(--purple)"
                dim={dim}
              />
              {disks.slice(0, 3).map((d, i) => (
                <Meter
                  key={d.mount}
                  label={d.mount}
                  value={`${formatBytes(d.used)} / ${formatBytes(d.total)}`}
                  percent={d.total ? (d.used / d.total) * 100 : 0}
                  color="var(--green)"
                  extra={i > 0}
                  dim={dim}
                />
              ))}
            </div>
          ) : (
          <div className="rings">
            <Ring
              label="CPU"
              percent={latest.cpu}
              detail={latest.cpu != null ? `${latest.cpu.toFixed(1)}%` : '—'}
              color="var(--blue)"
              dim={dim}
            />
            <Ring
              label="Memory"
              percent={memPercent}
              detail={`${formatBytes(latest.mem?.used)} / ${formatBytes(latest.mem?.total)}`}
              color="var(--purple)"
              dim={dim}
            />
            {primary && (
              <Ring
                label={primary.mount.length > 8 ? 'Storage' : primary.mount}
                percent={diskPercent}
                detail={`${formatBytes(primary.used)} / ${formatBytes(primary.total)}`}
                color="var(--green)"
                dim={dim}
              />
            )}
          </div>
          )}

          {meters !== 'bars' && extraDisks.length > 0 && (
            <div className="stats__extra">
              {extraDisks.map((d) => (
                <div className="stats__disk" key={d.mount}>
                  <div className="stats__diskHead">
                    <span>{d.mount}</span>
                    <span>
                      {formatBytes(d.used)} / {formatBytes(d.total)}
                    </span>
                  </div>
                  <UsageBar percent={(d.used / d.total) * 100} color="var(--green)" />
                </div>
              ))}
            </div>
          )}

          <div className="stats__spark">
            <Sparkline values={cpuHistory} color="var(--blue)" />
          </div>

          <div className="stats__footer">
            <span>Uptime {formatUptime(latest.uptimeSec)}</span>
            <span>IP {device.ipAddress || 'unavailable'}</span>
            <span>{formatRelativeTime(device.lastSeen)}</span>
          </div>
        </div>
      )}
    </WidgetFrame>
  );
}
