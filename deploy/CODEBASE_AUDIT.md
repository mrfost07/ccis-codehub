# Codebase Audit — production risk review

Date: 2026-07-27 · Scope: `backend/` (26k lines) + `frontend/src` (52k lines),
reviewed against the live deployment at https://ccis-codehub.space.

Each finding states how it was **verified** — several things that "looked fine"
in this codebase turned out to be broken only under production conditions, so
nothing below is asserted from reading alone unless it says so.

---

## Fixed during this audit

| # | Severity | Issue | Commit |
|---|---|---|---|
| 1 | 🔴 Critical | Student code could read `DATABASE_URL` / `DJANGO_SECRET_KEY` | `1abcf0e` |
| 2 | 🟠 High | Chat returned the **oldest** 100 messages, not the newest | `6063c91` |
| 3 | 🟠 High | Chat N+1: one query per message, every 3s, per user | `6063c91` |
| 4 | 🟠 High | No React error boundary — any render error blanked the app | `6063c91` |
| 5 | 🟡 Medium | Signup blocked on SMTP; resend leaked account existence by timing | (below) |

### 1. Student code inherited the server environment 🔴

Coding challenges run submitted code in a subprocess that inherited the full
Django environment. Verified by executing this through the real executor:

```
LEAKED: ['ANTHROPIC_API_KEY', 'API_RATE_LIMIT', 'DATABASE_URL', 'DJANGO_SECRET_KEY', ...]
```

A student solving any challenge with `print(os.environ['DATABASE_URL'])` would
obtain live Postgres credentials — enough to read or delete every account,
enrolment and grade from anywhere on the internet.

**Fixed** by passing an explicit minimal environment to both the run and
compile subprocesses. Re-verified: probe now reports `LEAKED: []`, a normal
solution still passes, anti-hardcode suite still 9/9.

**Not fixed — still open:** there is no filesystem, network or memory
isolation. Submitted code can read any file the `deploy` user can read
(including `backend/.env`) and open outbound sockets. See §"Open risks".

### 2. Chat showed the oldest 100 messages 🟠

```python
.order_by('created_at')[:100]   # comment said "last 100" — this is the FIRST 100
```

Any room passing 100 messages silently stops showing new ones. The client polls
every 3s and keeps receiving the same stale page, so chat appears frozen with no
error. Fixed to take the newest 100 and reverse for display; verified the
response now ends at the newest message in the room.

### 3. Chat N+1 under polling 🟠

`get_is_deleted_for_me` ran `.filter().exists()` per message — ~100 extra
queries per request, polled every 3s per connected student. Thirty students in
one room ≈ **1,000 queries/second** against a managed Postgres with connection
limits. Fixed with `prefetch_related('deleted_for')` plus in-Python matching.

### 4. No error boundary anywhere 🟠

React unmounts the entire tree when a render throws, so one bad component
blanked the whole platform — precisely how the `manualChunks` bug presented as
a white page. Added a boundary around the routed tree that resets on
navigation. Verified with a deliberately throwing route: caught, recovery panel
shown, cleared on navigate. Probe removed afterwards.

### 5. Mail was sent on the request thread 🟡

`send_verification_email` ran inside the signup request, so registration
blocked for the entire SMTP conversation — TCP, STARTTLS, AUTH, DATA — which
takes seconds against Gmail from a datacenter IP, up to the 10s `EMAIL_TIMEOUT`.
On a single daphne process, concurrent signups each held a worker for that long.

Waiting bought nothing: a successful `send()` only means Gmail *accepted* the
message, not that it arrived (see R9 — messages sat in Gmail's retry queue for
minutes). Sending now happens on a daemon thread that closes its DB connection
on the way out. Verified against a backend stalling 3s: the request returned in
**0.004s**, the mail still delivered with an absolute link and its HTML part,
and no threads lingered.

The same change fixes a **timing side-channel** on `/resend-verification/`:
that endpoint returns an identical message for every address so it cannot be
used to discover accounts, but a synchronous send made the real-account path
measurably slower, leaking exactly what the generic response concealed. Both
paths now return in the same time.

Registration's success message also now says delivery can take a few minutes
and to check spam — the previous wording implied the mail was already in the
inbox, which is what made the delay look like a failure.

---

## Open risks

### 🔴 R1 — Student code has no sandbox

`code_executor.py` runs untrusted code with the app user's full filesystem and
network access. Credential exfiltration via env is now closed, but a
determined student can still read `backend/.env` directly, scan the local
network, or exhaust disk.

**Fix:** run submissions in a container with no network and a read-only mount
(`docker run --network=none --read-only --memory=256m --pids-limit=64`), or
delegate to [Judge0](https://judge0.com). Until then treat the box as
compromisable by any enrolled student.

### 🔴 R2 — Root password published in git history

`Fostanes_020705` is in the public repo history and is also the root SSH
password. **Fix:** `passwd root`, then disable password auth (add your key
first). Rotating only the app setting is not sufficient.

### 🟠 R3 — Dev and production share one database

Both `backend/.env` files point at the same Neon instance. A local
`manage.py flush`, a mistaken migration, or a test script hits **live student
data**. **Fix:** create a Neon dev branch and repoint local config. Media
folders are already separate, so uploads will drift until this is split.

### 🟠 R4 — Chat polls instead of using the WebSocket that already exists

`CommunityChat` polls `/messages/` every 3s per open tab. With 100 students
that is ~33 req/s of pure overhead plus Postgres load, all to usually return
nothing new. The project already runs Channels/Redis for live quizzes.

**Fix:** move chat onto the existing WebSocket layer, or add an
`If-Modified-Since` / `?since=<id>` short-circuit so unchanged polls are cheap.

### 🟠 R5 — Single point of failure, no monitoring

One VM runs nginx, daphne and Redis, with no uptime monitoring, error tracking
or automated backups. A crash is invisible until a student reports it.

**Fix (cheap, in order):** free uptime monitor on `/api/health/`; Sentry free
tier (`SENTRY_DSN` is already in `.env_example`); a nightly cron tarring
`backend/media` off-box.

### 🟡 R6 — Internal errors returned to clients

26 handlers return `{'error': str(e)}`, exposing paths, SQL fragments and
library internals. **Fix:** log the exception server-side and return a generic
message with a correlation id.

### 🟡 R7 — Bare `except:` blocks

~17 across `serializers.py`, `ai_service.py`, `module_analyzer.py` and others.
These swallow `KeyboardInterrupt`/`SystemExit` and hide real failures.
**Fix:** narrow to the expected exception, or `except Exception` with a log line.

### 🟡 R8 — `AllowAny` on a mutating endpoint

`get_app_settings` is decorated `@permission_classes([AllowAny])` and accepts
`PUT`. The admin check is done *inside* the function, so it is **not currently
exploitable** — but the decorator misrepresents the endpoint and one refactor
away from being wrong. **Fix:** split GET and PUT, or use `IsAdminUser` on the
mutating path.

### 🟢 R9 — Institutional email: RESOLVED (was undeliverable)

**Superseded 2026-07-29.** `ssct.edu.ph` now resolves and accepts mail.
Delivery was confirmed by the user, and re-probing shows the domain was
re-delegated away from the unreachable `dinagatislands.ph` nameservers:

```
ssct.edu.ph  MX  1 aspmx.l.google.com  (+4 alt) — Google Workspace
             NS  ns1/ns2.itanong.academy         — was ns1/ns2.dinagatislands.ph
```

Three consecutive lookups via 8.8.8.8 returned all five MX records in
234–330 ms, so resolution is stable, not intermittent.

**This also explains the delay the user observed.** Gmail had been accepting
the messages and queueing them, retrying on a backoff (minutes, then tens of
minutes) because the recipient domain would not resolve. Once DNS was fixed
the queue flushed — which is why mail "started working" and why the first
ones arrived late. It was never a rate limit or a free-tier throttle.

**Action:** re-enable verification — `REQUIRE_EMAIL_VERIFICATION=True` in
production `.env`. It was set to `False` purely to work around this.

**Residual fragility (🟡):** neither `ns1.itanong.academy` nor
`ns2.itanong.academy` has a resolvable A record, and `itanong.academy` itself
publishes no NS records. Public resolvers are currently answering for
`ssct.edu.ph` regardless — presumably via glue in the `.ph` parent zone — but
a delegation whose nameserver hostnames do not resolve is one cache expiry
away from breaking again. Worth raising with campus IT. `snsu.edu.ph` is
cleanly configured and is the safer domain to depend on.

### 🟡 R10 — Minor

- `Invalid line:` on every boot — one malformed row in `backend/.env` that
  django-environ silently skips.
- `learning` reports an unapplied auto-generated index rename; cosmetic,
  deliberately not migrated.
- Frontend ships a ~1 MB main chunk. Route-level `React.lazy` already exists;
  re-introducing `manualChunks` would shrink it, but **only** if every
  React-dependent package sits in the same chunk as React — see `308269d` for
  what happens otherwise.

---

## Verified healthy

Worth recording so future work does not re-litigate these:

- DRF defaults to `IsAuthenticated`; public endpoints are deliberate and small.
- Google OAuth takes identity from a server-signed token, never client-supplied
  data, and enforces the institutional domain on the verified address.
- Live-quiz WebSockets reject foreign origins (`403`) while accepting the real
  one (`101`) — confirmed against production.
- List endpoints generally use `select_related`/`prefetch_related`; the chat
  N+1 was the outlier.
- Scoring is shared between the REST and WebSocket paths, so the two cannot
  drift.
- No secrets are committed; only `_example` templates are tracked.

---

## Suggested order of work

1. **R2** — rotate the root password (minutes, unbounded exposure)
2. **R1** — containerise code execution (highest residual risk)
3. **R3** — split the dev database (one bad command from data loss)
4. **R5** — uptime + error monitoring (you currently learn from students)
5. **R4** — chat onto WebSockets (before class-sized usage)
6. R6–R10 as cleanup
