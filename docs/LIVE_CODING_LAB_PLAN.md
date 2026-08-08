# Live Coding Lab — design

A classroom exercise, not an autograder. The instructor writes a problem in
prose, students write and run code freely, and when a student is confident they
submit. The instructor reads the code and the output, decides, and the decision
lands on the student's profile.

The distinguishing feature is that **there is no expected output**. Every other
coding surface on this platform compares stdout to a stored string. This one
compares nothing; a human is the grader. That single difference drives most of
the design below, because it removes the thing that made the existing executor
cheap and safe to reason about.

---

## 1. What already exists, and what we reuse

Measured on the running system, not assumed.

| Piece | State | Verdict |
|---|---|---|
| `LiveQuiz` + join codes + `LiveQuizConsumer` (902 lines) | Working, with anti-cheat counters | **Reuse the session/join/presence model, not the code** |
| `CodeExecutor` | Subprocess, 5s wall clock, POSIX CPU rlimit, filtered env | **Reuse the language config, replace the execution mechanism** |
| `run_public_only()` | Runs code and returns stdout without grading | **This is already 80% of "compiler mode"** |
| Redis | Active on production | Channel layer + queue + snapshot store |
| Celery 5.3.4 | In `requirements.txt`, no workers running | The execution queue |
| Channels 4 + channels-redis | Active | Realtime transport |
| `LiveQuizParticipant` | Has `fullscreen_violations`, `tab_switch_count`, `copy_paste_attempts` | Anti-cheat model to copy |

Not present: `javac`. Java challenges cannot compile on production right now.

---

## 2. Three constraints that shape everything

### 2.1 The executor is not a sandbox, and this feature makes that critical

`code_executor.py` says so in its own docstring: *"does NOT provide filesystem,
network, or memory isolation."* I verified it. Student code run through the
current executor reported:

```
root entries: 38
can read parent dirs: True
```

It walks the filesystem as the `deploy` user. On production that user owns
`backend/.env`, which holds the database URL, `DJANGO_SECRET_KEY`, the email
credentials and the API keys. A student who prints that file owns the platform.

This is **already true today** — any authenticated student can submit code — so
it is not a new hole. But today's blast radius is bounded by pre-vetted problems
with fixed test cases and a modest audience. This feature invites instructors to
write free-form problems, asks for third-party libraries, and points a thousand
students at it simultaneously. Shipping it on the current executor would be
negligent.

**Sandboxing is Phase 0. The feature does not ship before it.**

### 2.2 Execution is CPU-bound, and the box has two cores

Production is 2 vCPU / 3.8 GB, one Daphne process.

The arithmetic that matters. If a run costs ~300 ms of CPU and a student runs
their code every 30 seconds:

| Students | CPU-seconds/sec needed | Cores needed (execution alone) |
|---|---|---|
| 40 | 0.4 | fits comfortably |
| 200 | 2.0 | saturates the box, Django starves |
| 1,000 | 10.0 | **~10 cores, plus the web tier** |
| 3,000 | 30.0 | ~30 cores |

Note what this says: a realistic SNSU class of 40–60 runs on the box you already
have. "Thousands simultaneously" is a different system — it needs execution on
separate machines from the web tier. The design below separates them from day
one so that scaling is a matter of adding workers rather than a rewrite, but the
honest statement is that **no amount of clever code makes 2 cores serve 1,000
concurrent compilations.**

### 2.3 "The instructor sees every student's screen" is a fan-in problem

The naive reading — mirror 1,000 editors into one browser — fails on every axis.
At one keystroke event per student per second that is 1,000 messages/second into
a single tab, and no browser lays out 1,000 live code editors.

It is also the wrong product. An instructor cannot *watch* 1,000 screens. What
they need is: a wall of small status tiles, and the ability to open the few that
matter. The design serves that, and it happens to be what scales.

**Never send video or screen capture.** Code is text; a full snapshot of a
student's editor is ~2 KB, a screenshot is ~200 KB. Text is a hundred times
cheaper and infinitely more useful — it is searchable, diffable and reviewable.

---

## 3. Architecture

```
                      ┌──────────────────────────────┐
   student browser ───┤  WS /ws/lab/<code>/          │
        (editor)      │  Django Channels (N workers) │
                      └───────┬──────────────┬───────┘
                              │              │
              snapshot (5s)   │              │  run/submit
                              ▼              ▼
                    ┌──────────────┐   ┌──────────────────┐
                    │ Redis        │   │ Celery queue     │
                    │ - snapshots  │   │ lab.execute      │
                    │   (TTL 2h)   │   └────────┬─────────┘
                    │ - presence   │            │
                    │ - channel    │            ▼
                    │   layer      │   ┌──────────────────┐
                    └──────┬───────┘   │ Execution workers│
                           │           │  ── sandbox ──   │
                           │           │  Piston / nsjail │
                           │           └────────┬─────────┘
                           │                    │ result
                           ▼                    ▼
                    ┌──────────────────────────────────┐
                    │ instructor browser               │
                    │  presence wall (aggregated)      │
                    │  + on-demand student streams     │
                    └──────────────────────────────────┘
                                   │ accept
                                   ▼
                          Postgres: LabSubmission,
                          UserProgress, AchievedSkill
```

### 3.1 Execution tier — the sandbox decision

Three real options:

| Option | Isolation | Cold start | Libraries | Effort |
|---|---|---|---|---|
| **Piston** (self-hosted) | Container per run, no network, rlimits | ~50–150 ms (pre-warmed) | `pkgman` installs per language | Medium — deploy a service |
| nsjail / firejail + seccomp | Namespaces + syscall filter | ~10–30 ms | Bake into the image yourself | High — you own the policy |
| Docker per run | Container per run | ~300–500 ms | Bake into the image | Low effort, worst latency |

**Recommendation: Piston.** It is purpose-built for exactly this problem — run
untrusted code, many languages, no network, resource-capped — and its package
manager answers the "support the libraries and built-ins for different
languages" requirement without us curating an image per language. It also fixes
the missing `javac` by making the runtime the service's problem rather than the
box's.

It runs as its own service, which is precisely the separation §2.2 demands: put
it on its own host when the class outgrows one box, and the web tier does not
change.

Keep `LANG_CONFIG` and the existing hardcode detection; they move to the worker
unchanged.

**Non-negotiable caps per run:** wall clock 5 s, CPU 5 s, memory 256 MB, no
network, output 16 KB, processes 32, writable disk 32 MB in a tmpfs discarded
afterwards.

### 3.2 Backpressure, which is the difference between slow and broken

A queue with no limit does not degrade, it collapses — students press Run again
because nothing happened, which adds load, which makes nothing happen.

Rules:

1. **One in-flight run per student.** A second Run replaces the queued job
   rather than adding one. This alone caps the queue at the student count.
2. **Per-session concurrency cap**, default 2× worker count. Beyond it students
   get a queue position, not a spinner.
3. **The UI states the truth**: "Queued — 14 ahead of you". A student who can
   see the queue does not spam the button.
4. **Submit outranks run.** Two Redis queues; workers drain `submit` first.
   Submission is the graded event and must never sit behind idle experimentation.

### 3.3 Realtime topology — two channels, not one

The whole scaling trick is that the expensive stream is opt-in.

**Presence channel** — `lab:<session>:presence`, everyone subscribed.
Aggregated and emitted on a fixed 2-second tick, never per-event:

```json
{"t": 1738500000,
 "counts": {"idle": 412, "typing": 380, "running": 61, "submitted": 147},
 "deltas": [{"id": "u1", "s": "submitted"}, {"id": "u2", "s": "running"}]}
```

Deltas only, so the message stays small regardless of class size. One tick per
2 s for a 1,000-student session is 0.5 messages/second to the instructor,
against 1,000/second for the naive design.

**Per-student channel** — `lab:<session>:student:<id>`, subscribed **only while
the instructor has that student's card open.** Carries full code snapshots and
run output. With a virtualised grid, at most ~12 are ever open.

**Student → server** is debounced, never per-keystroke: a snapshot at most every
5 seconds while typing, plus an immediate one on run and on submit. Snapshots go
to Redis with a 2-hour TTL, not Postgres — they are transient, and 1,000
students × 240 snapshots each would be 240,000 rows of write traffic for data
nobody reads after the session.

Only the **submitted** code is durable, in Postgres.

### 3.4 The output shown to the instructor must be the server's

A subtle correctness point that decides whether this is gradeable at all.

The student's browser shows output from a run. If the instructor reviews *that*
string, a student can edit the DOM and show whatever they like. So: **on submit,
the server re-executes the code and stores its own output**, and the review
screen renders the server's result. The student's last-seen output is kept
alongside it and flagged when the two differ — which is itself a useful signal.

This is why submit gets its own priority queue: it is a mandatory execution, not
an optional one.

---

## 4. Data model

New app `apps/lab`, so none of this entangles with the quiz models.

```python
class CodingLab:                      # the session
    instructor, title, instructions
    join_code (6 chars, unique, indexed)
    state: draft | open | running | review | closed
    languages: list[str]              # which the student may pick
    allow_late_submissions: bool
    created_at, started_at, closed_at

class LabProblemSet:                  # "Set A", "Set B", "Set C"
    lab (FK), label, assignment: auto | manual
                                      # auto = deterministic hash, below

class LabProblem:
    problem_set (FK), order
    title, statement (markdown/HTML), starter_code: dict[lang -> str]
    reference_solution: dict          # instructor's own, never shown
    # NOTE: no expected_output, no test_cases. That is the point.

class LabParticipant:
    lab (FK), student (FK), problem_set (FK)   # which set they drew
    joined_at, last_seen_at
    tab_switch_count, copy_paste_attempts, is_flagged

class LabSubmission:
    participant (FK), problem (FK)
    language, code
    student_output          # what their browser showed
    server_output           # what the server got re-running it  ← reviewed
    outputs_match: bool
    status: submitted | accepted | returned
    reviewer (FK, null), reviewed_at, feedback
    attempt_number
```

Indexes that matter: `(lab, status)` for the review queue,
`(participant, problem)` for resubmissions, `join_code` unique.

**Set assignment** is deterministic, not random:

```python
index = int(hashlib.sha256(f'{lab.id}:{student.id}'.encode()).hexdigest(), 16) % set_count
```

Stable across reconnects, reproducible when a student disputes which set they
got, and needs no stored state to compute. An instructor override column exists
for the case where two friends must be separated.

---

## 5. Flow and layout

### Student

1. Join by code (or a link from the lab list). Lands in a lobby that says which
   **set** they drew and how many problems it holds.
2. Instructor starts. The workspace is three panes: **statement** left, **editor**
   centre, **console** right. Language picker in the editor header, restricted to
   what the lab allows.
3. **Run** is unlimited and ungraded — that is the "just a compiler" behaviour
   asked for. Output, stderr and exit status appear in the console. Queue
   position shows when the system is busy.
4. **Submit** asks for confirmation, because it is a claim. State becomes
   *Awaiting review* and the editor goes read-only for that problem.
5. Instructor accepts → a toast, the problem turns green, and progress lands on
   the profile. Returned → the feedback appears inline and the editor unlocks.

### Instructor

1. **Wall** — a virtualised grid of tiles, one per student: name, set, current
   problem, status dot, last-run result. Sorted by "needs attention". Fed only by
   the presence channel, so it costs the same at 40 students as at 1,000.
2. **Filter** — submitted / running / idle / flagged / by set. This is how a
   review queue is worked; nobody scrolls a thousand tiles.
3. **Open a tile** — subscribes to that student's stream and shows live code,
   their last run, and their submission if any. Closing unsubscribes.
4. **Review** — code, server output, diff-flag if the student's output
   disagreed, and Accept / Return with a note. Keyboard-driven (`J`/`K` to move,
   `A` to accept), because an instructor grading 200 submissions with a mouse
   will not finish.
5. **Close** — locks submissions, shows a summary, exports CSV.

### On acceptance

Inside one transaction: mark the submission accepted, create/complete the
`UserProgress` row, grant the problem's skills as `AchievedSkill`, award points,
then broadcast to that student's channel. Idempotent on `(participant, problem)`
so a double-click cannot double-award — the bug this codebase has already been
bitten by more than once.

---

## 6. Phases

Decided: engineer for **one class of 40–60**, sandbox with **self-hosted
Piston**, start at Phase 0.

| Phase | Delivers | Notes |
|---|---|---|
| **0. Sandbox** ✅ | Piston deployed, `CodeExecutor` routed through it, existing challenges still green | **Done** — see §8. Java now compiles. |
| **1. Model + REST** | `apps/lab`, migrations, CRUD for labs/sets/problems, instructor-only writes | Permissions mirror `IsInstructorOrAdmin` |
| **2. Student workspace** | Join, statement/editor/console, Run via Celery, queue position | Feature-complete for one student |
| **3. Realtime** | Presence channel, snapshot debounce, on-demand student streams | Where the scale work lives |
| **4. Review** | Wall, filters, keyboard review, accept/return, profile write | The instructor half |
| **5. Sets** | A/B/C, deterministic assignment, per-set analytics | Small once 1–4 exist |
| **6. Load proof** | Simulate 200 → 1,000 synthetic students, measure, publish numbers | Before any real class over ~50 |

Phase 6 is not optional. Every claim in §2.2 is arithmetic, not measurement, and
arithmetic is where capacity plans go wrong.

---

## 7. Decisions I need from you

1. **Class size, honestly.** If the real ceiling is 60, the current box is fine
   and Phases 3/6 shrink a lot. If you genuinely mean 1,000+, budget a second
   host for execution. This changes the plan more than any other answer.
2. **Piston, or roll our own with nsjail?** Piston is faster to a safe state and
   answers the library requirement; nsjail is fewer moving parts to deploy.
3. **May students see each other's status?** A live "14 submitted" is
   motivating for some cohorts and stressful for others.
4. **Does a returned submission cost an attempt?** Affects whether students
   submit early to fish for feedback.
5. **Java.** `javac` is missing on production. Phase 0 fixes it via Piston —
   confirm Java matters, since it changes the runtime set to install.

---

## 8. Phase 0 as built

Piston runs on the application box as a container on `127.0.0.1:2000` — never
exposed, because it executes arbitrary code on request. Runtimes pinned:
python 3.12.0, javascript 20.11.1, c++ 10.2.0, java 15.0.2. Runtimes live in
`/var/lib/piston`, so the container can be recreated without reinstalling them.

Service limits are set to match the executor's contract rather than the other
way round — `PISTON_RUN_TIMEOUT=5000`, `PISTON_COMPILE_TIMEOUT=15000`,
`PISTON_RUN_MEMORY_LIMIT=256M`, `PISTON_OUTPUT_MAX_SIZE=16384`. Lowering our
timeouts to fit Piston's defaults would have failed any solution that legitimately
took more than three seconds, which is a grading change disguised as a config
change. (Piston's default compile cap is 10 s and rejected our 15 s outright,
which is how this was found: every challenge failed 0/N in under four seconds.)

Only the process-spawning primitive changed. `_build_run_cmd` returns a sandbox
handle instead of an argv list, and `_run_single_with_cmd` dispatches on it.
Wrapping, output normalisation and the hardcode detector are untouched.

**Verified after the switch:**

| Check | Result |
|---|---|
| `validate_challenges` over all 160 | 0 unsolvable, 0 passable by printing, 0 passable by branching — identical to before |
| Filesystem root, via `CodeExecutor` | 10 entries (the jail), against 38 on the host |
| Read `backend/.env` | denied |
| Secrets in the environment | `[]` |
| Network egress | denied |
| Fork bomb | capped |
| Backend errors since the switch | 0 |

Cost: ~91 s for roughly a thousand sandboxed executions, about 90 ms each.

`PISTON_URL` unset keeps the old subprocess path, so local development and CI
need no Docker. When it is set and the sandbox cannot be reached, execution
fails closed with `sandbox_unavailable` — it never falls back to the host,
because a silent fallback would restore the hole on the day the container dies.
