# AWS EC2 Deployment Documentation

## Overview

CCIS CodeHub is deployed on AWS EC2 using Nginx as a reverse proxy and Gunicorn as the application server.

---

## Infrastructure

| Component | Technology |
|-----------|------------|
| Server | AWS EC2 (t3.micro, Ubuntu 24.04) |
| Web Server | Nginx (reverse proxy) |
| App Server | Gunicorn (WSGI) |
| Database | Neon PostgreSQL (external) |
| SSL | Let's Encrypt (Certbot) |
| Domain | ccis-codehub.space |

---

## Domain Setup

### Domain Provider
Domain: `ccis-codehub.space` (Hostinger)

### DNS Configuration
Add these records in Hostinger DNS settings:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `<EC2-Public-IP>` | 14400 |
| A | www | `<EC2-Public-IP>` | 14400 |
| TXT | @ | `google-site-verification=...` | 14400 |

### Steps
1. Log in to Hostinger → DNS / Nameservers
2. Add A record pointing `@` to EC2 public IP
3. Add A record pointing `www` to EC2 public IP
4. Wait 5-10 minutes for DNS propagation
5. Verify with: `nslookup ccis-codehub.space`

---

## Architecture

```
User → DNS → Nginx (Port 443)
                ├── /api/* → Gunicorn (Port 8000) → Django Backend
                ├── /admin/* → Gunicorn → Django Admin
                ├── /media/* → Static files
                └── /* → React Frontend (dist/)
```

---

## Deployment Steps

### 1. Server Setup
- Launch EC2 instance (t3.micro, Ubuntu 24.04)
- Configure Security Group: ports 22, 80, 443
- SSH access via key pair

### 2. Install Dependencies
```bash
sudo apt update
sudo apt install python3-pip python3-venv nginx
```

### 3. Clone Repository
```bash
git clone https://github.com/mrfost07/ccis-codehub.git
cd ccis-codehub
```

### 4. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic
```

### 5. Gunicorn Service
Create `/etc/systemd/system/ccis-backend.service`:
```ini
[Unit]
Description=CCIS CodeHub Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/ccis-codehub/backend
ExecStart=/home/ubuntu/ccis-codehub/backend/venv/bin/gunicorn core.wsgi:application --bind 127.0.0.1:8000 --workers 2
Restart=always

[Install]
WantedBy=multi-user.target
```

### 6. Nginx Configuration
Create `/etc/nginx/sites-available/ccis-codehub`:
```nginx
server {
    server_name ccis-codehub.space www.ccis-codehub.space;

    location / {
        root /home/ubuntu/ccis-codehub/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /admin/ {
        proxy_pass http://127.0.0.1:8000/admin/;
    }

    location /media/ {
        alias /home/ubuntu/ccis-codehub/backend/media/;
    }

    location /static/ {
        alias /home/ubuntu/ccis-codehub/backend/staticfiles/;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/ccis-codehub.space/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ccis-codehub.space/privkey.pem;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/ccis-codehub /etc/nginx/sites-enabled/
```

### 7. SSL Certificate
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d ccis-codehub.space -d www.ccis-codehub.space
```

### 8. Start Services
```bash
sudo systemctl enable ccis-backend
sudo systemctl start ccis-backend
sudo systemctl restart nginx
```

---

## Deployment Workflow

### Local Build & Upload
```powershell
# Build frontend locally
cd frontend
npm run build

# Upload to EC2
scp -i MyKey.pem -r dist ubuntu@<EC2-IP>:~/ccis-codehub/frontend/
```

### Fix Permissions (EC2)
```bash
~/fix-deploy.sh
```

---

## Environment Variables

### Backend `.env` (Production)
```env
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=ccis-codehub.space,www.ccis-codehub.space,<EC2-IP>
FRONTEND_URL=https://ccis-codehub.space
DATABASE_URL=postgresql://...@neon.tech/neondb
GOOGLE_CLIENT_ID=<client_id>
GOOGLE_CLIENT_SECRET=<secret>
OPENROUTER_API_KEY=<key>
```

### Frontend `.env` (Production)
```env
VITE_API_URL=https://ccis-codehub.space
VITE_API_BASE_URL=https://ccis-codehub.space/api
VITE_WS_URL=wss://ccis-codehub.space/ws
```

---

## Useful Commands

### Check Service Status
```bash
sudo systemctl status ccis-backend
sudo systemctl status nginx
```

### View Logs
```bash
sudo journalctl -u ccis-backend -f
sudo tail -f /var/log/nginx/error.log
```

### Restart Services
```bash
sudo systemctl restart ccis-backend
sudo systemctl restart nginx
```

---

## Summary

The application is deployed on AWS EC2 with Nginx handling SSL termination and static file serving, while Gunicorn runs the Django backend. The database is hosted externally on Neon PostgreSQL for scalability and reliability.
