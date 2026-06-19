# MyRack by: MichaelAPerson, Michael Fischer

##🚀 INSTALL MYRACK

## 📘 What is MyRack?

**MyRack** is a self-hosted monitoring tool for computers and servers. It displays real-time usage of:
- 💽 CPU
- 🧠 Memory
- 🗄️ Storage

No cloud — your data stays on your machines.

## Install

### 📊 Install the Hub
```
curl -fsSL https://raw.githubusercontent.com/MichaelAPerson/MyRack/main/install-hub.sh | bash
```

###  📥  Install the Agent Auto-Restart Tool
**After you setup an agent device you are going to want to run this command so that if the device were to crash/reboot MyRack starts automatically.**
```
curl -fsSL https://raw.githubusercontent.com/MichaelAPerson/MyRack/main/auto-restart.sh | bash
```

## ➕ Adding Devices

### To add a device to your MyRack hub:

**1. Open the MyRack dashboard in your browser**

**2. Click Devices**

**3. Enter a name for the device**

**4. The hub will generate an install command**

**5. Copy and run that command on the target device**

**6. Wait for it to connect**

**7. Click + Add Widget**

**8. Select the device you just added**
