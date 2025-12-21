# CCIS-CodeHub Cloudways Deployment Guide

> Complete step-by-step guide for deploying CCIS-CodeHub to Cloudways VPS

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Cloudways Server Setup](#cloudways-server-setup)
3. [Domain & SSL Configuration](#domain--ssl-configuration)
4. [SSH Access Setup](#ssh-access-setup)
5. [Backend Deployment](#backend-deployment)
6. [Frontend Deployment](#frontend-deployment)
7. [PHP API Proxy Setup](#php-api-proxy-setup)
8. [Media Files Configuration](#media-files-configuration)
9. [Starting the Backend Server](#starting-the-backend-server)
10. [Verification & Testing](#verification--testing)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts & Services
- **Cloudways Account** (with VPS server)
- **GitHub Repository** with CCIS-CodeHub code
- **NeonDB Account** (PostgreSQL database)
- **Google Cloud Console** (for OAuth)
- **Domain Name** (e.g., `ccis-codehub.space`)

### Required API Keys
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- `GEMINI_API_KEY` (for AI features)
- NeonDB connection string

---

## Cloudways Server Setup

### 1. Create Server
1. Log in to Cloudways → **Add Server**
2. Choose **DigitalOcean** (or preferred provider)
3. Select **PHP 8.1+** application
4. Server size: Minimum **1GB RAM** recommended
5. Choose region closest to target users

### 2. Switch to Hybrid Stack
> [!IMPORTANT]
> This is required for `.htaccess` support

1. Go to **Server Management** → **Settings & Packages**
2. Under **Web Server**, change from **NGINX Only** to **Hybrid Stack** (Apache + NGINX)
3. Wait for server restart

### 3. Install Python & Dependencies
SSH into server and run:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Install additional dependencies
sudo apt install -y git redis-server

# Start Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

---

## Domain & SSL Configuration

### 1. Add Domain in Cloudways
1. **Applications** → Select your app → **Domain Management**
2. Add your domain (e.g., `ccis-codehub.space`)
3. Set as **Primary Domain**

### 2. Configure DNS
Add these records at your domain registrar:
| Type | Name | Value |
|------|------|-------|
| A | @ | `YOUR_SERVER_IP` |
| A | www | `YOUR_SERVER_IP` |

### 3. Install SSL Certificate
1. **Applications** → **SSL Certificate**
2. Choose **Let's Encrypt**
3. Enter email and domain
4. Click **Install Certificate**
5. Enable **Force HTTPS Redirect**

---

## SSH Access Setup

### 1. Get SSH Credentials
1. **Server Management** → **Master Credentials**
2. Note: Username, Password, IP Address

### 2. Connect via SSH
```bash
ssh master_username@YOUR_SERVER_IP
# Enter password when prompted
```

### 3. Navigate to Application Directory
```bash
cd ~/applications/YOUR_APP_FOLDER/
# Your app folder name is shown in Cloudways dashboard
```

---

## Backend Deployment

### 1. Clone Repository
```bash
cd ~/applications/YOUR_APP_FOLDER/
git clone https://github.com/mrfost07/ccis-codehub.git backend_repo
```

### 2. Setup Python Virtual Environment
```bash
cd backend_repo/backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Create Backend .env File
```bash
nano .env
```

Add the following (replace with your values):
```env
# Django Settings
DJANGO_SECRET_KEY=your-secure-secret-key-here
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=ccis-codehub.space,www.ccis-codehub.space,YOUR_SERVER_IP

# Database (NeonDB)
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require

# CORS Settings
CORS_ALLOWED_ORIGINS=https://ccis-codehub.space,https://www.ccis-codehub.space

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Redis
REDIS_URL=redis://localhost:6379/0
```

### 4. Run Migrations
```bash
source venv/bin/activate
python manage.py migrate
python manage.py collectstatic --noinput
```

### 5. Create Superuser (if needed)
```bash
python manage.py createsuperuser
```

---

## Frontend Deployment

### 1. Build Frontend Locally
On your local machine:
```bash
cd frontend

# Create/update .env.production
echo "VITE_API_URL=https://ccis-codehub.space" > .env.production
echo "VITE_API_BASE_URL=https://ccis-codehub.space/api" >> .env.production
echo "VITE_WS_URL=wss://ccis-codehub.space" >> .env.production

# Build
npm install
npm run build
```

### 2. Push to GitHub
```bash
git add .
git commit -m "Build frontend for production"
git push origin main
```

### 3. Deploy to Cloudways
SSH into server:
```bash
cd ~/applications/YOUR_APP_FOLDER/

# Pull latest code
cd backend_repo
git pull origin main

# Copy frontend build to public_html
cp -r frontend/dist/* ~/applications/YOUR_APP_FOLDER/public_html/
```

---

## PHP API Proxy Setup

> [!IMPORTANT]
> This proxy routes `/api/*` requests to the Django backend

### 1. Create API Proxy Directory
```bash
mkdir -p ~/applications/YOUR_APP_FOLDER/public_html/api
```

### 2. Create PHP Proxy File
```bash
nano ~/applications/YOUR_APP_FOLDER/public_html/api/index.php
```

Paste this content:
```php
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$backend_url = 'http://127.0.0.1:8000';
$request_uri = $_SERVER['REQUEST_URI'];
$path = preg_replace('/^\/api/', '/api', $request_uri);
$full_url = $backend_url . $path;

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $full_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

// Forward request method
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);

// Forward headers
$headers = [];
foreach (getallheaders() as $name => $value) {
    if (strtolower($name) !== 'host' && strtolower($name) !== 'content-length') {
        $headers[] = "$name: $value";
    }
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Forward request body for POST/PUT/PATCH
if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH'])) {
    $input = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
}

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

if (curl_errno($ch)) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Backend connection failed', 'detail' => curl_error($ch)]);
} else {
    http_response_code($http_code);
    if ($content_type) {
        header('Content-Type: ' . $content_type);
    }
    echo $response;
}

curl_close($ch);
?>
```

### 3. Create .htaccess for API Routing
```bash
nano ~/applications/YOUR_APP_FOLDER/public_html/.htaccess
```

Content:
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    
    # Route /api requests to PHP proxy
    RewriteCond %{REQUEST_URI} ^/api
    RewriteRule ^api/(.*)$ /api/index.php [L,QSA]
    
    # React Router - serve index.html for client-side routes
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>
```

---

## Media Files Configuration

### 1. Copy Media Files
```bash
# Copy media from backend to public_html
cp -r ~/applications/YOUR_APP_FOLDER/backend_repo/backend/media ~/applications/YOUR_APP_FOLDER/public_html/
```

### 2. Set Permissions
```bash
chmod -R 755 ~/applications/YOUR_APP_FOLDER/public_html/media
```

---

## Starting the Backend Server

### 1. Create Startup Script
```bash
nano ~/applications/YOUR_APP_FOLDER/start_backend.sh
```

Content:
```bash
#!/bin/bash
cd ~/applications/YOUR_APP_FOLDER/backend_repo/backend
source venv/bin/activate
export DJANGO_SETTINGS_MODULE=core.settings

# Kill existing process if running
pkill -f "daphne.*8000" 2>/dev/null

# Start Daphne (ASGI server for WebSocket support)
nohup daphne -b 127.0.0.1 -p 8000 core.asgi:application > ~/daphne.log 2>&1 &

echo "Backend started on port 8000"
echo "Logs: ~/daphne.log"
```

### 2. Make Executable and Run
```bash
chmod +x ~/applications/YOUR_APP_FOLDER/start_backend.sh
~/applications/YOUR_APP_FOLDER/start_backend.sh
```

### 3. Verify Backend is Running
```bash
curl http://127.0.0.1:8000/api/health/
# Should return: {"status": "ok"}
```

---

## Verification & Testing

### 1. Test API Endpoints
```bash
# From server
curl https://ccis-codehub.space/api/auth/check/

# Should return authentication response
```

### 2. Test Frontend
Visit `https://ccis-codehub.space` in browser - should load the React app

### 3. Test Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client
4. Add these **Authorized redirect URIs**:
   - `https://ccis-codehub.space/api/auth/google/callback/`
   - `https://ccis-codehub.space/auth/callback`

### 4. Test Login Flow
Try logging in via Google OAuth on the live site

---

## Troubleshooting

### Backend Not Starting
```bash
# Check logs
tail -f ~/daphne.log

# Check if port is in use
sudo lsof -i :8000

# Kill and restart
pkill -f daphne
~/applications/YOUR_APP_FOLDER/start_backend.sh
```

### API Returns 502 Bad Gateway
- Backend server not running - start it with the startup script
- Check PHP proxy logs in Cloudways dashboard

### CORS Errors
- Verify `CORS_ALLOWED_ORIGINS` in backend `.env`
- Check PHP proxy CORS headers

### OAuth "Method Not Allowed" (405)
- Ensure PHP proxy forwards POST request body correctly
- Check Google OAuth redirect URIs are correct

### Media/Images Not Loading
- Verify media files are in `public_html/media/`
- Check file permissions (755)
- Clear browser cache

### Frontend Shows Blank Page
- Check browser console for errors
- Verify `.htaccess` is correct for React Router
- Rebuild frontend with correct `.env.production`

---

## Quick Reference Commands

```bash
# SSH into server
ssh master_username@YOUR_SERVER_IP

# Navigate to app
cd ~/applications/YOUR_APP_FOLDER/

# Start backend
~/applications/YOUR_APP_FOLDER/start_backend.sh

# View backend logs
tail -f ~/daphne.log

# Pull latest code
cd backend_repo && git pull origin main

# Rebuild and deploy frontend
cd frontend && npm run build
cp -r dist/* ~/applications/YOUR_APP_FOLDER/public_html/

# Copy latest media
cp -r backend/media/* ~/applications/YOUR_APP_FOLDER/public_html/media/
```

---

## Important URLs

| Purpose | URL |
|---------|-----|
| Frontend | `https://ccis-codehub.space` |
| API Base | `https://ccis-codehub.space/api/` |
| Admin Panel | `https://ccis-codehub.space/api/admin/` |
| Health Check | `https://ccis-codehub.space/api/health/` |

---

*Last Updated: December 2024*
