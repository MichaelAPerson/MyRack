#!/usr/bin/env node
// MyRack Agent
// Runs on a monitored machine (Linux, Windows, or macOS), reads system stats,
// and POSTs them to the MyRack hub at a regular interval. If the hub is
// unreachable, readings are buffered in memory and flushed once it's back.

const fs = require('fs');
const path = require('path');
const os = require('os');
const si = require('systeminformation');

const AGENT_VERSION = require('./package.json').version;
const CONFIG_PATH = process.env.MYRACK_CONFIG || path.join(__dirname, 'config.json');
const MAX_BUFFERED_METRICS = 100; // oldest are dropped past this, so a long outage doesn't grow memory forever

function log(level, message) {
  console.log(`[${new Date().toISOString()}] [${level}] ${message}`);
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`Config not found at ${CONFIG_PATH}`);
    console.error('Copy config.example.json to config.json and fill in hubUrl + apiKey, or use the install script from the dashboard.');
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  if (!config.hubUrl || !config.apiKey) {
    console.error('config.json must include hubUrl and apiKey.');
    process.exit(1);
  }
  config.intervalSeconds = config.intervalSeconds || 5;
  config.hubUrl = config.hubUrl.replace(/\/$/, '');
  return config;
}

async function collectMetrics() {
  const [cpuLoad, mem, fsSize, netStats, osInfo, timeInfo, temp] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.networkStats(),
    si.osInfo(),
    si.time(),
    si.cpuTemperature().catch(() => null), // not available on all platforms/permissions
  ]);

  const disks = fsSize
    .filter((d) => d.size > 0)
    .map((d) => ({ mount: d.mount, used: d.used, total: d.size }));

  const net = netStats.length
    ? netStats.reduce(
        (acc, n) => ({ rx: acc.rx + (n.rx_sec || 0), tx: acc.tx + (n.tx_sec || 0) }),
        { rx: 0, tx: 0 }
      )
    : null;

  return {
    timestamp: Date.now(),
    cpu: Math.round(cpuLoad.currentLoad * 10) / 10,
    mem: { used: mem.active, total: mem.total },
    disks,
    network: net,
    uptimeSec: Math.round(timeInfo.uptime),
    temps: temp && typeof temp.main === 'number' ? { cpu: temp.main } : null,
    hostname: os.hostname(),
    os: `${osInfo.distro || osInfo.platform} ${osInfo.release || ''}`.trim(),
    agentVersion: AGENT_VERSION,
  };
}

async function send(config, metric) {
  const res = await fetch(`${config.hubUrl}/api/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
    },
    body: JSON.stringify(metric),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Hub rejected report: ${res.status} ${text}`);
  }
}

async function main() {
  const config = loadConfig();
  log('INFO', `MyRack agent v${AGENT_VERSION} starting. Reporting to ${config.hubUrl} every ${config.intervalSeconds}s.`);

  const buffer = [];
  let consecutiveFailures = 0;

  const tick = async () => {
    let metric;
    try {
      metric = await collectMetrics();
    } catch (err) {
      log('ERROR', `Failed to read system stats: ${err.message}`);
      return;
    }

    buffer.push(metric);
    if (buffer.length > MAX_BUFFERED_METRICS) buffer.splice(0, buffer.length - MAX_BUFFERED_METRICS);

    // Try to flush everything buffered, oldest first. Stop at the first
    // failure so the hub still gets data in order on the next successful send.
    while (buffer.length) {
      try {
        await send(config, buffer[0]);
        buffer.shift();
        if (consecutiveFailures > 0) {
          log('INFO', `Reconnected to hub after ${consecutiveFailures} failed attempt(s).`);
          consecutiveFailures = 0;
        }
      } catch (err) {
        consecutiveFailures += 1;
        log('ERROR', `Report failed (attempt ${consecutiveFailures}): ${err.message}. Buffering ${buffer.length} reading(s) for retry.`);
        break;
      }
    }
  };

  await tick();
  setInterval(tick, config.intervalSeconds * 1000);
}

main();
