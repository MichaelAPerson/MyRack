#!/bin/bash

set -euo pipefail

echo -e "\n\033[1;35m=========================================\033[0m"
echo -e "\033[1;36m  Installing MyRack Server vBeta.14 Bash Edition)\033[0m"
echo -e "\033[1;32m  By: Michael Fischer\033[0m"
echo -e "\033[1;35m=========================================\033[0m\n"

cat << 'EOF'

 __  __       ____            _
|  \/  |_   _|  _ \ __ _  ___| | __
| |\/| | | | | |_) / _` |/ __| |/ /
| |  | | |_| |  _ < (_| | (__|   <
|_|  |_|\__, |_| \_\__,_|\___|_|\_\
        |___/

EOF

echo -e "\033[1;35m=========================================\033[0m"

error_exit() {
  echo -e "\n\033[1;31m✖ Error: $1\033[0m"
  exit 1
}

trap 'error_exit "Something went wrong during installation."' ERR

echo "[*] Updating package list..."
sudo apt-get update || error_exit "Failed to update packages."

echo "[*] Installing Node.js, npm..."
sudo apt-get install -y nodejs npm || error_exit "Failed to install Node.js/npm."

echo "[*] Installing create-react-app..."
sudo npm install -g create-react-app || error_exit "Failed to install create-react-app."

APP_DIR="$HOME/myrack-dashboard"

if [ -d "$APP_DIR" ]; then
  echo "[*] Cleaning up existing directory: $APP_DIR"
  rm -rf "$APP_DIR"
fi

echo "[*] Creating React app in $APP_DIR..."
create-react-app "$APP_DIR" || error_exit "create-react-app failed."

# --- Change into the app directory BEFORE running npm install ---
cd "$APP_DIR"

echo "[*] Installing main dependencies..."
npm install lucide-react recharts framer-motion || echo "[!] Warning: npm had warnings during dependency install."

echo "[*] Installing Tailwind CSS + PostCSS (for CRA)..."
npm install -D tailwindcss postcss autoprefixer || error_exit "Failed to install Tailwind dev dependencies."

echo "[*] Initializing Tailwind config..."
# Use npx instead of direct binary path - this is more reliable
npx tailwindcss init -p || error_exit "Tailwind init failed."

# Alternative method if npx fails
if [ ! -f "tailwind.config.js" ]; then
    echo "[*] Trying alternative Tailwind initialization..."
    # Create config files manually if npx fails
    cat << 'EOF' > tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

    cat << 'EOF' > postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF
fi

echo "[*] Updating index.css..."
cat << 'EOF' > src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

echo "[*] Writing App.css..."
cat << 'EOF' > src/App.css
/* Custom styles for MyRack Dashboard */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: linear-gradient(135deg, #1a1a1a 0%, #000000 50%, #1a1a1a 100%);
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}

.recharts-wrapper {
  border-radius: 4px;
}

.recharts-line-curve {
  filter: drop-shadow(0 0 2px #00ffff);
}

/* Custom scrollbar for device list */
.max-h-32::-webkit-scrollbar {
  width: 4px;
}

.max-h-32::-webkit-scrollbar-track {
  background: #374151;
  border-radius: 2px;
}

.max-h-32::-webkit-scrollbar-thumb {
  background: #06b6d4;
  border-radius: 2px;
}

.max-h-32::-webkit-scrollbar-thumb:hover {
  background: #0891b2;
}

/* Glow effects */
.shadow-cyan-500\/20 {
  box-shadow: 0 0 15px rgba(6, 182, 212, 0.2);
}

.shadow-cyan-500\/30 {
  box-shadow: 0 0 20px rgba(6, 182, 212, 0.3);
}

/* Animation for status indicators */
.bg-green-500 {
  animation: pulse-green 2s infinite;
}

@keyframes pulse-green {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.bg-red-500 {
  animation: pulse-red 1s infinite;
}

@keyframes pulse-red {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.bg-yellow-500 {
  animation: pulse-yellow 1.5s infinite;
}

@keyframes pulse-yellow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
EOF

echo "[*] Replacing App.js..."
cat << 'EOF' > src/App.js
import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import {
  Menu, User, Server, HardDrive, Cpu, Network, Activity, Trash2
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const SetupModal = ({ userName, setUserName, devices, setDevices, onComplete }) => {
  const [deviceName, setDeviceName] = useState('');
  const [deviceIP, setDeviceIP] = useState('');
  const [step, setStep] = useState(1);

  const handleAddDevice = () => {
    if (deviceName.trim() && deviceIP.trim()) {
      setDevices(prev => [...prev, {
        id: Date.now(),
        name: deviceName,
        ip: deviceIP
      }]);
      setDeviceName('');
      setDeviceIP('');
    }
  };

  const handleDeleteDevice = (id) => {
    setDevices(prev => prev.filter(d => d.id !== id));
  };

  const canContinue = () => {
    if (step === 1) return userName.trim();
    return true;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl border border-cyan-600 p-10 w-full max-w-md shadow-lg shadow-cyan-500/30">
        <h2 className="text-3xl font-semibold text-cyan-400 mb-6 text-center">
          {step === 1 && "Welcome to MyRack"}
          {step === 2 && "Add Devices"}
          {step === 3 && "Review Setup"}
        </h2>

        {step === 1 && (
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Your name"
            autoFocus
            className="w-full p-3 rounded-md bg-gray-800 border border-cyan-500 text-cyan-100 placeholder-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 mb-4"
          />
        )}

        {step === 2 && (
          <>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Device Name"
              className="w-full p-3 rounded-md bg-gray-800 border border-cyan-500 text-cyan-100 placeholder-cyan-500 mb-3"
            />
            <input
              type="text"
              value={deviceIP}
              onChange={(e) => setDeviceIP(e.target.value)}
              placeholder="Device IP"
              className="w-full p-3 rounded-md bg-gray-800 border border-cyan-500 text-cyan-100 placeholder-cyan-500 mb-3"
            />
            <button
              onClick={handleAddDevice}
              disabled={!deviceName.trim() || !deviceIP.trim()}
              className="w-full py-2 mb-4 rounded-md bg-cyan-500 text-black font-semibold hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Device
            </button>
            <ul className="text-cyan-300 text-sm mb-4 max-h-32 overflow-y-auto space-y-2">
              {devices.map(d => (
                <li key={d.id} className="flex justify-between items-center">
                  <span>{d.name} - {d.ip}</span>
                  <button onClick={() => handleDeleteDevice(d.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {step === 3 && (
          <div className="space-y-4 text-cyan-300 text-sm">
            <div>
              <span className="font-semibold text-cyan-400">Name:</span> {userName}
            </div>
            <div>
              <span className="font-semibold text-cyan-400">Devices:</span>
              {devices.length === 0 ? (
                <span className="text-yellow-400 ml-2">No devices added</span>
              ) : (
                <ul className="pl-4 list-disc">
                  {devices.map(d => (
                    <li key={d.id}>{d.name} - {d.ip}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6 space-x-2">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-2 rounded-md border border-cyan-400 text-cyan-300 hover:bg-cyan-700 hover:text-white"
            >
              Back
            </button>
          )}
          {step < 3 && (
            <button
              onClick={() => canContinue() && setStep(step + 1)}
              disabled={!canContinue()}
              className="flex-1 py-2 rounded-md bg-cyan-500 text-black font-semibold hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          )}
          {step === 3 && (
            <button
              onClick={onComplete}
              className="flex-1 py-2 rounded-md bg-cyan-500 text-black font-semibold hover:bg-cyan-400"
            >
              Finish
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const MyRack = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSetup, setShowSetup] = useState(true);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [userName, setUserName] = useState('');
  const [devices, setDevices] = useState([]);
  const [servers, setServers] = useState([]);
  const [unitMap, setUnitMap] = useState({});

  const accountMenuRef = useRef(null);
  const profileButtonRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchStats = () => {
      devices.forEach(device => {
        fetch(`http://${device.ip}:4000/stats`)
          .then(res => res.json())
          .then(data => {
            setServers(prev => {
              const history = prev.find(s => s.id === device.id)?.networkHistory || [];
              const newHistory = [...history.slice(-19), { time: Date.now(), value: data.network }];
              const updated = {
                id: device.id,
                name: device.name,
                status: 'online',
                memory: data.memory,
                storage: data.storage,
                cpu: data.cpu,
                network: data.network,
                ip: device.ip,
                networkHistory: newHistory
              };
              return [...prev.filter(s => s.id !== device.id), updated];
            });
          })
          .catch(() => {
            setServers(prev => [
              ...prev.filter(s => s.id !== device.id),
              {
                id: device.id,
                name: device.name,
                status: 'offline',
                memory: 0,
                storage: 0,
                cpu: 0,
                network: 0,
                ip: device.ip,
                networkHistory: []
              }
            ]);
          });
      });
    };

    if (devices.length > 0) {
      fetchStats();
      const interval = setInterval(fetchStats, 2000);
      return () => clearInterval(interval);
    }
  }, [devices]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showAccountMenu &&
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target) &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(event.target)
      ) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAccountMenu]);

  const toggleUnit = (serverId) => {
    setUnitMap(prev => ({
      ...prev,
      [serverId]: prev[serverId] === 'Mbps' ? 'Kbps' : 'Mbps'
    }));
  };

  const getGreeting = () => {
    if (!userName.trim()) return '';
    const hour = currentTime.getHours();
    if (hour < 12) return `Good Morning, ${userName}`;
    if (hour < 18) return `Good Afternoon, ${userName}`;
    return `Good Evening, ${userName}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getResourceColor = (percentage, status) => {
    if (status === 'offline') return 'bg-gray-600';
    if (percentage > 80) return 'bg-red-500';
    if (percentage > 60) return 'bg-yellow-500';
    return 'bg-cyan-500';
  };

  const ResourceBar = ({ label, percentage, status, icon: Icon }) => (
    <div className="flex flex-col items-center space-y-2">
      <div className="flex items-center space-x-1">
        <Icon size={16} className="text-cyan-300" />
        <span className="text-sm text-cyan-300">{label}</span>
      </div>
      <div className="w-16 h-3 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${getResourceColor(percentage, status)}`}
          style={{ width: `${status === 'offline' ? 0 : percentage}%` }}
        />
      </div>
      <span className="text-xs text-cyan-400">
        {status === 'offline' ? 'N/A' : `${Math.round(percentage)}%`}
      </span>
    </div>
  );

  const NetworkGraph = ({ networkHistory, status, serverId }) => {
    const unit = unitMap[serverId] || 'Kbps';
    const lastValue = networkHistory.at(-1)?.value || 0;
    const displayValue = unit === 'Mbps' ? (lastValue / 1000).toFixed(2) : Math.round(lastValue);
    return (
      <div className="flex flex-col items-center space-y-2">
        <div
          className="flex items-center space-x-1 cursor-pointer"
          onClick={() => toggleUnit(serverId)}
        >
          <Network size={16} className="text-cyan-300" />
          <span className="text-sm text-cyan-300">Network</span>
        </div>
        <div className="w-24 h-12">
          {status === 'offline' ? (
            <div className="w-full h-full bg-gray-700 rounded flex items-center justify-center">
              <span className="text-xs text-gray-500">Offline</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={networkHistory}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#00ffff"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <span className="text-xs text-cyan-400">
          {status === 'offline' ? 'N/A' : `${displayValue} ${unit}`}
        </span>
      </div>
    );
  };

  const ServerCard = ({ server }) => (
    <div className="bg-gray-900 rounded-lg p-4 border border-cyan-500 hover:border-cyan-400 transition-colors shadow-lg shadow-cyan-500/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-cyan-400">Status:</span>
          <div className={`w-3 h-3 rounded-full ${getStatusColor(server.status)}`} />
          <span className="text-cyan-100 font-medium">{server.name}</span>
        </div>
        <Server size={20} className="text-cyan-400" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <ResourceBar label="Memory" percentage={server.memory} status={server.status} icon={Activity} />
        <ResourceBar label="Storage" percentage={server.storage} status={server.status} icon={HardDrive} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <ResourceBar label="CPU" percentage={server.cpu} status={server.status} icon={Cpu} />
        <NetworkGraph networkHistory={server.networkHistory} status={server.status} serverId={server.id} />
      </div>

      <div className="text-xs text-cyan-500 text-center pt-2 border-t border-cyan-700 select-text">
        {server.ip}
      </div>
    </div>
  );

  if (showSetup) {
    return (
      <SetupModal
        userName={userName}
        setUserName={setUserName}
        devices={devices}
        setDevices={setDevices}
        onComplete={() => setShowSetup(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {showHamburgerMenu && (
        <div className="fixed inset-0 bg-black/60 z-30" onClick={() => setShowHamburgerMenu(false)}></div>
      )}

      <header className="sticky top-0 z-20 flex items-center justify-between p-4 border-b border-cyan-500 bg-black/50 backdrop-blur-sm" style={{ minHeight: '80px' }}>
        <div className="flex flex-1 items-center space-x-4">
          <button onClick={() => setShowHamburgerMenu(prev => !prev)} className="p-2 rounded-md bg-gray-900 hover:bg-gray-800 transition-colors border border-cyan-500" aria-label="Toggle menu">
            <Menu size={24} className="text-cyan-400" />
          </button>
          <h1 className="text-cyan-400 text-3xl font-bold tracking-wide select-none">MyRack</h1>
        </div>

        <div className="flex-1 text-center hidden lg:block">
          {userName.trim() && (
            <div className="flex flex-col items-center">
              <h2 className="text-cyan-400 font-bold text-2xl">{getGreeting()}</h2>
              <span className="text-cyan-300 text-sm">{currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        <div className="flex flex-1 items-center justify-end">
          <div className="relative">
            <button
              ref={profileButtonRef}
              onClick={() => setShowAccountMenu(prev => !prev)}
              className="p-2 rounded-full bg-gray-900 hover:bg-gray-800 transition-colors border border-cyan-500"
              aria-label="User menu"
            >
              <User size={24} className="text-cyan-400" />
            </button>

            {showAccountMenu && (
              <div ref={accountMenuRef} className="absolute right-0 mt-2 w-48 bg-gray-900 border border-cyan-600 rounded-md shadow-lg z-50">
                <div className="px-4 py-3 text-cyan-300 border-b border-cyan-700">{userName}</div>
                <button
                  onClick={() => {
                    setShowSetup(true);
                    setDevices([]);
                    setServers([]);
                    setShowAccountMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-cyan-200 hover:bg-cyan-800 hover:text-white"
                >
                  Reset Setup
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="p-6">
        {servers.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Server size={64} className="text-cyan-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-cyan-400 mb-2">No Servers Connected</h2>
              <p className="text-cyan-300">Add some devices in the setup to see your server dashboard.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            {servers.map(server => (
              <ServerCard key={server.id} server={server} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyRack;
EOF

echo "[*] Creating systemd service..."

SERVICE_FILE="/etc/systemd/system/myrack-dashboard.service"

sudo bash -c "cat > $SERVICE_FILE" << EOF
[Unit]
Description=MyRack Dashboard React App
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=$(which npm) start
Restart=always
RestartSec=5
Environment=PATH=/usr/bin:/usr/local/bin:/usr/sbin:/sbin
Environment=NODE_ENV=development
Environment=BROWSER=none

[Install]
WantedBy=multi-user.target
EOF

echo "[*] Enabling service to run on startup..."
sudo systemctl daemon-reload
sudo systemctl enable myrack-dashboard
sudo systemctl start myrack-dashboard

echo -e "\n\033[1;32m✔ MyRack Dashboard is installed and running in the background!\033[0m"
echo -e "\033[1;34m  Access it at: http://localhost:3000\033[0m"
echo -e "\n\033[1;33m  To check status: sudo systemctl status myrack-dashboard\033[0m"
echo -e "\033[1;33m  To view logs: sudo journalctl -u myrack-dashboard -f\033[0m"
echo -e "\n\033[1;35m=========================================\033[0m"
echo -e "\033[1;36m  Finished MyRack Dashboard Setup\033[0m"
echo -e "\033[1;32m  By: Michael Fischer\033[0m"
echo -e "\033[1;35m=========================================\033[0m\n"
