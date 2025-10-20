#!/bin/bash

set -euo pipefail

echo -e "\n\033[1;35m=========================================\033[0m"
echo -e "\033[1;36m  Installing MyRack Dashboard v1.1.2 (Bash Edition)\033[0m"
echo -e "\033[1;32m  By: Michael Fischer\033[0m"
echo -e "\033[1;35m=========================================\033[0m\n"

error_exit() {
  echo -e "\n\033[1;31m✖ Error: $1\033[0m"
  exit 1
}

trap 'error_exit "Something went wrong during installation."' ERR

echo "[*] Updating package list..."
sudo apt update || error_exit "Failed to update packages."

echo "[*] Installing Node.js, npm, git..."
sudo apt install -y nodejs npm git || error_exit "Failed to install Node.js/npm."

echo "[*] Setting up MyRack dashboard directory..."
mkdir -p ~/myrack-dashboard
cd ~/myrack-dashboard

echo "[*] Initializing React app..."
npx create-react-app . || error_exit "Failed to create React app."

echo "[*] Installing dependencies..."
npm install axios recharts framer-motion tailwindcss postcss autoprefixer || error_exit "Dependency install failed."

echo "[*] Setting up Tailwind CSS..."
npx tailwindcss init -p || error_exit "Tailwind setup failed."

# Tailwind config
cat << 'EOF' > tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
EOF

# index.css
cat << 'EOF' > src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #0f172a;
  color: #f8fafc;
}
EOF

# App.js
cat << 'EOF' > src/App.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import ServerCard from "./components/ServerCard";
import StatsSummary from "./components/StatsSummary";

function App() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await axios.get("http://localhost:4000/stats");
      setStats(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-8 text-xl">Loading dashboard...</div>;

  return (
    <div className="p-8 min-h-screen bg-gray-900">
      <h1 className="text-4xl font-bold mb-8">MyRack Dashboard</h1>
      <StatsSummary stats={stats} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        <ServerCard stats={stats} />
      </div>
    </div>
  );
}

export default App;
EOF

# Create components folder
mkdir -p src/components

# ServerCard.js
cat << 'EOF' > src/components/ServerCard.js
import React from "react";
import { motion } from "framer-motion";

export default function ServerCard({ stats }) {
  return (
    <motion.div
      className="bg-gray-800 p-6 rounded-2xl shadow-lg"
      whileHover={{ scale: 1.05 }}
    >
      <h2 className="text-xl font-semibold mb-2">Server</h2>
      <p>IP: {stats.ip}</p>
      <p>Status: {stats.status}</p>
      <p>CPU: {stats.cpu.toFixed(2)}%</p>
      <p>Memory: {stats.memory.toFixed(2)}%</p>
      <p>Storage: {stats.storage.toFixed(2)}%</p>
      <p>Network: {(stats.network / 1024).toFixed(2)} KB/s</p>
    </motion.div>
  );
}
EOF

# StatsSummary.js
cat << 'EOF' > src/components/StatsSummary.js
import React from "react";

export default function StatsSummary({ stats }) {
  return (
    <div className="flex gap-6">
      <div className="bg-gray-800 p-4 rounded-xl w-1/4 text-center">
        <h3 className="font-bold">CPU</h3>
        <p>{stats.cpu.toFixed(2)}%</p>
      </div>
      <div className="bg-gray-800 p-4 rounded-xl w-1/4 text-center">
        <h3 className="font-bold">Memory</h3>
        <p>{stats.memory.toFixed(2)}%</p>
      </div>
      <div className="bg-gray-800 p-4 rounded-xl w-1/4 text-center">
        <h3 className="font-bold">Storage</h3>
        <p>{stats.storage.toFixed(2)}%</p>
      </div>
      <div className="bg-gray-800 p-4 rounded-xl w-1/4 text-center">
        <h3 className="font-bold">Network</h3>
        <p>{(stats.network / 1024).toFixed(2)} KB/s</p>
      </div>
    </div>
  );
}
EOF

echo "[*] Creating systemd service file..."

SERVICE_FILE="/etc/systemd/system/myrack-dashboard.service"

sudo bash -c "cat > $SERVICE_FILE" << EOF
[Unit]
Description=MyRack Dashboard
After=network.target

[Service]
User=$USER
WorkingDirectory=$HOME/myrack-dashboard
ExecStart=$(which npm) start
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo "[*] Reloading systemd daemon..."
sudo systemctl daemon-reload || error_exit "Failed to reload systemd."

echo "[*] Enabling and starting myrack-dashboard service..."
sudo systemctl enable myrack-dashboard || error_exit "Failed to enable service."
sudo systemctl start myrack-dashboard || error_exit "Failed to start service."

echo -e "\n\033[1;32m✔ MyRack Dashboard installed and running!\033[0m"
echo -e "\033[1;34m  Access it via your browser at http://localhost:3000\033[0m"
