#!/bin/bash
# CCIS-CodeHub VPS Deployment Script - Part 1: Initial Setup
# Run as root: sudo bash setup_vps.sh

set -e

echo "=========================================="
echo "  CCIS-CodeHub VPS Setup - Part 1"
echo "=========================================="

# Update system
echo "[1/5] Updating system..."
apt update && apt upgrade -y

# Install dependencies
echo "[2/5] Installing dependencies..."
apt install -y python3 python3-pip python3-venv python3-dev \
    nodejs npm nginx certbot python3-certbot-nginx \
    git curl build-essential libpq-dev

# Create deploy user
echo "[3/5] Creating deploy user..."
if id "deploy" &>/dev/null; then
    echo "User 'deploy' already exists"
else
    adduser --disabled-password --gecos "" deploy
    usermod -aG sudo deploy
    echo "deploy ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/deploy
fi

# Setup directories
echo "[4/5] Setting up directories..."
mkdir -p /home/deploy/CCIS-CodeHub
chown -R deploy:deploy /home/deploy/CCIS-CodeHub

# Configure firewall
echo "[5/5] Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo "=========================================="
echo "  Part 1 Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Copy project files to /home/deploy/CCIS-CodeHub"
echo "2. Run setup_backend.sh as deploy user"
echo ""
