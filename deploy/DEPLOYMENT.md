# CCIS CodeHub — Deployment Guide

Live: **https://ccis-codehub.space**

Everything below reflects the deployment as it actually runs, verified on
2026-07-26. For the pre-launch audit and remaining hardening items see
[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md).

---

## 1. The environment

| | |
|---|---|
| Host | `104.207.92.63` (Ubuntu 24.04 LTS, 8 vCPU AMD EPYC, 8 GB RAM) |
| SSH | `ssh -i ~/.ssh/spaceship -p 22022 root@104.207.92.63` (**port 22022**, not 22) |
| Domain | `ccis-codehub.space` + `www` → both A records point at the host |
| DNS | Hostinger (`ns1/ns2.dns-parking.com`) |
| App path | `/home/deploy/CCIS-CodeHub` |
| Runs as | `deploy` |
| Database | Neon Postgres (managed, external) |
| TLS | Let's Encrypt via certbot, auto-renewing |

### Request flow

```
browser
  │  https://ccis-codehub.space
  ▼
nginx :443  ── /            → frontend/dist        (React SPA, static)
            ── /assets/     → frontend/dist/assets
            ── /media/      → backend/media        (user uploads)
            ── /static/     → backend/staticfiles  (Django admin assets)
            ── /api/    ┐
            ── /admin/  ├─→ 127.0.0.1:8000  daphne (ASGI)
            ── /ws/     ┘   └─ WebSockets: Upgrade headers + 1h timeouts
                                └─ Channels → Redis (127.0.0.1:6379)
                                └─ Django   → Neon Postgres
```

**daphne, not gunicorn.** WSGI cannot serve WebSockets at all; live quizzes,
the instructor monitor and violation reporting all depend on `/ws/`.

---

## 2. Everyday workflow — ship a change

### On your laptop

```bash
# 1. make your changes, then verify BEFORE pushing
cd frontend && npx tsc --noEmit && npx vite build && cd ..

# 2. commit
git add -A
git commit -m "fix(scope): what changed and why"

# 3. push
git push origin main
```

> A successful `vite build` does **not** mean the app works — it only means it
> compiled. See §6 "blank page" for the bug that shipped exactly that way. To
> actually check the production bundle:
> `cd frontend && npx vite preview --port 4173` then open http://localhost:4173

### On the server

```bash
ssh -i ~/.ssh/spaceship -p 22022 root@104.207.92.63
cd /home/deploy/CCIS-CodeHub
git pull
sudo bash deploy/bootstrap.sh
```

Then **hard-refresh** the browser (`Ctrl+Shift+R`) — asset filenames are
content-hashed, but `index.html` can be cached.

That is the whole loop. `bootstrap.sh` is idempotent: it pulls, rebuilds,
migrates, restarts, and re-applies permissions every time, and skips whatever
is already correct.

### What bootstrap.sh does

| Step | Action |
|---|---|
| 0 | Detect the real SSH port; refuse to run if nothing is listening on it |
| 1 | apt packages, Node 20, Redis (enabled) |
| 2 | `deploy` user + sudoers |
| 3 | `git fetch` + `reset --hard origin/main`, fix ownership |
| — | Re-apply `backend/media` perms (`deploy:www-data`) |
| 4 | Verify `backend/.env` exists; warn on dangerous values |
| 5 | venv, `pip install`, `migrate`, `collectstatic` |
| 6 | `npm ci` + `vite build` (logs to `/tmp/ccis-frontend-build.log`) |
| 7 | Install + restart `ccis-backend` (daphne); abort if it fails to start |
| 8 | Install nginx config, reload, open firewall (SSH/80/443) |
| 9 | certbot — only if DNS actually points here |

Useful flags:

```bash
sudo SKIP_TLS=1 bash deploy/bootstrap.sh          # skip certbot
sudo SSH_PORT=22022 bash deploy/bootstrap.sh      # pin the SSH port
sudo DOMAIN=example.com bash deploy/bootstrap.sh  # different domain
```

### Backend-only change (skip the ~2 min frontend build)

```bash
cd /home/deploy/CCIS-CodeHub && git pull
cd backend && sudo -u deploy ./venv/bin/python manage.py migrate --noinput
sudo systemctl restart ccis-backend
```

### First-time / rebuilt server

```bash
git clone https://github.com/mrfost07/ccis-codehub.git /home/deploy/CCIS-CodeHub
# .env is gitignored — copy it up from your laptop first:
#   scp -P 22022 deploy/.env.production root@104.207.92.63:/home/deploy/CCIS-CodeHub/backend/.env
cd /home/deploy/CCIS-CodeHub && sudo SKIP_TLS=1 bash deploy/bootstrap.sh
# add DNS A records, then re-run without SKIP_TLS for the certificate
```

---

## 3. Configuration

**Django reads exactly one file: `backend/.env`.** `deploy/.env.production` is
a *template you copy there* — nothing reads it automatically. Both are
gitignored; only the `_example` files are committed.

**Vite bakes `VITE_*` values in at build time.** Changing them requires a
rebuild, not a restart. Everything with a `VITE_` prefix is public — never put
a secret there. For `npm run build`, Vite merges (right wins):

```
.env  →  .env.local  →  .env.production
```

`.env.local` is loaded during production builds too — a common trap.

### Settings that will bite you

| Variable | Production value | Why it matters |
|---|---|---|
| `DJANGO_DEBUG` | `False` | Defaults to `True` if unset |
| `SECURE_SSL_REDIRECT` | `True` (after TLS) | `True` **before** certbot makes the site unreachable — nginx isn't listening on 443 yet |
| `REDIS_URL` | `redis://127.0.0.1:6379/0` | Without it Channels falls back to in-memory and live quizzes break across workers |
| `FRONTEND_URL` | `https://ccis-codehub.space` | Must include the scheme, or emailed links are relative and unusable |
| `SYSTEM_SETTINGS_KEY` | *(set)* | Admin settings dialog returns 503 if unset |
| `REQUIRE_EMAIL_VERIFICATION` | `False` *(see §7)* | `True` blocks every signup while email is undeliverable |
| `EMAIL_BACKEND` | `...smtp.EmailBackend` | Console backend *prints* mail instead of sending it |

---

## 4. Operations

```bash
# logs
sudo journalctl -u ccis-backend -f                  # live
sudo journalctl -u ccis-backend -n 100 --no-pager   # recent
sudo tail -f /var/log/nginx/error.log               # 502s, TLS
cat /tmp/ccis-frontend-build.log                    # last build

# filter out internet bots probing /api/.env, /api/graphql …
sudo journalctl -u ccis-backend -f | grep -vE "\.env|graphql|gql|/api/config|wp-"

# service control
sudo systemctl restart ccis-backend
sudo systemctl status ccis-backend --no-pager
sudo nginx -t && sudo systemctl reload nginx

# health
curl -I https://ccis-codehub.space/
curl -s https://ccis-codehub.space/api/health/

# WebSocket — must return 101. The Origin header is REQUIRED:
# Channels' AllowedHostsOriginValidator rejects requests without one,
# so omitting it gives a misleading 403.
curl -i -N -H "Origin: https://ccis-codehub.space" \
  -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  https://ccis-codehub.space/ws/quiz/TEST/ | head -3
```

### Verified working (2026-07-26)

| Check | Result |
|---|---|
| `https://ccis-codehub.space/` | `200` |
| `/api/health/` | `{"status":"healthy"}` |
| `http://` → `https://` | `301` |
| `/media/...` | `200 image/jpeg` |
| WebSocket upgrade | `101 Switching Protocols` |
| WebSocket, foreign origin | `403` (correctly rejected) |

---

## 5. Triage

| Symptom | Look at |
|---|---|
| 502 Bad Gateway | `systemctl status ccis-backend` — daphne died |
| Blank page, assets 200 | Browser console. Server logs show nothing for JS errors |
| Images 403 | `backend/media` ownership — see §6 |
| Images 404 | File genuinely missing; `media/` is gitignored, so `scp` it up |
| WebSocket not 101 | Confirm daphne (not gunicorn) is running; check nginx `/ws/` block |
| Site unreachable after deploy | `SECURE_SSL_REDIRECT=True` without a certificate |
| Email "sent" but never arrives | See §7 — usually recipient-side DNS |

**Everything 200 but the site looks broken?** `location /` has
`try_files $uri /index.html`, so a misrouted path returns `200 text/html`
instead of 404. Always check `Content-Type`, not just the status code.

---

## 6. Problems hit during this deployment

Recorded so a recurrence is recognisable. Each is fixed in the commit shown.

| Symptom | Root cause | Commit |
|---|---|---|
| Blank white page, all assets `200` | `manualChunks` put React in `react-vendor` but React-dependent libs in `vendor`, which Rollup emitted first → `undefined.memo`. Dev serves unbundled modules, so it only broke in production | `308269d` |
| Avatar upload `500` | `QueryDict` subclasses `dict`, so `isinstance(request.data, dict)` matched multipart and hit `.copy()` — a deep copy that can't pickle a `TemporaryUploadedFile`'s handle. Only files **>2.5 MB** (`FILE_UPLOAD_MAX_MEMORY_SIZE`) go to disk, so small avatars worked | `52d63c9` |
| Navbar avatar stayed stale | `ProfileEnhanced` refreshed only local state; the navbar reads `AuthContext`, still holding the `sessionStorage` copy from login | `257fc94` |
| **All** `/media/` → `403` | `chown -R deploy:deploy` on `media/` took group ownership away from `www-data`, which nginx runs as. `/static/` in the same parent kept working, which localises it | `be949a2` |
| Verification links pointed nowhere | `settings.py` never defined `FRONTEND_URL`; `.env` was only read into a local var inside the CSRF block, so links were relative (`/verify-email/...`) | `c0acb52` |
| No email ever sent | `settings.py` defined no `EMAIL_*` at all, so `EMAIL_BACKEND` in `.env` was ignored and Django fell back to `smtp://localhost:25` | `98e979d` |
| WebSockets impossible | systemd ran `gunicorn core.wsgi` (WSGI can't do WebSockets) **and** nginx had no `/ws/` block | `f798cc2` |
| `bootstrap.sh` aborted on port 22 | Port read only from `sshd_config`; Ubuntu 24.04 keeps it in a `sshd_config.d/` drop-in | `0c870db` |
| Frontend build failed silently | npm stderr sent to `/dev/null`; root-owned `~/.npm` from a `sudo` without `-H` | `a8a58c2` |
| `dubious ownership` on git | Repo cloned by root, then git run as `deploy` | `122681b` |
| Voice-status 401 loop | `FloatingAIMentor` mounts on public pages and called an authed endpoint → 401 → refresh → redirect | `23dc142` |

**Two near-misses worth remembering:**

- `setup_vps.sh` ran `ufw allow OpenSSH` (port 22) then `ufw --force enable`.
  On this box SSH is 22022 — that would have severed the session and locked
  everyone out. The scripts now detect the live port and refuse to run if
  nothing is listening on it.
- `deploy_all.sh` copied `deploy/.env.production` unconditionally, but that
  file is gitignored and absent after a clone — it would have started a backend
  with no configuration. `bootstrap.sh` stops with instructions instead.

---

## 7. Known issues

### 🔴 Email to `@ssct.edu.ph` cannot be delivered

Not an application bug. SSCT's DNS is unreachable from the internet:

```
.edu.ph delegates ssct.edu.ph → ns1/ns2.dinagatislands.ph
both resolve to the same IP   → 27.110.161.109
that host                     → no ICMP, no UDP/53, no TCP/53
Google, Cloudflare, Quad9     → SERVFAIL for every ssct.edu.ph hostname
```

Gmail accepts the message (`accepted=1`), cannot resolve the MX, retries, and
eventually bounces. No sender-side configuration can work around this — mail
delivery requires the recipient domain to be publicly resolvable. By contrast
`snsu.edu.ph` resolves correctly and is on Google Workspace.

**Current mitigation:** `REQUIRE_EMAIL_VERIFICATION=False`. Accounts are created
and usable; the `@ssct.edu.ph` restriction still limits who can register. The
whole verification flow is intact — set the flag back to `True` once DNS is
fixed, no code changes needed.

**For IT:** `ssct.edu.ph` is delegated to two nameservers that share a single
unreachable IP, so external email to the domain fails campus-wide.

### 🔴 Rotate the root password

`Fostanes_020705` appears in public git history *and* is the root SSH password.
Change it (`passwd root`), then disable password auth — **add your key first**:

```bash
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh
```

### 🟠 Dev and production share one database

Both point at the same Neon instance, so a local `manage.py flush` or a bad
migration would hit live student data. Create a Neon branch for development and
repoint your local `backend/.env`. Media folders are already separate, so the
two environments will drift on uploads until this is split.

### 🟡 Minor

- `Invalid line:` on every start — one malformed row in `backend/.env` that
  django-environ silently skips. Find it with:
  `grep -nvE '^\s*(#|[A-Za-z_][A-Za-z0-9_]*=|$)' backend/.env`
- `learning` reports unapplied model changes — an auto-generated index rename
  and a `DEFAULT_AUTO_FIELD` tweak. Cosmetic; deliberately not migrated.
- Student code runs in a subprocess with a timeout but **no** filesystem,
  network or memory isolation. Consider Docker/nsjail before opening it up.

---

## 8. Backups

Neon handles database backups. Not covered automatically:

```bash
# user uploads — the only irreplaceable state on the box
tar czf ~/media-$(date +%F).tar.gz -C /home/deploy/CCIS-CodeHub/backend media

# configuration (contains secrets — store securely)
cp /home/deploy/CCIS-CodeHub/backend/.env ~/env-backup-$(date +%F)
```

`bootstrap.sh` never deletes anything under `media/`, so redeploys are safe.
