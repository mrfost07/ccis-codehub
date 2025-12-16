#!/bin/bash
# CCIS-CodeHub Master Deployment Script
# Run as root after copying project to VPS
# Usage: sudo bash deploy_all.sh

set -e

PROJECT_DIR="/home/deploy/CCIS-CodeHub"
DEPLOY_USER="deploy"

echo "=========================================="
echo "  CCIS-CodeHub Full Deployment"
echo "  Domain: ccis-codehub.space"
echo "=========================================="
echo ""

# Step 1: Initial VPS Setup
echo "[Step 1/8] Setting up VPS..."
bash $PROJECT_DIR/deploy/setup_vps.sh

# Step 2: Fix ownership
echo "[Step 2/8] Fixing file ownership..."
chown -R $DEPLOY_USER:$DEPLOY_USER $PROJECT_DIR

# Step 3: Setup Backend
echo "[Step 3/8] Setting up backend..."
sudo -u $DEPLOY_USER bash $PROJECT_DIR/deploy/setup_backend.sh

# Step 4: Copy production .env
echo "[Step 4/8] Setting up environment..."
cp $PROJECT_DIR/deploy/.env.production $PROJECT_DIR/backend/.env
chown $DEPLOY_USER:$DEPLOY_USER $PROJECT_DIR/backend/.env

# Step 5: Build Frontend
echo "[Step 5/8] Building frontend..."
sudo -u $DEPLOY_USER bash $PROJECT_DIR/deploy/build_frontend.sh

# Step 6: Setup Gunicorn service
echo "[Step 6/8] Setting up Gunicorn service..."
cp $PROJECT_DIR/deploy/ccis-backend.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable ccis-backend
systemctl start ccis-backend

# Step 7: Setup Nginx
echo "[Step 7/8] Setting up Nginx..."
cp $PROJECT_DIR/deploy/nginx-ccis-codehub.conf /etc/nginx/sites-available/ccis-codehub
ln -sf /etc/nginx/sites-available/ccis-codehub /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# Step 8: Setup SSL
echo "[Step 8/8] Setting up SSL with Let's Encrypt..."
certbot --nginx -d ccis-codehub.space -d www.ccis-codehub.space --non-interactive --agree-tos --email admin@ccis-codehub.space || echo "SSL setup may need manual intervention"

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "Your site should now be available at:"
echo "  Frontend: https://ccis-codehub.space"
echo "  API:      https://ccis-codehub.space/api/"
echo ""
echo "To check status:"
echo "  systemctl status ccis-backend"
echo "  systemctl status nginx"
echo ""
echo "To view logs:"
echo "  journalctl -u ccis-backend -f"
echo ""
