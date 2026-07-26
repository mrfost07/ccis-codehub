# AWS EC2 Deployment Guide — CCIS-CodeHub

> ## ⚠️ SUPERSEDED — do not follow this guide
>
> This documents the **old AWS EC2 host** (`13.219.220.21`), which is no longer
> the deployment target. Production now runs on a different VM and **every
> connection detail below is wrong for it**:
>
> | | This guide (old) | Current target |
> |---|---|---|
> | IP | `13.219.220.21` | `104.207.92.63` |
> | SSH user | `ubuntu` | `root` |
> | SSH key | `MyKey.pem` | `spaceship` |
> | SSH port | 22 (default) | **22022** |
> | Project path | `~/ccis-codehub` | `/home/deploy/CCIS-CodeHub` |
> | Server | `gunicorn` (WSGI) | `daphne` (ASGI — required for WebSockets) |
>
> Use **[../deploy/PRODUCTION_CHECKLIST.md](../deploy/PRODUCTION_CHECKLIST.md)**
> and the scripts in `deploy/` instead. Kept for historical reference only.

## Server Details

| Item | Value |
|------|-------|
| **IP** | `13.219.220.21` |
| **Domain** | `ccis-codehub.space` |
| **OS** | Ubuntu (1GB RAM, 29GB disk) |
| **SSH Key** | `C:\Users\fosta\.ssh\MyKey.pem` |
| **SSH User** | `ubuntu` |
| **Project Path** | `~/ccis-codehub` |
| **Backend Venv** | `~/ccis-codehub/backend/venv` |
| **Python** | `~/ccis-codehub/backend/venv/bin/python` |
| **GitHub Repo** | `github.com/mrfost07/ccis-codehub` |
| **Branch** | `main` |

---

## Quick SSH Command

```powershell
ssh -i C:\Users\fosta\.ssh\MyKey.pem ubuntu@13.219.220.21
```

---

## Full Deployment Steps

### 1. Build Frontend Locally

```powershell
# From project root on Windows
cd "C:\Users\fosta\OneDrive\Desktop\Software Engineering\Project\CCIS-CodeHub\frontend"
npm run build
```

### 2. Build Android APK Locally

```powershell
# Sync Capacitor web assets into Android project
npx cap sync android

# Build debug APK
cd android
.\gradlew.bat assembleDebug

# APK output location:
# android\app\build\outputs\apk\debug\app-debug.apk
```

### 3. Push Code to GitHub

```powershell
cd "C:\Users\fosta\OneDrive\Desktop\Software Engineering\Project\CCIS-CodeHub"
git add -A
git commit -m "your message"
git push origin main
```

### 4. Pull Code on EC2

```powershell
ssh -i C:\Users\fosta\.ssh\MyKey.pem ubuntu@13.219.220.21 "cd ~/ccis-codehub && git pull origin main"
```

### 5. Upload Frontend Dist to EC2

```powershell
scp -i C:\Users\fosta\.ssh\MyKey.pem -r "C:\Users\fosta\OneDrive\Desktop\Software Engineering\Project\CCIS-CodeHub\frontend\dist" ubuntu@13.219.220.21:~/ccis-codehub/frontend/
```

### 6. Upload APK to EC2

SCP doesn't like the long path with spaces, so copy APK to temp first:

```powershell
# Copy APK to temp path (avoids path-with-spaces SCP issues)
Copy-Item "C:\Users\fosta\OneDrive\Desktop\Software Engineering\Project\CCIS-CodeHub\frontend\android\app\build\outputs\apk\debug\app-debug.apk" "C:\tmp\CCIS-CodeHub.apk" -Force

# Upload to dist folder on server
scp -i C:\Users\fosta\.ssh\MyKey.pem C:\tmp\CCIS-CodeHub.apk ubuntu@13.219.220.21:~/ccis-codehub/frontend/dist/CCIS-CodeHub.apk
```

APK will be downloadable at: `https://ccis-codehub.space/CCIS-CodeHub.apk`

### 7. Fix Permissions on EC2

```powershell
ssh -i C:\Users\fosta\.ssh\MyKey.pem ubuntu@13.219.220.21 "sudo chown -R www-data:www-data ~/ccis-codehub/frontend/dist && sudo chmod -R 755 ~/ccis-codehub/frontend/dist"
```

### 8. Run Migrations on EC2

```powershell
ssh -i C:\Users\fosta\.ssh\MyKey.pem ubuntu@13.219.220.21 "cd ~/ccis-codehub/backend && ~/ccis-codehub/backend/venv/bin/python manage.py makemigrations && ~/ccis-codehub/backend/venv/bin/python manage.py migrate"
```

### 9. Restart Nginx

```powershell
ssh -i C:\Users\fosta\.ssh\MyKey.pem ubuntu@13.219.220.21 "sudo systemctl restart nginx"
```

---

## One-Liner: Full Deploy (Steps 4-9 Combined)

```powershell
ssh -i C:\Users\fosta\.ssh\MyKey.pem ubuntu@13.219.220.21 "cd ~/ccis-codehub && git pull origin main && sudo chown -R www-data:www-data frontend/dist && sudo chmod -R 755 frontend/dist && cd backend && ~/ccis-codehub/backend/venv/bin/python manage.py makemigrations && ~/ccis-codehub/backend/venv/bin/python manage.py migrate && sudo systemctl restart nginx && echo 'DEPLOY DONE'"
```

---

## Server Architecture

```
nginx (port 443/80)
  ├── /              → frontend/dist  (React SPA)
  ├── /api/          → gunicorn :8000 (Django backend)
  ├── /static/       → backend/staticfiles/
  ├── /media/        → backend/media/
  └── /CCIS-CodeHub.apk → frontend/dist/CCIS-CodeHub.apk
```

**Services running:**
- **nginx** — reverse proxy, serves frontend dist
- **gunicorn** — Django backend on port 8000 (3 workers)
- **redis-server** — caching/sessions

---

## Server Health Checks

```powershell
# Memory
ssh -i C:\Users\fosta\.ssh\MyKey.pem ubuntu@13.219.220.21 "free -h"

# Disk
ssh -i C:\Users\fosta\.ssh\MyKey.pem ubuntu@13.219.220.21 "df -h /"

# Services running
ssh -i C:\Users\fosta\.ssh\MyKey.pem ubuntu@13.219.220.21 "sudo lsof -i :8000 | head -5"

# Nginx errors (last 20 lines)
ssh -i C:\Users\fosta\.ssh\MyKey.pem ubuntu@13.219.220.21 "sudo tail -20 /var/log/nginx/error.log"

# Nginx access log
ssh -i C:\Users\fosta\.ssh\MyKey.pem ubuntu@13.219.220.21 "sudo tail -20 /var/log/nginx/access.log"

# Full diagnostics
ssh -i C:\Users\fosta\.ssh\MyKey.pem ubuntu@13.219.220.21 "free -h && echo '---' && df -h / && echo '---' && uptime && echo '---' && sudo systemctl status nginx --no-pager | head -5"
```

---

## Nginx Config

- **Config file:** `/etc/nginx/sites-enabled/ccis-codehub`
- **Main config:** `/etc/nginx/nginx.conf`
- **SSL certs:** `/etc/letsencrypt/live/ccis-codehub.space/`
- **Gzip:** Enabled with comp_level 6 (uncommented 2026-03-01)

Edit nginx config:
```bash
sudo nano /etc/nginx/sites-enabled/ccis-codehub
sudo nginx -t        # test config
sudo systemctl restart nginx
```

---

## Django Admin

- **URL:** `https://ccis-codehub.space/api/admin/`
- **Django shell:**
  ```bash
  cd ~/ccis-codehub/backend
  ~/ccis-codehub/backend/venv/bin/python manage.py shell
  ```
- **Collect static files:**
  ```bash
  ~/ccis-codehub/backend/venv/bin/python manage.py collectstatic --noinput
  ```

---

## Clean Up Old Dist Assets

After SCP'ing a new dist, old hashed bundles stay on disk. Clean them:

```bash
cd ~/ccis-codehub/frontend/dist/assets
# List all JS bundles
ls -lh *.js
# Remove all except the current one (check filename from latest build)
sudo rm -f index-OLD_HASH.js index-OLD_HASH.js.map
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| **502 Bad Gateway** | Gunicorn crashed → `sudo lsof -i :8000` to check, restart if needed |
| **Site shows old content** | Hard refresh (Ctrl+Shift+R), clear nginx cache: `sudo rm -rf /var/cache/nginx/*` |
| **APK download 404** | Check APK is in `frontend/dist/` and permissions are set |
| **Migration errors** | Check `~/ccis-codehub/backend/venv/bin/python manage.py showmigrations` |
| **Slow loading** | Verify gzip: `curl -H 'Accept-Encoding: gzip' -sI https://ccis-codehub.space/assets/index-*.js | grep Content-Encoding` should show `gzip` |
| **Permission denied on dist** | `sudo chown -R www-data:www-data ~/ccis-codehub/frontend/dist` |
