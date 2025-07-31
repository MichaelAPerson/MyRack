#!/bin/bash

set -euo pipefail

echo -e "\n\033[1;35m=========================================\033[0m"
echo -e "\033[1;36m  Installing MyRack Server vBeta.11 Bash Edition\033[0m"
echo -e "\033[1;32m  By: Michael Fischer\033[0m"
echo -e "\033[1;35m=========================================\033[0m\n"

echo -e "\n\033[1;35m=========================================\033[0m"

cat <<EOF

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

cd "$APP_DIR"

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
              className="w-full py-2 mb-4 rounded-md bg-cyan-500 text-black font-semibold hover:bg-cyan-400"
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
              <ul className="pl-4 list-disc">
                {devices.map(d => (
                  <li key={d.id}>{d.name} - {d.ip}</li>
                ))}
              </ul>
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
              className="flex-1 py-2 rounded-md bg-cyan-500 text-black font-semibold hover:bg-cyan-400"
            >
              Next
            </button>
          )}
          {step === 3 && (
            <button
              onClick={onComplete}
              disabled={!userName.trim() || devices.length === 0}
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

    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {servers.map(server => (
            <ServerCard key={server.id} server={server} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default MyRack;

EOF

echo "[*] Replacing App.css..."
cat << 'EOF' > src/App.css
/* Reset and basics */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
  background: #000;
}

/* Base utilities */
.min-h-screen {
  min-height: 100vh;
}

.bg-gradient-to-br {
  background: linear-gradient(to bottom right, #111827, #000000, #111827);
}

.backdrop-blur-sm {
  backdrop-filter: blur(4px);
}

/* Flexbox & Grid */
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.justify-center { justify-content: center; }
.justify-end { justify-content: flex-end; }
.flex-col { flex-direction: column; }
.flex-1 { flex: 1 1 0%; }

.grid { display: grid; }
.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.gap-4 { gap: 1rem; }
.gap-6 { gap: 1.5rem; }

/* Spacing */
.space-x-1 > * + * { margin-left: 0.25rem; }
.space-x-2 > * + * { margin-left: 0.5rem; }
.space-x-4 > * + * { margin-left: 1rem; }
.space-y-2 > * + * { margin-top: 0.5rem; }
.space-y-4 > * + * { margin-top: 1rem; }

.p-2 { padding: 0.5rem; }
.p-3 { padding: 0.75rem; }
.p-4 { padding: 1rem; }
.p-6 { padding: 1.5rem; }
.p-10 { padding: 2.5rem; }

.px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }

.py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
.py-4 { padding-top: 1rem; padding-bottom: 1rem; }

.pt-2 { padding-top: 0.5rem; }
.mb-3 { margin-bottom: 0.75rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-6 { margin-bottom: 1.5rem; }
.mt-2 { margin-top: 0.5rem; }

/* Sizing */
.w-3 { width: 0.75rem; }
.w-16 { width: 4rem; }
.w-24 { width: 6rem; }
.w-48 { width: 12rem; }
.w-64 { width: 16rem; }
.w-full { width: 100%; }
.max-w-md { max-width: 28rem; }
.max-w-max { max-width: max-content; }

.h-3 { height: 0.75rem; }
.h-12 { height: 3rem; }
.h-full { height: 100%; }

/* Typography */
.text-xs { font-size: 0.75rem; line-height: 1rem; }
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }
.text-2xl { font-size: 1.5rem; line-height: 2rem; }
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; }

.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
.tracking-wide { letter-spacing: 0.025em; }

.text-center { text-align: center; }
.text-left { text-align: left; }
.underline { text-decoration-line: underline; }

/* Colors - Cyberpunk Theme */
.bg-black { background-color: #000; }
.bg-black\/50 { background-color: rgb(0 0 0 / 0.5); }
.bg-black\/60 { background-color: rgb(0 0 0 / 0.6); }
.bg-black\/90 { background-color: rgb(0 0 0 / 0.9); }
.bg-gray-600 { background-color: #4b5563; }
.bg-gray-700 { background-color: #374151; }
.bg-gray-800 { background-color: #1f2937; }
.bg-gray-900 { background-color: #111827; }
.bg-green-500 { background-color: #10b981; }
.bg-red-500 { background-color: #ef4444; }
.bg-yellow-500 { background-color: #f59e0b; }
.bg-cyan-500 { background-color: #06b6d4; }
.bg-cyan-700 { background-color: #0e7490; }

.text-black { color: #000; }
.text-white { color: #ffffff; }
.text-cyan-100 { color: #cffafe; }
.text-cyan-200 { color: #a5f3fc; }
.text-cyan-300 { color: #67e8f9; }
.text-cyan-400 { color: #22d3ee; }
.text-cyan-500 { color: #06b6d4; }
.text-gray-400 { color: #9ca3af; }
.text-gray-500 { color: #6b7280; }
.placeholder-cyan-500::placeholder { color: #06b6d4; }

/* Borders */
.border { border-width: 1px; }
.border-b { border-bottom-width: 1px; }
.border-t { border-top-width: 1px; }
.border-r { border-right-width: 1px; }

.border-cyan-400 { border-color: #22d3ee; }
.border-cyan-500 { border-color: #06b6d4; }
.border-cyan-600 { border-color: #0891b2; }
.border-cyan-700 { border-color: #0e7490; }
.border-gray-600 { border-color: #4b5563; }

.rounded { border-radius: 0.25rem; }
.rounded-md { border-radius: 0.375rem; }
.rounded-lg { border-radius: 0.5rem; }
.rounded-xl { border-radius: 0.75rem; }
.rounded-full { border-radius: 9999px; }

/* Interactivity & States */
.cursor-pointer { cursor: pointer; }
.cursor-not-allowed { cursor: not-allowed; }
.opacity-60 { opacity: 0.6; }
.select-text { user-select: text; }
.select-none { user-select: none; }
.pointer-events-none { pointer-events: none; }

.hover\:bg-cyan-400:hover { background-color: #22d3ee; }
.hover\:bg-cyan-800:hover { background-color: #155e75; }
.hover\:bg-gray-800:hover { background-color: #1f2937; }
.hover\:border-cyan-400:hover { border-color: #22d3ee; }
.hover\:text-white:hover { color: #ffffff; }
.hover\:text-cyan-300:hover { color: #67e8f9; }

.focus\:outline-none:focus { outline: 2px solid transparent; outline-offset: 2px; }
.focus\:ring-2:focus { --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color); --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color); box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000); }
.focus\:ring-cyan-400:focus { --tw-ring-color: #22d3ee; }

/* Positioning & Layout */
.fixed { position: fixed; }
.absolute { position: absolute; }
.relative { position: relative; }
.sticky { position: sticky; }
.hidden { display: none; }
.block { display: block; }
.inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
.top-0 { top: 0; }
.left-0 { left: 0; }
.right-0 { right: 0; }

.z-20 { z-index: 20; }
.z-30 { z-index: 30; }
.z-40 { z-index: 40; }
.z-50 { z-index: 50; }

/* Transitions & Transforms */
.transition { transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, -webkit-backdrop-filter; transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter; transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter, -webkit-backdrop-filter; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
.transition-colors { transition-property: color, background-color, border-color, text-decoration-color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
.transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
.transition-transform { transition-property: transform; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
.duration-300 { transition-duration: 300ms; }
.duration-500 { transition-duration: 500ms; }

.-translate-x-full { transform: translateX(-100%); }
.translate-x-0 { transform: translateX(0px); }

/* Shadows & Filters */
.shadow-lg { box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); }
.shadow-cyan-500\/20 { box-shadow: 0 10px 15px -3px rgba(6, 182, 212, 0.2), 0 4px 6px -2px rgba(6, 182, 212, 0.1); }
.shadow-cyan-500\/30 { box-shadow: 0 0 25px rgba(6, 182, 212, 0.3); }

/* Other */
.overflow-hidden { overflow: hidden; }

/* Responsive Design */
@media (min-width: 768px) {
  .md\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1024px) {
  .lg\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .lg\:block {
      display: block;
  }
}
@media (min-width: 1280px) {
  .xl\:grid-cols-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: #111827;
}
::-webkit-scrollbar-thumb {
  background: #06b6d4;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #22d3ee;
}
EOF

echo "[*] Installing main dependencies..."
npm install lucide-react recharts framer-motion || echo "[!] Warning: npm had warnings during dependency install."

echo "[*] Installing Tailwind CSS + PostCSS (for CRA)..."
npm install -D tailwindcss postcss autoprefixer || error_exit "Failed to install Tailwind dev dependencies."

echo "[*] Initializing Tailwind config..."
npx tailwindcss init -p || error_exit "Tailwind init failed."

echo "[*] Writing tailwind.config.js..."
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

echo "[*] Updating index.css..."
cat << 'EOF' > src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;
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
Environment=PATH=/usr/bin:/usr/local/bin
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo "[*] Enabling service to run on startup..."
sudo systemctl daemon-reload
sudo systemctl enable myrack-dashboard
sudo systemctl start myrack-dashboard

echo -e "\n\033[1;32m✔ MyRack Dashboard is installed and running in the background!\033[0m"
echo -e "\033[1;34m  Access it at: http://localhost:3000\033[0m"
echo -e "\n\033[1;35m=========================================\033[0m"
echo -e "\033[1;36m  Finished MyRack Dashboard Setup\033[0m"
echo -e "\033[1;32m  By: Michael Fischer\033[0m"
echo -e "\033[1;35m=========================================\033[0m\n"
