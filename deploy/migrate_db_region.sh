#!/bin/bash
# =============================================================================
# CCIS-CodeHub — move the database to a Neon project in another region
#
# Why: the server is in Singapore and the database was in us-east-1, so every
# query cost ~230 ms of round-trip. Measured on production, 454 queries across
# 120 endpoints took 109 SECONDS of pure network wait, and the cost model was
# almost exactly `ms = queries x 231`. Same-region puts that at 1-5 ms.
#
# The move is done with Django's own dumpdata/loaddata rather than
# pg_dump/pg_restore, because this box has no postgresql-client at all and
# installing one needs apt — which is currently blocked by a stuck upgrade.
# Django talks to both databases over the wire, so the client version and the
# 17-vs-18 question never arise.
#
# Run one phase at a time and read the output. Every phase is safe to re-run.
#
#   sudo bash deploy/migrate_db_region.sh preflight   # read-only, no downtime
#   sudo bash deploy/migrate_db_region.sh export      # stops the app
#   sudo bash deploy/migrate_db_region.sh load
#   sudo bash deploy/migrate_db_region.sh verify      # GATE — must pass
#   sudo bash deploy/migrate_db_region.sh switch
#   sudo bash deploy/migrate_db_region.sh finish
#   sudo bash deploy/migrate_db_region.sh rollback    # any time after switch
#
# The old project keeps running untouched the whole way through, so rollback is
# one line in .env. Do not delete it for at least a week.
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/home/deploy/CCIS-CodeHub}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
BACKEND="$APP_DIR/backend"
PY="$BACKEND/venv/bin/python"
ENV_FILE="$BACKEND/.env"

# Work area: root-only, because it holds a data export and a connection URL.
WORK="${WORK:-/var/tmp/ccis-db-migrate}"
URL_CACHE="$WORK/target_url"
DUMP="$WORK/data.json"
ROWS_BEFORE="$WORK/rows_before.txt"
ROWS_AFTER="$WORK/rows_after.txt"
ENV_BACKUP="$WORK/env.before-switch"

hdr()  { echo -e "\n\033[1;35m==>\033[0m \033[1m$*\033[0m"; }
ok()   { echo -e "  \033[32m✓\033[0m $*"; }
warn() { echo -e "  \033[33m!\033[0m $*"; }
die()  { echo -e "\n\033[31m✗ $*\033[0m\n" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run with sudo"
[ -x "$PY" ] || die "no venv python at $PY"
[ -f "$ENV_FILE" ] || die "no $ENV_FILE"

# Owned by the deploy user, not root: dumpdata runs as deploy (root-run python
# leaves root-owned __pycache__ in a deploy-owned tree, which is exactly what
# broke `git pull` earlier), so deploy has to be able to write the export here.
# Root still reads and writes everything regardless. 700 keeps it private.
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$WORK"

# ---------------------------------------------------------------------------
# Target URL. Prompted, never committed, cached 600 for the run and shredded
# by `finish`. Neon's -pooler host is PgBouncer in transaction mode, where
# session-scoped state breaks; migrations and fixture loads use the direct
# endpoint, which is the same hostname without that suffix.
# ---------------------------------------------------------------------------
target_url() {
    if [ -n "${TARGET_DATABASE_URL:-}" ]; then
        printf '%s' "$TARGET_DATABASE_URL" > "$URL_CACHE"
        chmod 600 "$URL_CACHE"
    fi
    if [ ! -s "$URL_CACHE" ]; then
        # Prompts go to stderr. This function's stdout IS the URL — a stray
        # newline on stdout would be captured by $(target_url) and prefixed to
        # the connection string, which then fails to parse.
        echo >&2
        read -rsp "  Paste the target (Singapore) DATABASE_URL: " _u; echo >&2
        [ -n "$_u" ] || die "empty URL"
        printf '%s' "$_u" > "$URL_CACHE"
        chmod 600 "$URL_CACHE"
        unset _u
    fi
    # Strip -pooler so every phase talks to the direct endpoint.
    sed 's/-pooler\././' "$URL_CACHE"
}

# Masked form, safe to print.
show_url() {
    python3 - "$1" <<'PY'
import sys, urllib.parse as u
p = u.urlparse(sys.argv[1])
print(f"{p.username}:***@{p.hostname}:{p.port or 5432}{p.path}")
PY
}

# Run a Django management command against a chosen database, AS THE DEPLOY
# USER — root-run python leaves root-owned __pycache__ in a deploy-owned tree,
# which is the same failure that broke `git pull` earlier in this migration.
dj() {
    local url="$1"; shift
    ( cd "$BACKEND" && sudo -u "$DEPLOY_USER" env DATABASE_URL="$url" "$PY" manage.py "$@" )
}

# Run an inline python snippet (on stdin) against a chosen database.
dj_py() {
    local url="$1"
    ( cd "$BACKEND" && sudo -u "$DEPLOY_USER" env DATABASE_URL="$url" "$PY" - )
}

row_counts() {   # $1 = url ; writes "table count" lines to stdout
    dj_py "$1" <<'PY'
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from django.db import connection
with connection.cursor() as c:
    c.execute("""SELECT table_name FROM information_schema.tables
                 WHERE table_schema='public' AND table_type='BASE TABLE'
                 ORDER BY table_name""")
    for (t,) in c.fetchall():
        c.execute(f'SELECT count(*) FROM "{t}"')
        print(t, c.fetchone()[0])
PY
}

# ---------------------------------------------------------------------------
case "${1:-}" in

preflight)
    URL="$(target_url)"
    hdr "Target database"
    ok "$(show_url "$URL")"
    dj_py "$URL" <<'PY'
import os, sys, time, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from django.db import connection
connection.ensure_connection()
with connection.cursor() as c:
    c.execute('SELECT version()')
    ver = c.fetchone()[0].split(',')[0]
    c.execute("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
    tables = c.fetchone()[0]
print(f'  version: {ver}')
print(f'  existing public tables: {tables}')
if tables:
    print('  ! NOT EMPTY — loading into this would mix two datasets')
lat = []
for _ in range(7):
    s = time.perf_counter()
    with connection.cursor() as c:
        c.execute('SELECT 1')
    lat.append((time.perf_counter() - s) * 1000)
lat.sort()
print(f'  SELECT 1 median: {lat[len(lat)//2]:.1f} ms   (us-east-1 measured 228 ms)')
PY
    hdr "Source database (live)"
    row_counts "$(grep -m1 '^DATABASE_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '"'"'"'')" > "$ROWS_BEFORE" \
        || die "could not read the live database"
    ok "$(wc -l < "$ROWS_BEFORE") tables counted -> $ROWS_BEFORE"
    echo
    ok "read-only; nothing changed. Next: export (this stops the app)"
    ;;

export)
    hdr "Stopping the application"
    systemctl stop ccis-backend
    ok "ccis-backend stopped — downtime starts now"
    # Anything else that writes must be down too, or the export misses rows.
    systemctl list-units --type=service --state=running 2>/dev/null \
        | grep -Ei 'celery|daphne|ccis' || ok "no other app services running"

    hdr "Exporting data"
    # contenttypes + auth.permission are rebuilt by migrate on the target;
    # re-loading them collides on the unique (app_label, model) key.
    # admin.logentry is dropped because production still has content types for
    # the deleted ai_proctor app, and a log row pointing at a model that no
    # longer exists aborts the whole load. It is a Django-admin audit trail,
    # not application data.
    # --natural-foreign is what makes the exclusions safe: FKs to content types
    # serialise as ["app","model"] instead of ids that will not match.
    ( cd "$BACKEND" && sudo -u "$DEPLOY_USER" "$PY" manage.py dumpdata \
        --natural-foreign --natural-primary \
        --exclude contenttypes --exclude auth.permission --exclude admin.logentry \
        --output "$DUMP" )
    chmod 600 "$DUMP"
    ok "wrote $(du -h "$DUMP" | cut -f1) to $DUMP"
    warn "this file contains user emails — 'finish' shreds it"
    ;;

load)
    URL="$(target_url)"
    [ -s "$DUMP" ] || die "no export at $DUMP — run 'export' first"

    hdr "Building the schema on the target"
    dj "$URL" migrate --noinput
    ok "migrations applied"

    hdr "Loading data"
    dj "$URL" loaddata "$DUMP"
    ok "fixtures loaded"

    hdr "Resetting sequences"
    # loaddata inserts explicit primary keys and leaves every sequence at 1, so
    # the next insert on an AutoField table collides. Normally this is piped
    # through dbshell, which needs psql — absent here, so run it in-process.
    dj_py "$URL" <<'PY'
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from django.apps import apps
from django.core.management.color import no_style
from django.db import connection
stmts = []
for cfg in apps.get_app_configs():
    models = list(cfg.get_models(include_auto_created=True))
    if models:
        stmts += connection.ops.sequence_reset_sql(no_style(), models)
with connection.cursor() as c:
    for s in stmts:
        c.execute(s)
print(f'  reset {len(stmts)} sequences')
PY
    ok "sequences reset"
    ;;

verify)
    URL="$(target_url)"
    [ -s "$ROWS_BEFORE" ] || die "no baseline at $ROWS_BEFORE — run 'preflight' first"

    hdr "Comparing row counts"
    row_counts "$URL" > "$ROWS_AFTER"

    python3 - "$ROWS_BEFORE" "$ROWS_AFTER" <<'PY' || die "verification FAILED — do not switch"
import sys
# The only differences that are expected, and why:
#   django_admin_log      excluded from the export on purpose
#   django_content_type   rebuilt by migrate; stale ai_proctor rows not recreated
#   auth_permission       same
ALLOWED = {'django_admin_log', 'django_content_type', 'auth_permission'}

def load(p):
    d = {}
    for line in open(p):
        if line.strip():
            t, n = line.rsplit(None, 1)
            d[t.strip()] = int(n)
    return d

before, after = load(sys.argv[1]), load(sys.argv[2])
missing = sorted(set(before) - set(after))
extra   = sorted(set(after) - set(before))
bad, noted = [], []
for t in sorted(set(before) & set(after)):
    if before[t] != after[t]:
        (noted if t in ALLOWED else bad).append((t, before[t], after[t]))

for t, b, a in noted:
    print(f'  expected: {t:<34} {b:>7} -> {a:>7}')
if missing:
    print(f'  MISSING TABLES ON TARGET: {missing}')
if extra:
    print(f'  EXTRA TABLES ON TARGET:   {extra}')
for t, b, a in bad:
    print(f'  MISMATCH: {t:<36} {b:>7} -> {a:>7}')

if bad or missing:
    print(f'\n  {len(bad)} mismatched, {len(missing)} missing')
    sys.exit(1)
print(f'\n  {len(before)} tables match (excluding the 3 expected above)')
PY
    ok "row counts match"

    hdr "Migration state"
    unapplied="$(dj "$URL" showmigrations | grep -c '\[ \]' || true)"
    [ "$unapplied" = "0" ] || die "$unapplied unapplied migrations on the target"
    ok "all migrations applied"
    echo
    ok "GATE PASSED — safe to switch"
    ;;

switch)
    URL="$(target_url)"
    hdr "Backing up .env"
    cp "$ENV_FILE" "$ENV_BACKUP"
    chmod 600 "$ENV_BACKUP"
    ok "$ENV_BACKUP"

    hdr "Pointing .env at the new database"
    # Rewritten in python so only this key changes and nothing else in the file
    # is reformatted or reordered.
    python3 - "$ENV_FILE" "$URL" <<'PY'
import sys
path, url = sys.argv[1], sys.argv[2]
lines = open(path, encoding='utf-8').read().splitlines(keepends=True)
out, replaced = [], False
for line in lines:
    if line.startswith('DATABASE_URL=') and not replaced:
        out.append(f'DATABASE_URL={url}\n'); replaced = True
    else:
        out.append(line)
if not replaced:
    out.append(f'DATABASE_URL={url}\n')
open(path, 'w', encoding='utf-8').write(''.join(out))
print('  DATABASE_URL replaced' if replaced else '  DATABASE_URL appended')
PY
    chown "$DEPLOY_USER:$DEPLOY_USER" "$ENV_FILE"
    chmod 600 "$ENV_FILE"

    hdr "Repointing PgBouncer at the new upstream"
    # setup-pgbouncer.sh reads DATABASE_URL from .env, rewrites the pool config,
    # points .env back at 127.0.0.1, verifies /api/health/, and restores the
    # previous .env by itself if that check fails.
    bash "$APP_DIR/deploy/setup-pgbouncer.sh"
    ok "pool repointed"
    ;;

finish)
    hdr "Starting the application"
    systemctl start ccis-backend
    sleep 5
    systemctl is-active --quiet ccis-backend && ok "ccis-backend active" || die "backend did not start"

    hdr "Smoke test"
    bash "$APP_DIR/deploy/verify.sh" || warn "verify.sh reported failures — see above"

    hdr "Latency after the move"
    ( cd "$BACKEND" && sudo -u "$DEPLOY_USER" "$PY" manage.py measure_queries --threshold 8 ) || true

    hdr "Cleaning up"
    for f in "$DUMP" "$URL_CACHE"; do
        [ -f "$f" ] && shred -u "$f" && ok "shredded $(basename "$f")"
    done
    warn "keep $ENV_BACKUP until you are satisfied — it is the rollback"
    warn "leave the us-east-1 Neon project running for at least a week"
    warn "rotate the new database password in the Neon console"
    ;;

rollback)
    [ -s "$ENV_BACKUP" ] || die "no backup at $ENV_BACKUP"
    hdr "Restoring the previous .env"
    cp "$ENV_BACKUP" "$ENV_FILE"
    chown "$DEPLOY_USER:$DEPLOY_USER" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    systemctl restart ccis-backend
    sleep 5
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 \
        "https://${DOMAIN:-ccis-codehub.space}/api/health/" || echo 000)"
    ok "restored; /api/health/ -> $code"
    warn "PgBouncer still points at the new upstream; re-run setup-pgbouncer.sh if the old path is needed"
    ;;

*)
    sed -n '3,32p' "$0"
    exit 1
    ;;
esac
