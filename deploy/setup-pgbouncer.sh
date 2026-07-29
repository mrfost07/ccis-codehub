#!/bin/bash
# =============================================================================
# Put PgBouncer between Django and Neon.
#
#   sudo bash deploy/setup-pgbouncer.sh
#
# WHY
# Opening a database connection from this VM to Neon costs ~2 seconds: TCP,
# then TLS, then SCRAM channel binding, across a long distance (Neon is in
# us-east-1). Django cannot amortise that under ASGI — its connection registry
# is scoped per async task, so CONN_MAX_AGE=600 never actually reuses a
# connection and every single request pays the full handshake before doing any
# work at all.
#
# Measured on production before this change:
#   /api/         (no database)     0.26 s
#   /api/health/  (one SELECT 1)    2.24 s     <- ~2 s is pure connection setup
#
# PgBouncer holds those expensive TLS sessions to Neon open and hands Django a
# loopback connection in microseconds. Nothing about the application changes;
# only the host in DATABASE_URL.
#
# This does NOT reduce per-query latency (~250 ms each, because the data is
# still a continent away). Fewer queries per request still matters, and moving
# the Neon project to a region near this VM would cut that too.
#
# Idempotent: safe to re-run.
# =============================================================================
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/home/deploy/CCIS-CodeHub}"
ENV_FILE="$APP_DIR/backend/.env"
BOUNCER_PORT=6432
POOL_SIZE="${POOL_SIZE:-20}"

hdr() { echo -e "\n\033[1;35m==>\033[0m \033[1m$*\033[0m"; }
ok()  { echo -e "  \033[32m✓\033[0m $*"; }
die() { echo -e "  \033[31m✗\033[0m $*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run with sudo"
[ -f "$ENV_FILE" ] || die "no $ENV_FILE"

# ---------------------------------------------------------------------------
hdr "Reading the upstream database URL"

# Parsed in Python, not with sed: the password may legitimately contain the
# same characters a shell regex would split on.
read -r UP_USER UP_PASS UP_HOST UP_PORT UP_DB <<EOF
$(python3 - "$ENV_FILE" <<'PY'
import sys, urllib.parse as u
url = ''
for line in open(sys.argv[1], encoding='utf-8', errors='ignore'):
    line = line.strip()
    if line.startswith('DATABASE_URL='):
        url = line.split('=', 1)[1].strip().strip('"').strip("'")
if not url:
    sys.exit('DATABASE_URL not found')
if '127.0.0.1' in url or 'localhost' in url:
    sys.exit('ALREADY_LOCAL')
p = u.urlparse(url)
print(u.unquote(p.username or ''), u.unquote(p.password or ''),
      p.hostname or '', p.port or 5432, (p.path or '/').lstrip('/').split('?')[0])
PY
)
EOF

case "${UP_USER:-}" in
    ALREADY_LOCAL*) ok "DATABASE_URL already points at a local pool — nothing to do"; exit 0 ;;
    '')             die "could not parse DATABASE_URL" ;;
esac
ok "upstream: $UP_HOST:$UP_PORT/$UP_DB (user $UP_USER)"

# Neon routes by TLS SNI; PgBouncer does not send it. The endpoint ID is the
# first label of the hostname with any '-pooler' suffix removed.
ENDPOINT_ID="${UP_HOST%%.*}"
ENDPOINT_ID="${ENDPOINT_ID%-pooler}"
case "$ENDPOINT_ID" in
    ep-*) ok "endpoint id: $ENDPOINT_ID" ;;
    *)    die "could not derive a Neon endpoint id from '$UP_HOST'" ;;
esac

# The connect string below wraps the password in single quotes, so one inside
# the password would terminate it early and produce a config that silently
# authenticates with the wrong value.
case "$UP_PASS" in
    *"'"*) die "upstream password contains a single quote; rotate it in Neon first" ;;
esac

# ---------------------------------------------------------------------------
hdr "Installing PgBouncer"

pgb_version() { pgbouncer --version 2>/dev/null | head -1 | awk '{print $NF}'; }

# PgBouncer only learned the `options` connect-string parameter in 1.23, and
# without it there is no way to tell Neon which endpoint to route to (it does
# not send TLS SNI). Ubuntu 24.04 ships 1.22, which fails to even load the
# config: "unrecognized connection parameter: options".
version_ok() {
    local v; v=$(pgb_version) || return 1
    [ -n "$v" ] || return 1
    local major=${v%%.*} minor=${v#*.}; minor=${minor%%.*}
    [ "$major" -gt 1 ] || { [ "$major" -eq 1 ] && [ "$minor" -ge 23 ]; }
}

if ! command -v pgbouncer >/dev/null 2>&1; then
    DEBIAN_FRONTEND=noninteractive apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq pgbouncer >/dev/null || true
fi

if ! version_ok; then
    echo "  distro pgbouncer is $(pgb_version || echo none) — need >= 1.23 for 'options'"
    echo "  adding the PostgreSQL APT repository"
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq curl ca-certificates gnupg >/dev/null
    install -d /usr/share/postgresql-common/pgdg
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
        -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
    CODENAME=$(. /etc/os-release && echo "$VERSION_CODENAME")
    echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt ${CODENAME}-pgdg main" \
        > /etc/apt/sources.list.d/pgdg.list
    DEBIAN_FRONTEND=noninteractive apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --only-upgrade pgbouncer >/dev/null \
        || DEBIAN_FRONTEND=noninteractive apt-get install -y -qq pgbouncer >/dev/null
fi

version_ok || die "pgbouncer $(pgb_version || echo none) is too old and no newer build is available.
  Nothing has been changed — the site is untouched.
  PgBouncer >= 1.23 is required because Neon identifies the target project from
  TLS SNI, which PgBouncer does not send, and the only alternative is the
  'options' connect-string parameter added in 1.23."
ok "pgbouncer $(pgb_version)"

# ---------------------------------------------------------------------------
hdr "Writing configuration"
install -d -m 750 -o postgres -g postgres /etc/pgbouncer

# Credentials for Django -> PgBouncer. Generated once and reused, so re-running
# this script does not invalidate the URL already written into .env.
LOCAL_PASS_FILE=/etc/pgbouncer/.local_password
if [ ! -f "$LOCAL_PASS_FILE" ]; then
    head -c 24 /dev/urandom | base64 | tr -d '/+=' > "$LOCAL_PASS_FILE"
fi
chmod 600 "$LOCAL_PASS_FILE"; chown postgres:postgres "$LOCAL_PASS_FILE"
LOCAL_PASS="$(cat "$LOCAL_PASS_FILE")"

cat > /etc/pgbouncer/userlist.txt <<EOF
"$UP_USER" "$LOCAL_PASS"
EOF
chmod 640 /etc/pgbouncer/userlist.txt; chown postgres:postgres /etc/pgbouncer/userlist.txt

cat > /etc/pgbouncer/pgbouncer.ini <<EOF
;; Managed by deploy/setup-pgbouncer.sh — regenerated on each run.
[databases]
;; Django connects to this name; PgBouncer dials Neon over TLS on its behalf.
;;
;; Two things here are not obvious and both are required:
;;
;; 1. options='endpoint=...'
;;    Neon multiplexes every project behind one hostname and identifies the
;;    target from the TLS SNI field. PgBouncer does not send SNI, so Neon
;;    rejects the connection with "Endpoint ID is not specified". Passing the
;;    endpoint ID as a startup option is Neon's documented workaround for
;;    clients without SNI. The ID is the first label of the hostname, minus
;;    the '-pooler' suffix.
;;
;; 2. user=/password=
;;    Without explicit server credentials PgBouncer forwards whatever the
;;    client sent — which is the LOCAL password from userlist.txt, not the
;;    Neon one — and authentication fails after the routing succeeds.
$UP_DB = host=$UP_HOST port=$UP_PORT dbname=$UP_DB user=$UP_USER password='$UP_PASS' options='endpoint=$ENDPOINT_ID'

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = $BOUNCER_PORT
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

;; transaction pooling: a server connection is held only for the duration of a
;; transaction, so a handful of upstream connections serve many requests.
;; Django is configured with DISABLE_SERVER_SIDE_CURSORS to match.
pool_mode = transaction
max_client_conn = 200
default_pool_size = $POOL_SIZE
min_pool_size = 4

;; Keep connections warm. Neon closes idle ones; reconnecting costs ~2 s, so
;; retire them on our own schedule rather than being surprised mid-request.
server_lifetime = 900
server_idle_timeout = 300
server_login_retry = 2

;; TLS from PgBouncer to Neon (required). Django's hop is loopback only.
server_tls_sslmode = require

ignore_startup_parameters = extra_float_digits,options
logfile = /var/log/postgresql/pgbouncer.log
pidfile = /var/run/postgresql/pgbouncer.pid
admin_users = $UP_USER
EOF
chmod 640 /etc/pgbouncer/pgbouncer.ini; chown postgres:postgres /etc/pgbouncer/pgbouncer.ini
ok "config written"

# ---------------------------------------------------------------------------
hdr "Starting PgBouncer"
systemctl enable pgbouncer >/dev/null 2>&1 || true
systemctl restart pgbouncer
sleep 2
systemctl is-active --quiet pgbouncer || {
    journalctl -u pgbouncer -n 20 --no-pager || true
    die "pgbouncer failed to start"
}
ok "running on 127.0.0.1:$BOUNCER_PORT"

# ---------------------------------------------------------------------------
hdr "Pointing Django at the pool"
ENC_PASS=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$LOCAL_PASS")
NEW_URL="postgresql://$UP_USER:$ENC_PASS@127.0.0.1:$BOUNCER_PORT/$UP_DB"

BACKUP="$ENV_FILE.bak.$(date +%s)"
cp "$ENV_FILE" "$BACKUP"

# From here on the app is pointed at the pool. If anything below fails, put the
# original file back and restart — an unverified change must never be left in
# place. The first version of this script did exactly that and took the site
# down when Neon rejected the pool's connection.
rollback() {
    echo
    echo -e "  \033[31m✗\033[0m verification failed — rolling back"
    cp "$BACKUP" "$ENV_FILE"
    systemctl restart ccis-backend || true
    sleep 3
    local code
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 \
        "https://${DOMAIN:-ccis-codehub.space}/api/health/" || echo 000)
    echo "  restored original DATABASE_URL; /api/health/ -> $code"
    echo "  pgbouncer left installed but unused; logs: journalctl -u pgbouncer -n 50"
    exit 1
}
trap rollback ERR
python3 - "$ENV_FILE" "$NEW_URL" <<'PY'
import sys
path, new = sys.argv[1], sys.argv[2]
out, seen = [], False
for line in open(path, encoding='utf-8', errors='ignore'):
    if line.strip().startswith('DATABASE_URL='):
        if not seen:
            # Keep the original as DIRECT_DATABASE_URL: migrations and psql
            # still want a direct connection, and it is the rollback path.
            out.append('DIRECT_' + line if not line.startswith('DIRECT_') else line)
            out.append(f'DATABASE_URL={new}\n')
            seen = True
        continue
    out.append(line)
open(path, 'w', encoding='utf-8', newline='\n').writelines(out)
print('  rewrote DATABASE_URL (original kept as DIRECT_DATABASE_URL)')
PY
ok "backup saved next to .env"

# ---------------------------------------------------------------------------
hdr "Verifying the pool can actually reach Neon"
cd "$APP_DIR/backend"

# Checked BEFORE the app is restarted, so a broken pool never reaches users.
sudo -H -u deploy ./venv/bin/python - <<'PY' || rollback
import os, sys, time, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from django.db import connection
try:
    t0 = time.perf_counter()
    connection.ensure_connection()
    setup = (time.perf_counter() - t0) * 1000
    ts = []
    for _ in range(5):
        t = time.perf_counter()
        with connection.cursor() as c:
            c.execute('SELECT 1'); c.fetchone()
        ts.append((time.perf_counter() - t) * 1000)
    ts.sort()
    print(f'  connection setup : {setup:7.0f} ms   (was ~2000 ms direct to Neon)')
    print(f'  query round-trip : {ts[len(ts)//2]:7.0f} ms   (unchanged — still cross-region)')
except Exception as exc:
    print(f'  could not query through the pool: {exc}'[:400], file=sys.stderr)
    sys.exit(1)
PY

systemctl restart ccis-backend
sleep 4

hdr "End-to-end"
FAILED=1
for i in 1 2 3; do
    OUT=$(curl -s -o /dev/null -w '%{http_code} %{time_total}' --max-time 30 \
        "https://${DOMAIN:-ccis-codehub.space}/api/health/" || echo "000 0")
    echo "    /api/health/  ${OUT% *} in ${OUT#* }s"
    [ "${OUT% *}" = "200" ] && FAILED=0
done
[ "$FAILED" -eq 0 ] || rollback

trap - ERR
ok "pool is live and the site is healthy"

cat <<EOF

Rollback if needed:
  cp $BACKUP $ENV_FILE && systemctl restart ccis-backend

Note: migrations run through the pool fine, but if you ever hit an error about
prepared statements or cursors, run them against DIRECT_DATABASE_URL instead.
EOF
