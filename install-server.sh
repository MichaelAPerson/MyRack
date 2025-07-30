#!/bin/bash
# MyRack Central API Server Installer v1.2

# Exit on any error, treat unset variables as an error, and pipeline fails on first error.
set -euo pipefail

# --- Display Header ---
echo -e "\n\033[1;35m==================================================\033[0m"
echo -e "\033[1;36m  Installing MyRack Central API Server vBeta.3\033[0m"
echo -e "\033[1;32m  This server will manage and poll your MyRack agents.\033[0m"
echo -e "\033[1;35m==================================================\033[0m\n"

# --- Helper Functions and Initial Setup ---

# Initialize PID variable to prevent unbound variable errors on early exit
SUDO_KEEPALIVE_PID=""

# Function for logging errors and ensuring a clean exit
error_exit() {
  echo -e "\n\033[1;31m✖ ERROR: $1\033[0m"
  echo -e "\033[1;31m  Installation failed. Please check the messages above for details.\033[0m"
  # Clean up the background sudo keep-alive process if it was started
  if [ -n "$SUDO_KEEPALIVE_PID" ]; then
    kill "$SUDO_KEEPALIVE_PID" 2>/dev/null || true
  fi
  exit 1
}

# Trap unexpected errors to call the error_exit function
trap 'error_exit "An unexpected error occurred. Aborting installation."' ERR

# --- Privilege and Prerequisite Checks ---

# 1. CRITICAL: Prevent running as the root user.
if [ "$(id -u)" = "0" ]; then
   error_exit "This script must not be run as root. Please log in as a regular user and run the command again without 'sudo' at the beginning."
fi

# 2. Check for the sudo command itself
if ! command -v sudo >/dev/null 2>&1; then
  error_exit "'sudo' command not found, which is required to install system packages. Please install it first."
fi

# 3. Request sudo privileges upfront and keep the session active.
echo "[*] This installation needs administrator privileges for some steps."
echo "[*] You may be prompted for your password now."
sudo -v || error_exit "Could not obtain sudo privileges. Please run this script as a user with sudo access."

# This loop runs in the background to keep the sudo ticket alive.
(while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done) &
SUDO_KEEPALIVE_PID=$!


# --- Installation Process ---
echo -e "\n[*] \033[1;34mStarting installation...\033[0m"
echo "[*] Updating system package lists..."
sudo apt-get update -y || error_exit "Failed to update package lists."

echo "[*] Installing system packages (Node.js, npm, git)..."
sudo apt-get install -y nodejs npm git || error_exit "Failed to install required packages."

echo "[*] Verifying installations..."
node -v || error_exit "Node.js was not installed correctly."
npm -v || error_exit "npm (Node Package Manager) was not installed correctly."

echo "[*] Creating server directory at ~/myrack-server..."
mkdir -p "$HOME/myrack-server"
cd "$HOME/myrack-server"

echo "[*] Setting up Node.js project and dependencies..."
if [ ! -f "package.json" ]; then
    npm init -y --silent || error_exit "Failed to initialize npm project."
fi
npm install express cors axios --silent || error_exit "Failed to install Node.js packages."

# --- Writing the Application Code ---
echo "[*] Generating the server application file (server.js)..."
cat << 'EOF' > server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DB_FILE = path.join(__dirname, 'servers.json');

app.use(cors());
app.use(express.json());

const readServers = () => { try { return fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE)) : []; } catch (e) { console.error("DB Read Error:", e); return []; } };
const writeServers = (servers) => { try { fs.writeFileSync(DB_FILE, JSON.stringify(servers, null, 2)); } catch (e) { console.error("DB Write Error:", e); } };

let servers = readServers();
let nextId = servers.length > 0 ? Math.max(...servers.map(s => s.id)) + 1 : 1;

app.post('/api/servers', (req, res) => {
  const { name, ip } = req.body;
  if (!name || !ip) return res.status(400).json({ message: 'Name and IP are required.' });
  if (servers.some(s => s.ip === ip)) return res.status(409).json({ message: `Server with IP ${ip} already exists.` });
  const newServer = { id: nextId++, name, ip };
  servers.push(newServer);
  writeServers(servers);
  console.log(`[API] Added: ${name} (${ip})`);
  res.status(201).json(newServer);
});

app.delete('/api/servers/:id', (req, res) => {
  const serverId = parseInt(req.params.id);
  const serverIndex = servers.findIndex(s => s.id === serverId);
  if (serverIndex === -1) return res.status(404).json({ message: 'Server not found' });
  const [deletedServer] = servers.splice(serverIndex, 1);
  writeServers(servers);
  console.log(`[API] Removed: ${deletedServer.name} (${deletedServer.ip})`);
  res.status(204).send();
});

app.get('/api/servers/stats', async (req, res) => {
  const statsPromises = servers.map(async (server) => {
    try {
      const { data } = await axios.get(`http://${server.ip}:4000/stats`, { timeout: 2000 });
      return { ...server, ...data, status: 'online' };
    } catch (error) {
      return { ...server, status: 'offline', cpu: 0, memory: 0, storage: 0, network: 0 };
    }
  });
  res.json(await Promise.all(statsPromises));
});

app.listen(PORT, () => {
  console.log(`MyRack Central API server started on port ${PORT}. Ready for connections.`);
});
EOF

# --- Systemd Service Creation ---
echo "[*] Creating systemd service to run the server in the background..."
SERVICE_FILE="/etc/systemd/system/myrack-server.service"
sudo bash -c "cat > $SERVICE_FILE" << EOF
[Unit]
Description=MyRack Central API Server
After=network.target

[Service]
Type=simple
User=$USER
Group=$(id -gn $USER)
WorkingDirectory=$HOME/myrack-server
ExecStart=$(which node) server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo "[*] Reloading systemd, enabling and starting the server..."
sudo systemctl daemon-reload || error_exit "Failed to reload systemd."
sudo systemctl enable --now myrack-server.service || error_exit "Failed to enable and start the myrack-server service."

# --- Clean up and Finalize ---
kill "$SUDO_KEEPALIVE_PID"
trap - ERR

SERVER_IP=$(hostname -I | awk '{print $1}')

echo -e "\n\033[1;32m✔✔✔ Installation Complete! ✔✔✔\033[0m"
echo -e "\n\033[1;34mThe MyRack Central API Server is running and will start automatically on boot.\033[0m"
echo -e "\033[1;33m----------------------------------------------------------------\033[0m"
echo -e "  Your Central API Server IP is: \033[1;37m$SERVER_IP\033[0m"
echo -e "  The API is listening at:       \033[1;37mhttp://$SERVER_IP:3001\033[0m"
echo -e "\n\033[1;33mACTION REQUIRED: Update the \`API_BASE_URL\` in your React app\033[0m"
echo -e "\033[1;33mto this IP address for the dashboard to connect.\033[0m"
echo -e "\033[1;33m----------------------------------------------------------------\033[0m"
echo -e "\nTo view live logs: \033[1;36mjournalctl -u myrack-server -f\033[0m"
echo -e "To manage the service: \033[1;36msudo systemctl status|restart|stop myrack-server\033[0m\n"
