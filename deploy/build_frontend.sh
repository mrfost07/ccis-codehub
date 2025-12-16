#!/bin/bash
# CCIS-CodeHub Frontend Build Script
# Run as deploy user: bash build_frontend.sh

set -e

cd /home/deploy/CCIS-CodeHub/frontend

echo "=========================================="
echo "  CCIS-CodeHub Frontend Build"
echo "=========================================="

# Install npm dependencies
echo "[1/2] Installing npm dependencies..."
npm install

# Build for production
echo "[2/2] Building for production..."
npm run build

echo ""
echo "=========================================="
echo "  Frontend Build Complete!"
echo "=========================================="
echo ""
echo "Static files are in: /home/deploy/CCIS-CodeHub/frontend/dist"
echo ""
