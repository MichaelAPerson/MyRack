#!/bin/bash
# MyRack Central API Server Installer (root-compatible)

set -euo pipefail

echo -e "\n\033[1;35m=========================================\033[0m"
echo -e "\033[1;36m  Installing MyRack Central API Server vBeta.3\033[0m"
echo -e "\033[1;32m  By: Michael Fischer\033[0m"
echo -e "\033[1;35m=========================================\033[0m\n"

cat <<EOF

 __  __       ____            _
|  \/  |_   _|  _ \ __ _  ___| | __
| |\/| | | | | |_) / _\` |/ __| |/ /
| |  | | |_| |  _ < (_| | (__|   <
|_|  |_|\__, |_| \_\__,_|\___|_|\_\\
        |___/

EOF

echo -e "\033[1;35m=========================================\033[0m"

SUDO_KEEPALIVE_PID=""

error_exit() {
  echo -e "\n\033[1;31m✖ ERROR: $1\033[0m"
  [ -n "$SUDO_KEEPALIVE_PID" ] && kill "$SUDO_KEEPALIVE_PID" 2>/dev/null || true
  exit 1
}

trap 'error_exit "Something went wrong during installation."' ERR

# Allow running as root
if [ "$(id -u)" = "0" ]; then
  echo "[*] Running as root. Proceeding anyway..."
  USER="root"
  HOME="/root"
fi

echo "[*] Updating package list..."
apt update -y || error_exit "Failed to update packages."

echo "[*] Installing Node.js, npm, git..."
apt install -y nodejs npm git || error_exit "Failed installing dependencies."

echo "[*] Setting up MyRack server directory..."
mkdir -p "$HOME/myrack-server"
cd "$HOME/myrack-server"

echo "[*] Initializing npm project..."
[ -f package.json ] || npm init -y || error_exit "npm init failed."

echo "[*] Installing dependencies..."
npm install express cors axios || error_exit "Dependency install failed."

echo "[*] Writing API server..."
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

const readServers = () => {
  try {
    return fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE)) : [];
  } catch (e) {
    console.error("DB Read Error:", e);
    return [];
  }
};

const writeServers = (servers) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(servers, null, 2));
  } catch (e) {
    console.error("DB Write Error:", e);
  }
};

let servers = readServers();
let nextId = servers.length > 0 ? Math.max(...servers.map(s => s.id)) + 1 : 1;

app.post('/api/servers', (req, res) => {
  const { name, ip } = req.body;
  if (!name || !ip) return res.status(400).json({ message: 'Name and IP are required.' });
  if (servers.some(s => s.ip === ip)) return res.status(409).json({ message: \`Server with IP \${ip} already exists.\` });
  const newServer = { id: nextId++, name, ip };
  servers.push(newServer);
  writeServers(servers);
  console.log(\`[API] Added: \${name} (\${ip})\`);
  res.status(201).json(newServer);
});

app.delete('/api/servers/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = servers.findIndex(s => s.id === id);
  if (index === -1) return res.status(404).json({ message: 'Server not found' });
  const [removed] = servers.splice(index, 1);
  writeServers(servers);
  console.log(\`[API] Removed: \${removed.name} (\${removed.ip})\`);
  res.status(204).send();
});

app.get('/api/servers/stats', async (req, res) => {
  const results = await Promise.all(servers.map(async (server) => {
    try {
      const { data } = await axios.get(\`http://\${server.ip}:4000/stats\`, { timeout: 2000 });
      return { ...server, ...data, status: 'online' };
    } catch {
      return { ...server, status: 'offline', cpu: 0, memory: 0, storage: 0, network: 0 };
    }
  }));
  res.json(results);
});

app.listen(PORT, () => {
  console.log(\`MyRack Central API listening on port \${PORT}.\`);
});
EOF

echo "[*] Creating systemd service..."

SERVICE_FILE="/etc/systemd/system/myrack-server.service"
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=MyRack Central API Server
After=network.target

[Service]
User=$USER
WorkingDirectory=$HOME/myrack-server
ExecStart=$(which node) server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo "[*] Reloading systemd and starting service..."
systemctl daemon-reload || error_exit "systemd reload failed."
systemctl enable --now myrack-server || error_exit "service failed to start."

IP=$(hostname -I | awk '{print $1}')

echo -e "\n\033[1;32m✔✔✔ MyRack Central API Server is installed and running.\033[0m"
echo -e "\033[1;34m  Access it at: http://$IP:3001\033[0m"
echo -e "\033[1;33m  Set your frontend \`API_BASE_URL\` to this IP.\033[0m"
echo -e "\nTo check logs:   \033[1;36mjournalctl -u myrack-server -f\033[0m"
echo -e "To control it:   \033[1;36msystemctl start|stop|restart myrack-server\033[0m"
