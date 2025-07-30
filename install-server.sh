#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
# Treat unset variables as an error.
# The return value of a pipeline is the status of the last command to exit with a non-zero status.
set -euo pipefail

# --- Display Header ---
echo -e "\n\033[1;35m==================================================\033[0m"
echo -e "\033[1;36m  Installing MyRack Central API Server vBeta.2\033[0m"
echo -e "\033[1;32m  This script will set up the central server that\033[0m"
echo -e "\033[1;32m  communicates with all your MyRack monitoring agents.\033[0m"
echo -e "\033[1;35m==================================================\033[0m\n"

# --- Helper Functions ---
error_exit() {
  echo -e "\n\033[1;31m✖ ERROR: $1\033[0m"
  echo -e "\033[1;31m  Installation failed. Please check the messages above for details.\033[0m"
  # Clean up the background sudo keep-alive process if it exists
  if jobs -p | grep -q "$SUDO_KEEPALIVE_PID"; then
    kill "$SUDO_KEEPALIVE_PID"
  fi
  exit 1
}

trap 'error_exit "An unexpected error occurred. Aborting installation."' ERR

# --- Privilege and Prerequisite Checks ---

# 1. Prevent running as root
if [ "$(id -u)" = "0" ]; then
   error_exit "This script must not be run as root. Run it as a regular user with sudo privileges."
fi

# 2. Check for the sudo command
if ! command -v sudo >/dev/null 2>&1; then
  error_exit "'sudo' command not found. Please ensure 'sudo' is installed on your system."
fi

# 3. Ask for sudo password upfront and keep the session alive in the background
echo "[*] This installation requires administrator privileges to install packages and create a system service."
echo "[*] You may be prompted for your password."
sudo -v || error_exit "Failed to obtain sudo privileges. Please run this script as a user with sudo access."

# Keep sudo session alive in a background process
SUDO_KEEPALIVE_PID=""
while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done 2>/dev/null &
SUDO_KEEPALIVE_PID=$!


# --- Installation Process ---
echo -e "\n[*] \033[1;34mStarting installation...\033[0m"
echo "[*] Updating system package lists. This might take a moment..."
sudo apt-get update -y || error_exit "Failed to update package lists. Check your internet connection and repository configuration."

echo "[*] Installing required system packages (Node.js, npm, git)..."
sudo apt-get install -y nodejs npm git || error_exit "Failed to install required packages (nodejs, npm, git)."

echo "[*] Verifying Node.js installation..."
node -v || error_exit "Node.js was not installed correctly."
npm -v || error_exit "npm was not installed correctly."

echo "[*] Setting up the MyRack server directory in your home folder (~/myrack-server)..."
mkdir -p "$HOME/myrack-server"
cd "$HOME/myrack-server"

echo "[*] Setting up Node.js project and installing dependencies (express, cors, axios)..."
# Only run npm init if package.json doesn't exist
if [ ! -f "package.json" ]; then
    npm init -y >/dev/null || error_exit "Failed to initialize npm project."
fi
npm install express cors axios || error_exit "Failed to install required Node.js packages."

# --- Writing the Application Code ---
echo "[*] Generating the server application file (server.js)..."
# This uses a heredoc to write the Node.js code to server.js
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

// --- Database Functions ---
const readServers = () => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE);
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading servers database:", error);
  }
  return []; // Default to empty array
};

const writeServers = (servers) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(servers, null, 2));
  } catch (error) {
    console.error("Error writing to servers database:", error);
  }
};

let servers = readServers();
let nextId = servers.length > 0 ? Math.max(...servers.map(s => s.id)) + 1 : 1;

// --- API Endpoints ---
app.post('/api/servers', (req, res) => {
  const { name, ip } = req.body;
  if (!name || !ip) return res.status(400).json({ message: 'Server name and IP are required.' });
  if (servers.some(s => s.ip === ip)) return res.status(409).json({ message: `Server with IP ${ip} already exists.` });

  const newServer = { id: nextId++, name, ip };
  servers.push(newServer);
  writeServers(servers);
  console.log(`[API] Added server: ${name} (${ip})`);
  res.status(201).json(newServer);
});

app.delete('/api/servers/:id', (req, res) => {
  const serverId = parseInt(req.params.id);
  const serverIndex = servers.findIndex(s => s.id === serverId);

  if (serverIndex === -1) return res.status(404).json({ message: 'Server not found' });

  const [deletedServer] = servers.splice(serverIndex, 1);
  writeServers(servers);
  console.log(`[API] Removed server: ${deletedServer.name} (${deletedServer.ip})`);
  res.status(204).send();
});

app.get('/api/servers/stats', async (req, res) => {
  const statsPromises = servers.map(async (server) => {
    try {
      const agentUrl = `http://${server.ip}:4000/stats`;
      const { data } = await axios.get(agentUrl, { timeout: 2000 });
      return { ...server, ...data, status: 'online' };
    } catch (error) {
      console.error(`[API] Agent offline or error fetching from ${server.name} (${server.ip})`);
      return { ...server, status: 'offline', cpu: 0, memory: 0, storage: 0, network: 0 };
    }
  });

  const allServersWithStats = await Promise.all(statsPromises);
  res.json(allServersWithStats);
});

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`MyRack Central API server started successfully.`);
  console.log(`Listening for requests on port ${PORT}.`);
  console.log(`Ready to connect with your MyRack frontend dashboard.`);
});
EOF

# --- Systemd Service Creation ---
echo "[*] Creating systemd service file to run the server automatically..."
SERVICE_FILE="/etc/systemd/system/myrack-server.service"
# Use 'sudo bash -c' to write the file with root privileges
sudo bash -c "cat > $SERVICE_FILE" << EOF
[Unit]
Description=MyRack Central API Server
After=network.target

[Service]
Type=simple
# Run the service as the user who ran the installation script
User=$USER
Group=$(id -gn $USER)
# Use the full path to the user's home directory
WorkingDirectory=$HOME/myrack-server
# Use the full path to the node executable
ExecStart=$(which node) server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo "[*] Reloading systemd daemon, enabling and starting the server..."
sudo systemctl daemon-reload || error_exit "Failed to reload systemd daemon."
sudo systemctl enable myrack-server.service || error_exit "Failed to enable the MyRack server service."
sudo systemctl restart myrack-server.service || error_exit "Failed to start the MyRack server service."

# --- Clean up and Finalize ---
# Stop the background sudo keep-alive process
kill "$SUDO_KEEPALIVE_PID"

SERVER_IP=$(hostname -I | awk '{print $1}')

echo -e "\n\033[1;32m✔✔✔ MyRack Central API Server installation complete! ✔✔✔\033[0m"
echo -e "\n\033[1;34mThe server is now running in the background and will start automatically on reboot.\033[0m"
echo -e "\033[1;33m----------------------------------------------------------------\033[0m"
echo -e "  Your Central API Server IP is: \033[1;37m$SERVER_IP\033[0m"
echo -e "  The API is accessible at:      \033[1;37mhttp://$SERVER_IP:3001\033[0m"
echo -e "\n\033[1;33mIMPORTANT: You must update the \`API_BASE_URL\` in your React app\033[0m"
echo -e "\033[1;33mto this IP address for the dashboard to work.\033[0m"
echo -e "\033[1;33m----------------------------------------------------------------\033[0m"
echo -e "\nTo view the server's live logs, you can run:"
echo -e "  \033[1;36mjournalctl -u myrack-server -f\033[0m"
echo -e "\nTo manage the service, use these commands:"
echo -e "  \033[1;36msudo systemctl status myrack-server\033[0m"
echo -e "  \033[1;36msudo systemctl restart myrack-server\033[0m"
echo -e "  \033[1;36msudo systemctl stop myrack-server\033[0m\n"
