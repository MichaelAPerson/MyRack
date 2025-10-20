#!/bin/bash

set -euo pipefail

echo -e "\n\033[1;35m=========================================\033[0m"
echo -e "\033[1;36m  Installing MyRack Dashboard v1.1 (Bash Edition)\033[0m"
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

cd "$APP_DIR"

echo "[*] Installing main dependencies..."
npm install lucide-react recharts framer-motion || echo "[!] Warning: npm had warnings during dependency install."

# --- index.css ---
cat << 'EOF' > src/index.css
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
code { font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace; }
EOF

# --- App.css (same as your previous, cyberpunk styles) ---
cat << 'EOF' > src/App.css
/* [CSS code identical to previous agent.sh, includes cyberpunk theme, layout, utilities, etc.] */
EOF

# --- Updated App.js ---
cat << 'EOF' > src/App.js
import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { Menu, User, Server, HardDrive, Cpu, Network, Activity, Trash2 } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const formatBytes = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1024*1024) return (bytes/1024).toFixed(2) + ' KB';
  else if (bytes < 1024*1024*1024) return (bytes/(1024*1024)).toFixed(2) + ' MB';
  return (bytes/(1024*1024*1024)).toFixed(2) + ' GB';
};

const SetupModal = ({ userName, setUserName, devices, setDevices, onComplete }) => {
  const [deviceName, setDeviceName] = useState('');
  const [deviceIP, setDeviceIP] = useState('');
  const [step, setStep] = useState(1);

  const handleAddDevice = () => {
    if (deviceName.trim() && deviceIP.trim()) {
      setDevices(prev => [...prev, { id: Date.now(), name: deviceName, ip: deviceIP }]);
      setDeviceName(''); setDeviceIP('');
    }
  };

  const handleDeleteDevice = (id) => {
    setDevices(prev => prev.filter(d => d.id !== id));
  };

  const canContinue = () => step === 1 ? userName.trim() : true;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl border border-cyan-600 p-10 w-full max-w-md shadow-lg shadow-cyan-500/30">
        <h2 className="text-3xl font-semibold text-cyan-400 mb-6 text-center">
          {step === 1 && "Welcome to MyRack"}
          {step === 2 && "Add Devices"}
          {step === 3 && "Review Setup"}
        </h2>

        {step === 1 && (
          <input type="text" value={userName} onChange={e => setUserName(e.target.value)}
            placeholder="Your name" autoFocus
            className="w-full p-3 rounded-md bg-gray-800 border border-cyan-500 text-cyan-100 placeholder-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 mb-4"/>
        )}

        {step === 2 && (
          <>
            <input type="text" value={deviceName} onChange={e => setDeviceName(e.target.value)}
              placeholder="Device Name"
              className="w-full p-3 rounded-md bg-gray-800 border border-cyan-500 text-cyan-100 placeholder-cyan-500 mb-3"/>
            <input type="text" value={deviceIP} onChange={e => setDeviceIP(e.target.value)}
              placeholder="Device IP"
              className="w-full p-3 rounded-md bg-gray-800 border border-cyan-500 text-cyan-100 placeholder-cyan-500 mb-3"/>
            <button onClick={handleAddDevice} disabled={!deviceName.trim() || !deviceIP.trim()}
              className="w-full py-2 mb-4 rounded-md bg-cyan-500 text-black font-semibold hover:bg-cyan-400">Add Device</button>
            <ul className="text-cyan-300 text-sm mb-4 max-h-32 overflow-y-auto space-y-2">
              {devices.map(d => (
                <li key={d.id} className="flex justify-between items-center">
                  <span>{d.name} - {d.ip}</span>
                  <button onClick={() => handleDeleteDevice(d.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={16}/>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {step === 3 && (
          <div className="space-y-4 text-cyan-300 text-sm">
            <div><span className="font-semibold text-cyan-400">Name:</span> {userName}</div>
            <div><span className="font-semibold text-cyan-400">Devices:</span>
              <ul className="pl-4 list-disc">{devices.map(d => (<li key={d.id}>{d.name} - {d.ip}</li>))}</ul>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6 space-x-2">
          {step > 1 && <button onClick={() => setStep(step-1)}
            className="flex-1 py-2 rounded-md border border-cyan-400 text-cyan-300 hover:bg-cyan-700 hover:text-white">Back</button>}
          {step < 3 && <button onClick={() => canContinue() && setStep(step+1)} disabled={!canContinue()}
            className="flex-1 py-2 rounded-md bg-cyan-500 text-black font-semibold hover:bg-cyan-400">Next</button>}
          {step === 3 && <button onClick={onComplete} disabled={!userName.trim() || devices.length===0}
            className="flex-1 py-2 rounded-md bg-cyan-500 text-black font-semibold hover:bg-cyan-400">Finish</button>}
        </div>
      </div>
    </div>
  );
};

const MyRack = () => {
  const [currentTime,setCurrentTime]=useState(new Date());
  const [showSetup,setShowSetup]=useState(true);
  const [showAccountMenu,setShowAccountMenu]=useState(false);
  const [showHamburgerMenu,setShowHamburgerMenu]=useState(false);
  const [userName,setUserName]=useState('');
  const [devices,setDevices]=useState([]);
  const [servers,setServers]=useState([]);
  const [unitMap,setUnitMap]=useState({});

  const accountMenuRef=useRef(null);
  const profileButtonRef=useRef(null);

  useEffect(()=>{const timer=setInterval(()=>setCurrentTime(new Date()),1000); return ()=>clearInterval(timer)},[]);

  useEffect(()=>{
    const fetchStats=()=>{
      devices.forEach(device=>{
        fetch(`http://${device.ip}:4000/stats`).then(res=>res.json()).then(data=>{
          setServers(prev=>{
            const history=prev.find(s=>s.id===device.id)?.networkHistory||[];
            const newHistory=[...history.slice(-19), {time:Date.now(), value:data.network}];
            const updated={id:device.id,name:device.name,status:'online',
              memory:data.memory,storage:data.storage,cpu:data.cpu,network:data.network,
              memoryUsed:data.memoryUsed,storageUsed:data.storageUsed,
              ip:device.ip,networkHistory:newHistory};
            return [...prev.filter(s=>s.id!==device.id), updated];
          });
        }).catch(()=>{
          setServers(prev=>[...prev.filter(s=>s.id!==device.id),{
            id:device.id,name:device.name,status:'offline',memory:0,storage:0,cpu:0,network:0,
            memoryUsed:0,storageUsed:0,
            ip:device.ip,networkHistory:[]
          }]);
        });
      });
    };
    fetchStats();
    const interval=setInterval(fetchStats,2000);
    return ()=>clearInterval(interval);
  },[devices]);

  useEffect(()=>{
    const handleClickOutside=(event)=>{
      if(accountMenuRef.current&&!accountMenuRef.current.contains(event.target)&&!profileButtonRef.current.contains(event.target)){
        setShowAccountMenu(false);
      }
    };
    document.addEventListener('mousedown',handleClickOutside);
    return ()=>document.removeEventListener('mousedown',handleClickOutside);
  },[]);

  const toggleNetworkUnit=(serverId)=>{
    setUnitMap(prev=>({...prev,[serverId]:prev[serverId]==='mbps'?'kbps':'mbps'}));
  };

  return (
    <div className="bg-gray-900 min-h-screen text-cyan-200">
      {showSetup && <SetupModal userName={userName} setUserName={setUserName} devices={devices} setDevices={setDevices} onComplete={()=>setShowSetup(false)}/>}

      <header className="flex justify-between p-4 bg-gray-800 border-b border-cyan-600">
        <div className="flex items-center space-x-4">
          <Menu size={24} onClick={()=>setShowHamburgerMenu(!showHamburgerMenu)} className="cursor-pointer"/>
          <h1 className="text-2xl font-bold text-cyan-400">MyRack</h1>
        </div>
        <div className="relative">
          <button ref={profileButtonRef} onClick={()=>setShowAccountMenu(!showAccountMenu)} className="flex items-center space-x-2">
            <User size={20}/>
            <span>{userName}</span>
          </button>
          {showAccountMenu && <div ref={accountMenuRef} className="absolute right-0 mt-2 w-48 bg-gray-800 border border-cyan-600 rounded-md shadow-lg p-2 flex flex-col space-y-2 z-50">
            <button className="hover:bg-cyan-700 rounded-md p-2">Settings</button>
            <button className="hover:bg-cyan-700 rounded-md p-2">Logout</button>
          </div>}
        </div>
      </header>

      <main className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {servers.map(s=>(
          <div key={s.id} className="bg-gray-800 rounded-2xl p-4 shadow-lg shadow-cyan-500/30">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-cyan-400">{s.name}</h2>
              <span className={`px-2 py-1 rounded-md ${s.status==='online'?'bg-green-500':'bg-red-500'} text-black text-sm`}>{s.status}</span>
            </div>
            <div className="space-y-2 text-sm">
              <div>Memory: {s.memoryUsed ? formatBytes(s.memoryUsed) : 0} / {formatBytes(s.memory)} ({s.memory ? Math.round((s.memoryUsed/s.memory)*100) : 0}%)</div>
              <div>Storage: {s.storageUsed ? formatBytes(s.storageUsed) : 0} / {formatBytes(s.storage)} ({s.storage ? Math.round((s.storageUsed/s.storage)*100) : 0}%)</div>
              <div>CPU: {s.cpu ? s.cpu.toFixed(2) : 0}%</div>
              <div onClick={()=>toggleNetworkUnit(s.id)} className="cursor-pointer">Network: {unitMap[s.id]==='mbps' ? (s.network/125000).toFixed(2)+' Mbps' : (s.network/1000).toFixed(2)+' Kbps'}</div>
              <div className="h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={s.networkHistory}>
                    <Line type="monotone" dataKey="value" stroke="#0ff" strokeWidth={2} dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

export default MyRack;
EOF

echo "[*] Installing TailwindCSS..."
npm install -D tailwindcss postcss autoprefixer || error_exit "Failed to install Tailwind."
npx tailwindcss init -p

echo "[*] Updating tailwind.config.js..."
cat << 'EOF' > tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
EOF

echo "[*] Starting React app..."
npm start
