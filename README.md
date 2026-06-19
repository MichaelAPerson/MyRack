# MyRack

🚀 INSTALL MYRACK

## 📘 What is MyRack?

**MyRack** is a self-hosted monitoring tool for computers and servers. It displays real-time usage of:
- 💽 CPU
- 🧠 Memory
- 🗄️ Storage

No cloud — your data stays on your machines.

## Install

### 📊 Install the Hub
```
sudo curl -fsSL https://raw.githubusercontent.com/MichaelAPerson/MyRack/main/install-hub.sh | bash
```

###  📥  Install the Agent Auto-Restart Tool
**After you setup an agent device you are going to want to run this command so that if the device were to crash/reboot MyRack starts automatically.**
```
curl -fsSL https://raw.githubusercontent.com/MichaelAPerson/MyRack/main/auto-restart.sh | bash
```

## How do I add devices to my hub?
**To add devices to the hub you will click the *Devices* button and enter the device's name you want to add, then it will provide you a command that you can copy and paste in the terminal of the device you are adding, then once it is connected you then click on the *+Add widget* button and can select the device you just setup. After you do that you are going to want to copy the command to Install the Agent Auto-Restart Tool**
