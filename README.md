# MyRack

MyRack is a self-hosted dashboard for monitoring CPU, memory, storage, and device status. Metrics stay on your hub.

## Requirements

- Hub: Node.js 20.19+ or 22.12+, Git, and npm.
- Agent: Node.js 18+ and network access to the hub on port 4280 (or your configured port).
- Linux agent auto-start: systemd.

For HTTPS deployments, terminate TLS at a reverse proxy and start the hub with `COOKIE_SECURE=true`. Plain-HTTP LAN installs can leave this unset.

## Install the Dashboard Hub

Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/MichaelAPerson/MyRack/main/install-hub.sh | bash
```

Windows PowerShell:

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/MichaelAPerson/MyRack/main/install-hub.ps1" -UseBasicParsing | Invoke-Expression
```

The Windows installer uses `$HOME\MyRack` by default. To choose another folder, download the script and run it with `-InstallDir`; use `-SkipStart` to install and build without launching the hub. Both installers require Node.js 20.19+ or 22.12+ and Git. Open `http://<hub-ip>:4280` and create the administrator account on first launch.

## Add Devices

Agent installation is handled by the dashboard: open **Devices**, add a device, then run the generated setup command on that machine. Keep the device API key private; it is shown only when created or rotated.

## Start the Linux Agent at Boot

After installing the agent, run this on that Linux device as the same user who installed it:

```bash
curl -fsSL https://raw.githubusercontent.com/MichaelAPerson/MyRack/main/auto-restart.sh | bash
```

The script installs and enables a systemd service. Check it with `sudo systemctl status myrack-agent`.

## Review Before Running

These commands execute scripts downloaded from GitHub. To inspect one first, download it to a file, review it, then run it locally with the same arguments.
