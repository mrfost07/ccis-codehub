#!/bin/bash
# CCIS-CodeHub Backend Setup Script
# Run as deploy user: bash setup_backend.sh

set -e

cd /home/deploy/CCIS-CodeHub/backend

echo "=========================================="
echo "  CCIS-CodeHub Backend Setup"
echo "=========================================="

# Create virtual environment
echo "[1/4] Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install dependencies
echo "[2/4] Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn

# Run migrations
echo "[3/4] Running database migrations..."
python manage.py migrate --noinput

# Collect static files
echo "[4/4] Collecting static files..."
python manage.py collectstatic --noinput

echo ""
echo "=========================================="
echo "  Backend Setup Complete!"
echo "=========================================="
echo ""
echo "Make sure to create .env file with production settings"
echo ""
