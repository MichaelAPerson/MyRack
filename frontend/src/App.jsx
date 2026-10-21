import { useEffect, useState, useCallback, useRef } from 'react';
import HomeHeader from './components/HomeHeader';
import DashboardGrid from './components/DashboardGrid';
import AppGrid from './components/AppGrid';
import AppWindow from './components/AppWindow';
import DevicesSheet from './components/DevicesSheet';
import SettingsSheet from './components/SettingsSheet';
import AddWidgetModal from './components/AddWidgetModal';
import AuthScreen from './components/AuthScreen';
import Logo from './components/Logo';
import { api } from './lib/api';
import { socket } from './lib/socket';

const OFFLINE_AFTER_MS = 30 * 1000;
const HIGH_CPU_THRESHOLD = 90;
const HIGH_CPU_RENOTIFY_MS = 5 * 60 * 1000;
const HEADER_CONTENT_KEY = 'myrack.header-content';
const DEFAULT_HEADER_CONTENT = {
  title: [{ type: 'greeting' }, { type: 'username' }],
  subtitle: [{ type: 'date' }, { type: 'time' }],
  weatherLocation: '',
  fahrenheit: false,
};

function loadHeaderContent() {
  try {
    const saved = JSON.parse(localStorage.getItem(HEADER_CONTENT_KEY) || 'null');
    return {
      ...DEFAULT_HEADER_CONTENT,
      ...(saved && typeof saved === 'object' ? saved : {}),
      title: Array.isArray(saved?.title) ? saved.title : DEFAULT_HEADER_CONTENT.title,
      subtitle: Array.isArray(saved?.subtitle) ? saved.subtitle : DEFAULT_HEADER_CONTENT.subtitle,
    };
  } catch {
    return DEFAULT_HEADER_CONTENT;
  }
}

function notify(title, body) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/rack-icon.svg' });
  } catch {
    // Notifications can throw in some embedded/insecure contexts - never let this break the app.
  }
}

const GRID_COLS = 12;

// First free spot (reading order) for a w x h widget among the ones already placed.
// Within a row it prefers columns that are multiples of the widget's width, which keeps
// mixed-size widgets lined up on a tidy grid instead of ending up ragged.
function findSlot(placed, w, h) {
  const hits = (x, y) => placed.some((e) => x < e.x + e.w && x + w > e.x && y < e.y + e.h && y + h > e.y);
  const all = Array.from({ length: GRID_COLS - w + 1 }, (_, x) => x);
  const xs = [...all.filter((x) => x % w === 0), ...all.filter((x) => x % w !== 0)];
  for (let y = 0; y < 500; y++) {
    for (const x of xs) {
      if (!hits(x, y)) return { x, y };
    }
  }
  return { x: 0, y: placed.reduce((m, e) => Math.max(m, e.y + e.h), 0) };
}

export default function App() {
  // authStage: 'loading' | 'setup' | 'login' | 'ready'
  const [authStage, setAuthStage] = useState('loading');
  const [username, setUsername] = useState(null);
  const [hubVersion, setHubVersion] = useState(null);

  const [devices, setDevices] = useState([]);
  const [widgets, setWidgets] = useState([]);
  const [headerContent, setHeaderContent] = useState(loadHeaderContent);
  const headerContentRef = useRef(headerContent);
  const headerSaveTimerRef = useRef(null);
  const headerSaveRevisionRef = useRef(0);
  const headerSavePendingRef = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addWidgetOpen, setAddWidgetOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [openApp, setOpenApp] = useState(null);
  const homeRef = useRef(null);
  // API keys are only ever sent by the hub right after creation/rotation. We cache them here,
  // in memory only, for the rest of this browser session so re-opening "Setup" doesn't require
  // rotating (and thereby breaking) an already-paired agent's key.
  const [apiKeys, setApiKeys] = useState({});
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );

  const lastCpuAlertRef = useRef({}); // deviceId -> timestamp of last high-cpu notification

  const applyHeaderContent = useCallback((content) => {
    headerContentRef.current = content;
    setHeaderContent(content);
  }, []);

  const saveHeaderContent = useCallback((content) => {
    applyHeaderContent(content);
    headerSavePendingRef.current = true;
    const revision = ++headerSaveRevisionRef.current;
    clearTimeout(headerSaveTimerRef.current);
    headerSaveTimerRef.current = setTimeout(() => {
      headerSaveTimerRef.current = null;
      api.updateHeaderContent(content)
        .then((result) => {
          if (revision !== headerSaveRevisionRef.current) return;
          headerSavePendingRef.current = false;
          applyHeaderContent(result.headerContent);
        })
        .catch((err) => {
          if (revision !== headerSaveRevisionRef.current) return;
          headerSavePendingRef.current = false;
          console.error('Failed to sync header settings:', err);
        });
    }, 250);
  }, [applyHeaderContent]);

  const applyRemoteHeaderContent = useCallback((content) => {
    if (!content || headerSavePendingRef.current) return;
    applyHeaderContent(content);
  }, [applyHeaderContent]);

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
      setSettingsOpen(false);
      setDrawerOpen(false);
      setOpenApp(null);
      setEditMode(false);
      setAuthStage('login');
    }
  }, []);

  // ---------- Dashboard data, only once authenticated ----------

  useEffect(() => {
    if (authStage !== 'ready') return;

    const onUnauthorized = (err) => {
      if (err?.status === 401) setAuthStage('login');
    };

    Promise.all([api.getDevices(), api.getWidgets(), api.getHeaderContent()])
      .then(([d, w, settings]) => {
        setDevices(d);
        setWidgets(w);
        if (settings.headerContent) {
          applyRemoteHeaderContent(settings.headerContent);
        } else {
          const initialContent = headerContentRef.current;
          api.updateHeaderContent(initialContent)
            .then((result) => {
              if (headerSaveRevisionRef.current === 0) applyRemoteHeaderContent(result.headerContent);
            })
            .catch((err) => console.error('Failed to initialize shared header settings:', err));
        }
      })
      .catch(onUnauthorized);

    socket.connect();
    return () => socket.disconnect();
  }, [authStage, applyRemoteHeaderContent]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, [applyRemoteHeaderContent]);

  useEffect(() => {
    try {
      localStorage.setItem(HEADER_CONTENT_KEY, JSON.stringify(headerContent));
    } catch {
      // Header preferences remain usable for this session if storage is unavailable.
    }
  }, [headerContent]);

  useEffect(() => {
    const onHello = ({ devices: d, widgets: w, headerContent: sharedHeaderContent }) => {
      setDevices(d);
      setWidgets(w);
      applyRemoteHeaderContent(sharedHeaderContent);
    };
    const onHeaderUpdated = applyRemoteHeaderContent;
    const onMetrics = ({ deviceId, metric, ipAddress }) => {
      setDevices((prev) =>
        prev.map((d) => (d.id === deviceId ? { ...d, lastSeen: Date.now(), latest: metric, ipAddress: ipAddress || d.ipAddress } : d))
      );
    };
    const onDeviceCreated = (device) =>
      setDevices((prev) => (prev.some((d) => d.id === device.id) ? prev : [...prev, device]));
    const onDeviceUpdated = (device) =>
      setDevices((prev) => prev.map((d) => (d.id === device.id ? { ...d, ...device } : d)));
    const onDeviceDeleted = ({ deviceId }) => {
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      setApiKeys((prev) => {
        if (!(deviceId in prev)) return prev;
        const next = { ...prev };
        delete next[deviceId];
        return next;
      });
    };
    const onDeviceKeyRotated = ({ deviceId }) => {
      setApiKeys((prev) => {
        if (!(deviceId in prev)) return prev;
        const next = { ...prev };
        delete next[deviceId];
        return next;
      });
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
    socket.on('header:updated', onHeaderUpdated);
    socket.on('metrics:update', onMetrics);
    socket.on('device:created', onDeviceCreated);
    socket.on('device:updated', onDeviceUpdated);
    socket.on('device:deleted', onDeviceDeleted);
    socket.on('device:key-rotated', onDeviceKeyRotated);
    socket.on('device:offline', onDeviceOffline);
    socket.on('widget:created', onWidgetCreated);
    socket.on('widget:updated', onWidgetUpdated);
    socket.on('widget:deleted', onWidgetDeleted);
    socket.on('connect_error', onConnectError);
    return () => {
      socket.off('hello', onHello);
      socket.off('header:updated', onHeaderUpdated);
      socket.off('metrics:update', onMetrics);
      socket.off('device:created', onDeviceCreated);
      socket.off('device:updated', onDeviceUpdated);
      socket.off('device:deleted', onDeviceDeleted);
      socket.off('device:key-rotated', onDeviceKeyRotated);
      socket.off('device:offline', onDeviceOffline);
      socket.off('widget:created', onWidgetCreated);
      socket.off('widget:updated', onWidgetUpdated);
      socket.off('widget:deleted', onWidgetDeleted);
      socket.off('connect_error', onConnectError);
    };
  }, [applyRemoteHeaderContent]);

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
    setDevices((prev) => (prev.some((d) => d.id === device.id) ? prev : [...prev, device]));
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
      // Device widgets flow into the next free slot (so they fill a row before starting a new one).
      // Apps are ordered by position too, so they just go to the end.
      let pos;
      if (input.type === 'iframe') {
        pos = { x: 0, y: widgets.reduce((m, w) => Math.max(m, w.y + w.h), 0) };
      } else {
        pos = findSlot(widgets.filter((w) => w.type !== 'iframe'), input.w, input.h);
      }
      const widget = await api.createWidget({ ...input, ...pos });
      // The socket 'widget:created' event can beat this response here, so don't add it twice.
      setWidgets((prev) => (prev.some((w) => w.id === widget.id) ? prev : [...prev, widget]));
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

  // Re-flow every device widget into tidy rows, keeping their current order and sizes.
  const autoArrange = useCallback(() => {
    const ordered = widgets.filter((w) => w.type !== 'iframe').sort((a, b) => a.y - b.y || a.x - b.x);
    const placed = [];
    for (const w of ordered) {
      const { x, y } = findSlot(placed, w.w, w.h);
      placed.push({ ...w, x, y });
      if (w.x !== x || w.y !== y) commitLayout(w.id, { x, y });
    }
  }, [widgets, commitLayout]);

  const goHome = useCallback(() => {
    setDrawerOpen(false);
    setSettingsOpen(false);
    setAddWidgetOpen(false);
    setOpenApp(null);
    setEditMode(false);
    homeRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const statsWidgets = widgets.filter((w) => w.type !== 'iframe');
  const appWidgets = widgets.filter((w) => w.type === 'iframe');
  const view = drawerOpen ? 'devices' : settingsOpen ? 'settings' : 'home';

  const wallpaperLayer = <div className="wallpaper" aria-hidden="true" />;

  if (authStage === 'loading') {
    return (
      <div className="shell">
        {wallpaperLayer}
        <div className="boot">
          <Logo size={64} />
        </div>
      </div>
    );
  }

  if (authStage === 'setup' || authStage === 'login') {
    return (
      <div className="shell">
        {wallpaperLayer}
        <AuthScreen mode={authStage} onSuccess={checkAuth} />
      </div>
    );
  }

  return (
    <div className="shell">
      {wallpaperLayer}

      <main className="home" ref={homeRef}>
        <HomeHeader
          username={username}
          devices={devicesWithStatus}
          content={headerContent}
          onHeaderContentChange={saveHeaderContent}
          editMode={editMode}
          onAutoArrange={autoArrange}
          onDoneEditing={() => setEditMode(false)}
          navigation={{
            view,
            editMode,
            onHome: goHome,
            onDevices: () => {
              setSettingsOpen(false);
              setDrawerOpen(true);
            },
            onAdd: () => setAddWidgetOpen(true),
            onToggleEdit: () => setEditMode((value) => !value),
            onSettings: () => {
              setDrawerOpen(false);
              setSettingsOpen(true);
            },
          }}
        />

        {statsWidgets.length === 0 && appWidgets.length === 0 ? (
          <div className="empty-home">
            <p className="empty-home__title">Your home is empty</p>
            <p className="empty-home__hint">
              Add a widget to watch a device's stats, or add an app to launch anything on your network.
            </p>
            <div className="empty-home__actions">
              <button type="button" className="btn btn--primary" onClick={() => setAddWidgetOpen(true)}>
                Add widget or app
              </button>
              <button type="button" className="btn" onClick={() => setDrawerOpen(true)}>
                Set up a device
              </button>
            </div>
          </div>
        ) : (
          <>
            {statsWidgets.length > 0 && (
              <section className="home-section">
                <DashboardGrid
                  widgets={statsWidgets}
                  devices={devicesWithStatus}
                  editMode={editMode}
                  onLayoutCommit={commitLayout}
                  onRemoveWidget={removeWidget}
                  onConfigChange={(id, config) => commitLayout(id, { config })}
                />
              </section>
            )}
            <section className="home-section">
              <AppGrid
                apps={appWidgets}
                editMode={editMode}
                onOpen={setOpenApp}
                onRemove={removeWidget}
                onAdd={() => setAddWidgetOpen(true)}
              />
            </section>
          </>
        )}



<footer className="home-footer">
  <a
    className="home-footer__brand"
    href="https://myrack.ct.ws"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="MyRack website"
  >
    <Logo size={18} />
    <span>MyRack</span>
    <span className="home-footer__version">v1.0.0</span>
  </a>

  <span className="home-footer__note">
    Copyright © {new Date().getFullYear()} MyRack. All rights reserved. Made by{" "}
    <a
      href="https://github.com/MichaelAPerson"
      target="_blank"
      rel="noopener noreferrer"
    >
      Michael Fischer
    </a>
  </span>

  <a
    className="home-footer__link"
    href="https://github.com/MichaelAPerson/MyRack"
    target="_blank"
    rel="noopener noreferrer"
  >
    View on GitHub <span aria-hidden="true">↗</span>
  </a>
</footer>


      </main>

      {openApp && <AppWindow app={openApp} onClose={() => setOpenApp(null)} />}

      {drawerOpen && (
        <DevicesSheet
          devices={devicesWithStatus}
          apiKeys={apiKeys}
          hubVersion={hubVersion}
          onClose={() => setDrawerOpen(false)}
          onAddDevice={addDevice}
          onDeleteDevice={deleteDevice}
          onRotateKey={rotateKey}
        />
      )}

      {settingsOpen && (
        <SettingsSheet
          username={username}
          headerContent={headerContent}
          onHeaderContentChange={saveHeaderContent}
          hubVersion={hubVersion}
          notificationsEnabled={notificationsEnabled}
          onEnableNotifications={requestNotifications}
          onLogout={handleLogout}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {addWidgetOpen && (
        <AddWidgetModal devices={devicesWithStatus} onClose={() => setAddWidgetOpen(false)} onCreate={addWidget} />
      )}
    </div>
  );
}
