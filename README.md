# MyRack

🚀 INSTALL MYRACK
MyRack Status Platform Install Script

📘 What is MyRack?
MyRack is a self-hosted monitoring tool for computers and servers. It displays real-time usage of:

💽 CPU
🧠 Memory
🗄️ Storage
No cloud — your data stays on your machines.



## How it's put together

```
myrack/
  hub/        Node.js + Express + Socket.io server. Serves the dashboard and
              the JSON API behind a login, stores devices/metrics/widget
              layout/sessions in a single local file (hub/data/db.json).
  agent/      Node.js script you run on every machine you want monitored.
              Reads stats with `systeminformation`, buffers and retries if
              the hub is unreachable, and POSTs them to the hub.
  frontend/   The dashboard itself - React + Vite + react-grid-layout for the
              drag/resize grid. Builds into hub/public, which the hub serves.
  start.js    One-command production start (see "Running it" below).
```

Data flow: agent reads local stats every few seconds → POSTs to `hub/api/ingest` with its API key → hub stores it and broadcasts it over Socket.io → every logged-in dashboard tab updates live, no polling.

No native dependencies anywhere (deliberately - so installing the agent on a random Windows box doesn't require build tools), and the hub's "database" is a plain JSON file, so there's nothing extra to install or configure beyond Node itself.

## Running it

You need [Node.js](https://nodejs.org) (18+) on the hub machine and on every machine you want to monitor.

### 1. Set up and start the hub

From the repo root, the fastest path:

```
npm run setup     # installs deps for hub, agent, and frontend
npm start         # builds the frontend if needed, then starts the hub
```

`npm start` runs [`start.js`](./start.js), which uses [pm2](https://pm2.keymetrics.io/) to keep the hub running in the background if pm2 is installed (`npm i -g pm2` first), and otherwise just runs it in the foreground. Either way you'll see `MyRack hub listening on http://0.0.0.0:4280`.

If you'd rather run the hub directly without any of that:
```
cd hub
npm install
npm start
```

Open that machine's LAN IP and port in a browser, e.g. `http://192.168.1.5:4280` — that's your dashboard.

**First time opening it**, you'll be asked to create an admin username and password. That's the only account; everyone who has it can see and manage everything. After that, every visit asks you to log in.

To keep the hub running permanently without pm2, see `hub/myrack-hub.service.example` (systemd, Linux) — adjust the paths and `systemctl enable --now myrack-hub`.

### 2. Add a device from the dashboard

Click **Devices** → type a name → **Add**. The drawer shows you a one-line install command, tabbed for Linux/macOS or Windows.

### 3. Run that one command on the device you want monitored

Copy the command and run it on that machine (could be the hub machine itself, or any other Linux/Windows/Mac box on your network):

```
curl -fsSL http://192.168.1.5:4280/install.sh | bash -s -- "http://192.168.1.5:4280" "<api-key>"
```
or, on Windows (from an elevated PowerShell so it also registers at startup):
```
iwr http://192.168.1.5:4280/install.ps1 -OutFile install.ps1
powershell -ExecutionPolicy Bypass -File install.ps1 -HubUrl "http://192.168.1.5:4280" -ApiKey "<api-key>"
```

That single command downloads the agent, installs its dependencies, writes its config, and starts it. On Windows with an elevated prompt, it also registers a scheduled task so it survives reboots; on Linux/Mac, see `agent/myrack-agent.service.example` for the equivalent (systemd).

Not comfortable piping a script straight into a shell? Fair - the dashboard's setup panel links to the raw script so you can read it first and run it locally instead of piping. There's also a "prefer to set it up by hand?" toggle with the plain `config.json` + `npm install` + `npm start` steps, no script involved.

Stats should appear on the dashboard within a few seconds of the agent starting.

### 4. Build your board

**Add widget** lets you pick a device for a live stats widget, or paste any URL for an iframe widget (your router's admin page, a NAS UI, Grafana, anything that allows being embedded). Drag widgets by their header, resize from the corner — layout is saved automatically.

**Enable alerts** (top bar) turns on browser notifications for a device going offline or hitting high CPU. These are local browser notifications, not emails or webhooks - see Roadmap below.

## Operations notes

- **Logs**: the hub writes timestamped logs to both the console and `hub/data/hub.log` — logins, agent connect/disconnect, failed ingests. The agent logs to its own console/log file, including a note whenever it's buffering readings because the hub is unreachable, and when it reconnects.
- **If the hub is briefly unreachable**, the agent buffers up to 100 readings in memory and replays them in order once it's back, instead of silently dropping data. A full agent restart still loses whatever was only in memory, though.
- **Versioning**: every metric report includes the agent's version. If it doesn't match the hub's version, the Devices panel shows a small warning next to that device - everything still works, it's just a heads-up to update.
- **Rotating a key** breaks that device's currently-installed agent until you re-run the install command with the new key on it. That's intentional - it's the only way to revoke a leaked key.

## Known limitations / roadmap

- **Single admin account**, not multi-user/role-based. Fine for "the household" or "the on-call team with one shared login"; not built for per-user permissions.
- **Storage**: metrics live in a single JSON file with the last ~24h kept per device. Great for a homelab-sized fleet; if you grow to dozens of machines or want longer retention, swap `hub/store.js` for SQLite or Postgres - nothing else in the app needs to change.
- **Alerts are local browser notifications only** right now (offline device, high CPU). Webhooks (Slack/Discord/generic) and configurable thresholds are natural next steps if you want alerting that doesn't depend on a browser tab being open.
- **Charts** are intentionally minimal (a raw-SVG CPU sparkline, no charting library). Memory/disk-over-time, network throughput, and temperature graphs are reasonable additions.
- See [SECURITY.md](./SECURITY.md) for what to harden before exposing this past your LAN.

## API reference (hub)

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /api/auth/me` | none | Whether setup is needed / whether you're logged in |
| `POST /api/auth/setup` | none (one-time) | Create the admin account |
| `POST /api/auth/login` / `POST /api/auth/logout` | none / session | Log in or out |
| `GET /api/version` | none | Hub version, used for the agent-version-mismatch check |
| `GET /api/devices` | session | List devices with online status and latest metric (no API keys) |
| `POST /api/devices` `{name}` | session | Create a device, returns its API key (shown once) |
| `DELETE /api/devices/:id` | session | Remove a device and its history |
| `POST /api/devices/:id/rotate-key` | session | Issue a new API key for a device (shown once) |
| `GET /api/devices/:id/metrics?limit=60` | session | Recent metric history |
| `POST /api/ingest` | API key header | Used by the agent to report stats |
| `GET/POST/PUT/DELETE /api/widgets` | session | Dashboard widget layout (position, size, config) |
| `GET /install.sh` / `GET /install.ps1` | none | The agent installer scripts |
| `GET /agent-files/agent.js` / `/agent-files/package.json` | none | Agent source, fetched by the installer scripts |

Socket.io (requires a valid session cookie to connect): `hello` (initial state), `metrics:update`, `device:offline`, `widget:created`, `widget:updated`, `widget:deleted`.
