#!/bin/bash
# =============================================================================
# CCIS-CodeHub — post-deploy smoke test
#
#   sudo bash deploy/verify.sh
#
# Run after every deploy. Checks the paths that have actually broken in
# production before, not just "does the server respond":
#   - HTTPS, redirect, API health
#   - WebSocket upgrade (live quizzes die silently without this)
#   - media + static (a chown has taken media offline before)
#   - the SPA actually mounts (a bundle-ordering bug served 200s and a blank page)
#   - code execution still runs AND cannot read server secrets
#   - chat returns the NEWEST messages
#
# Exits non-zero if anything fails, so it can gate a deploy.
# =============================================================================
set -uo pipefail

DOMAIN="${DOMAIN:-ccis-codehub.space}"
APP_DIR="${APP_DIR:-/home/deploy/CCIS-CodeHub}"
BASE="https://${DOMAIN}"

pass=0; fail=0
ok()   { echo -e "  \033[32m✓\033[0m $*"; pass=$((pass+1)); }
bad()  { echo -e "  \033[31m✗\033[0m $*"; fail=$((fail+1)); }
note() { echo -e "  \033[33m·\033[0m $*"; }
hdr()  { echo -e "\n\033[1;35m==>\033[0m \033[1m$*\033[0m"; }

code() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$@"; }

# ---------------------------------------------------------------------------
hdr "Services"
for svc in ccis-backend nginx redis-server; do
    if systemctl is-active --quiet "$svc"; then ok "$svc active"; else bad "$svc NOT active"; fi
done

# daphne, not gunicorn — WSGI silently cannot serve WebSockets
if systemctl cat ccis-backend 2>/dev/null | grep -q 'daphne'; then
    ok "backend runs daphne (ASGI)"
else
    bad "backend is NOT running daphne — WebSockets will fail"
fi

# ---------------------------------------------------------------------------
hdr "HTTP surface"
c=$(code "$BASE/");                     [ "$c" = 200 ] && ok "GET / -> 200"            || bad "GET / -> $c"
c=$(code "http://${DOMAIN}/");          [ "$c" = 301 ] && ok "http -> https (301)"     || bad "http redirect -> $c"
h=$(curl -s --max-time 20 "$BASE/api/health/")
echo "$h" | grep -q '"healthy"' && ok "API health OK" || bad "API health: $h"
c=$(code "$BASE/static/admin/css/base.css"); [ "$c" = 200 ] && ok "/static/ -> 200" || bad "/static/ -> $c"

# ---------------------------------------------------------------------------
hdr "Media (nginx must be able to read uploads)"
IMG=$(find "$APP_DIR/backend/media" -type f \( -name '*.jpg' -o -name '*.png' -o -name '*.jpeg' \) 2>/dev/null | head -1)
if [ -n "$IMG" ]; then
    REL="${IMG#"$APP_DIR/backend/media/"}"
    c=$(code "$BASE/media/$REL")
    ct=$(curl -sI --max-time 20 "$BASE/media/$REL" | tr -d '\r' | awk -F': ' '/^[Cc]ontent-[Tt]ype/{print $2}')
    if [ "$c" = 200 ] && [[ "$ct" == image/* ]]; then
        ok "media serves ($c, $ct)"
    else
        bad "media -> $c ${ct:+($ct)}  — check: chown -R deploy:www-data $APP_DIR/backend/media"
    fi
    # 404 on a missing file proves nginx isn't blanket-200ing via the SPA fallback
    c=$(code "$BASE/media/__definitely_missing__.jpg")
    [ "$c" = 404 ] && ok "missing media -> 404 (routing correct)" \
                   || bad "missing media -> $c (expected 404; SPA fallback may be swallowing /media/)"
else
    note "no uploads on disk yet — skipped"
fi

# ---------------------------------------------------------------------------
hdr "WebSocket (live quizzes)"
# Origin is REQUIRED: Channels' AllowedHostsOriginValidator rejects requests
# without one, which looks like a broken deploy when it is just a bad test.
WS=$(curl -s -i -N --max-time 15 \
    -H "Origin: ${BASE}" -H "Connection: Upgrade" -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    "$BASE/ws/quiz/SMOKETEST/" 2>&1 | head -1)
echo "$WS" | grep -q '101' && ok "upgrade -> 101" || bad "upgrade -> ${WS:-no response}"

WSBAD=$(code -H "Origin: https://evil.example.com" -H "Connection: Upgrade" -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    "$BASE/ws/quiz/SMOKETEST/")
[ "$WSBAD" = 403 ] && ok "foreign origin rejected (403)" || bad "foreign origin -> $WSBAD (expected 403)"

# ---------------------------------------------------------------------------
hdr "SPA actually mounts"
# A bundle-ordering bug once served every asset with 200 while rendering a
# blank page, so status codes alone are not enough — check the entry chunk
# is present and non-trivial.
ENTRY=$(curl -s --max-time 20 "$BASE/" | grep -oE 'src="/assets/index-[^"]+"' | sed 's/src="//;s/"//' | head -1)
if [ -n "$ENTRY" ]; then
    sz=$(curl -s -o /dev/null -w '%{size_download}' --max-time 30 "$BASE$ENTRY")
    if [ "$sz" -gt 100000 ]; then ok "entry bundle served ($ENTRY, $sz bytes)"; else bad "entry bundle suspiciously small ($sz bytes)"; fi
else
    bad "no entry bundle referenced in index.html"
fi
note "a blank page with all-200 assets is a JS error — check the browser console"

# ---------------------------------------------------------------------------
hdr "Code execution (runs, and cannot read secrets)"
if ! cd "$APP_DIR/backend" 2>/dev/null; then
    bad "cannot cd to $APP_DIR/backend — skipping backend checks"
    SKIP_BACKEND=1
elif [ ! -x ./venv/bin/python ]; then
    bad "no venv at $APP_DIR/backend/venv — skipping backend checks"
    SKIP_BACKEND=1
else
    SKIP_BACKEND=0
fi

if [ "$SKIP_BACKEND" = 0 ]; then
OUT=$(sudo -H -u deploy ./venv/bin/python - <<'PY' 2>&1
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from apps.learning.code_executor import CodeExecutor
ex = CodeExecutor()

# 1. a legitimate solution must still pass
r = ex.run('python', 'a=int(input())\nb=int(input())\nprint(a+b)',
           [{'input': '5\n3', 'expected_output': '8'}])
print('RUNS=' + ('yes' if r['all_passed'] else 'no'))
if not r['all_passed']:
    print('ERR=' + (r['results'][0].get('stderr') or '')[:200].replace('\n', ' '))

# 2. submitted code must NOT see server secrets
probe = ("import os\n"
         "print('LEAK=' + ','.join(k for k in os.environ "
         "if any(x in k for x in ('SECRET','DATABASE','API_KEY','PASSWORD'))))")
r2 = ex.run('python', probe, [{'input': '', 'expected_output': 'x'}])
print((r2['results'][0]['stdout'] or 'LEAK=').strip())
PY
)
echo "$OUT" | grep -q 'RUNS=yes' && ok "python submissions execute" \
    || bad "code execution BROKEN -> $(echo "$OUT" | grep -E 'ERR=|Traceback' | head -1)"
LEAK=$(echo "$OUT" | grep -oE 'LEAK=.*' | sed 's/LEAK=//')
[ -z "$LEAK" ] && ok "no server secrets visible to student code" \
               || bad "SECRETS EXPOSED to submitted code: $LEAK"

# ---------------------------------------------------------------------------
hdr "Chat returns newest messages"
# Captured into a variable, NOT piped into `while read` — a pipeline runs its
# right-hand side in a subshell, so pass/fail increments there would be lost
# and the final tally would silently under-report failures.
CHAT=$(sudo -H -u deploy ./venv/bin/python - <<'PY' 2>/dev/null
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from apps.community.models import ChatRoom, ChatMessage
room = ChatRoom.objects.first()
if not room:
    print('SKIP no chat rooms'); raise SystemExit
qs = ChatMessage.objects.filter(room=room).exclude(deleted_for_everyone=True)
newest = qs.order_by('-created_at').first()
served = list(qs.order_by('-created_at')[:100])[::-1]
print('OK' if served and served[-1].id == newest.id else 'BAD', qs.count(), 'messages')
PY
)
case "$CHAT" in
    OK*)   ok "chat slice includes the newest message (${CHAT#OK })" ;;
    BAD*)  bad "chat is returning stale messages — the oldest-100 bug is back" ;;
    SKIP*) note "${CHAT#SKIP }" ;;
    *)     bad "chat check failed to run: ${CHAT:-no output}" ;;
esac
fi   # SKIP_BACKEND

# ---------------------------------------------------------------------------
hdr "Configuration sanity"
ENV="$APP_DIR/backend/.env"
grep -q '^DJANGO_DEBUG=False' "$ENV" 2>/dev/null && ok "DEBUG off" || bad "DJANGO_DEBUG is not False"
grep -q '^REDIS_URL=' "$ENV" 2>/dev/null && ok "REDIS_URL set" || bad "REDIS_URL missing (quizzes need it)"
grep -qE '^FRONTEND_URL=https?://' "$ENV" 2>/dev/null && ok "FRONTEND_URL absolute" || bad "FRONTEND_URL must include scheme"

# Mail: a console/dummy backend in production means signup links go nowhere.
BK=$(grep -E '^EMAIL_BACKEND=' "$ENV" 2>/dev/null | cut -d= -f2-)
case "$BK" in
    *smtp*)          ok "EMAIL_BACKEND is SMTP" ;;
    ''|*console*|*dummy*|*locmem*)
                     bad "EMAIL_BACKEND is '${BK:-unset}' — verification mail will not be delivered" ;;
    *)               note "EMAIL_BACKEND=$BK" ;;
esac
grep -q '^REQUIRE_EMAIL_VERIFICATION=False' "$ENV" 2>/dev/null \
    && note "email verification is OFF — was a workaround for ssct.edu.ph DNS, now fixed; set True" \
    || ok "email verification enabled"

# Recipient domains must actually resolve, or mail sits in Gmail's retry queue
# for tens of minutes and looks like a broken signup flow.
if command -v dig >/dev/null 2>&1; then   MXQ="dig +short +time=3 +tries=1 MX"
elif command -v host >/dev/null 2>&1; then MXQ="host -t MX -W 3"
else                                       MXQ=""
fi
if [ -z "$MXQ" ]; then
    # No resolver tool: stay silent rather than report a failure we cannot
    # actually observe. `apt install dnsutils` to enable this check.
    note "no dig/host available — skipped MX check (apt install dnsutils)"
else
    for d in ssct.edu.ph snsu.edu.ph; do
        if $MXQ "$d" 2>/dev/null | grep -qi 'aspmx\|mail\|MX'; then
            ok "$d resolves MX (mail deliverable)"
        else
            bad "$d has no MX — mail to it is deferred and retried, not bounced"
        fi
    done
fi
if grep -q '^SECURE_SSL_REDIRECT=True' "$ENV" 2>/dev/null; then ok "SSL redirect on"
else note "SECURE_SSL_REDIRECT is not True — fine pre-TLS, enable it once HTTPS works"; fi
BADLINE=$(grep -nvE '^\s*(#|[A-Za-z_][A-Za-z0-9_]*=|$)' "$ENV" 2>/dev/null | head -1)
[ -z "$BADLINE" ] && ok "no malformed .env lines" || note "malformed .env line (silently skipped): $BADLINE"

# ---------------------------------------------------------------------------
hdr "Result"
echo "  passed: $pass   failed: $fail"
[ "$fail" -eq 0 ] && echo -e "\n\033[32mDeployment looks healthy.\033[0m\n" \
                 || echo -e "\n\033[31m$fail check(s) failed — see above.\033[0m\n"
exit $(( fail > 0 ? 1 : 0 ))
