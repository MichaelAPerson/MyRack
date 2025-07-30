#!/bin/bash

# Stop on any error
set -euo pipefail

# --- Pre-flight Checks ---
echo -e "\n\033[1;35m==================================================\033[0m"
echo -e "\033[1;36m  Installing MyRack Central API Server v1.0\033[0m"
echo -e "\033[1;32m  This server will manage and poll your MyRack agents.\033[0m"
echo -e "\033[1;35m==================================================\033[0m\n"

# Function for logging errors
error_exit() {
  echo -e "\n\033[1;31m✖ ERROR: $1\033[0m"
  echo -e "\033[1;31m  Installation failed. Please check the logs above.\033[0m"
  exit 1
}

# Trap errors for a clean exit message
trap 'error_exit "An unexpected error occurred."' ERR

# Check if running as root, as sudo will be used for system-level changes
if [ "$(id -u)" = "0" ]; then
   error_exit "This script should not be run as root. Run it as a regular user with sudo privileges."
fi

# Function to get the primary IP address
get_primary_ip() {
  hostname -I | awk '{print $1}'
}


# --- Installation Steps ---
echo "[*] Updating package list. This may take a moment..."
sudo apt-get update -y || error_exit "Failed to update package lists."

echo "[*] Checking for and installing required packages (Node.js, npm, git)..."
sudo apt-get install -y nodejs npm git || error_exit "Failed to install required packages (nodejs, npm, git)."

# Verify Node.js and npm are installed
command -v node >/dev/null 2>&1 || error_exit "Node.js installation failed."
command -v npm >/dev/null 2>&1 || error_exit "npm (Node Package Manager) installation failed."

echo "[*] Node.js and npm are installed."
echo "[*] Setting up MyRack server directory at ~/myrack-server..."
mkdir -p ~/myrack-server
cd ~/myrack-server

echo "[*] Initializing Node.js project and installing dependencies (express, cors, axios)..."
# Check if package.json exists to avoid re-initializing
if [ ! -f "package.json" ]; then
    npm init -y || error_exit "Failed to initialize npm project."
fi
npm install express cors axios || error_exit "Failed to install Node.js dependencies."


# --- Write the Server Application Code ---
echo "[*] Creating the central API server application file (server.js)..."
cat << 'EOF' > server.js
// server.js - Central API to communicate with MyRack Agents
const express = require('express');
const cors = require('cors');
const axios = require('axios'); // Used to make HTTP requests to agents
const fs = require('fs'); // To save servers list to a file
const app = express();
const port = 3001; // Port for this central API

app.use(cors()); // Allow your React app to talk to this server
app.use(express.json()); // Allow server to read JSON from requests

// --- DATABASE (JSON file for persistence) ---
const DB_FILE = './servers.json';

// Function to read servers from the file
const readServers = () => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE);
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading servers database:", error);
  }
  return []; // Return empty array if file doesn't exist or is corrupt
};

// Function to write servers to the file
const writeServers = (servers) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(servers, null, 2));
  } catch (error) {
    console.error("Error writing to servers database:", error);
  }
};

let servers = readServers();
let nextId = servers.length > 0 ? Math.max(...servers.map(s => s.id)) + 1 : 1;

// --- API ENDPOINTS FOR THE REACT FRONTEND ---

// [POST] /api/servers - Add a new server to monitor
app.post('/api/servers', (req, res) => {
  const { name, ip } = req.body;
  if (!name || !ip) {
    return res.status(400).json({ message: 'Server name and IP are required.' });
  }
  if (servers.some(s => s.ip === ip)) {
    return res.status(409).json({ message: `Server with IP ${ip} already exists.` });
  }
  const newServer = { id: nextId++, name, ip };
  servers.push(newServer);
  writeServers(servers); // Save to file
  console.log(`[API] Added server: ${name} (${ip})`);
  res.status(201).json(newServer);
});

// [DELETE] /api/servers/:id - Remove a server from the list
app.delete('/api/servers/:id', (req, res) => {
    const serverId = parseInt(req.params.id);
    const serverIndex = servers.findIndex(s => s.id === serverId);

    if (serverIndex === -1) {
        return res.status(404).json({ message: 'Server not found' });
    }
    
    const [deletedServer] = servers.splice(serverIndex, 1);
    writeServers(servers); // Save to file
    console.log(`[API] Removed server: ${deletedServer.name} (${deletedServer.ip})`);
    res.status(204).send();
});

// [GET] /api/servers/stats - The main endpoint for the dashboard to get all live data
app.get('/api/servers/stats', async (req, res) => {
  const statsPromises = servers.map(async (server) => {
    try {
      const agentUrl = `http://${server.ip}:4000/stats`;
      const response = await axios.get(agentUrl, { timeout: 2000 });
      return { ...server, ...response.data, status: 'online' };
    } catch (error) {
      console.error(`[API] Agent offline or error fetching from ${server.name} (${server.ip})`);
      return { ...server, status: 'offline', cpu: 0, memory: 0, storage: 0, network: 0 };
    }
  });

  const allServersWithStats = await Promise.all(statsPromises);
  res.json(allServersWithStats);
});

// Start the server
app.listen(port, () => {
  console.log(`MyRack Central API server started. Listening on http://localhost:${port}`);
  console.log('This server is now ready to be connected to from your MyRack frontend.');
});
EOF


# --- Systemd Service Setup ---
echo "[*] Creating systemd service to run the server in the background..."
SERVICE_FILE="/etc/systemd/system/myrack-server.service"

sudo bash -c "cat > $SERVICE_FILE" << EOF
[Unit]
Description=MyRack Central API Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/myrack-server
# Ensure we use the absolute path to node
ExecStart=$(which node) server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo "[*] Reloading systemd, enabling and starting the myrack-server service..."
sudo systemctl daemon-reload || error_exit "Failed to reload systemd daemon."
sudo systemctl enable myrack-server.service || error_exit "Failed to enable myrack-server service."
sudo systemctl restart myrack-server.service || error_exit "Failed to start or restart myrack-server service."


# --- Final Output ---
SERVER_IP=$(get_primary_ip)

echo -e "\n\033[1;32m✔✔✔ MyRack Central API Server installation complete! ✔✔✔\033[0m"
echo -e "\n\033[1;34mThe server is now running and will start automatically on boot.\033[0m"
echo -e "\033[1;33m----------------------------------------------------------------\033[0m"
echo -e "  Your Central API Server IP is: \033[1;37m$SERVER_IP\033[0m"
echo -e "  The API is accessible at:      \033[1;37mhttp://$SERVER_IP:3001\033[0m"
echo -e "\n\033[1;33mYou must configure this URL in your React application (\`App.js\`) \033[0m"
echo -e "\033[1;33mfor the dashboard to connect to the server.\033[0m"
echo -e "\033[1;33m----------------------------------------------------------------\033[0m"
echo -e "\nTo view the server logs, run: \033[1;36mjournalctl -u myrack-server -f\033[0m"
echo -e "To manage the service, use: \033[1;36msudo systemctl [status|start|stop|restart] myrack-server\033[0m\n"
