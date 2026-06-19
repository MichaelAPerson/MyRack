#!/bin/bash

set -e

echo -e "\n\033[1;35m=========================================\033[0m"
echo -e "\033[1;36m  Installing MyRack Hub v0.1\033[0m"
echo -e "\033[1;32m  By: Michael Fischer\033[0m"
echo -e "\033[1;35m=========================================\033[0m\n"

# -----------------------------
# 1. Check Node
# -----------------------------
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install Node 18+ first:"
    echo "https://nodejs.org/"
    exit 1
fi

echo "✅ Node found: $(node -v)"

# -----------------------------
# 2. Check Git
# -----------------------------
if ! command -v git &> /dev/null; then
    echo "❌ Git not found. Install Git first:"
    echo "https://git-scm.com/"
    exit 1
fi

# -----------------------------
# 3. Install PM2 safely
# -----------------------------
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."

    if [ "$EUID" -eq 0 ]; then
        npm install -g pm2 --unsafe-perm=true
    else
        sudo npm install -g pm2 --unsafe-perm=true
    fi
fi

# -----------------------------
# 4. Clone or update repo
# -----------------------------
INSTALL_DIR="MyRack"

if [ -d "$INSTALL_DIR" ]; then
    echo "📁 MyRack already exists, updating..."
    cd $INSTALL_DIR
    git pull
else
    echo "📥 Cloning MyRack..."
    git clone https://github.com/MichaelAPerson/MyRack.git $INSTALL_DIR
    cd $INSTALL_DIR
fi

# -----------------------------
# 5. Install dependencies
# -----------------------------
echo "📦 Installing dependencies..."

echo "   → Root"
npm install

echo "   → Hub"
cd hub
npm install
cd ..

echo "   → Frontend"
cd frontend
npm install
cd ..

# -----------------------------
# 6. Build frontend
# -----------------------------
echo "🏗️ Building frontend..."
cd frontend
npm run build || { echo "❌ Frontend build failed"; exit 1; }
cd ..

# -----------------------------
# 7. Start hub with PM2
# -----------------------------
echo "⚙️ Starting MyRack Hub..."

pm2 start hub/server.js \
  --name myrack-hub \
  --cwd "$(pwd)"

pm2 save

# -----------------------------
# 8. Detect LAN IP
# -----------------------------
IP=$(hostname -I 2>/dev/null | awk '{print $1}')

if [ -z "$IP" ]; then
    IP=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}')
fi

if [ -z "$IP" ]; then
    IP="localhost"
fi

# -----------------------------
# 9. Done
# -----------------------------
echo ""
echo "✅ MyRack Hub installed successfully!"
echo "🌐 Open: http://$IP:4280"
echo ""
