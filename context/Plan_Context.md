# CCIS-CodeHub — Master Feature Plan
**Last Updated:** 2026-05-01 (Session 6 Planning)
**Status:** Phases 1–5 DONE · Session 6 workstreams NEXT

---

## Table of Contents
1. [Phase 1 — Skills & Achievements](#1-phase-1--skills--achievements) ✅
2. [Phase 2 — Certificate System](#2-phase-2--certificate-system) ✅
3. [Phase 3 — Badges System](#3-phase-3--badges-system) ✅
4. [Phase 4 — Resume Builder](#4-phase-4--resume-builder) ✅
5. [Phase 5 — Leaderboard](#5-phase-5--leaderboard) ✅
6. [Phase 6 — Job Fetcher](#6-phase-6--job-fetcher) ← NEXT
7. [Workstream A — Leaderboard Polish](#7-workstream-a--leaderboard-polish) ← NEXT
8. [Workstream B — Coding Challenges Fix](#8-workstream-b--coding-challenges-fix) ← NEXT
9. [Workstream C — Featured Projects Carousel](#9-workstream-c--featured-projects-carousel) ← NEXT
10. [Dependency Graph](#10-dependency-graph)

---

## 1. Phase 1 — Skills & Achievements ✅ DONE

**Completed:** 2026-04-30

### What was built
- `AchievedSkill` model with `source_type`, `skill_name`, `skill_category`, `proficiency_level`
- `skills_taught` JSONField on `LearningModule`, `skills_granted` on `CareerPath`
- `_grant_skills_from_module()` hooked into `LearningModuleViewSet.complete()`
- `AchievedSkillViewSet` → `GET /learning/skills/me/` (grouped by category)
- Profile **Achievements tab** with stats + verified skills grid
- Migrations: 0016 (model), 0017 (constraint fix)

### How to use
- Go to Django admin → `LearningModule` → set `skills_taught` JSON:
  ```json
  [{"name": "Python", "category": "Programming Language", "level": "beginner"}]
  ```
- Complete a module → skills appear in Profile Achievements tab

---

## 2. Phase 2 — Certificate System ✅ DONE

**Completed:** 2026-04-30

### What was built
- `GET /learning/certificates/eligibility/` — per-path progress with `is_eligible` flag
- `POST /learning/certificates/check_and_award/` — retroactive cert creation
- `Certificates.tsx` fully rewritten:
  - **"Ready to Claim"** section with 1-click Claim button
  - **"Earned Certificates"** grid with CertificateCard
  - **"In Progress"** paths with progress bars

---

## 3. Phase 3 — Badges System ✅ DONE

**Completed:** 2026-04-30

### What was built
- `BadgeDefinition` model (8 trigger types, 4 rarities) + `UserBadge` model
- `badge_service.py` — decoupled service layer for all badge granting
- `grant_badges_after_module()` called automatically in `complete()` action
- `GET /learning/badges/catalog/` — full catalog with earned/locked per user
- 13 badges seeded via `python manage.py seed_badges`
- Profile **Badge Showcase** — rarity-colored grid, locked badges greyed/grayscaled
- Migration: 0018

### Badge Catalog (13 seeded)
| Icon | Name | Trigger | Rarity |
|------|------|---------|--------|
| ⚔️ | First Blood | 1 challenge solved | Common |
| 🗡️ | Code Warrior | 5 challenges | Common |
| 🎯 | Problem Crusher | 10 challenges | Rare |
| 🏆 | Coding Master | 25 challenges | Epic |
| ⚡ | Speed Demon | Challenge < 60s | Rare |
| 📚 | Eager Learner | 1 module | Common |
| 🦉 | Bookworm | 10 modules | Common |
| 🔭 | Knowledge Seeker | 25 modules | Rare |
| 🛤️ | Path Finisher | 1 path complete | Rare |
| 🗺️ | Road Scholar | 3 paths complete | Epic |
| 💎 | Certified | 1 certificate | Epic |
| 🌟 | Hall of Fame | 3 certificates | Legendary |
| 🧠 | Quiz Ace | 100% quiz score | Rare |

---

## 4. Phase 4 — Resume Builder ✅ DONE

**Completed:** 2026-04-30

### What was built
- `ResumePage.tsx` — 3-step flow: pick template → edit → print PDF
- `ResumePreview.tsx` — 4 pure inline-style templates:
  - **Classic** — navy header, serif, blue pills
  - **Modern** — dark two-column sidebar
  - **Minimal** — ultra-clean, timeline rows
  - **Bold** — purple hero banner, two-column body
- Auto-populated from: profile, `/learning/skills/me/`, `/learning/certificates/`
- Left editor panel: personal info, summary, skills, education, experience, projects
- Right live A4 preview — updates as you type
- Print-to-PDF via `window.print()` with print CSS
- Route: `/resume` (ProtectedRoute)
- Profile Achievements tab → "Build My Resume" card shortcut

---

## 5. Phase 5 — Leaderboard ✅ DONE
**Completed:** 2026-05-01 | **Depends on:** Phases 1–3

### Concept
Replace the "Coming Soon" placeholder (`Leaderboard.tsx`) with a **real, data-driven leaderboard** showing student rankings across multiple categories.

### Scoring System

Points are calculated server-side by aggregating existing data:

| Action | Points |
|--------|--------|
| Module completed | +10 pts |
| Career path completed | +100 pts |
| Coding challenge solved (first time) | +50 pts |
| Coding challenge solved (fast < 60s) | +75 pts |
| Quiz 100% score | +30 pts |
| Certificate earned | +200 pts |
| Badge earned (common) | +20 pts |
| Badge earned (rare) | +50 pts |
| Badge earned (epic) | +100 pts |
| Badge earned (legendary) | +300 pts |

### Backend — Scoring Engine

**Option A (Computed, no new model):** Calculate scores on the fly from existing tables using Django ORM aggregation. Pros: no extra storage, always fresh. Cons: slow at scale.

**Option B (Cached, recommended):** `LeaderboardSnapshot` model updated via a periodic task or after each scoring event.

```python
# backend/apps/learning/models.py — ADD

class LeaderboardSnapshot(models.Model):
    """
    Cached leaderboard entry per user, refreshed on each scoring event.
    Updated by: module completion, challenge solve, badge earn, cert earn.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='leaderboard_entry'
    )
    total_points = models.IntegerField(default=0, db_index=True)
    modules_completed = models.IntegerField(default=0)
    challenges_solved = models.IntegerField(default=0)
    paths_completed = models.IntegerField(default=0)
    certificates_earned = models.IntegerField(default=0)
    badges_earned = models.IntegerField(default=0)
    quiz_perfect_scores = models.IntegerField(default=0)

    # Rolling windows (updated via recalculation)
    weekly_points = models.IntegerField(default=0, db_index=True)
    monthly_points = models.IntegerField(default=0, db_index=True)

    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-total_points']

    def recalculate(self):
        """Recompute all scores from scratch. Call after any scoring event."""
        from django.db.models import Count, Sum
        from .models import UserProgress, Certificate, UserBadge

        BADGE_RARITY_POINTS = {'common': 20, 'rare': 50, 'epic': 100, 'legendary': 300}

        modules = UserProgress.objects.filter(user=self.user, is_completed=True).count()
        certs = Certificate.objects.filter(user=self.user).count()
        badge_qs = UserBadge.objects.filter(user=self.user).select_related('badge')

        badge_pts = sum(BADGE_RARITY_POINTS.get(ub.badge.rarity, 0) for ub in badge_qs)

        # Coding challenges
        try:
            from .models import CodingSubmission
            challenges = (
                CodingSubmission.objects
                .filter(user=self.user, status='accepted')
                .values('challenge').distinct().count()
            )
        except Exception:
            challenges = 0

        paths = Enrollment.objects.filter(user=self.user, status='completed').count()

        self.modules_completed = modules
        self.certificates_earned = certs
        self.challenges_solved = challenges
        self.paths_completed = paths
        self.badges_earned = badge_qs.count()

        self.total_points = (
            modules * 10 +
            paths * 100 +
            challenges * 50 +
            certs * 200 +
            badge_pts
        )
        self.save()
```

### API Endpoints

```python
class LeaderboardViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /learning/leaderboard/              — all-time top 50
    GET /learning/leaderboard/monthly/     — top 50 this month
    GET /learning/leaderboard/weekly/      — top 50 this week
    GET /learning/leaderboard/me/          — current user rank + neighbors
    GET /learning/leaderboard/paths/?path_id=X  — leaderboard for specific path
    """
```

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/learning/leaderboard/` | All-time top 50 with rank, points, user info |
| `GET` | `/learning/leaderboard/monthly/` | Top 50 this month |
| `GET` | `/learning/leaderboard/weekly/` | Top 50 this week |
| `GET` | `/learning/leaderboard/me/` | My rank, ±5 neighbors, percentile |
| `GET` | `/learning/leaderboard/categories/` | Per-category breakdowns |

### Response Shape

```json
{
  "total_users": 312,
  "updated_at": "2026-04-30T14:00:00Z",
  "entries": [
    {
      "rank": 1,
      "user": {
        "id": "...", "username": "jdoe", "first_name": "John",
        "avatar": "...", "program": "BSCS", "year_level": "3"
      },
      "total_points": 4250,
      "modules_completed": 34,
      "challenges_solved": 12,
      "certificates_earned": 2,
      "badges_earned": 8,
      "is_me": false
    }
  ],
  "my_rank": { "rank": 47, "total_points": 820, "percentile": 85 }
}
```

### Frontend — Leaderboard Page (Full Redesign)

Replace the placeholder in `Leaderboard.tsx` with:

```
/leaderboard
├── Header — "Who's Leading CCIS-CodeHub?"
│
├── Tabs: [All Time] [This Month] [This Week] [By Path ▾]
│
├── Top 3 Podium (animated)
│   ├── 🥇 1st place — large card, gold glow
│   ├── 🥈 2nd place — medium card, silver glow
│   └── 🥉 3rd place — medium card, bronze glow
│
├── Rankings Table (4th–50th)
│   ├── Rank | Avatar | Name | Program | Points | Badges | Challenges
│   ├── Each row links to that user's public profile
│   └── "You" row always highlighted + sticky when in view
│
└── My Rank Card (always visible at bottom)
    ├── "You are ranked #47 out of 312 students"
    ├── "Top 85% · 430 pts to reach #40"
    └── Progress bar to next rank
```

### Frontend Components Needed

| Component | Purpose |
|-----------|---------|
| `LeaderboardPodium` | Animated top-3 with crown/medal SVGs |
| `LeaderboardTable` | Virtualized table for 4–50 |
| `MyRankCard` | Sticky bottom card showing user's own rank |
| `LeaderboardTabs` | All Time / Monthly / Weekly / By Path |
| `RankBadge` | Gold/Silver/Bronze/numbered rank badge |

### Design Notes
- **Podium**: center 1st, left 3rd (shorter), right 2nd (medium) — classic podium shape
- **Gold/Silver/Bronze glow** using `box-shadow` + gradient borders
- **Rank change indicators**: up arrow (green), down arrow (red), dash (no change) — future feature
- **Score breakdown tooltip**: hover over points to see breakdown (modules × 10, challenges × 50, etc.)
- **Animated number counter**: points count up on first load (CSS animation)
- Background: dark theme matching existing pages (`from-slate-900 via-purple-950 to-slate-900`)

### Score Update Triggers (Backend Hooks)

Add `update_leaderboard_score(user)` call in:
1. `LearningModuleViewSet.complete()` — after module marked done
2. `ChallengeViewSet.submit()` — after accepted submission
3. `CertificateViewSet.check_and_award()` — after cert is issued
4. `BadgeService.check_and_grant_badges()` — after badge earned

```python
# In each trigger location:
from .leaderboard_service import update_leaderboard_score
try:
    update_leaderboard_score(user)
except Exception as e:
    logger.warning(f"Leaderboard update failed (non-fatal): {e}")
```

### Management Command

```bash
python manage.py recalculate_leaderboard  # Rebuild all snapshots from scratch
```

Use this to bootstrap data for existing users before going live.

### Implementation Order
1. `LeaderboardSnapshot` model + migration
2. `leaderboard_service.py` — `update_leaderboard_score()` + `recalculate_all()`
3. `LeaderboardViewSet` + URLs
4. Management command `recalculate_leaderboard`
5. Hook into module complete, challenge submit, badge grant, cert award
6. Frontend `Leaderboard.tsx` — full redesign
7. `LeaderboardPodium`, `LeaderboardTable`, `MyRankCard` components

---

## 6. Phase 6 — Job Fetcher ← NEXT
**Priority:** MEDIUM | **Effort:** ~4 hours | **Depends on:** Phase 1 (skills for matching)

Full plan in `context/Session6_Plan.md` Workstream D.

Key points:
- **JSearch RapidAPI** integration → `JobCache` model (cached locally)
- **Skill match algorithm** cross-references `AchievedSkill` with `skills_required` JSON
- Management commands: `fetch_jobs`, `cleanup_stale_jobs`
- Frontend: story cards on Community + full `/jobs` browser page
- 5 API endpoints under `/learning/jobs/`

---

## 7. Workstream A — Leaderboard Polish ← NEXT
**Priority:** HIGH | **Effort:** 30 min

Replace all emojis in `Leaderboard.tsx` with Lucide icons:
- Podium medals → `<Crown>`, `<Medal>`, `<Award>` inside gradient circles
- Score breakdown → `<BookOpen>`, `<Zap>`, `<Map>`, `<GraduationCap>`, `<Shield>`
- Points guide footer → icon+text rows instead of emoji bullets

---

## 8. Workstream B — Coding Challenges Fix ← NEXT
**Priority:** HIGH | **Effort:** 1.5 hours

1. Hook `update_leaderboard_score()` into `views_coding.py` submit action
2. Add `POST /learning/challenges/{slug}/run-custom/` — runs code with user-provided stdin
3. Fix output comparison: normalize whitespace per line in `code_executor.py`
4. Frontend: custom input textarea + "Run Custom" button in `CodingChallengePage.tsx`

---

## 9. Workstream C — Featured Projects Carousel ← NEXT
**Priority:** MEDIUM | **Effort:** 2.5 hours

1. Backend: `GET /projects/featured/` — public projects with team member avatars
2. `FeaturedProjectSerializer` with nested contributor list
3. Frontend: `FeaturedCarousel.tsx` — auto-scrolling cards with snap, gradient headers, overlapping avatar row
4. Add "Featured" tab to `ProjectsEnhanced.tsx`
5. Click → detail modal with full team grid (GitHub contributors style)

---

## 10. Dependency Graph

```
Phase 1 (Skills) ──→ Phase 3 (Badges) ──→ Phase 5 (Leaderboard) ✅
                                                ↑
Phase 2 (Cert Fix) ────────────────────────────┘ ✅

Phase 1 (Skills) ──→ Phase 4 (Resume Builder) ✅

Phase 1 (Skills) ──→ Phase 6 (Job Fetcher)

Phase 5 ──→ Workstream A (Leaderboard Polish)
Phase 5 ──→ Workstream B (Coding Fix — leaderboard hook)
Projects Hub ──→ Workstream C (Featured Carousel)
```

### Implementation Order
| Order | Phase | Est. Time | Status |
|-------|-------|-----------|--------|
| 1 | Phase 2 — Certificate Fix | 1 day | ✅ Done |
| 2 | Phase 1 — Skills & Achievements | 3 days | ✅ Done |
| 3 | Phase 3 — Badges | 2 days | ✅ Done |
| 4 | Phase 4 — Resume Builder | 2 days | ✅ Done |
| 5 | Phase 5 — Leaderboard | 3 days | ✅ Done |
| 6 | **Workstream A — Leaderboard Polish** | 30 min | 🔲 Next |
| 7 | **Workstream B — Coding Challenges Fix** | 1.5 hr | 🔲 Next |
| 8 | **Workstream C — Featured Projects** | 2.5 hr | 🔲 Next |
| 9 | **Phase 6 — Job Fetcher** | 4 hr | 🔲 Next |

**Remaining estimated time: ~8.5 hours**

---

> **REMINDER for next session:** Start with Workstream A (quick Leaderboard icon swap), then B (coding fixes), then C (featured carousel), then D (job fetcher). Detailed plan in `context/Session6_Plan.md`.
