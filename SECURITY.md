# Security model

MyRack is built to be safe to run on a home network out of the box, and safe enough to expose more broadly if you take the steps below. Here's exactly what is and isn't protected.

## What's protected

- **The dashboard and its API** (`/api/devices`, `/api/widgets`, metrics, everything you can see or change by clicking around) require a logged-in session. There's a single admin account, created the first time anyone opens the hub.
- **Sessions** are an httpOnly cookie, so they're not readable from page JavaScript, and they expire after 30 days.
- **Passwords** are hashed with bcrypt before being stored - the hub never stores or logs a plaintext password.
- **API keys are shown exactly once** - right when a device is created or its key is rotated. The dashboard never sends a key back over the wire after that. If you need to see it again, you rotate it (which issues a new one and means you need to re-run the install command on that device).

## What's intentionally open

- **`POST /api/ingest`** - this is how agents report in. It's authenticated by the device's own API key (sent as a header), not by a login session, since the agent isn't a person who can log in.
- **`/install.sh`, `/install.ps1`, `/agent-files/*`** - the install scripts and the agent's source code. These are public on purpose: the install one-liner needs to fetch them before any pairing has happened, and there's nothing sensitive in them (no keys, no device data).
- **`/api/version`** - just the hub's version number, used to flag agent/hub mismatches.

## Things to know before exposing this past your LAN

MyRack assumes a trusted home or office network by default. If you want to reach it from outside that network:

- **Put it behind a reverse proxy with TLS** (Caddy, nginx, Traefik, Tailscale, etc.). The session cookie isn't marked `secure`, specifically so login still works over plain `http://192.168.x.x` on a LAN - but that also means it isn't forced over HTTPS, so don't send it over the open internet unencrypted.
- **There's one admin account**, not per-user accounts or roles. Anyone with that login can see and change everything, including removing devices and rotating their keys.
- **CORS is wide open** (`origin: true`) so the dashboard works regardless of what IP/hostname you access it by. If you expose the hub publicly, consider tightening this in `hub/server.js`.
- **Install scripts are "curl/iwr piped into a shell."** That's convenient but means trusting the script sight-unseen if you pipe it directly. The dashboard's setup panel also links to the raw script so you can read it first and run it locally instead.
- **Rate limiting isn't implemented** on login or ingest. On an exposed deployment, consider adding it (or putting a reverse proxy in front that does).

## Reporting a security issue

If you find a real vulnerability (not just "this is permissive by design," which is documented above), please open an issue or reach out privately before disclosing publicly, so it can be fixed first.
