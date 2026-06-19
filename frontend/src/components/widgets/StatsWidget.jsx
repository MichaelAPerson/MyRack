import { useEffect, useState } from 'react';
import WidgetFrame from '../WidgetFrame';
import Sparkline from '../Sparkline';
import UsageBar from '../UsageBar';
import { formatBytes, formatUptime, formatRelativeTime } from '../../lib/format';
import { api } from '../../lib/api';
import { socket } from '../../lib/socket';

export default function StatsWidget({ device, onRemove }) {
  const [history, setHistory] = useState([]);
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
      <WidgetFrame title="Unknown device" led="red" onRemove={onRemove}>
        <p className="empty-note">This device was removed. Delete this widget or pick another device.</p>
      </WidgetFrame>
    );
  }

  const latest = history[history.length - 1] || device.latest;
  const cpuHistory = history.map((m) => m.cpu ?? 0);
  const memPercent = latest?.mem ? (latest.mem.used / latest.mem.total) * 100 : null;

  return (
    <WidgetFrame
      title={device.name}
      eyebrow={device.os || 'unknown os'}
      led={device.online ? 'online' : 'offline'}
      onRemove={onRemove}
    >
      {!latest ? (
        <p className="empty-note">No data reported yet. Make sure the agent is running on this device.</p>
      ) : (
        <div className="stats-widget">
          <div className="stats-widget__metric">
            <div className="stats-widget__metricHead">
              <span className="stats-widget__label">CPU</span>
              <span className="stats-widget__value">{latest.cpu?.toFixed(1) ?? '—'}%</span>
            </div>
            <Sparkline values={cpuHistory} color="var(--amber)" />
          </div>

          <div className="stats-widget__metric">
            <div className="stats-widget__metricHead">
              <span className="stats-widget__label">Memory</span>
              <span className="stats-widget__value">
                {formatBytes(latest.mem?.used)} / {formatBytes(latest.mem?.total)}
              </span>
            </div>
            <UsageBar percent={memPercent} color="var(--led-blue)" />
          </div>

          {(latest.disks || []).slice(0, 3).map((d) => (
            <div className="stats-widget__metric" key={d.mount}>
              <div className="stats-widget__metricHead">
                <span className="stats-widget__label">{d.mount}</span>
                <span className="stats-widget__value">
                  {formatBytes(d.used)} / {formatBytes(d.total)}
                </span>
              </div>
              <UsageBar percent={(d.used / d.total) * 100} color="var(--led-green)" />
            </div>
          ))}

          <div className="stats-widget__footer">
            <span>Uptime {formatUptime(latest.uptimeSec)}</span>
            <span>{formatRelativeTime(device.lastSeen)}</span>
          </div>
        </div>
      )}
    </WidgetFrame>
  );
}
