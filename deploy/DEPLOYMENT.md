# CCIS CodeHub — Deployment Guide

Live: **https://ccis-codehub.space**

Everything below reflects the deployment as it actually runs, verified on
2026-08-04. For the pre-launch audit and remaining hardening items see
[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md).

---

## 1. The environment

Moved to AWS EC2 on 2026-08-04. The previous host (`104.207.92.63`) no longer
exists — do not use commands or IPs from git history against it.

| | |
|---|---|
| Host | `54.255.89.200` — AWS EC2 `c7i-flex.large`, **ap-southeast-1 (Singapore)**, Ubuntu 24.04.4 LTS, 2 vCPU / 3.8 GB RAM + 4 GB swap, 29 GB disk |
| SSH | `ssh -i ~/.ssh/ccis-ssh-key.pem ubuntu@54.255.89.200` (port **22**; no root login — use `sudo`) |
| Domain | `ccis-codehub.space` A record → host; `www` is a CNAME to the apex |
| DNS | Hostinger (`ns1/ns2.dns-parking.com`) — those are Hostinger's normal nameservers, "parking" is just their branding |
| App path | `/home/deploy/CCIS-CodeHub` |
| Runs as | `deploy` |
| Database | Neon Postgres, **ap-southeast-1** — 1.3 ms query round-trip, 19 ms connection setup |
| TLS | Let's Encrypt via certbot, auto-renewing (`certbot.timer`) |

> **`54.255.89.200` is an Elastic IP** (allocation `eipalloc-0405ccaa25f8f945c`),
> so it survives a stop/start. If you ever terminate the instance, **release the
> address too** — an Elastic IP that is allocated but not associated is billed as
> idle. Associating one *replaces* the auto-assigned address and the old one is
> gone for good, so DNS and `DJANGO_ALLOWED_HOSTS` both need updating at the same
> time.

> **Inbound rules live in the EC2 security group, not just `ufw`.** The instance
> uses `launch-wizard-2`; it must allow 22, 80 and 443. `ufw` allowing a port is
> not sufficient — a wizard-created group starts with SSH only, which presents as
> a connection timeout on 80/443 while everything on the box looks healthy.

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
ssh -i ~/.ssh/ccis-ssh-key.pem ubuntu@54.255.89.200
cd /home/deploy/CCIS-CodeHub
sudo -u deploy git pull         # the repo is owned by deploy, not ubuntu
sudo bash deploy/bootstrap.sh
sudo bash deploy/verify.sh      # confirm it actually works
```

There is no root login on EC2 — you land as `ubuntu` and use `sudo`. Running
`git pull` as `ubuntu` or `root` leaves root-owned objects in `.git` that the
`deploy` user then cannot write, which surfaces later as
`insufficient permission for adding an object`. Fix with
`sudo chown -R deploy:deploy /home/deploy/CCIS-CodeHub/.git`.

A normal reload is enough. `index.html` is served with `Cache-Control: no-cache`
so it revalidates every request, and the hashed assets it points at are
`immutable`.

This used to require a hard refresh (`Ctrl+Shift+R`), because `index.html` went
out with only `ETag`/`Last-Modified` and no `Cache-Control`: browsers cached it
heuristically for hours and kept requesting the previous build's chunks, which are
immutable and still on disk. The symptom is a deploy that verifiably succeeded
while users keep running the old app — confirmed on 2026-08-05, when production
was serving `index-BvFD9Ej-.js` and a browser kept running `index-DYCgYlQs.js`.
If you ever see that again, check the header before doubting the deploy:

```bash
curl -sSI https://ccis-codehub.space/ | grep -i cache-control
```

### verify.sh — prove the deploy worked

`bootstrap.sh` finishing successfully means the *commands* succeeded, not that
the site works. Every incident in §6 got past a clean bootstrap. `verify.sh`
checks the things that actually broke, and exits non-zero if any fail:

| Check | Catches |
|---|---|
| services + daphne | a WSGI server that cannot serve WebSockets |
| `/`, redirect, health, `/static/` | the basics |
| media serves an image, missing file 404s | the `chown` that took uploads offline |
| WS `101`, foreign origin `403` | dead live quizzes; a wide-open socket |
| entry bundle present and >100 KB | the all-200s blank page |
| code runs **and** cannot read secrets | a regression of the credential leak |
| newest chat message is in the slice | the oldest-100 bug returning |
| `.env` sanity, `EMAIL_BACKEND`, MX | signup mail silently going nowhere |

The WebSocket check sends an `Origin` header deliberately — Channels'
`AllowedHostsOriginValidator` rejects requests without one, so a test that
omits it reports a broken deploy when nothing is wrong.

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
# .env is gitignored — copy it up from your laptop first. There is no root
# login and `deploy` has no password, so land as ubuntu and move it into place:
#   scp -i ~/.ssh/ccis-ssh-key.pem deploy/.env.production ubuntu@54.255.89.200:/tmp/env
#   ssh -i ~/.ssh/ccis-ssh-key.pem ubuntu@54.255.89.200 \
#     'sudo install -o deploy -g deploy -m 600 /tmp/env /home/deploy/CCIS-CodeHub/backend/.env && rm /tmp/env'
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
- Verification mail was sent **on the request thread**, so registration blocked
  for the whole SMTP conversation (seconds, up to the 10s `EMAIL_TIMEOUT`) and
  concurrent signups each tied up a daphne worker. Waiting bought nothing — a
  successful send only means Gmail accepted the message, not that it arrived.
  Now dispatched to a daemon thread. This also removed a timing side-channel on
  `/resend-verification/`: the endpoint returns an identical message for every
  address so it cannot be used to probe for accounts, but the synchronous send
  made the real-account path measurably slower, leaking what the wording hid.

---

## 7. Known issues

### ✅ Email to `@ssct.edu.ph` — RESOLVED (2026-07-29)

**Mail now delivers.** The domain was re-delegated away from the unreachable
nameservers, and re-probing confirms it:

```
was:  ssct.edu.ph → ns1/ns2.dinagatislands.ph → 27.110.161.109 → no DNS response
now:  ssct.edu.ph → ns1/ns2.itanong.academy
      MX  1 aspmx.l.google.com (+4 alt)  — Google Workspace
      3/3 lookups via 8.8.8.8 in 234-330 ms
```

**Why the first emails arrived late.** Gmail was accepting each message and
queueing it, then retrying on a widening backoff (a minute, then five, then
tens of minutes) because it could not resolve the recipient domain. Deferral,
not rejection — so nothing bounced and nothing was lost. When DNS started
working the queue flushed and the backlog landed at once. This was never a
rate limit or a sending quota.

**Re-enabling verification — do it in this order.** It is *not* just flipping
the flag. Every account created while verification was off has
`email_verified=False`, and login 403s on that once the flag is on. That
includes your admin account, and the "resend link" recovery path needs working
mail — so a naive flip can lock everyone out of the platform at once.

```bash
cd /home/deploy/CCIS-CodeHub/backend

# 1. see who would be affected (read-only, changes nothing)
sudo -u deploy ./venv/bin/python manage.py grandfather_verified_emails

# 2. mark those existing accounts verified
sudo -u deploy ./venv/bin/python manage.py grandfather_verified_emails --commit

# 3. NOW turn enforcement on
sed -i 's/^REQUIRE_EMAIL_VERIFICATION=.*/REQUIRE_EMAIL_VERIFICATION=True/' .env
grep -q '^REQUIRE_EMAIL_VERIFICATION=' .env || echo 'REQUIRE_EMAIL_VERIFICATION=True' >> .env
sudo systemctl restart ccis-backend

# 4. confirm you can still sign in before closing the SSH session
```

Everyone who signs up *after* this still has to confirm their address —
grandfathering only covers accounts that predate enforcement.

If you get locked out anyway, verify a single account directly:

```bash
sudo -u deploy ./venv/bin/python manage.py shell -c \
  "from apps.accounts.models import User; from django.utils import timezone; \
   User.objects.filter(email='you@ssct.edu.ph').update(email_verified=True, email_verified_at=timezone.now())"
```

**Still worth flagging to IT (🟡):** neither `ns1.itanong.academy` nor
`ns2.itanong.academy` has a resolvable A record, and `itanong.academy` itself
publishes no NS records. Resolvers answer for `ssct.edu.ph` anyway — presumably
via glue in the `.ph` parent zone — but a delegation whose nameserver hostnames
do not themselves resolve is fragile. `snsu.edu.ph` is cleanly configured.

Mail send no longer blocks the signup request either (see §6), so a slow relay
can no longer stall registrations.

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

Neon handles the database. `media/` is the only irreplaceable state on the box —
profile pictures, project files, certificates, the CEO signature. It was lost
once, when the old VPS was decommissioned, and had to be rebuilt by hand.

**Automated, running now.** A systemd timer archives `media/` daily at 18:30 UTC
(02:30 Manila) and keeps the last 14:

```bash
systemctl list-timers ccis-backup.timer      # when it next runs
journalctl -u ccis-backup.service -n 20      # what it did last time
ls -lh /home/deploy/backups/media/           # the archives
sudo /usr/local/bin/ccis-backup              # run one now
```

The script refuses to archive an empty `media/` — far more likely a broken
deploy than a real state worth keeping — and deletes any archive that does not
read back, so a failure means no backup was taken rather than a bad one
replacing good ones. Verified by restoring: 50/50 files, byte-for-byte identical
to live media.

Restore:

```bash
A=$(ls -1t /home/deploy/backups/media/media-*.tar.gz | head -1)
sudo tar -xzf "$A" -C /home/deploy/CCIS-CodeHub/backend   # paths are relative to media/
sudo chown -R deploy:www-data /home/deploy/CCIS-CodeHub/backend/media
```

**Still needed: get a copy off the box.** Everything above lives on the same disk
as the data, so it covers accidental deletion, a bad deploy and an app bug — not
losing the host, which is exactly how the uploads went the first time. Two ways,
both needing the AWS console:

1. *EBS snapshots* (simplest, protects the whole box). EC2 → Lifecycle Manager →
   create a daily snapshot policy for this instance's volume. No changes on the box.
2. *S3* (just the uploads, cheapest). Create a bucket, attach an instance role
   that can `s3:PutObject` to it, `sudo apt install awscli`, then add to
   `/etc/systemd/system/ccis-backup.service`:

   ```ini
   Environment="BACKUP_REMOTE=s3://your-bucket/media"
   ```

   `systemctl daemon-reload` and the next run pushes there too. The script warns
   in the journal if `BACKUP_REMOTE` is set but the CLI is missing.

Configuration is not backed up automatically because it contains secrets:

```bash
cp /home/deploy/CCIS-CodeHub/backend/.env ~/env-backup-$(date +%F)
```

`bootstrap.sh` never deletes anything under `media/`, so redeploys are safe.
