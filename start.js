#!/usr/bin/env node
// Single entry point for "just start the thing properly."
// Works the same on Linux, macOS, and Windows since it's plain Node, not a shell script.
//
//   npm start
//
// What it does:
//   1. Makes sure hub/ has its dependencies installed.
//   2. Makes sure the dashboard frontend is actually built into hub/public
//      (it ships pre-built in the repo, but this also covers a fresh clone
//      where someone deleted hub/public, or wants to rebuild after editing it).
//   3. Starts the hub - via pm2 if it's installed (so it survives this
//      terminal closing), otherwise in the foreground.

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const HUB_DIR = path.join(ROOT, 'hub');
const FRONTEND_DIR = path.join(ROOT, 'frontend');

function run(cmd, args, cwd) {
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    console.error(`Command failed: ${cmd} ${args.join(' ')}`);
    process.exit(result.status || 1);
  }
}

function hasCommand(cmd) {
  try {
    execSync(process.platform === 'win32' ? `where ${cmd}` : `command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

console.log('--- MyRack production start ---');

if (!fs.existsSync(path.join(HUB_DIR, 'node_modules'))) {
  console.log('Installing hub dependencies (first run only) ...');
  run('npm', ['install', '--omit=dev', '--no-audit', '--no-fund'], HUB_DIR);
}

const builtIndex = path.join(HUB_DIR, 'public', 'index.html');
if (!fs.existsSync(builtIndex)) {
  console.log('Dashboard frontend not found in hub/public - building it now ...');
  if (!fs.existsSync(path.join(FRONTEND_DIR, 'node_modules'))) {
    run('npm', ['install', '--no-audit', '--no-fund'], FRONTEND_DIR);
  }
  run('npm', ['run', 'build'], FRONTEND_DIR);
}

if (hasCommand('pm2')) {
  console.log('pm2 detected - starting the hub under pm2 so it keeps running after this terminal closes.');
  run('pm2', ['start', path.join(ROOT, 'ecosystem.config.js')], ROOT);
  console.log('');
  console.log('The hub is now running in the background. Useful commands:');
  console.log('  pm2 logs myrack-hub      - tail its logs');
  console.log('  pm2 stop myrack-hub      - stop it');
  console.log('  pm2 restart myrack-hub   - restart it');
  console.log('');
  console.log('To make it survive a REBOOT too:');
  console.log('  Linux/macOS : pm2 save && pm2 startup   (then run the command pm2 prints)');
  console.log('  Windows     : pm2 save, then use pm2-windows-startup, or see hub/myrack-hub.service.example for a plain systemd alternative on Linux.');
} else {
  console.log('Tip: install pm2 (`npm i -g pm2`) and re-run `npm start` to keep the hub running after you close this terminal.');
  console.log('Starting in the foreground now - leave this window open, or Ctrl+C and set up pm2/systemd/NSSM instead (see README).');
  console.log('');
  run('node', ['server.js'], HUB_DIR);
}
