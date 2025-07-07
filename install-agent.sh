#!/bin/bash

set -euo pipefail

echo -e "\n\033[1;35m=========================================\033[0m"
echo -e "\033[1;36m  Installing MyRack Agent\033[0m"
echo -e "\033[1;32m  By: Michael Fischer\033[0m"
echo -e "\033[1;35m=========================================\033[0m\n"

echo -e "\n\033[1;35m=========================================\033[0m"

cat <<EOF

 __  __       ____            _
|  \/  |_   _|  _ \ __ _  ___| | __
| |\/| | | | | |_) / _\` |/ __| |/ /
| |  | | |_| |  _ < (_| | (__|   <
|_|  |_|\__, |_| \_\__,_|\___|_|\_\\
        |___/

EOF

echo -e "\033[1;35m=========================================\033[0m"



error_exit() {
  echo -e "\n\033[1;31m✖ Error: $1\033[0m"
  exit 1
}

trap 'error_exit "Something went wrong during installation."' ERR

get_pi_ip() {
  hostname -I | awk '{print $1}'
}

echo "[*] Updating package list..."
sudo apt update || error_exit "Failed to update packages."

echo "[*] Installing Node.js, npm, git..."
sudo apt install -y nodejs npm git || error_exit "Failed to install Node.js/npm."

echo "[*] Setting up MyRack agent directory..."
mkdir -p ~/myrack-agent
cd ~/myrack-agent

echo "[*] Initializing npm project..."
npm init -y || error_exit "npm init failed."

echo "[*] Installing dependencies..."
npm install express systeminformation cors || error_exit "Dependency install failed."

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
  console.log(`MyRack agent running at http://localhost:${PORT}/stats`);
});
EOF

echo "[*] Creating systemd service file..."

SERVICE_FILE="/etc/systemd/system/myrack-agent.service"

sudo bash -c "cat > $SERVICE_FILE" << EOF
[Unit]
Description=MyRack Agent
After=network.target

[Service]
User=$USER
WorkingDirectory=$HOME/myrack-agent
ExecStart=$(which node) index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo "[*] Reloading systemd daemon..."
sudo systemctl daemon-reload || error_exit "Failed to reload systemd."

echo "[*] Enabling and starting myrack-agent service..."
sudo systemctl enable myrack-agent || error_exit "Failed to enable service."
sudo systemctl start myrack-agent || error_exit "Failed to start service."

PI_IP=$(get_pi_ip)

echo -e "\n\033[1;32m✔ MyRack Agent installed and running!\033[0m"
echo -e "\033[1;34m  Add this device to your MyRack dashboard with: $PI_IP\033[0m"
echo -e "\033[1;34m  If you don't have the MyRack dashboard setup, install it with:\033[0m"
echo -e "\033[1;36m  curl -s https://raw.githubusercontent.com/MyRack/myrack-agent/master/install-agent.sh | bash\033[0m"

echo -e "\n\033[1;35m=========================================\033[0m"
echo -e "\033[1;36m  Installed MyRack Agent\033[0m"
echo -e "\033[1;32m  By: Michael Fischer\033[0m"
echo -e "\033[1;35m=========================================\033[0m\n"
