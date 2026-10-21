param(
  [Parameter(Mandatory=$true)][string]$HubUrl,
  [Parameter(Mandatory=$true)][string]$ApiKey,
  [string]$InstallDir = "$env:USERPROFILE\myrack-agent"
)

$ErrorActionPreference = 'Stop'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js 18+ is required. Install Node.js first: https://nodejs.org'
}

$HubUrl = $HubUrl.TrimEnd('/')
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Invoke-WebRequest -Uri "$HubUrl/agent-files/agent.js" -OutFile "$InstallDir\agent.js"
Invoke-WebRequest -Uri "$HubUrl/agent-files/package.json" -OutFile "$InstallDir\package.json"
Invoke-WebRequest -Uri "$HubUrl/agent-files/package-lock.json" -OutFile "$InstallDir\package-lock.json"

Push-Location $InstallDir
try {
  npm ci --omit=dev --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed with exit code $LASTEXITCODE." }
} finally {
  Pop-Location
}

$config = @{ hubUrl = $HubUrl; apiKey = $ApiKey; intervalSeconds = 5 } | ConvertTo-Json
$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $InstallDir 'config.json'), $config, $utf8WithoutBom)

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)
if ($isAdmin) {
  $nodePath = (Get-Command node).Source
  $action = New-ScheduledTaskAction -Execute $nodePath -Argument 'agent.js' -WorkingDirectory $InstallDir
  $trigger = New-ScheduledTaskTrigger -AtStartup
  Register-ScheduledTask -TaskName 'MyRackAgent' -Action $action -Trigger $trigger -RunLevel Highest -Force | Out-Null
  Start-ScheduledTask -TaskName 'MyRackAgent'
  Write-Host 'MyRack agent installed and registered to start at boot.'
} else {
  Start-Process -FilePath (Get-Command node).Source -ArgumentList 'agent.js' -WorkingDirectory $InstallDir -WindowStyle Hidden
  Write-Host 'MyRack agent started. Run the installer as Administrator to register it at startup.'
}