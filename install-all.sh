#!/bin/bash

set -euo pipefail

echo -e "\n\033[1;35m=========================================\033[0m"
echo -e "\033[1;36m  Installing MyRack Agent + Dashboard v1.0\033[0m"
echo -e "\033[1;32m  By: Michael Fischer\033[0m"
echo -e "\033[1;35m=========================================\033[0m\n"

error_exit() {
  echo -e "\n\033[1;31m✖ Error: $1\033[0m"
  exit 1
}

trap 'error_exit "Something went wrong during installation."' ERR

get_pi_ip() {
  hostname -I | awk '{print $1}'
}

install_node() {
  echo "[*] Installing Node.js, npm, git..."
  sudo apt update
  sudo apt install -y nodejs npm git || error_exit "Failed to install Node.js/npm/git."
}

install_agent() {
  echo "[*] Setting up MyRack agent..."
  mkdir -p ~/myrack-agent
  cd ~/myrack-agent

  echo "[*] Initializing npm project..."
  npm init -y

  echo "[*] Installing agent dependencies..."
  npm install express systeminformation cors

  echo "[*] Writing agent server code..."
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

  echo "[*] Creating systemd service for agent..."
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

  sudo systemctl daemon-reload
  sudo systemctl enable myrack-agent
  sudo systemctl start myrack-agent
  echo "[✔] MyRack Agent installed and running!"
}

install_dashboard() {
  echo "[*] Setting up MyRack dashboard..."
  mkdir -p ~/myrack-dashboard
  cd ~/myrack-dashboard

  echo "[*] Initializing React dashboard..."
  npx create-react-app . || error_exit "Failed to create React app."

  echo "[*] Installing dashboard dependencies..."
  npm install axios recharts tailwindcss@latest postcss@latest autoprefixer@latest
  npx tailwindcss init -p

  # Tailwind setup
  cat << 'EOF' > tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
EOF

  # Example App.js setup
  cat << 'EOF' > src/App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [agents, setAgents] = useState([{ ip: '127.0.0.1' }]); // Add your agents here

  const [stats, setStats] = useState({});

  useEffect(() => {
    agents.forEach(agent => {
      axios.get(`http://${agent.ip}:4000/stats`)
        .then(res => setStats(prev => ({ ...prev, [agent.ip]: res.data })))
        .catch(err => setStats(prev => ({ ...prev, [agent.ip]: { error: 'Offline' } })));
    });
  }, [agents]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">MyRack Dashboard</h1>
      {agents.map(agent => (
        <div key={agent.ip} className="border rounded p-4 mb-2">
          <h2 className="font-semibold">Agent: {agent.ip}</h2>
          <pre>{JSON.stringify(stats[agent.ip], null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}

export default App;
EOF

  echo "[✔] MyRack Dashboard installed!"
  echo "[*] To run dashboard: cd ~/myrack-dashboard && npm start"
}

# Run installation
install_node
install_agent
install_dashboard

PI_IP=$(get_pi_ip)

echo -e "\n\033[1;32m✔ Installation complete!\033[0m"
echo -e "\033[1;34m  Agent IP: $PI_IP\033[0m"
echo -e "\033[1;34m  Dashboard folder: ~/myrack-dashboard\033[0m"
