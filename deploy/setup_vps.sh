#!/bin/bash
# CCIS-CodeHub VPS Deployment Script - Part 1: Initial Setup
# Run as root: sudo bash setup_vps.sh
#
# Target: Ubuntu 24.04 LTS

set -euo pipefail

# ---------------------------------------------------------------------------
# SSH port — MUST match the port you actually connect on.
# The firewall step below opens ONLY this port. `ufw allow OpenSSH` opens 22,
# so on a box using a custom port (e.g. 22022) enabling ufw severs your own
# session and locks you out. Detected from sshd_config; override with:
#     SSH_PORT=22022 bash setup_vps.sh
# ---------------------------------------------------------------------------
DETECTED_PORT="$(grep -oP '^\s*Port\s+\K[0-9]+' /etc/ssh/sshd_config 2>/dev/null | head -1 || true)"
SSH_PORT="${SSH_PORT:-${DETECTED_PORT:-22}}"

echo "=========================================="
echo "  CCIS-CodeHub VPS Setup - Part 1"
echo "=========================================="
echo "  SSH port to keep open: ${SSH_PORT}"
echo "=========================================="

# Refuse to continue if nothing is listening there — a wrong value means the
# ufw step below cuts your connection.
if ! ss -tlnH "sport = :${SSH_PORT}" 2>/dev/null | grep -q .; then
    echo "!! Nothing is listening on port ${SSH_PORT}."
    echo "!! Re-run with the correct port, e.g.:  SSH_PORT=22022 bash setup_vps.sh"
    exit 1
fi

# Update system
echo "[1/5] Updating system..."
apt update && apt upgrade -y

# Install dependencies
# redis-server backs the Channels layer used by live quizzes; without it the
# app falls back to an in-memory layer that breaks across multiple workers.
echo "[2/5] Installing dependencies..."
apt install -y python3 python3-pip python3-venv python3-dev \
    nodejs npm nginx certbot python3-certbot-nginx \
    redis-server git curl build-essential libpq-dev

systemctl enable --now redis-server

# Create deploy user
echo "[3/5] Creating deploy user..."
if id "deploy" &>/dev/null; then
    echo "User 'deploy' already exists"
else
    adduser --disabled-password --gecos "" deploy
    usermod -aG sudo deploy
    # Single '>' — the original appended on every run, growing the sudoers file.
    echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy
    chmod 440 /etc/sudoers.d/deploy
fi

# Setup directories
echo "[4/5] Setting up directories..."
mkdir -p /home/deploy/CCIS-CodeHub
chown -R deploy:deploy /home/deploy/CCIS-CodeHub

# Configure firewall
echo "[5/5] Configuring firewall..."
ufw allow "${SSH_PORT}/tcp" comment 'SSH'
ufw allow 80/tcp   comment 'HTTP'
ufw allow 443/tcp  comment 'HTTPS'
ufw --force enable
ufw status verbose

echo ""
echo "=========================================="
echo "  Part 1 Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Copy project files to /home/deploy/CCIS-CodeHub"
echo "2. Run setup_backend.sh as the deploy user"
echo ""
