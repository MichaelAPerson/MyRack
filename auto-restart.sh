#!/bin/bash

set -e

echo "Setting up the MyRack agent systemd service..."

AGENT_DIR="${MYRACK_AGENT_DIR:-$HOME/myrack-agent}"
NODE_PATH="$(command -v node || true)"
SERVICE_USER="$(id -un)"

if [[ -z "$NODE_PATH" ]]; then
    echo "Node.js was not found on PATH." >&2
    exit 1
fi

if [[ ! -f "$AGENT_DIR/agent.js" || ! -f "$AGENT_DIR/config.json" ]]; then
    echo "Agent files were not found in $AGENT_DIR. Install the agent first, or set MYRACK_AGENT_DIR." >&2
    exit 1
fi

if ! command -v systemctl >/dev/null 2>&1; then
    echo "systemd is required to install the startup service." >&2
    exit 1
fi

SERVICE_FILE="$(mktemp)"
trap 'rm -f "$SERVICE_FILE"' EXIT
cat > "$SERVICE_FILE" <<UNIT
[Unit]
Description=MyRack monitoring agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory="$AGENT_DIR"
ExecStart="$NODE_PATH" "$AGENT_DIR/agent.js"
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

chmod 600 "$AGENT_DIR/config.json"
sudo install -m 644 "$SERVICE_FILE" /etc/systemd/system/myrack-agent.service
sudo systemctl daemon-reload
sudo systemctl enable --now myrack-agent

echo "MyRack agent is installed and enabled at boot."
echo "Check status with: sudo systemctl status myrack-agent"
