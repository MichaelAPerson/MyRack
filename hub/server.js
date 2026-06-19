const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const { nanoid } = require('nanoid');
const store = require('./store');
const auth = require('./auth');
const logger = require('./logger');

const PORT = process.env.PORT || 4280;
const OFFLINE_AFTER_MS = 30 * 1000; // device considered offline if no report in this window
const HUB_VERSION = require('./package.json').version;

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });

// ---------- Helpers ----------

function deviceWithStatus(device) {
  const latest = store.getLatestMetric(device.id);
  const online = !!device.lastSeen && Date.now() - device.lastSeen < OFFLINE_AFTER_MS;
  return { ...device, online, latest };
}

// Never send API keys back over the wire except right after creation/rotation,
// when the admin is expected to copy them down.
function sanitizeDevice(device) {
  const { apiKey, ...rest } = device;
  return rest;
}

function requireAuth(req, res, next) {
  const session = auth.getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });
  req.session = session;
  next();
}

// ---------- Auth ----------

app.get('/api/auth/me', (req, res) => {
  const existingAuth = store.getAuth();
  const session = auth.getSessionFromRequest(req);
  res.json({
    setupRequired: !existingAuth,
    authenticated: !!session,
    username: session?.username || null,
  });
});

app.post('/api/auth/setup', (req, res) => {
  if (store.getAuth()) {
    return res.status(409).json({ error: 'Admin account already exists' });
  }
  const { username, password } = req.body || {};
  if (!username || !username.trim() || !password || password.length < 8) {
    return res.status(400).json({ error: 'Username and a password of at least 8 characters are required' });
  }
  store.setAuth({ username: username.trim(), passwordHash: auth.hashPassword(password) });
  const session = auth.createSession(username.trim());
  auth.setSessionCookie(res, session.token);
  logger.info(`Admin account created (${username.trim()})`);
  res.status(201).json({ ok: true });
});

app.post('/api/auth/login', (req, res) => {
  const existingAuth = store.getAuth();
  if (!existingAuth) return res.status(409).json({ error: 'No admin account exists yet' });
  const { username, password } = req.body || {};
  const valid = username === existingAuth.username && password && auth.verifyPassword(password, existingAuth.passwordHash);
  if (!valid) {
    logger.warn(`Failed login attempt for username "${username}"`);
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  const session = auth.createSession(existingAuth.username);
  auth.setSessionCookie(res, session.token);
  logger.info(`Login: ${existingAuth.username}`);
  res.json({ ok: true });
});

app.post('/api/auth/logout', (req, res) => {
  const session = auth.getSessionFromRequest(req);
  if (session) store.deleteSession(session.token);
  auth.clearSessionCookie(res);
  res.json({ ok: true });
});

// ---------- Device management (dashboard only - requires login) ----------

app.get('/api/devices', requireAuth, (req, res) => {
  res.json(store.listDevices().map(deviceWithStatus).map(sanitizeDevice));
});

app.post('/api/devices', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Device name is required' });
  }
  const device = {
    id: nanoid(10),
    name: name.trim(),
    hostname: null,
    os: null,
    apiKey: nanoid(32),
    agentVersion: null,
    createdAt: Date.now(),
    lastSeen: null,
  };
  store.createDevice(device);
  logger.info(`Device created: ${device.name} (${device.id})`);
  res.status(201).json(device); // include apiKey here - this is the one time the admin needs to see it
});

app.delete('/api/devices/:id', requireAuth, (req, res) => {
  const device = store.getDevice(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  store.deleteDevice(req.params.id);
  logger.info(`Device removed: ${device.name} (${device.id})`);
  res.status(204).end();
});

app.get('/api/devices/:id/metrics', requireAuth, (req, res) => {
  const device = store.getDevice(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const limit = Math.min(parseInt(req.query.limit, 10) || 60, 288);
  res.json(store.getMetrics(req.params.id, limit));
});

// Rotate a device's API key if it leaks or you want to reset it
app.post('/api/devices/:id/rotate-key', requireAuth, (req, res) => {
  const device = store.getDevice(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const updated = store.updateDevice(req.params.id, { apiKey: nanoid(32) });
  logger.info(`API key rotated for device ${device.name} (${device.id})`);
  res.json(updated); // includes the fresh apiKey - same one-time-reveal rule as creation
});

// ---------- Agent ingestion (used by the agent running on each device - API key auth, no login) ----------

const knownOnlineState = new Map(); // deviceId -> bool, used only to log connect/disconnect transitions

app.post('/api/ingest', (req, res) => {
  const apiKey = req.header('X-API-Key');
  if (!apiKey) return res.status(401).json({ error: 'Missing X-API-Key header' });

  const device = store.getDeviceByApiKey(apiKey);
  if (!device) {
    logger.warn(`Ingest rejected: unknown API key`);
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const body = req.body || {};
  const metric = {
    timestamp: typeof body.timestamp === 'number' ? body.timestamp : Date.now(),
    cpu: body.cpu ?? null, // percent 0-100
    mem: body.mem ?? null, // { used, total } bytes
    disks: body.disks ?? [], // [{ mount, used, total }]
    network: body.network ?? null, // { rx, tx } bytes/sec
    uptimeSec: body.uptimeSec ?? null,
    temps: body.temps ?? null, // optional, e.g. { cpu: 52 }
  };

  store.addMetric(device.id, metric);
  store.updateDevice(device.id, {
    lastSeen: Date.now(),
    hostname: body.hostname || device.hostname,
    os: body.os || device.os,
    agentVersion: body.agentVersion || device.agentVersion,
  });

  if (knownOnlineState.get(device.id) !== true) {
    knownOnlineState.set(device.id, true);
    logger.info(`Agent connected: ${device.name} (${device.id})`);
  }

  io.emit('metrics:update', { deviceId: device.id, metric });
  res.json({ ok: true, hubVersion: HUB_VERSION });
});

// Periodic sweep: notice when a device goes quiet, for logging + live status pushes.
setInterval(() => {
  for (const device of store.listDevices()) {
    const online = !!device.lastSeen && Date.now() - device.lastSeen < OFFLINE_AFTER_MS;
    if (knownOnlineState.get(device.id) === true && !online) {
      knownOnlineState.set(device.id, false);
      logger.warn(`Agent went offline: ${device.name} (${device.id})`);
      io.emit('device:offline', { deviceId: device.id });
    }
  }
  store.pruneExpiredSessions();
}, 10 * 1000);

// ---------- Widget layout (dashboard only - requires login) ----------

app.get('/api/widgets', requireAuth, (req, res) => {
  res.json(store.listWidgets());
});

app.post('/api/widgets', requireAuth, (req, res) => {
  const { type, x = 0, y = 0, w = 4, h = 4, config = {} } = req.body;
  if (!type) return res.status(400).json({ error: 'Widget type is required' });
  const widget = { id: nanoid(10), type, x, y, w, h, config, createdAt: Date.now() };
  store.createWidget(widget);
  io.emit('widget:created', widget);
  res.status(201).json(widget);
});

app.put('/api/widgets/:id', requireAuth, (req, res) => {
  const updated = store.updateWidget(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Widget not found' });
  io.emit('widget:updated', updated);
  res.json(updated);
});

app.delete('/api/widgets/:id', requireAuth, (req, res) => {
  store.deleteWidget(req.params.id);
  io.emit('widget:deleted', { id: req.params.id });
  res.status(204).end();
});

// ---------- Public: version, agent source files, install scripts ----------
// These have to be reachable without a login session, since they're fetched
// by the install script / agent before any dashboard session exists. None of
// them expose anything sensitive - just hub version and static agent code.

app.get('/api/version', (req, res) => res.json({ version: HUB_VERSION }));

const AGENT_DIR = path.join(__dirname, '..', 'agent');
app.get('/agent-files/agent.js', (req, res) => res.type('text/javascript').sendFile(path.join(AGENT_DIR, 'agent.js')));
app.get('/agent-files/package.json', (req, res) => res.type('application/json').sendFile(path.join(AGENT_DIR, 'package.json')));

const SCRIPTS_DIR = path.join(__dirname, 'scripts');
app.get('/install.sh', (req, res) => res.type('text/plain').sendFile(path.join(SCRIPTS_DIR, 'install.sh')));
app.get('/install.ps1', (req, res) => res.type('text/plain').sendFile(path.join(SCRIPTS_DIR, 'install.ps1')));

// ---------- Serve the built dashboard frontend ----------

const FRONTEND_DIST = path.join(__dirname, 'public');
app.use(express.static(FRONTEND_DIST));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/agent-files/') || req.path.startsWith('/install.')) {
    return next();
  }
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

// ---------- Socket.io (live updates) - also requires a valid session cookie ----------

function parseCookieHeader(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return out;
}

io.use((socket, next) => {
  const cookies = parseCookieHeader(socket.handshake.headers.cookie);
  const token = cookies[auth.SESSION_COOKIE];
  const session = token ? store.getSession(token) : null;
  if (!session) return next(new Error('unauthenticated'));
  next();
});

io.on('connection', (socket) => {
  // Push current state on connect so the dashboard can hydrate without a separate fetch race
  socket.emit('hello', {
    devices: store.listDevices().map(deviceWithStatus).map(sanitizeDevice),
    widgets: store.listWidgets(),
  });
});

server.listen(PORT, () => {
  logger.info(`MyRack hub v${HUB_VERSION} listening on http://0.0.0.0:${PORT}`);
});
