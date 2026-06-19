#!/usr/bin/env bash
# MyRack agent installer (Linux/macOS).
#
# Usage (this is exactly what the dashboard's "Setup" panel gives you):
#   curl -fsSL http://<hub-host>:4280/install.sh | bash -s -- "http://<hub-host>:4280" "<api-key>"
#
# Prefer to review before running it? Download first, then run it yourself:
#   curl -fsSL http://<hub-host>:4280/install.sh -o install.sh
#   bash install.sh "http://<hub-host>:4280" "<api-key>"
set -euo pipefail

HUB_URL="${1:-}"
API_KEY="${2:-}"
INSTALL_DIR="${3:-$HOME/myrack-agent}"

if [[ -z "$HUB_URL" || -z "$API_KEY" ]]; then
  echo "Usage: install.sh <hub-url> <api-key> [install-dir]" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required but wasn't found on PATH. Install Node.js 18+ first: https://nodejs.org" >&2
  exit 1
fi

echo "Installing MyRack agent into $INSTALL_DIR ..."
mkdir -p "$INSTALL_DIR"
curl -fsSL "$HUB_URL/agent-files/agent.js" -o "$INSTALL_DIR/agent.js"
curl -fsSL "$HUB_URL/agent-files/package.json" -o "$INSTALL_DIR/package.json"

cd "$INSTALL_DIR"
echo "Installing dependencies ..."
npm install --omit=dev --no-audit --no-fund >/dev/null

cat > config.json << CFG
{
  "hubUrl": "$HUB_URL",
  "apiKey": "$API_KEY",
  "intervalSeconds": 5
}
CFG

echo "Starting the agent in the background ..."
nohup node agent.js > agent.log 2>&1 &
disown || true
echo ""
echo "Done. The agent is running (PID $!) and reporting to $HUB_URL."
echo "Logs: $INSTALL_DIR/agent.log"
echo ""
echo "This will not survive a reboot on its own. To make it permanent, see:"
echo "  $INSTALL_DIR/agent.js   (the agent itself)"
echo "and the systemd example at agent/myrack-agent.service.example in the MyRack repo,"
echo "adjusted to point at $INSTALL_DIR."
