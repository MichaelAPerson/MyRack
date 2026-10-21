#!/usr/bin/env bash
# MyRack agent installer used by the dashboard's Devices setup command.
set -euo pipefail
umask 077

HUB_URL="${1:-}"
API_KEY="${2:-}"
INSTALL_DIR="${3:-$HOME/myrack-agent}"

if [[ -z "$HUB_URL" || -z "$API_KEY" ]]; then
  echo "Usage: install.sh <hub-url> <api-key> [install-dir]" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18+ is required. Install Node.js first: https://nodejs.org" >&2
  exit 1
fi

HUB_URL="${HUB_URL%/}"
mkdir -p "$INSTALL_DIR"
curl -fsSL "$HUB_URL/agent-files/agent.js" -o "$INSTALL_DIR/agent.js"
curl -fsSL "$HUB_URL/agent-files/package.json" -o "$INSTALL_DIR/package.json"
curl -fsSL "$HUB_URL/agent-files/package-lock.json" -o "$INSTALL_DIR/package-lock.json"

cd "$INSTALL_DIR"
npm ci --omit=dev --no-audit --no-fund
printf '{\n  "hubUrl": "%s",\n  "apiKey": "%s",\n  "intervalSeconds": 5\n}\n' "$HUB_URL" "$API_KEY" > config.json
chmod 600 config.json

nohup node agent.js > agent.log 2>&1 &
AGENT_PID=$!
disown "$AGENT_PID" 2>/dev/null || true
echo "MyRack agent started (PID $AGENT_PID). Logs: $INSTALL_DIR/agent.log"