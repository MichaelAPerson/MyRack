import React, { useState, useEffect } from 'react';
import './App.css';
import {
  Menu, User, Server, HardDrive, Cpu, Network, Activity
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const SetupModal = ({ userName, setUserName, setupStep, setSetupStep, onComplete }) => {
  const handleNext = () => {
    if (setupStep === 1) {
      setSetupStep(2);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl border border-cyan-600 p-10 w-full max-w-md shadow-lg">
        {setupStep === 1 ? (
          <>
            <h2 className="text-3xl font-semibold text-cyan-400 mb-6 text-center">Welcome to MyRack</h2>
            <p className="text-cyan-300 mb-6 text-center">Please enter your name to get started.</p>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Your name"
              autoFocus
              className="w-full p-3 rounded-md bg-gray-800 border border-cyan-500 text-cyan-100 placeholder-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 mb-6"
            />
            <button
              disabled={!userName.trim()}
              onClick={handleNext}
              className={`w-full py-3 rounded-md text-black font-semibold transition ${
                userName.trim()
                  ? 'bg-cyan-500 hover:bg-cyan-400 cursor-pointer'
                  : 'bg-cyan-700 cursor-not-allowed opacity-60'
              }`}
            >
              Next
            </button>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-semibold text-cyan-400 mb-6 text-center">Let's get your Devices setup</h2>
            <p className="text-cyan-300 mb-4 text-center">
              First make sure the MyRack Agent is setup<br />
              <a
                href="https://github.com/MichaelAPerson/myrack.github.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline text-sm"
              >
                If MyRack is not setup, please open this link for instructions
              </a>
            </p>
            <p className="text-cyan-300 mb-6 text-center">
              MyRack is a monitoring tool used for computers and servers to monitor CPU usage, memory usage, network usage, and storage usage.
            </p>

            <div className="space-y-4 mb-6">
              <div className="relative">
                <input
                  type="text"
                  value=""
                  placeholder="Server's Name"
                  disabled
                  className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-gray-500 placeholder-gray-500 cursor-not-allowed opacity-60"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                    (This step will be skipped for the demo)
                  </span>
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value=""
                  placeholder="Server's IP"
                  disabled
                  className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-gray-500 placeholder-gray-500 cursor-not-allowed opacity-60"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                    (This step will be skipped for the demo)
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-3 rounded-md text-black font-semibold bg-cyan-500 hover:bg-cyan-400 cursor-pointer transition"
            >
              Finish
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const MyRack = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSetup, setShowSetup] = useState(true);
  const [setupStep, setSetupStep] = useState(1);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [userName, setUserName] = useState('');

  const [servers, setServers] = useState([
    {
      id: 1,
      name: 'PiHole',
      status: 'online',
      memory: 45,
      storage: 32,
      cpu: 23,
      network: 67,
      ip: '192.168.1.100',
      networkHistory: Array.from({ length: 20 }, (_, i) => ({ time: i, value: Math.random() * 100 }))
    },
    {
      id: 2,
      name: 'Web Server',
      status: 'offline',
      memory: 0,
      storage: 0,
      cpu: 0,
      network: 0,
      ip: '192.168.1.101',
      networkHistory: Array.from({ length: 20 }, () => ({ time: 0, value: 0 }))
    },
    {
      id: 3,
      name: 'Libre Potato',
      status: 'warning',
      memory: 78,
      storage: 89,
      cpu: 34,
      network: 56,
      ip: '192.168.1.102',
      networkHistory: Array.from({ length: 20 }, (_, i) => ({ time: i, value: Math.random() * 100 }))
    },
    {
      id: 4,
      name: 'NAS',
      status: 'online',
      memory: 40,
      storage: 67,
      cpu: 60,
      network: 45,
      ip: '192.168.1.103',
      networkHistory: Array.from({ length: 20 }, (_, i) => ({ time: i, value: Math.random() * 100 }))
    }
  ]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateTimer = setInterval(() => {
      setServers(prevServers =>
        prevServers.map(server => {
          if (server.status === 'offline') return server;

          const newNetworkValue = Math.random() * 100;
          const newNetworkHistory = [
            ...server.networkHistory.slice(-19),
            { time: server.networkHistory.length + 1, value: newNetworkValue }
          ];

          return {
            ...server,
            memory: Math.min(100, Math.max(0, server.memory + (Math.random() - 0.5) * 10)),
            cpu: Math.min(100, Math.max(0, server.cpu + (Math.random() - 0.5) * 15)),
            network: newNetworkValue,
            networkHistory: newNetworkHistory
          };
        })
      );
    }, 2000);

    return () => clearInterval(updateTimer);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      setShowAccountMenu(false);
      setShowHamburgerMenu(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
        {status === 'offline' ? '0%' : `${Math.round(percentage)}%`}
      </span>
    </div>
  );

  const NetworkGraph = ({ networkHistory, status }) => (
    <div className="flex flex-col items-center space-y-2">
      <div className="flex items-center space-x-1">
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
                strokeLinecap="round"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <span className="text-xs text-cyan-400">
        {status === 'offline' ? '0%' : `${Math.round(networkHistory.at(-1)?.value || 0)}%`}
      </span>
    </div>
  );

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
        <NetworkGraph networkHistory={server.networkHistory} status={server.status} />
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
        setupStep={setupStep}
        setSetupStep={setSetupStep}
        onComplete={() => setShowSetup(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* HEADER */}
      <div className="flex items-center justify-between p-6 border-b border-cyan-500 bg-black/50 backdrop-blur-sm relative">
        <div className="flex items-center space-x-4">
          <button
            onClick={e => {
              e.stopPropagation();
              setShowHamburgerMenu(prev => !prev);
              setShowAccountMenu(false);
            }}
            className="p-2 rounded-md bg-gray-900 hover:bg-gray-800 transition-colors border border-cyan-500"
          >
            <Menu size={24} className="text-cyan-400" />
          </button>
          <h1 className="text-cyan-400 text-3xl font-bold tracking-wide select-none">MyRack</h1>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center select-text whitespace-nowrap">
          {userName.trim() && (
            <>
              <h2 className="text-cyan-400 font-bold text-3xl">{getGreeting()}</h2>
              <span className="text-cyan-300 text-xl mt-2">
                {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
              </span>
            </>
          )}
        </div>

        <div className="relative">
          <button
            onClick={e => {
              e.stopPropagation();
              setShowAccountMenu(prev => !prev);
              setShowHamburgerMenu(false);
            }}
            className="p-2 rounded-full bg-gray-900 hover:bg-gray-800 transition-colors border border-cyan-500"
            aria-label="User menu"
          >
            <User size={24} className="text-cyan-400" />
          </button>

          {/* Profile Menu */}
          {showAccountMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-cyan-600 rounded-md shadow-lg z-50">
              <div className="px-4 py-2 text-cyan-300 border-b border-cyan-700">{userName}</div>
              <button
                onClick={() => {
                  setShowSetup(true);
                  setSetupStep(1);
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

      {/* DASHBOARD */}
      <div className="p-6 pt-32">
        <div className="grid grid-cols-2 gap-6">
          {servers.map(server => (
            <ServerCard key={server.id} server={server} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyRack;
