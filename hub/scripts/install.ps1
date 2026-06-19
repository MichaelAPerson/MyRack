# MyRack agent installer (Windows PowerShell).
#
# Usage (this is exactly what the dashboard's "Setup" panel gives you):
#   iwr http://<hub-host>:4280/install.ps1 -OutFile install.ps1
#   powershell -ExecutionPolicy Bypass -File install.ps1 -HubUrl "http://<hub-host>:4280" -ApiKey "<api-key>"
#
# Registering the scheduled task (so the agent survives reboots) requires
# running this from an elevated ("Run as Administrator") PowerShell prompt.
# Without elevation, the agent still installs and starts, just not at startup.

param(
  [Parameter(Mandatory=$true)][string]$HubUrl,
  [Parameter(Mandatory=$true)][string]$ApiKey,
  [string]$InstallDir = "$env:USERPROFILE\myrack-agent"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js is required but wasn't found on PATH. Install Node.js 18+ first: https://nodejs.org"
  exit 1
}

Write-Host "Installing MyRack agent into $InstallDir ..."
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

Invoke-WebRequest -Uri "$HubUrl/agent-files/agent.js" -OutFile "$InstallDir\agent.js"
Invoke-WebRequest -Uri "$HubUrl/agent-files/package.json" -OutFile "$InstallDir\package.json"

Set-Location $InstallDir
Write-Host "Installing dependencies ..."
npm install --omit=dev --no-audit --no-fund | Out-Null

$config = @{ hubUrl = $HubUrl; apiKey = $ApiKey; intervalSeconds = 5 }
$config | ConvertTo-Json | Set-Content -Path "$InstallDir\config.json"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
  Write-Host "Registering a scheduled task so the agent starts automatically at boot ..."
  $nodePath = (Get-Command node).Source
  $action = New-ScheduledTaskAction -Execute $nodePath -Argument "agent.js" -WorkingDirectory $InstallDir
  $trigger = New-ScheduledTaskTrigger -AtStartup
  Register-ScheduledTask -TaskName "MyRackAgent" -Action $action -Trigger $trigger -RunLevel Highest -Force | Out-Null
  Start-ScheduledTask -TaskName "MyRackAgent"
  Write-Host "Done. The agent is installed and will start automatically at boot."
} else {
  Write-Host "Starting the agent now ..."
  Start-Process -FilePath "node" -ArgumentList "agent.js" -WorkingDirectory $InstallDir -WindowStyle Hidden
  Write-Host ""
  Write-Host "Done. The agent is running but won't survive a reboot."
  Write-Host "Re-run this script from an elevated ('Run as Administrator') PowerShell prompt to register it as a scheduled task that starts at boot."
}
