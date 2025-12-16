# CCIS-CodeHub VPS Deployment

This folder contains all scripts and configurations needed to deploy CCIS-CodeHub to a Linux VPS.

## Files

| File | Description |
|------|-------------|
| `setup_vps.sh` | Initial VPS setup (run as root) |
| `setup_backend.sh` | Backend Python setup |
| `build_frontend.sh` | Frontend React build |
| `deploy_all.sh` | **Master script** - runs everything |
| `ccis-backend.service` | Systemd service for Gunicorn |
| `nginx-ccis-codehub.conf` | Nginx configuration |
| `.env.production` | Production environment variables |

## Quick Deployment

### Option 1: Automated (Recommended)

```bash
# 1. Copy project to VPS
scp -r . root@158.247.250.110:/home/deploy/CCIS-CodeHub

# 2. SSH into VPS
ssh root@158.247.250.110

# 3. Run master script
cd /home/deploy/CCIS-CodeHub
sudo bash deploy/deploy_all.sh
```

### Option 2: Manual Steps

See `implementation_plan.md` for step-by-step instructions.

## Post-Deployment

### Update Google OAuth
Add these URIs in Google Cloud Console:
- `https://ccis-codehub.space/auth/callback`

### Check Services
```bash
systemctl status ccis-backend
systemctl status nginx
```

### View Logs
```bash
journalctl -u ccis-backend -f
```

### Redeploy After Changes
```bash
cd /home/deploy/CCIS-CodeHub
git pull
sudo systemctl restart ccis-backend
```
