#!/bin/bash
# =============================================================================
# CCIS-CodeHub — one-shot VM bootstrap + deploy
#
# Target: Ubuntu 24.04, nginx + daphne (ASGI) + Redis, Neon Postgres.
# Safe to re-run: every step is idempotent.
#
#   sudo bash deploy/bootstrap.sh
#
# Options (env vars):
#   DOMAIN=ccis-codehub.space   domain to serve
#   SSH_PORT=22022              port to keep open in the firewall
#   SKIP_TLS=1                  skip certbot (use when DNS isn't pointed yet)
#   REPO=https://github.com/mrfost07/ccis-codehub.git
# =============================================================================
set -euo pipefail

DOMAIN="${DOMAIN:-ccis-codehub.space}"
REPO="${REPO:-https://github.com/mrfost07/ccis-codehub.git}"
APP_DIR="${APP_DIR:-/home/deploy/CCIS-CodeHub}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
SKIP_TLS="${SKIP_TLS:-0}"

log()  { echo -e "\n\033[1;35m==>\033[0m \033[1m$*\033[0m"; }
ok()   { echo -e "  \033[32m✓\033[0m $*"; }
warn() { echo -e "  \033[33m!\033[0m $*"; }
die()  { echo -e "\n\033[31m✗ $*\033[0m\n" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run as root:  sudo bash deploy/bootstrap.sh"

# ---------------------------------------------------------------------------
# 0. Firewall port safety — opening the wrong port then enabling ufw would
#    sever this very SSH session.
# ---------------------------------------------------------------------------
detect_ssh_port() {
    # 1. Explicit override always wins.
    [ -n "${SSH_PORT:-}" ] && { echo "$SSH_PORT"; return; }

    # 2. The port of THIS session, when sudo preserved it (sudo -E).
    #    $SSH_CONNECTION = "<client ip> <client port> <server ip> <server port>"
    if [ -n "${SSH_CONNECTION:-}" ]; then
        awk '{print $4}' <<<"$SSH_CONNECTION" | grep -qE '^[0-9]+$' \
            && { awk '{print $4}' <<<"$SSH_CONNECTION"; return; }
    fi

    # 3. What sshd is actually listening on — authoritative, and independent of
    #    where the config happens to live.
    local live
    live="$(ss -tlnpH 2>/dev/null | awk '/sshd/ {n=split($4,a,":"); print a[n]}' | sort -un | head -1)"
    [ -n "$live" ] && { echo "$live"; return; }

    # 4. Config files. On Ubuntu 24.04 the real Port is usually in a drop-in
    #    under sshd_config.d/ (cloud-init), while the main file has it commented
    #    out — checking only the main file is why this used to guess 22.
    local cfg
    cfg="$(grep -rhoP '^\s*Port\s+\K[0-9]+' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/*.conf 2>/dev/null | head -1)"
    [ -n "$cfg" ] && { echo "$cfg"; return; }

    echo 22
}

SSH_PORT="$(detect_ssh_port)"
if ! ss -tlnH "sport = :${SSH_PORT}" 2>/dev/null | grep -q .; then
    echo
    echo "  sshd listeners found:"
    ss -tlnpH 2>/dev/null | awk '/sshd/ {print "    " $4}' || echo "    (none)"
    die "Nothing is listening on port ${SSH_PORT}. Re-run with: sudo SSH_PORT=<your port> SKIP_TLS=${SKIP_TLS} bash deploy/bootstrap.sh"
fi
ok "SSH port ${SSH_PORT} will stay open"

# ---------------------------------------------------------------------------
# 1. System packages
# ---------------------------------------------------------------------------
log "[1/9] Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq python3 python3-venv python3-dev \
    nginx redis-server git curl build-essential libpq-dev \
    certbot python3-certbot-nginx >/dev/null
# Node 20 (Ubuntu's default node is too old for the Vite build)
if ! command -v node >/dev/null || [ "$(node -v | cut -c2- | cut -d. -f1)" -lt 18 ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
    apt-get install -y -qq nodejs >/dev/null
fi
systemctl enable --now redis-server >/dev/null 2>&1
ok "packages installed (node $(node -v), redis $(redis-server --version | grep -oP 'v=\K[0-9.]+'))"

# ---------------------------------------------------------------------------
# 2. Deploy user
# ---------------------------------------------------------------------------
log "[2/9] Deploy user"
if id "$DEPLOY_USER" &>/dev/null; then
    ok "user '$DEPLOY_USER' exists"
else
    adduser --disabled-password --gecos "" "$DEPLOY_USER" >/dev/null
    usermod -aG sudo "$DEPLOY_USER"
    echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$DEPLOY_USER
    chmod 440 /etc/sudoers.d/$DEPLOY_USER
    ok "created user '$DEPLOY_USER'"
fi

# ---------------------------------------------------------------------------
# 3. Source code
# ---------------------------------------------------------------------------
log "[3/9] Source code"
if [ -d "$APP_DIR/.git" ]; then
    # Take ownership BEFORE any git call. A repo cloned by root cannot be
    # operated on as the deploy user — git aborts with "dubious ownership".
    chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"
    # root also reads this repo (below, and for future manual pulls).
    git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
    sudo -u "$DEPLOY_USER" git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

    sudo -u "$DEPLOY_USER" git -C "$APP_DIR" fetch --all -q
    sudo -u "$DEPLOY_USER" git -C "$APP_DIR" reset --hard origin/main -q
    ok "updated to $(git -C "$APP_DIR" rev-parse --short HEAD)"
else
    mkdir -p "$(dirname "$APP_DIR")"
    git clone -q "$REPO" "$APP_DIR"
    git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
    ok "cloned into $APP_DIR"
fi
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"

# ---------------------------------------------------------------------------
# 4. Backend environment file
#    deploy/.env.production is gitignored, so it is NOT present after a clone.
#    Fail loudly rather than starting a server with no configuration.
# ---------------------------------------------------------------------------
log "[4/9] Backend environment"
ENV_FILE="$APP_DIR/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$APP_DIR/deploy/.env.production" ]; then
        cp "$APP_DIR/deploy/.env.production" "$ENV_FILE"
        ok "seeded backend/.env from deploy/.env.production"
    else
        cat <<EOF

  backend/.env is missing and deploy/.env.production is gitignored, so it did
  not come down with the clone. Copy it up from your machine, then re-run:

     scp -P ${SSH_PORT} deploy/.env.production root@<server>:${ENV_FILE}

  It must contain at least:
     DJANGO_SECRET_KEY, DJANGO_DEBUG=False,
     DJANGO_ALLOWED_HOSTS=${DOMAIN},www.${DOMAIN},<server-ip>,localhost,127.0.0.1
     DATABASE_URL, REDIS_URL=redis://127.0.0.1:6379/0
     FRONTEND_URL=https://${DOMAIN}
     SYSTEM_SETTINGS_KEY=<fresh random value>
     EMAIL_HOST / EMAIL_HOST_USER / EMAIL_HOST_PASSWORD   (or REQUIRE_EMAIL_VERIFICATION=False)

EOF
        die "missing $ENV_FILE"
    fi
fi
chown "$DEPLOY_USER:$DEPLOY_USER" "$ENV_FILE"
chmod 600 "$ENV_FILE"

# Warn about settings that break things silently rather than loudly.
grep -q '^DJANGO_DEBUG=False'    "$ENV_FILE" || warn "DJANGO_DEBUG is not False — do not run production with debug on"
grep -q '^REDIS_URL='            "$ENV_FILE" || warn "REDIS_URL not set — live quizzes need the Redis channel layer"
grep -q "^FRONTEND_URL=https\?://" "$ENV_FILE" || warn "FRONTEND_URL must be a full URL or confirmation emails link nowhere"
grep -q '^SYSTEM_SETTINGS_KEY='  "$ENV_FILE" || warn "SYSTEM_SETTINGS_KEY not set — admin settings access will return 503"
ok "env file in place"

# ---------------------------------------------------------------------------
# 5. Python backend
# ---------------------------------------------------------------------------
log "[5/9] Backend (venv, migrations, static)"
# A root-run step can leave root-owned caches in the deploy user's home, which
# silently disables pip's cache and makes npm fail outright. Fix ownership and
# use `sudo -H` so HOME actually points at the deploy user's home.
mkdir -p /home/"$DEPLOY_USER"/.cache /home/"$DEPLOY_USER"/.npm
chown "$DEPLOY_USER:$DEPLOY_USER" /home/"$DEPLOY_USER"
chown -R "$DEPLOY_USER:$DEPLOY_USER" /home/"$DEPLOY_USER"/.cache /home/"$DEPLOY_USER"/.npm

sudo -H -u "$DEPLOY_USER" bash -eu <<EOF
cd "$APP_DIR/backend"
[ -d venv ] || python3 -m venv venv
./venv/bin/pip install -q --upgrade pip
./venv/bin/pip install -q -r requirements.txt
./venv/bin/python manage.py migrate --noinput
./venv/bin/python manage.py collectstatic --noinput >/dev/null
EOF
ok "migrations applied, static collected"

# ---------------------------------------------------------------------------
# 6. Frontend build
#    Vite bakes env values in at build time, so this must run AFTER .env.production
#    exists in frontend/ (VITE_API_URL etc.).
# ---------------------------------------------------------------------------
log "[6/9] Frontend build"
if [ ! -f "$APP_DIR/frontend/.env.production" ]; then
    sudo -u "$DEPLOY_USER" tee "$APP_DIR/frontend/.env.production" >/dev/null <<EOF
VITE_API_URL=https://${DOMAIN}/api
VITE_API_BASE_URL=https://${DOMAIN}/api
VITE_WS_URL=wss://${DOMAIN}/ws
VITE_ENABLE_DEBUG=false
VITE_ENABLE_DEV_TOOLS=false
VITE_LOG_LEVEL=error
EOF
    ok "generated frontend/.env.production for ${DOMAIN}"
fi
# Do NOT swallow npm's output: hiding stderr here made a failed build look like
# a silent early exit with no clue what went wrong. Log it, and print the tail
# on failure.
BUILD_LOG=/tmp/ccis-frontend-build.log
echo "  building (this takes a few minutes; log: $BUILD_LOG)"
if ! sudo -H -u "$DEPLOY_USER" bash -eu >"$BUILD_LOG" 2>&1 <<EOF
cd "$APP_DIR/frontend"
export NODE_OPTIONS=--max-old-space-size=2048
npm ci --no-audit --no-fund || npm install --no-audit --no-fund
npm run build
EOF
then
    echo
    echo "  ---- last 40 lines of $BUILD_LOG ----"
    tail -40 "$BUILD_LOG"
    echo "  -------------------------------------"
    die "frontend build failed (full log: $BUILD_LOG)"
fi
[ -f "$APP_DIR/frontend/dist/index.html" ] || die "build reported success but produced no dist/index.html (log: $BUILD_LOG)"
ok "built $(du -sh "$APP_DIR/frontend/dist" | cut -f1) into frontend/dist"

# ---------------------------------------------------------------------------
# 7. systemd (daphne ASGI — gunicorn/WSGI cannot serve WebSockets)
# ---------------------------------------------------------------------------
log "[7/9] Backend service"
cp "$APP_DIR/deploy/ccis-backend.service" /etc/systemd/system/ccis-backend.service
systemctl daemon-reload
systemctl enable ccis-backend >/dev/null 2>&1
systemctl restart ccis-backend
sleep 3
systemctl is-active --quiet ccis-backend \
  || { journalctl -u ccis-backend -n 30 --no-pager; die "ccis-backend failed to start"; }
ok "ccis-backend running ($(systemctl show -p MainPID --value ccis-backend))"

# ---------------------------------------------------------------------------
# 8. nginx
# ---------------------------------------------------------------------------
log "[8/9] nginx"
cp "$APP_DIR/deploy/nginx-ccis-codehub.conf" /etc/nginx/sites-available/ccis-codehub
ln -sf /etc/nginx/sites-available/ccis-codehub /etc/nginx/sites-enabled/ccis-codehub
rm -f /etc/nginx/sites-enabled/default
nginx -t >/dev/null 2>&1 || { nginx -t; die "nginx config invalid"; }
systemctl reload nginx
ok "nginx serving ${DOMAIN}"

ufw allow "${SSH_PORT}/tcp" comment 'SSH' >/dev/null 2>&1 || true
ufw allow 80/tcp  comment 'HTTP'  >/dev/null 2>&1 || true
ufw allow 443/tcp comment 'HTTPS' >/dev/null 2>&1 || true
ufw --force enable >/dev/null 2>&1 || true
ok "firewall: ${SSH_PORT}, 80, 443 open"

# ---------------------------------------------------------------------------
# 9. TLS
# ---------------------------------------------------------------------------
log "[9/9] TLS"
if [ "$SKIP_TLS" = "1" ]; then
    warn "SKIP_TLS=1 — skipping certbot"
else
    RESOLVED="$(getent hosts "$DOMAIN" | awk '{print $1}' | head -1 || true)"
    MYIP="$(curl -fsS --max-time 10 https://api.ipify.org || true)"
    if [ -z "$RESOLVED" ]; then
        warn "$DOMAIN does not resolve yet — add an A record pointing at ${MYIP:-this server}, then re-run"
    elif [ -n "$MYIP" ] && [ "$RESOLVED" != "$MYIP" ]; then
        warn "$DOMAIN resolves to $RESOLVED but this server is $MYIP — fix DNS, then re-run"
    else
        certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" \
                --non-interactive --agree-tos --register-unsafely-without-email --redirect \
          && ok "certificate issued; HTTPS enabled" \
          || warn "certbot failed — site still reachable over HTTP"
    fi
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
SCHEME="http"; grep -q "listen 443" /etc/nginx/sites-available/ccis-codehub 2>/dev/null && SCHEME="https"
log "Done"
echo "  Site      : ${SCHEME}://${DOMAIN}"
echo "  Health    : curl -I ${SCHEME}://${DOMAIN}/api/health/"
echo "  Backend   : systemctl status ccis-backend"
echo "  Logs      : journalctl -u ccis-backend -f"
echo
echo "  WebSocket check (must return HTTP/1.1 101):"
echo "    curl -i -N -H 'Connection: Upgrade' -H 'Upgrade: websocket' \\"
echo "      -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \\"
echo "      ${SCHEME}://${DOMAIN}/ws/quiz/TESTCODE/"
echo
