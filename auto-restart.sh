#!/bin/bash

set -e

echo -e "\n\033[1;35m=========================================\033[0m"
echo -e "\033[1;36m  Setting up MyRack Agent Auto-Restart Tool\033[0m"
echo -e "\033[1;32m  By: Michael Fischer\033[0m"
echo -e "\033[1;35m=========================================\033[0m\n"

# -----------------------------
# 1. download service example
# -----------------------------

command -v wget >/dev/null 2>&1 || {
    echo "❌ wget is not installed"
    echo "Install it with: sudo apt install wget -y"
    exit 1
}

wget -q https://raw.githubusercontent.com/MichaelAPerson/MyRack/main/agent/myrack-agent.service.example
echo "✅ wget success"

# -----------------------------
# 2. Rename file
# -----------------------------

if [ ! -f "myrack-agent.service.example" ]; then
    echo "❌ file not found to rename"
    exit 1
fi

mv -f myrack-agent.service.example myrack-agent.service
echo "✅ rename success"

# -----------------------------
# 3. Install systemd service
# -----------------------------

echo "📦 Installing systemd service..."

sudo cp myrack-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable myrack-agent
sudo systemctl start myrack-agent

echo "✅ service installed and started successfully"

# -----------------------------
# 4. Verify service
# -----------------------------

echo "🔍 Checking service status..."
systemctl status myrack-agent --no-pager || true

# -----------------------------
# done
# -----------------------------

echo ""
echo "✅ MyRack Agent Auto-Restart Tool installed successfully!"
echo ""
