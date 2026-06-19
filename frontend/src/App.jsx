import { useEffect, useState, useCallback, useRef } from 'react';
import TopBar from './components/TopBar';
import DashboardGrid from './components/DashboardGrid';
import DeviceDrawer from './components/DeviceDrawer';
import AddWidgetModal from './components/AddWidgetModal';
import AuthScreen from './components/AuthScreen';
import { api } from './lib/api';
import { socket } from './lib/socket';

const OFFLINE_AFTER_MS = 30 * 1000;
const HIGH_CPU_THRESHOLD = 90;
const HIGH_CPU_RENOTIFY_MS = 5 * 60 * 1000;

function notify(title, body) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/rack-icon.svg' });
  } catch {
    // Notifications can throw in some embedded/insecure contexts - never let this break the app.
  }
}

export default function App() {
  // authStage: 'loading' | 'setup' | 'login' | 'ready'
  const [authStage, setAuthStage] = useState('loading');
  const [username, setUsername] = useState(null);
  const [hubVersion, setHubVersion] = useState(null);

  const [devices, setDevices] = useState([]);
  const [widgets, setWidgets] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addWidgetOpen, setAddWidgetOpen] = useState(false);
  // API keys are only ever sent by the hub right after creation/rotation. We cache them here,
  // in memory only, for the rest of this browser session so re-opening "Setup" doesn't require
  // rotating (and thereby breaking) an already-paired agent's key.
  const [apiKeys, setApiKeys] = useState({});
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );

  const lastCpuAlertRef = useRef({}); // deviceId -> timestamp of last high-cpu notification

  // ---------- Auth bootstrap ----------

  const checkAuth = useCallback(() => {
    api
      .getMe()
      .then((me) => {
        setUsername(me.username);
        if (me.setupRequired) setAuthStage('setup');
        else if (!me.authenticated) setAuthStage('login');
        else setAuthStage('ready');
      })
      .catch(() => setAuthStage('login'));
  }, []);

  useEffect(() => {
    checkAuth();
    api.getVersion().then((v) => setHubVersion(v.version)).catch(() => {});
  }, [checkAuth]);

  const handleLogout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      socket.disconnect();
      setDevices([]);
      setWidgets([]);
      setApiKeys({});
      setAuthStage('login');
    }
  }, []);

  // ---------- Dashboard data, only once authenticated ----------

  useEffect(() => {
    if (authStage !== 'ready') return;

    const onUnauthorized = (err) => {
      if (err?.status === 401) setAuthStage('login');
    };

    Promise.all([api.getDevices(), api.getWidgets()])
      .then(([d, w]) => {
        setDevices(d);
        setWidgets(w);
      })
      .catch(onUnauthorized);

    socket.connect();
    return () => socket.disconnect();
  }, [authStage]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onHello = ({ devices: d, widgets: w }) => {
      setDevices(d);
      setWidgets(w);
    };
    const onMetrics = ({ deviceId, metric }) => {
      setDevices((prev) =>
        prev.map((d) => (d.id === deviceId ? { ...d, lastSeen: Date.now(), latest: metric } : d))
      );
    };
    const onDeviceOffline = ({ deviceId }) => {
      setDevices((prev) => {
        const device = prev.find((d) => d.id === deviceId);
        if (device) notify('Device offline', `${device.name} stopped reporting in.`);
        return prev;
      });
    };
    const onWidgetCreated = (widget) =>
      setWidgets((prev) => (prev.some((w) => w.id === widget.id) ? prev : [...prev, widget]));
    const onWidgetUpdated = (widget) => setWidgets((prev) => prev.map((w) => (w.id === widget.id ? widget : w)));
    const onWidgetDeleted = ({ id }) => setWidgets((prev) => prev.filter((w) => w.id !== id));
    const onConnectError = (err) => {
      if (err?.message === 'unauthenticated') setAuthStage('login');
    };

    socket.on('hello', onHello);
    socket.on('metrics:update', onMetrics);
    socket.on('device:offline', onDeviceOffline);
    socket.on('widget:created', onWidgetCreated);
    socket.on('widget:updated', onWidgetUpdated);
    socket.on('widget:deleted', onWidgetDeleted);
    socket.on('connect_error', onConnectError);
    return () => {
      socket.off('hello', onHello);
      socket.off('metrics:update', onMetrics);
      socket.off('device:offline', onDeviceOffline);
      socket.off('widget:created', onWidgetCreated);
      socket.off('widget:updated', onWidgetUpdated);
      socket.off('widget:deleted', onWidgetDeleted);
      socket.off('connect_error', onConnectError);
    };
  }, []);

  const devicesWithStatus = devices.map((d) => ({
    ...d,
    online: d.lastSeen ? now - d.lastSeen < OFFLINE_AFTER_MS : false,
  }));

  // High-CPU alerts, rate-limited per device. Runs off whatever's already in state -
  // no extra fetching, just watching the live numbers we already have.
  useEffect(() => {
    if (!notificationsEnabled) return;
    for (const d of devicesWithStatus) {
      const cpu = d.latest?.cpu;
      if (cpu == null || cpu < HIGH_CPU_THRESHOLD) continue;
      const last = lastCpuAlertRef.current[d.id] || 0;
      if (Date.now() - last > HIGH_CPU_RENOTIFY_MS) {
        lastCpuAlertRef.current[d.id] = Date.now();
        notify('High CPU', `${d.name} is at ${cpu.toFixed(0)}% CPU.`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices, notificationsEnabled]);

  const requestNotifications = useCallback(() => {
    if (typeof Notification === 'undefined') return;
    Notification.requestPermission().then((perm) => setNotificationsEnabled(perm === 'granted'));
  }, []);

  const addDevice = useCallback(async (name) => {
    const device = await api.createDevice(name);
    setDevices((prev) => [...prev, device]);
    setApiKeys((prev) => ({ ...prev, [device.id]: device.apiKey }));
    return device;
  }, []);

  const deleteDevice = useCallback(async (id) => {
    await api.deleteDevice(id);
    setDevices((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const rotateKey = useCallback(async (id) => {
    const updated = await api.rotateKey(id);
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)));
    setApiKeys((prev) => ({ ...prev, [id]: updated.apiKey }));
    return updated;
  }, []);

  const addWidget = useCallback(
    async (input) => {
      const maxY = widgets.reduce((m, w) => Math.max(m, w.y + w.h), 0);
      const widget = await api.createWidget({ ...input, x: 0, y: maxY });
      setWidgets((prev) => [...prev, widget]);
      setAddWidgetOpen(false);
    },
    [widgets]
  );

  const removeWidget = useCallback(async (id) => {
    await api.deleteWidget(id);
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const commitLayout = useCallback((id, patch) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
    api.updateWidget(id, patch).catch((err) => console.error('Failed to save layout:', err));
  }, []);

  if (authStage === 'loading') {
    return (
      <div className="app">
        <div className="empty-board">
          <p className="empty-board__title">Booting…</p>
        </div>
      </div>
    );
  }

  if (authStage === 'setup' || authStage === 'login') {
    return <AuthScreen mode={authStage} onSuccess={checkAuth} />;
  }

  return (
    <div className="app">
      <TopBar
        devices={devicesWithStatus}
        username={username}
        notificationsEnabled={notificationsEnabled}
        onEnableNotifications={requestNotifications}
        onOpenDevices={() => setDrawerOpen(true)}
        onAddWidget={() => setAddWidgetOpen(true)}
        onLogout={handleLogout}
      />

      <div className="board">
        <DashboardGrid
          widgets={widgets}
          devices={devicesWithStatus}
          onLayoutCommit={commitLayout}
          onRemoveWidget={removeWidget}
          onAddWidget={() => setAddWidgetOpen(true)}
        />
      </div>

      {drawerOpen && (
        <DeviceDrawer
          devices={devicesWithStatus}
          apiKeys={apiKeys}
          hubVersion={hubVersion}
          onClose={() => setDrawerOpen(false)}
          onAddDevice={addDevice}
          onDeleteDevice={deleteDevice}
          onRotateKey={rotateKey}
        />
      )}

      {addWidgetOpen && (
        <AddWidgetModal devices={devicesWithStatus} onClose={() => setAddWidgetOpen(false)} onCreate={addWidget} />
      )}
    </div>
  );
}
