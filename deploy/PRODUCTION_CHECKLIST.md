# Production Readiness — CCIS CodeHub

Audit date: 2026-07-25. Target: single VPS (`104.207.92.63`, Ubuntu 24.04, SSH on port 22022) serving
`ccis-codehub.space`, nginx in front, Django + Channels behind it, Neon
Postgres, Redis for the channel layer.

---

## 1. Which env file is actually used? (the confusing part)

### Frontend — Vite

Vite loads **several files at once** and merges them. For `npm run build`
(mode = `production`) it reads, in increasing priority:

```
.env                    →  .env.local            →  .env.production        →  .env.production.local
(shared defaults)          (your machine,           (production values,       (rare)
                            ALL modes!)              wins over the two left)
```

Key points:

- **`.env.local` is loaded during a production build too.** It is not
  dev-only. Anything in it that is *not* also set in `.env.production` leaks
  into the shipped bundle.
- `.env.production` **does** override `.env.local` for the same key —
  verified: the built bundle contains `https://ccis-codehub.space/api` and
  `wss://ccis-codehub.space/ws`, not localhost.
- Only `VITE_*` variables are exposed to the browser. **Everything with a
  `VITE_` prefix is public** — never put a real secret there.
- Values are **baked in at build time**. Changing an env file requires a
  rebuild + redeploy; restarting nginx does nothing.

Current state: `frontend/.env.local` only pins the dev port and localhost API
URLs, all of which `.env.production` overrides. Safe as-is.

### Backend — Django (`django-environ`)

Django reads **one** file: `backend/.env`, loaded by `core/settings.py`.

- `deploy/.env.production` is **not read automatically**. It is a *template
  you copy onto the server*:
  ```bash
  cp deploy/.env.production /home/deploy/CCIS-CodeHub/backend/.env
  ```
  The systemd unit also passes it via `EnvironmentFile=.../backend/.env`.
- So on the VPS, `backend/.env` must hold the production values. The
  `backend/.env` in this repo is your **local dev** copy (`DEBUG=True`) and is
  gitignored.

### Summary table

| File | Read by | When | In git |
|---|---|---|---|
| `frontend/.env` | Vite | always | no |
| `frontend/.env.local` | Vite | always (incl. prod build) | no |
| `frontend/.env.production` | Vite | `npm run build` | no |
| `frontend/.env_example` | nobody | template | **yes** |
| `backend/.env` | Django | always | no |
| `deploy/.env.production` | nobody | template to copy → `backend/.env` | no |
| `backend/.env_example` | nobody | template | **yes** |

Only the two `_example` files are tracked, and both contain placeholders. No
secrets are committed. ✅

---

## 2. Blockers fixed in this commit

### 🔴 WebSockets could not work in production — **two** independent causes

1. **The server was WSGI.** `deploy/ccis-backend.service` ran
   `gunicorn core.wsgi:application`. WSGI has no WebSocket support at all, so
   every live-quiz socket would fail regardless of anything else.
   → Now runs `daphne core.asgi:application` (daphne 4.0.0 is already in
   `requirements.txt`; `ASGI_APPLICATION` was already configured correctly).

2. **nginx had no `/ws/` block.** Requests to `/ws` fell through to the SPA
   `location /` and were never upgraded.
   → Added a `/ws/` proxy with `Upgrade`/`Connection` headers, a `map` for
   `$connection_upgrade`, and 1-hour read/send timeouts (quiz sockets idle
   between questions).

Impact if unfixed: live quizzes, the instructor monitor, and violation
reporting are all dead in production.

### 🔴 HTTPS redirect loop

`SECURE_SSL_REDIRECT = True` with **no `SECURE_PROXY_SSL_HEADER`**. Behind
nginx, Django sees every proxied request as plain HTTP and redirects forever
(`ERR_TOO_MANY_REDIRECTS`).
→ Added `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')` and
`USE_X_FORWARDED_HOST`. nginx already forwards `X-Forwarded-Proto`.
→ `SECURE_SSL_REDIRECT` is now env-overridable, and ACME challenges are exempt
so certbot can complete.

### 🔴 Hardcoded admin key in committed source

`views_system.py` fell back to a hardcoded personal-looking key when
`SYSTEM_SETTINGS_KEY` was unset — and `deploy/.env.production` **does not set
it**, so production used the value visible to anyone with repo access.
→ Fallback removed (fails closed with 503), comparison is now constant-time
via `secrets.compare_digest`, and the `PasswordVerificationThrottle` that was
defined but never attached is now applied.
**Action required: set `SYSTEM_SETTINGS_KEY` on the server, and treat the old
value as compromised (it is in git history).**

### 🟡 Missing `CSRF_TRUSTED_ORIGINS`

Django 4+ rejects cross-origin POSTs (including admin login over HTTPS)
without it. → Now auto-derived from `ALLOWED_HOSTS` + `FRONTEND_URL`, and
overridable via env.

---

## 3. Still to do before launch

| # | Item | Severity |
|---|---|---|
| 1 | **No TLS.** nginx listens on port 80 only, but the frontend calls `https://` / `wss://`. Run `sudo certbot --nginx -d ccis-codehub.space -d www.ccis-codehub.space`. Keep `SECURE_SSL_REDIRECT=False` until it succeeds. | 🔴 Blocker |
| 2 | **`SYSTEM_SETTINGS_KEY` missing** from `deploy/.env.production`. Backend now fails closed, so settings access returns 503 until set. Generate a fresh value. | 🔴 |
| 3 | **SMTP is required — signup is now blocked without it.** New accounts must click an emailed confirmation link before they can sign in, so a broken mailer means nobody can register. `EMAIL_*` settings were previously absent entirely, so `EMAIL_BACKEND` in `.env` was ignored and Django fell back to `smtp://localhost:25` (every send raised `ConnectionRefusedError`). Settings now read them properly and default to the console backend in DEBUG. **Production must set `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`.** To launch before SMTP is ready, set `REQUIRE_EMAIL_VERIFICATION=False`. | 🔴 Blocker |
| 4 | **`GITHUB_CLIENT_SECRET` is empty** in both env files — GitHub OAuth will fail. Either fill it in or hide the GitHub login button. | 🟠 |
| 5 | `JSEARCH_API_KEY`, `ELEVENLABS_API_KEY` missing from production env. They default to `''`, so no crash, but **Jobs and text-to-speech are silently non-functional**. | 🟠 |
| 6 | **Duplicate `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `backend/.env`** (defined twice — the last one silently wins). Delete the stale pair; this is a real source of "why isn't my change taking effect". | 🟠 |
| 7 | Enable HSTS **after** HTTPS is confirmed working: `SECURE_HSTS_SECONDS=31536000`. Off by default because browsers cache it aggressively and it is painful to undo. | 🟡 |
| 8 | Code execution runs student code in a subprocess with a timeout, but **no filesystem/network/memory isolation** (documented in `code_executor.py`). On a shared VPS consider Docker/nsjail or Judge0. | 🟡 |
| 9 | `DEBUG` defaults to `True` in `settings.py` when `DJANGO_DEBUG` is unset — a missing env var means a debug server in production. Consider defaulting to `False`. | 🟡 |
| 10 | No `STATIC_ROOT` collection step verified in deploy scripts; run `python manage.py collectstatic --noinput` (nginx serves `/static/` from `backend/staticfiles/`). | 🟡 |

### Verified healthy ✅

- `DJANGO_SECRET_KEY`: 67 chars / 39 unique, not the `django-insecure-` default, and **different** from any committed example.
- `DJANGO_DEBUG=False` and `DEVELOPMENT_MODE=False` in the production template.
- `ALLOWED_HOSTS` correctly scoped to the real domains + IP.
- `DATABASE_URL` points at managed Postgres (Neon); `REDIS_URL` is set, so the
  Channels layer is Redis (required for multi-worker) rather than in-memory.
- No `.env` file with real secrets is tracked by git.
- Frontend production build correctly bakes the production API/WS URLs.
- `AllowedHostsOriginValidator` guards WebSocket origins.

---

## 3b. Before the first deploy to this VM

Three things must be in place first — none of them can be done from the repo.

### 1. DNS (blocks TLS)

`ccis-codehub.space` currently has **no A record**, and `www` does not resolve
at all. Certbot cannot issue a certificate until it does. At your domain
registrar add:

| Type | Host | Value |
|---|---|---|
| A | `@` | `104.207.92.63` |
| A | `www` | `104.207.92.63` |

Verify before running certbot (must print the IP):

```bash
dig +short ccis-codehub.space
```

### 2. SSH key access

The box currently accepts `publickey,password` but the `spaceship` key is not
in root's `authorized_keys`, so key-based login fails. On the server:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo 'PASTE_YOUR_PUBLIC_KEY_HERE' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Consider disabling password auth afterwards (`PasswordAuthentication no` in
`/etc/ssh/sshd_config`, then `systemctl restart ssh`).

### 3. ⚠️ Firewall / SSH port

**SSH on this box is port 22022, not 22.** The old `setup_vps.sh` ran
`ufw allow OpenSSH` (which only opens 22) followed by `ufw --force enable` —
that would have cut the session and locked you out with no way back in except
provider console access.

`setup_vps.sh` now detects the port from `sshd_config`, refuses to run if
nothing is listening on it, and opens 22022/80/443 explicitly. If detection
ever fails, pass it manually:

```bash
SSH_PORT=22022 sudo -E bash deploy/setup_vps.sh
```

---

## 4. Deploy sequence

```bash
# 1. Backend env (edit values first — especially SYSTEM_SETTINGS_KEY)
cp deploy/.env.production /home/deploy/CCIS-CodeHub/backend/.env

# 2. Backend
cd /home/deploy/CCIS-CodeHub/backend
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py check --deploy          # should report no security.W0xx

# 3. Frontend (env is baked in at build time)
cd ../frontend && npm ci && npm run build

# 4. Services
sudo cp deploy/ccis-backend.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl restart ccis-backend
sudo cp deploy/nginx-ccis-codehub.conf /etc/nginx/sites-available/ccis-codehub
sudo nginx -t && sudo systemctl reload nginx

# 5. TLS (after DNS points at the box)
sudo certbot --nginx -d ccis-codehub.space -d www.ccis-codehub.space
# then set SECURE_SSL_REDIRECT=True (and later SECURE_HSTS_SECONDS) and restart

# 6. Smoke test
curl -I https://ccis-codehub.space/api/health/
# WebSocket must return HTTP 101:
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
     https://ccis-codehub.space/ws/quiz/TESTCODE/
```

A green `/api/health/` but a failing WebSocket upgrade is the single most
likely failure mode — check `systemctl status ccis-backend` shows **daphne**,
not gunicorn.
