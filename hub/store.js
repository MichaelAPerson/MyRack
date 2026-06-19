// Simple JSON-file backed store. No native dependencies, no DB server to install.
// Good enough for a homelab-scale number of devices and a few weeks of recent metrics.
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');
const MAX_METRICS_PER_DEVICE = 288; // ~24h at 5-minute resolution, or last N points either way

function emptyDb() {
  return { devices: {}, metrics: {}, widgets: {}, auth: null, sessions: {} };
}

function load() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return { ...emptyDb(), ...JSON.parse(raw) };
  } catch (err) {
    return emptyDb();
  }
}

let db = load();

function save() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  // Write atomically-ish: write to temp then rename, to avoid corrupting on crash mid-write
  const tmpPath = DB_PATH + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2));
  fs.renameSync(tmpPath, DB_PATH);
}

module.exports = {
  // --- devices ---
  listDevices() {
    return Object.values(db.devices).sort((a, b) => a.name.localeCompare(b.name));
  },
  getDevice(id) {
    return db.devices[id] || null;
  },
  getDeviceByApiKey(apiKey) {
    return Object.values(db.devices).find((d) => d.apiKey === apiKey) || null;
  },
  createDevice(device) {
    db.devices[device.id] = device;
    db.metrics[device.id] = [];
    save();
    return device;
  },
  updateDevice(id, patch) {
    if (!db.devices[id]) return null;
    db.devices[id] = { ...db.devices[id], ...patch };
    save();
    return db.devices[id];
  },
  deleteDevice(id) {
    delete db.devices[id];
    delete db.metrics[id];
    save();
  },

  // --- metrics ---
  addMetric(deviceId, metric) {
    if (!db.metrics[deviceId]) db.metrics[deviceId] = [];
    db.metrics[deviceId].push(metric);
    if (db.metrics[deviceId].length > MAX_METRICS_PER_DEVICE) {
      db.metrics[deviceId] = db.metrics[deviceId].slice(-MAX_METRICS_PER_DEVICE);
    }
    save();
  },
  getMetrics(deviceId, limit = 60) {
    const all = db.metrics[deviceId] || [];
    return all.slice(-limit);
  },
  getLatestMetric(deviceId) {
    const all = db.metrics[deviceId] || [];
    return all[all.length - 1] || null;
  },

  // --- widgets (dashboard layout) ---
  listWidgets() {
    return Object.values(db.widgets);
  },
  createWidget(widget) {
    db.widgets[widget.id] = widget;
    save();
    return widget;
  },
  updateWidget(id, patch) {
    if (!db.widgets[id]) return null;
    db.widgets[id] = { ...db.widgets[id], ...patch };
    save();
    return db.widgets[id];
  },
  deleteWidget(id) {
    delete db.widgets[id];
    save();
  },

  // --- auth ---
  getAuth() {
    return db.auth;
  },
  setAuth(auth) {
    db.auth = auth;
    save();
  },

  // --- sessions ---
  createSession(session) {
    db.sessions[session.token] = session;
    save();
    return session;
  },
  getSession(token) {
    const session = db.sessions[token];
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      delete db.sessions[token];
      save();
      return null;
    }
    return session;
  },
  deleteSession(token) {
    delete db.sessions[token];
    save();
  },
  pruneExpiredSessions() {
    const now = Date.now();
    let changed = false;
    for (const token of Object.keys(db.sessions)) {
      if (db.sessions[token].expiresAt < now) {
        delete db.sessions[token];
        changed = true;
      }
    }
    if (changed) save();
  },
};
