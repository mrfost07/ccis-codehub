# Session 6 — Comprehensive Implementation Plan
**Date:** 2026-05-01
**Scope:** 4 workstreams in priority order

---

## Workstream A: Leaderboard UI Polish (Remove Emojis, Professional Design)

### Problem
Current leaderboard uses emojis for rank badges and score breakdowns — looks informal.

### Plan
1. **Replace podium emojis** with Lucide icons + CSS-styled rank badges
   - 1st: `<Crown>` icon inside gold gradient circle
   - 2nd: `<Medal>` icon inside silver gradient circle
   - 3rd: `<Award>` icon inside bronze gradient circle
2. **Replace score breakdown emojis** with small Lucide icons
   - Modules → `<BookOpen>`
   - Challenges → `<Zap>`
   - Paths → `<Map>`
   - Certificates → `<GraduationCap>`
   - Badges → `<Shield>`
3. **Points guide footer** — replace emoji bullets with styled icon+text rows
4. **PodiumCard** — replace emoji medals with SVG badge component

### Files to modify
- `frontend/src/pages/Leaderboard.tsx` — all emoji references

### Estimated effort: 30 minutes

---

## Workstream B: Coding Challenges — Make Fully Functional

### Current Issues
1. **Leaderboard score not updated on challenge solve** — `update_leaderboard_score()` only called on module complete
2. **No custom input field** — students cannot test with their own input
3. **Output comparison is brittle** — trailing whitespace causes false negatives

### Plan

#### B1. Hook leaderboard into challenge submit
**File:** `backend/apps/learning/views_coding.py` (submit action)
```python
from .leaderboard_service import update_leaderboard_score
try:
    update_leaderboard_score(request.user)
except Exception:
    pass  # non-fatal
```

#### B2. Add "Custom Input" run mode
**Backend:** New endpoint `POST /learning/challenges/{slug}/run-custom/`
- Accepts `code`, `language`, `custom_input`
- Runs code with that stdin, returns raw stdout/stderr (no pass/fail)

**Frontend:** Textarea in results pane for custom stdin + "Run Custom" button

#### B3. Normalize output comparison
**File:** `backend/apps/learning/code_executor.py` line 159
```python
def normalize(s):
    return '\n'.join(line.rstrip() for line in s.strip().splitlines())
passed = normalize(stdout) == normalize(expected)
```

### Files to modify
| File | Change |
|------|--------|
| `views_coding.py` | Leaderboard hook + custom-input endpoint |
| `code_executor.py` | Output normalization |
| `CodingChallengePage.tsx` | Custom input textarea + run button |
| `codingService.ts` | `runCustom()` method |

### Estimated effort: 1.5 hours

---

## Workstream C: Projects Hub — Featured Projects Carousel

### Concept
Add a **"Featured"** tab to ProjectsEnhanced showing all **public** projects in a horizontal auto-scrolling carousel. Clicking a card opens a detail modal with team member avatars (GitHub contributors style).

### No Backend Schema Changes Needed
`Project` model already has `visibility='public'`, team memberships, owner info.

### Backend Plan

#### C1. Public projects API endpoint
**File:** `backend/apps/projects/views.py`
```
GET /projects/featured/   — public projects with team member details
```
- Filter: `Project.objects.filter(visibility='public').order_by('-updated_at')`
- Nested: owner avatar, team members with avatars
- No auth required

#### C2. Serializer with team members
**File:** `backend/apps/projects/serializers.py`
```python
class FeaturedProjectSerializer(serializers.ModelSerializer):
    contributors = SerializerMethodField()
    # Returns [{username, avatar_url, role}] for all team members
```

### Frontend Plan

#### C3. Add "Featured" tab to ProjectsEnhanced
- Add `'featured'` to `activeTab` union type
- When active, fetch from `/projects/featured/` and render `<FeaturedCarousel />`

#### C4. FeaturedCarousel component (NEW)
```
 Featured Projects                              
 ┌──────────┐ ┌──────────┐ ┌──────────┐        
 │ Gradient  │ │ Gradient  │ │ Gradient  │ auto- 
 │  Header   │ │  Header   │ │  Header   │ scroll
 │ Name+Type │ │ Name+Type │ │ Name+Type │       
 │ Desc      │ │ Desc      │ │ Desc      │       
 │ [avatars] │ │ [avatars] │ │ [avatars] │       
 └──────────┘ └──────────┘ └──────────┘        
```

Each card:
- Gradient header colored by `programming_language`
- Project name + type badge
- 2-line description
- Tech pill + status badge
- **Contributors row**: overlapping circular avatars (max 5, +N overflow)
- GitHub link icon if repo exists

#### C5. Project Detail Modal (on card click)
- Full description
- Team members with avatars, names, roles (GitHub contributors grid)
- Status, tech stack, GitHub link
- "View Full Project" button → `/projects/{slug}`

### Carousel behavior
- `scroll-snap-type: x mandatory`
- Left/right arrow buttons
- Auto-scroll 5s (pauses on hover)
- Responsive: 1 card mobile, 2 tablet, 3 desktop

### Files to create/modify
| File | Action |
|------|--------|
| `backend/apps/projects/views.py` | Add `featured` action |
| `backend/apps/projects/serializers.py` | `FeaturedProjectSerializer` |
| `frontend/src/components/FeaturedCarousel.tsx` | NEW |
| `frontend/src/pages/ProjectsEnhanced.tsx` | Add Featured tab |

### Estimated effort: 2.5 hours

---

## Workstream D: Phase 6 — Job Fetcher

### Architecture
```
JSearch API  →  JobCache (DB)  →  Frontend Job Cards
                     ↕
               SavedJob (per user)
                     ↕
              Skill Match Algorithm
```

### D1. Models
**File:** `backend/apps/learning/models.py`

```python
class JobCache(models.Model):
    external_id = CharField(unique=True, db_index=True)
    title, company, location = CharField fields
    salary_min, salary_max = IntegerField (nullable)
    salary_currency = CharField(default='PHP')
    job_type = CharField  # full-time, part-time, internship
    description = TextField
    apply_url = URLField
    company_logo_url = URLField(blank=True)
    skills_required = JSONField(default=list)
    posted_at = DateTimeField
    cached_at = DateTimeField(auto_now_add=True)
    is_active = BooleanField(default=True)

class SavedJob(models.Model):
    user = FK(User)
    job = FK(JobCache)
    saved_at = DateTimeField(auto_now_add=True)
    notes = TextField(blank=True)
    unique_together = ['user', 'job']
```

### D2. JSearch Service
**File:** `backend/apps/learning/job_service.py` (NEW)

- `fetch_jobs_from_jsearch(query)` — calls RapidAPI, normalizes
- `sync_jobs()` — runs multiple queries, upserts into DB
- `cleanup_stale_jobs(days=30)` — deactivates old listings
- `compute_skill_match(user, job)` — returns {score, matched, missing}

### D3. API Endpoints
| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/learning/jobs/recommended/` | Top 20 by skill match |
| `GET` | `/learning/jobs/search/?q=` | Search/filter |
| `GET` | `/learning/jobs/{id}/` | Detail + skill match |
| `POST` | `/learning/jobs/{id}/save/` | Toggle save |
| `GET` | `/learning/jobs/saved/` | Saved jobs |

### D4. Management Commands
```bash
python manage.py fetch_jobs
python manage.py cleanup_stale_jobs
```

### D5. Frontend — Job Cards on Community
Horizontal scroll row at top of CommunityEnhanced:
- Company logo, title, location, salary, match % badge
- "See All" → `/jobs`

### D6. Frontend — Jobs Page (NEW)
`frontend/src/pages/Jobs.tsx`:
- Search + filters (type, location, match)
- Job cards grid
- Detail slide-over: description, skills (green=matched, grey=missing), match ring, Apply button, Save toggle
- Saved jobs tab

### Implementation Order
1. Models + migration
2. `job_service.py`
3. Management command
4. ViewSet + serializers + URLs
5. Community job card row
6. Jobs.tsx full page
7. App.tsx route

### Environment Config
```env
JSEARCH_API_KEY=your_rapidapi_key
JSEARCH_HOST=jsearch.p.rapidapi.com
```

### Estimated effort: 4 hours

---

## Priority Order

| # | Workstream | Effort | Impact |
|---|-----------|--------|--------|
| 1 | **A — Leaderboard polish** | 30 min | Visual quality |
| 2 | **B — Coding challenges fix** | 1.5 hr | Core functionality |
| 3 | **C — Featured projects carousel** | 2.5 hr | New feature |
| 4 | **D — Job fetcher** | 4 hr | New feature |

**Total estimated: ~8.5 hours**
