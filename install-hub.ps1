param(
  [string]$InstallDir = (Join-Path $HOME 'MyRack'),
  [switch]$SkipStart
)

$ErrorActionPreference = 'Stop'
$RepositoryUrl = 'https://github.com/MichaelAPerson/MyRack.git'

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
  throw 'Node.js 20.19+ or 22.12+ is required. Install Node.js first: https://nodejs.org'
}

$nodeVersion = (& $nodeCommand.Source --version).TrimStart('v').Split('.')
$nodeMajor = [int]$nodeVersion[0]
$nodeMinor = [int]$nodeVersion[1]
$supportedNode = ($nodeMajor -eq 20 -and $nodeMinor -ge 19) -or ($nodeMajor -ge 22 -and ($nodeMajor -gt 22 -or $nodeMinor -ge 12))
if (-not $supportedNode) {
  throw "MyRack requires Node.js 20.19+ or 22.12+. Found $(& $nodeCommand.Source --version)."
}

$gitCommand = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCommand) {
  throw 'Git is required. Install Git for Windows first: https://git-scm.com/download/win'
}

if (Test-Path (Join-Path $InstallDir '.git')) {
  Write-Host "Updating MyRack in $InstallDir ..."
  & $gitCommand.Source -C $InstallDir pull --ff-only
  if ($LASTEXITCODE -ne 0) { throw 'Could not update the MyRack checkout.' }
} elseif (Test-Path $InstallDir) {
  throw "$InstallDir exists but is not a Git checkout. Choose another -InstallDir or move that directory."
} else {
  Write-Host "Cloning MyRack into $InstallDir ..."
  & $gitCommand.Source clone $RepositoryUrl $InstallDir
  if ($LASTEXITCODE -ne 0) { throw 'Could not clone the MyRack repository.' }
}

foreach ($packageDir in @('hub', 'agent', 'frontend')) {
  Write-Host "Installing $packageDir dependencies ..."
  Push-Location (Join-Path $InstallDir $packageDir)
  try {
    npm ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "Dependency installation failed in $packageDir." }
  } finally {
    Pop-Location
  }
}

Write-Host 'Building the dashboard ...'
Push-Location (Join-Path $InstallDir 'frontend')
try {
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'The dashboard build failed.' }
} finally {
  Pop-Location
}

Write-Host 'MyRack hub setup is complete.'
Write-Host "Dashboard URL: http://localhost:4280"
Write-Host 'Create the administrator account the first time you open the dashboard.'

if (-not $SkipStart) {
  $existingListener = Get-NetTCPConnection -LocalPort 4280 -State Listen -ErrorAction SilentlyContinue
  if ($existingListener) {
    Write-Warning 'Port 4280 is already in use; leaving the existing process untouched. Stop it before starting this installation.'
  } else {
    $logDir = Join-Path $InstallDir 'logs'
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    $process = Start-Process -FilePath $nodeCommand.Source -ArgumentList 'start.js' -WorkingDirectory $InstallDir -RedirectStandardOutput (Join-Path $logDir 'hub.out.log') -RedirectStandardError (Join-Path $logDir 'hub.err.log') -PassThru
    Write-Host "Started MyRack (process $($process.Id)). Logs: $logDir"
  }
}