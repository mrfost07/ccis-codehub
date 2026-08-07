# Career Paths Buildout — Plan

Building a learning path for every job role in the CCIS career map.

Written 2026-08-07. Numbers below were measured against production, not estimated.

---

## 1. Where things actually stand

### The role catalogue already exists

`backend/apps/learning/management/commands/seed_career_roles.py` seeds **81 roles**
across the three programs, grouped by field:

| Program | Roles | Groups |
|---|---|---|
| BSCS | 29 | Software Engineering (7), Data and AI (7), Systems and Security (6), Graphics and Interactive (3), Quality and Research (4), Emerging (2) |
| BSIT | 28 | Applications (6), Infrastructure and Cloud (6), Networks (4), Security and Governance (3), Support and Operations (3), Data and Storage (3), Quality and Emerging (3) |
| BSIS | 24 | Business Analysis (4), Data and Reporting (5), Enterprise Systems (4), Process and Governance (4), Product and Delivery (4), Strategy and Emerging (3) |

`CareerRole.career_path` is a nullable FK — the map renders without paths, and a
role gets wired to one when a path is seeded.

### Almost nothing is wired up

**0 of 81 roles have a career path.** And of the 10 paths that exist, only 2 are
complete:

```
path                                          program  modules  quizzes  questions
Data Science and Machine Learning             bscs        5        5        40   ✅
Python Programming Fundamentals               general     5        5        44   ✅
Comprehensive Data Structures (bscs)          bscs        3        3         0   ⚠ quizzes have no parseable questions
Comprehensive Web Development Course          bsit        3        1         0   ⚠
Fundamentals of SQL                           bscs        3        3         0   ⚠
Hosting a Website on AWS EC2                  bscs        3        3         0   ⚠
Cloud Computing Fundamentals                  bsit        2        0         0   ⚠ no quizzes
Comprehensive Data Structures (bsit)          bsit        2        0         0   ⚠ duplicate name
Frontend Developer                            general     0        0         0   ❌ empty
Software Enginering                           bscs        0        0         0   ❌ empty + typo
```

### Data problems to clear first — ✅ DONE 2026-08-07

- ~~**2 duplicate path names**: "Comprehensive Data Structures for College Students" exists twice.~~ Merged; the BSIT copy is retired. The one student on it was already enrolled on the survivor, so nothing had to move. Retyped `general`, since Data Structures is foundational to both programs and leaving it `bscs` would have dropped it off the BSIT branch of the map.
- ~~**2 duplicate roles in the catalogue**~~ — wrong: `--prune` had already deactivated both older spellings. Nothing to do.
- ~~**`program_type='general'`** — not a member of `PROGRAM_CHOICES`~~ — **wrong**. `general` *is* a valid choice on `CareerPath` (I had compared against `User.PROGRAM_CHOICES`). It is the right bucket for a foundational path that serves all three programs, which is what Python Programming Fundamentals is. No change needed, and no constraint should be added.
- ~~**"Software Enginering"**~~ — retired. It had no modules and no enrolments; a real Software Architect path supersedes it in Phase 3. "Frontend Developer" retired for the same reason.
- ~~4 paths have quizzes the importer cannot parse~~ — **wrong**: those 10 quizzes had **empty** `content`, not unparseable content. Placeholder rows, zero attempts, deleted. A module with no quiz is honest; a module with an empty quiz is a broken promise.
- Also done: `Data Scientist` is now wired to the Data Science and Machine Learning path — the first of 79 roles.

Two reusable commands came out of this and are tested (14 tests):
`prune_empty_quizzes` and `merge_career_paths --from … --into …`, both with
`--dry-run`. Duplicates and placeholders will happen again.

---

## 2. The problem with the obvious approach

`seed_datascience_path.py` is **1,465 lines for one path**. Multiplying that out:

```
81 paths × 5 modules × 8 questions  =  3,240 questions,  ~118,000 lines
```

That is not authorable, reviewable, or maintainable. The architecture has to
change before the content does.

---

## 3. Proposed architecture: shared modules + per-path manifest

Most roles overlap heavily. A Backend Engineer, a Data Engineer and a Platform
Engineer all need SQL; every BSIT role needs networking; every BSIS role needs
requirements analysis. Author each module **once**, then compose paths from them.

```
backend/apps/learning/content/
  __init__.py
  builder.py          # HTML rendering — extracted from seed_datascience_path.py
  modules/
    core/             # shared by many paths
      programming_fundamentals.py
      version_control.py
      sql_fundamentals.py
      linux_basics.py
      networking_basics.py
      web_fundamentals.py
      security_basics.py
      cloud_basics.py
      data_structures.py
      testing_basics.py
    tracks/           # shared within a family
      software_engineering/…
      data_and_ai/…
      infrastructure/…
      networks/…
      security/…
      business_analysis/…
      enterprise_systems/…
      product_delivery/…
    capstones/        # one per role — the only per-role authoring
      backend_engineer.py
      data_scientist.py
      …
  paths.py            # manifests: role slug → [module keys], metadata
```

A path manifest is then ~15 lines instead of 1,465:

```python
'backend-engineer': {
    'name': 'Backend Engineer',
    'program_type': 'bscs',
    'difficulty_level': 'intermediate',
    'estimated_duration': 10,
    'required_skills': ['Python', 'Databases', 'REST APIs', 'Testing'],
    'modules': [
        'core.programming_fundamentals',
        'core.sql_fundamentals',
        'tracks.software_engineering.apis_and_http',
        'tracks.software_engineering.testing_and_ci',
        'capstones.backend_engineer',
    ],
},
```

**Distinct modules needed: ~130, not 405.** `LearningModule.career_path` is a
plain FK, so shared modules are *rendered into* each path's rows from one
source-of-truth definition. No schema change; the content file is the truth and
the DB rows are generated, exactly as the seeds work today.

---

## 4. Content standard (so quality does not drift)

Every path must satisfy this before it is marked active:

- **5 modules**, ordered, each 8–12 slides
- **1 quiz per module**, 8–10 questions
- Question types: **multiple choice and true/false only**. No written-answer questions — `QuizViewSet._check_answer` grades `short_answer` by exact string equality, which marks a blank submission correct and a real answer wrong. This already bit us; 14 had to be removed and rewritten.
- Exactly **one** correct choice per question, and no duplicate choice text
- `passing_score`, `time_limit_minutes`, `max_attempts` set explicitly
- `required_skills` matches the `CareerRole` skills it is wired to
- `program_type` ∈ {bsit, bscs, bsis} — never `general`

The HTML contracts are already reverse-engineered and documented in the
`seed_datascience_path.py` docstring. Reuse it verbatim; do not re-derive. The
three that are easy to get wrong:

1. `data-choice-id` must appear **before** `data-correct` on the same tag.
2. Choice label text must be plain — the parser's final capture is `[^<]+`, so an inline `<code>` truncates the label to nothing.
3. Type is sniffed from the slide text: uppercase `TRUE` and `FALSE` both present means true/false. A multiple-choice question must never contain both words in caps.

---

## 5. Phases

### Phase 0 — Repair what exists (½ session)

1. Deduplicate the two "Comprehensive Data Structures" paths — keep one, migrate any enrolments/progress, deactivate the other.
2. Fix the two duplicate roles in `seed_career_roles.py`, re-run with `--prune`.
3. Rename "Software Enginering" → "Software Engineering".
4. Migrate `program_type='general'` → the right program; add a validator so it cannot recur.
5. Decide the fate of the 4 paths with unparseable quizzes: re-author their slides in the seeded format, or retire them.
6. Wire the 2 complete paths to their roles (`Data Scientist`, and a Programming Fundamentals prerequisite role).

**Exit:** no duplicates, no invalid `program_type`, no path with modules but zero questions.

### Phase 1 — Infrastructure — ✅ DONE 2026-08-07

Built and deployed:

- `apps/learning/content/builder.py` — render functions moved verbatim, plus `check_manifest`, `render_path` and `seed_path`.
- `apps/learning/content/paths/` — content registry; the Data Science path's 1,223 lines moved here unchanged, and `seed_datascience_path` is now a 42-line shim onto the generic command.
- `manage.py seed_path <slug> | --all | --list | --check` — `--check` renders a manifest and diffs it against the database.
- `manage.py validate_paths` — promotes the checks previously run by hand into a gate that exits non-zero.

**The refactor is proven, not assumed:** `seed_path data-science-and-machine-learning --check` against production reports *"matches the database exactly"*. 27 new tests; suite at 367.

`seed_path` refuses a manifest that would produce an unfinishable path — a `correct` index outside its choices, duplicate choice text, a module with no questions — **before** writing anything, because a half-seeded path is visible, enrollable and unfinishable.

**What `validate_paths` immediately found** (the honest state after Phase 0 removed the placeholder quizzes):

```
 ok   Data Science and Machine Learning        modules=5  questions=40
 ok   Python Programming Fundamentals          modules=5  questions=44
 FAIL Cloud Computing Fundamentals             modules=2  no quizzes
 FAIL Comprehensive Data Structures            modules=3  no quizzes
 FAIL Comprehensive Web Development Course     modules=3  no quizzes
 FAIL Fundamentals of SQL                      modules=3  no quizzes
 FAIL Hosting a Website on AWS EC2             modules=3  no quizzes
```

Five paths teach but cannot assess. Their module content is real; only the
quizzes were never written. Writing them is the first job of Phase 2 — and
because they are existing, enrolled paths, they come before any new role's path.

### Phase 1 — Infrastructure (original plan, for reference)

1. Extract the HTML builder from `seed_datascience_path.py` into `content/builder.py`, unchanged in behaviour — pin it with tests that the existing DS path still renders byte-identically.
2. Define the module and manifest format; write `content/paths.py` with the two existing complete paths expressed as manifests.
3. Write a generic `manage.py seed_path <slug>` / `--all` that replaces one-command-per-path. Idempotent, `--dry-run`, wires `CareerRole.career_path`.
4. Write `manage.py validate_paths` — promote the production checks already used ad hoc into a real command and a test:
   - every question grades right-vs-wrong (both directions)
   - every quiz's slides and `Question` rows agree
   - no written-answer questions
   - every path renders a certificate with all four official marks
   - every active path meets the content standard
5. Re-seed the DS path through the new pipeline and diff against production to prove equivalence.

**Exit:** `seed_path --all` reproduces the current two good paths exactly, and `validate_paths` passes.

### Phase 2a — The five paths that could not assess — ✅ DONE 2026-08-07

85 questions across 14 modules, each drawn from what its module actually
teaches. **Every active path now passes `validate_paths`, certificates included:**

```
 ok  Cloud Computing Fundamentals      modules=2  questions=16
 ok  Comprehensive Data Structures     modules=3  questions=24
 ok  Comprehensive Web Development     modules=3  questions=15
 ok  Data Science and Machine Learning modules=5  questions=40
 ok  Fundamentals of SQL               modules=3  questions=15
 ok  Hosting a Website on AWS EC2      modules=3  questions=15
 ok  Python Programming Fundamentals   modules=5  questions=44

all 7 active path(s) pass
```

**Quiz packs**, a second mechanism alongside path manifests: these five paths
have real teaching content authored before this system, and declaring them as
full manifests would mean transcribing fourteen modules of HTML into slide
dictionaries — risking loss or alteration of content nobody asked to change. A
pack declares *only* quizzes, matched to modules by title. `seed_quizzes` never
writes module content, and a test asserts it (mutation-checked). New paths are
still declared whole in `content/paths/`.

Question count is proportionate: 5 for a thirty-minute module, 8 for a long one.
The standard in §4 said 8–10 uniformly; that would have been a twenty-minute
exam on a half-hour lesson.

Content-wide tests, not spot checks — every question in every pack must have
exactly one correct answer, survive the round trip through the real parser with
the *declared* option still marked correct, carry no markup in a label (which
renders blank), and not read as true/false by accident. One bad question in
eighty-five is invisible by eye.

### Phase 2b — Module library and the first composed path — ✅ DONE 2026-08-07

The composition mechanism now exists: a manifest names modules by key
(`core.version_control`) and the builder resolves them from a shared library.
**Backend Engineer is the first path built this way — four shared modules plus
one capstone.** The next engineering path costs a capstone, not five modules.

Library so far (5 modules, 44 questions): `core.version_control`,
`core.http_and_apis`, `core.relational_data`, `core.automated_testing`,
`capstones.backend_engineer`.

An unknown key **raises** rather than being skipped — skipping would seed a
shorter path than the manifest describes and nothing downstream would notice.

**A defect this phase shipped and then fixed.** Every multiple-choice answer
authored for the library and the quiz packs sat at option A — all 115, with 85
already live. A student would notice in one sitting and score full marks without
reading. Each quiz now gets a balanced set of answer positions, deterministically
shuffled from its title, and a test fails if any body of content clusters. Live
distribution across all 185 multiple-choice questions is now
`{A:57, B:43, C:50, D:35}`.

Two things went wrong on the way and are worth recording:

- The first fix rotated choices by splicing individual element spans, which
  **merged two adjacent options** where one spanned several lines — silently
  turning a four-option question into three. Structurally invisible; caught by
  counting choices per question. The rewrite replaces whole list literals.
- A hash-derived shift is random, and random clusters: one eight-question quiz
  put five answers in the same place. Balanced-then-shuffled fixes it by
  construction.

**All 8 active paths pass `validate_paths`, certificates included.** 213
questions live. 2 of 79 roles now lead to a path.

### Phase 2c — Rest of the core library (1–2 sessions)

Author the ~10 core modules and the ~8 track families' shared modules
(~40 modules). These are the highest-leverage content in the project: each one
is reused by 5–20 paths.

Order by reuse count, highest first.

### Phase 3 — Tier 1 paths (2–3 sessions)

12 flagship roles, 4 per program, chosen for demand and distinctness:

- **BSCS**: Backend Engineer, Frontend Engineer, Data Scientist ✅, Machine Learning Engineer
- **BSIT**: Network Administrator, Cloud Engineer, IT Support Engineer, Cybersecurity/SOC Analyst
- **BSIS**: Business Analyst, Data Analyst, IT Project Manager, ERP Functional Consultant

Each gets a full 5-module path and its own capstone. Run `validate_paths` and
render a certificate for each before activating.

### Phase 4 — Tiering the remaining 69 roles (ongoing, batched)

Not every role needs its own full path on day one, and pretending otherwise
produces 69 thin, interchangeable paths. Proposal:

- **Tier 2 (~30 roles)** — a 3-module path: 2 shared + 1 role capstone.
- **Tier 3 (~39 roles)** — no own path. The role card stays in the career map with `career_path = null` and points at the nearest Tier 1/2 path as its recommended route. `seed_career_roles.py` was explicitly built for this ("the map is useful before any of them exist").

Batch by family so shared track modules get written once and amortised.

### Phase 5 — Map and progression (1 session)

1. Populate `CareerPath.prerequisites` — the M2M already exists and is unused.
2. Surface the recommended-path pointer on Tier 3 role cards.
3. Verify the career map renders 81 roles without becoming unreadable (this is why the catalogue is grouped by field).
4. Re-verify certificates across every new path.

---

## 6. Effort

| Phase | Sessions | Output |
|---|---|---|
| 0 Repair | 0.5 | clean data |
| 1 Infrastructure | 1 | builder, manifests, `seed_path`, `validate_paths` |
| 2 Core library | 1–2 | ~50 shared modules |
| 3 Tier 1 | 2–3 | 12 full paths, ~480 questions |
| 4 Tier 2 batches | 4–6 | ~30 paths, ~720 questions |
| 5 Map | 1 | prerequisites, pointers, verification |

Roughly **10–14 sessions** for full coverage; **4–5** to the point where all
three programs have credible flagship paths.

---

## 7. Open decisions (need your call before Phase 3)

1. **Tiering** — accept Tier 2/3, or insist every one of the 81 roles gets a full path? The second is defensible but roughly triples Phases 3–4.
2. **Content source** — hand-authored, or AI-drafted then reviewed? Drafting is far faster, but every answer key must be verified by a human; a wrong key is worse than a missing question.
3. **Instructor attribution** — every path currently shows "Renier Fostanes" as Course Instructor on the certificate. Should paths carry different instructors?
4. **Approval flow** — seed new paths as `approved` and live, or `pending` for review first?
5. **Retire or rebuild** the 4 half-built paths (Cloud Computing, Web Development, SQL, AWS EC2)? Their module content is real; only the quiz slides are unparseable.

---

## 8. Commands, in order (once Phase 1 lands)

```bash
python manage.py seed_career_roles --prune
python manage.py seed_path --all --dry-run
python manage.py seed_path --all
python manage.py import_quiz_questions --fill-missing
python manage.py validate_paths
```

`rewrite_written_questions` and `prune_ungradeable_questions` exist for repair
and should not be needed on new content — the content standard forbids what they
clean up.
