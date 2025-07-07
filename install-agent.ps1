# MyRack Windows Agent Installer v1.5
# Author: Michael Fischer

$ErrorActionPreference = 'Stop'

Write-Host "`n=========================================" -ForegroundColor Magenta
Write-Host "  Installing MyRack Agent v1.5 Windows Edition" -ForegroundColor Cyan
Write-Host "  By: Michael Fischer" -ForegroundColor Green
Write-Host "=========================================`n" -ForegroundColor Magenta

function Show-AsciiArt {
@"
 __  __       ____            _
|  \/  |_   _|  _ \ __ _  ___| | __
| |\/| | | | | |_) / _` |/ __| |/ /
| |  | | |_| |  _ < (_| | (__|   <
|_|  |_|\__, |_| \_\__,_|\___|_|\_\
        |___/

"@ | Write-Host -ForegroundColor Cyan
}

Show-AsciiArt
Write-Host "=========================================" -ForegroundColor Magenta

# Ensure Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[*] Node.js not found. Installing..." -ForegroundColor Yellow

    $nodeInstaller = "$env:TEMP\node-setup.msi"
    Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi" -OutFile $nodeInstaller
    Start-Process msiexec.exe -Wait -ArgumentList "/i `"$nodeInstaller`" /qn"
    Remove-Item $nodeInstaller

    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "✖ Failed to install Node.js" -ForegroundColor Red
        exit 1
    }
}

# Get the active IP address
$ip = Get-NetIPConfiguration |
    Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq "Up" } |
    Select-Object -ExpandProperty IPv4Address |
    Select-Object -First 1

if (-not $ip) {
    $ip = "localhost"
    Write-Host "⚠ Could not detect local IP. Defaulting to localhost." -ForegroundColor Yellow
} else {
    $ip = $ip.IPAddress
}

Write-Host "[*] Creating MyRack agent directory..."
$agentPath = "$env:USERPROFILE\myrack-agent"
New-Item -ItemType Directory -Path $agentPath -Force | Out-Null
Set-Location $agentPath

Write-Host "[*] Initializing npm project..."
npm init -y | Out-Null

Write-Host "[*] Installing dependencies..."
npm install express systeminformation cors | Out-Null

Write-Host "[*] Writing index.js..."
@"
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
"@ | Out-File "$agentPath\index.js" -Encoding UTF8

Write-Host "[*] Creating scheduled task to run agent at login..."

$taskName = "MyRackAgent"
$action = New-ScheduledTaskAction -Execute "node" -Argument "$agentPath\index.js"
$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

try {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
} catch {}

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal

# Open firewall port 4000
Write-Host "[*] Creating firewall rule for port 4000..."
New-NetFirewallRule -DisplayName "Allow MyRack Agent" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow -Profile Any -ErrorAction SilentlyContinue

# Start agent immediately
Write-Host "[*] Starting MyRack Agent now..."
Start-Process node "$agentPath\index.js"

Write-Host "`n✔ MyRack Agent installed and will run on login!" -ForegroundColor Green
Write-Host "📡 Access from: http://$ip:4000/stats" -ForegroundColor Cyan
Write-Host "🌐 Add this device to your MyRack dashboard using the IP above." -ForegroundColor Blue
