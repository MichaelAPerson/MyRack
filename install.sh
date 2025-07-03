#!/bin/bash

set -euo pipefail

# === HEADER ===
echo -e "\n\033[1;35m=========================================\033[0m"
echo -e "\033[1;36m  Installing MyRack Agent\033[0m"
echo -e "\033[1;32m  By: Michael Fischer\033[0m"
echo -e "\033[1;35m=========================================\033[0m\n"

# === FUNCTION TO HANDLE ERRORS ===
error_exit() {
  echo -e "\n\033[1;31m✖ Error: $1\033[0m"
  exit 1
}

trap 'error_exit "Something went wrong during installation."' ERR

# === GET PI IP ===
get_pi_ip() {
  hostname -I | awk '{print $1}'
}

# === SYSTEM UPDATE + NODE.JS ===
echo "[*] Updating package list..."
sudo apt update || error_exit "Failed to update packages."

echo "[*] Installing Node.js and npm..."
sudo apt install -y nodejs npm git || error_exit "Failed to install Node.js/npm."

# === PM2 INSTALLATION ===
echo "[*] Installing PM2..."
sudo npm install -g pm2 || error_exit "Failed to install PM2."

# === SETUP AGENT ===
echo "[*] Creating agent directory..."
mkdir -p ~/myrack-agent
cd ~/myrack-agent

echo "[*] Initializing npm project..."
npm init -y || error_exit "npm init failed."

echo "[*] Installing dependencies..."
npm install express systeminformation cors || error_exit "Dependency install failed."

# === WRITE index.js ===
echo "[*] Writing server code..."
cat << 'EOF' > index.js
const express = require('express');
const si = require('systeminformation');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/stats', async (req, res) => {
  try {
    const [cpuLoad, mem, fs, net] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats()
    ]);

    const data = {
      cpu: cpuLoad.currentLoad,
      memory: (mem.active / mem.total) * 100,
      storage: (fs[0].used / fs[0].size) * 100,
      network: (net[0]?.rx_sec + net[0]?.tx_sec) / 1024,
      ip: req.socket.localAddress,
      status: 'online'
    };

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats', detail: err.message });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(\`MyRack agent running at http://localhost:\${PORT}/stats\`);
});
EOF

# === RUNNING WITH PM2 ===
echo "[*] Starting agent with PM2..."
pm2 start index.js --name myrack-agent || error_exit "Failed to start agent with PM2."

echo "[*] Saving PM2 process list..."
pm2 save || error_exit "Failed to save PM2 process."

echo "[*] Enabling startup on boot..."
pm2 startup systemd -u $USER --hp $HOME | tail -n 1 | bash || error_exit "Failed to enable PM2 startup."

# === SHOW IP ===
PI_IP=$(get_pi_ip)

# === SUCCESS ===
echo -e "\n\033[1;32m✔ MyRack Agent installed and running!\033[0m"
echo -e "\033[1;34m  View stats at: http://$PI_IP:4000/stats\033[0m"
