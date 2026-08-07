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

### Data problems to clear first

- **2 duplicate path names**: "Comprehensive Data Structures for College Students" exists twice (bscs and bsit, different slugs).
- **2 duplicate roles in the catalogue**: `ERP / Low-Code Developer` vs `ERP and Low-Code Developer`; `System Administrator` vs `Systems Administrator`.
- **`program_type='general'`** on two paths — not a member of `PROGRAM_CHOICES` (bsit/bscs/bsis). Nothing validates it on the way in.
- **"Software Enginering"** — missing an `i`, and it prints onto certificates.
- 4 paths have quizzes whose slides the importer cannot parse (`no questions found in content: 10`).

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

### Phase 1 — Infrastructure (1 session)

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

### Phase 2 — Core module library (1–2 sessions)

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
