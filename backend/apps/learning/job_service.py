"""
Job Fetcher Service — Phase 6
Fetches jobs from JSearch (RapidAPI) and caches them locally.
Also provides skill-match scoring against the user's AchievedSkills.
"""
import logging
import requests
from datetime import datetime, timezone as dt_tz
from django.conf import settings

logger = logging.getLogger(__name__)

JSEARCH_URL  = 'https://jsearch.p.rapidapi.com/search'
JSEARCH_HOST = getattr(settings, 'JSEARCH_HOST', 'jsearch.p.rapidapi.com')
JSEARCH_KEY  = getattr(settings, 'JSEARCH_API_KEY', '')

# Default queries targeting Philippine IT market
DEFAULT_QUERIES = [
    'software developer Philippines',
    'web developer Philippines entry level',
    'IT intern Philippines',
    'python developer Philippines',
    'full stack developer Philippines',
]


# ─── JSearch integration ──────────────────────────────────────────────────────

def _parse_posted_at(raw: str | None) -> datetime | None:
    """Parse ISO-8601 or epoch timestamp from JSearch."""
    if not raw:
        return None
    try:
        # JSearch returns epoch seconds as a string like '1714700000'
        return datetime.fromtimestamp(int(raw), tz=dt_tz.utc)
    except (ValueError, TypeError):
        pass
    try:
        return datetime.fromisoformat(raw.replace('Z', '+00:00'))
    except Exception:
        return None


def fetch_jobs_from_jsearch(query: str, num_pages: int = 1) -> list[dict]:
    """
    Call JSearch API and return a list of normalized job dicts.
    Each dict is ready to be upserted into JobCache.
    """
    if not JSEARCH_KEY:
        logger.warning('JSEARCH_API_KEY is not configured — skipping fetch.')
        return []

    headers = {
        'x-rapidapi-key':  JSEARCH_KEY,
        'x-rapidapi-host': JSEARCH_HOST,
    }

    jobs = []
    for page in range(1, num_pages + 1):
        params = {
            'query':     query,
            'page':      str(page),
            'num_pages': '1',
            'date_posted': 'month',   # last 30 days
        }
        try:
            resp = requests.get(JSEARCH_URL, headers=headers, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json().get('data', [])
        except Exception as exc:
            logger.error(f'JSearch fetch failed (query={query!r}, page={page}): {exc}')
            break

        for item in data:
            # Map salary (JSearch provides min/max in USD; convert best-effort)
            sal_min = item.get('job_min_salary')
            sal_max = item.get('job_max_salary')
            currency = item.get('job_salary_currency', 'PHP') or 'PHP'

            # job_type normalisation
            emp_type = (item.get('job_employment_type') or '').lower()
            jtype_map = {
                'fulltime': 'fulltime', 'full_time': 'fulltime',
                'parttime': 'parttime', 'part_time': 'parttime',
                'intern': 'internship', 'internship': 'internship',
                'contract': 'contract', 'contractor': 'contract',
            }
            job_type = jtype_map.get(emp_type, 'fulltime')

            # Required skills: combine highlights + qualifications keywords
            skills = []
            highlights = item.get('job_highlights', {})
            for section_items in highlights.values():
                if isinstance(section_items, list):
                    for s in section_items:
                        # Extract short skill-looking words
                        words = [w.strip('.,;:()') for w in s.split() if 2 < len(w.strip()) < 25]
                        skills.extend(words[:3])
            # Deduplicate, lowercase, limit to 20
            seen = set()
            clean_skills = []
            for sk in skills:
                sl = sk.lower()
                if sl not in seen:
                    seen.add(sl)
                    clean_skills.append(sl)
                if len(clean_skills) >= 20:
                    break

            jobs.append({
                'external_id':  item.get('job_id', ''),
                'title':        item.get('job_title', '')[:300],
                'company':      item.get('employer_name', '')[:200],
                'location':     f"{item.get('job_city', '')} {item.get('job_country', '')}".strip()[:200],
                'job_type':     job_type,
                'salary_min':   int(sal_min) if sal_min else None,
                'salary_max':   int(sal_max) if sal_max else None,
                'salary_currency': currency[:5],
                'description':  (item.get('job_description') or '')[:5000],
                'apply_url':    item.get('job_apply_link') or item.get('job_google_link', ''),
                'company_logo': item.get('employer_logo') or '',
                'skills_required': clean_skills,
                'posted_at':    _parse_posted_at(item.get('job_posted_at_timestamp')),
            })

    return jobs


# ─── Sync / cleanup ───────────────────────────────────────────────────────────

def sync_jobs(queries: list[str] | None = None) -> dict:
    """
    Fetch jobs for all queries and upsert into JobCache.
    Returns {'created': N, 'updated': N, 'errors': N}
    """
    from .models import JobCache

    if queries is None:
        queries = DEFAULT_QUERIES

    created = updated = errors = 0
    seen_ids: set[str] = set()

    for q in queries:
        raw_jobs = fetch_jobs_from_jsearch(q, num_pages=2)
        for jdata in raw_jobs:
            eid = jdata.get('external_id', '').strip()
            if not eid or eid in seen_ids:
                continue
            seen_ids.add(eid)
            try:
                obj, was_created = JobCache.objects.update_or_create(
                    external_id=eid,
                    defaults={k: v for k, v in jdata.items() if k != 'external_id'},
                )
                if was_created:
                    created += 1
                else:
                    updated += 1
            except Exception as exc:
                logger.error(f'Upsert failed for job {eid}: {exc}')
                errors += 1

    logger.info(f'sync_jobs done: created={created} updated={updated} errors={errors}')
    return {'created': created, 'updated': updated, 'errors': errors}


def cleanup_stale_jobs(days: int = 30) -> int:
    """Mark jobs older than `days` days as inactive. Returns count deactivated."""
    from django.utils import timezone
    from .models import JobCache

    cutoff = timezone.now() - timezone.timedelta(days=days)
    qs = JobCache.objects.filter(is_active=True, cached_at__lt=cutoff)
    count = qs.count()
    qs.update(is_active=False)
    logger.info(f'cleanup_stale_jobs: deactivated {count} jobs older than {days}d')
    return count


# ─── Skill match ──────────────────────────────────────────────────────────────

def get_user_skill_names(user) -> set:
    """
    The user's achieved skill names, fetched once.

    Callers looping over jobs should resolve this a single time and pass it to
    compute_skill_match — the skills do not vary per job, and re-querying them
    per row cost one round-trip each.
    """
    try:
        from .models import AchievedSkill
        return set(
            AchievedSkill.objects
            .filter(user=user)
            .values_list('skill_name', flat=True)
        )
    except Exception:
        return set()


def compute_skill_match(user, job, user_skills=None) -> dict:
    """
    Compare user's AchievedSkills against job.skills_required.
    Returns {score: 0-100, matched: [...], missing: [...], total_required: N}

    Pass `user_skills` (from get_user_skill_names) when calling this in a loop;
    it is looked up per call otherwise.
    """
    if user_skills is None:
        user_skills = get_user_skill_names(user)

    user_lower = {s.lower() for s in user_skills}
    job_skills  = {s.lower() for s in (job.skills_required or [])}

    if not job_skills:
        return {'score': 0, 'matched': [], 'missing': [], 'total_required': 0}

    matched = sorted(user_lower & job_skills)
    missing = sorted(job_skills - user_lower)
    score   = round(len(matched) / len(job_skills) * 100)

    return {
        'score':          score,
        'matched':        matched,
        'missing':        missing,
        'total_required': len(job_skills),
    }
