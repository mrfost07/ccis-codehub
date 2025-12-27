#!/bin/bash
# CCIS CodeHub Deployment Fix Script
# Run this after uploading dist/ folder to fix permissions

echo "🔧 CCIS CodeHub - Fixing deployment..."

# Fix frontend dist permissions
echo "📁 Fixing frontend permissions..."
sudo chmod 755 /home/ubuntu
sudo chmod 755 /home/ubuntu/ccis-codehub
sudo chmod 755 /home/ubuntu/ccis-codehub/frontend
sudo chmod -R 755 /home/ubuntu/ccis-codehub/frontend/dist
sudo chown -R ubuntu:www-data /home/ubuntu/ccis-codehub/frontend/dist

# Fix media permissions
echo "📷 Fixing media permissions..."
sudo chmod -R 755 /home/ubuntu/ccis-codehub/backend/media
sudo chown -R ubuntu:www-data /home/ubuntu/ccis-codehub/backend/media

# Fix static permissions
echo "📦 Fixing static permissions..."
sudo chmod -R 755 /home/ubuntu/ccis-codehub/backend/staticfiles 2>/dev/null || true
sudo chown -R ubuntu:www-data /home/ubuntu/ccis-codehub/backend/staticfiles 2>/dev/null || true

# Restart services
echo "🔄 Restarting services..."
sudo systemctl restart ccis-backend
sudo systemctl restart nginx

# Test
echo "🧪 Testing..."
STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" https://localhost/)
if [ "$STATUS" = "200" ]; then
    echo "✅ Success! Site is working (HTTP $STATUS)"
else
    echo "⚠️ Warning: Got HTTP $STATUS - check nginx logs"
    sudo tail -5 /var/log/nginx/error.log
fi

echo "🚀 Done! Visit https://ccis-codehub.space"
