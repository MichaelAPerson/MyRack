# 🚀 INSTALL MYRACK

[![MyRack Status](https://img.shields.io/badge/MyRack-Monitoring-blueviolet?style=flat-square&logo=server)](https://github.com/MichaelAPerson/myrack)
[![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20Mac%20%7C%20Windows-green?style=flat-square&logo=windows)](https://github.com/MichaelAPerson/myrack)
[![Install Script](https://img.shields.io/badge/Installer-Shell%20Script-lightgrey?style=flat-square&logo=gnu-bash)](https://github.com/MichaelAPerson/myrack)

---

## 📘 What is MyRack?

**MyRack** is a self-hosted monitoring tool for Linux computers and servers. It displays real-time usage of:
- 💽 CPU
- 🧠 Memory
- 🌐 Network
- 🗄️ Storage

No cloud — your data stays on your machines.

---

## 📥 [Install the Agent](#install-the-agent)

Install this on every device you want to monitor.

### 🐧 Linux / 🍎 Mac
```
curl -fsSL https://raw.githubusercontent.com/MichaelAPerson/myrack/main/install-agent.sh | bash
```
### 🪟 Windows
```
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/MichaelAPerson/myrack/main/install-agent.sh" -UseBasicParsing | Invoke-Expression
```
## 📊 Install the Dashboard
Only one device needs the dashboard (usually your main machine or server).

### 🐧 Linux / 🍎 Mac
```
curl -fsSL https://raw.githubusercontent.com/MichaelAPerson/myrack/main/install-dashboard.sh | bash
```
### 🪟 Windows PowerShell
```
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/MichaelAPerson/myrack/main/install-dashboard.sh" -UseBasicParsing | Invoke-Expression
```
