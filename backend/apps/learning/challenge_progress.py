"""
A student's coding-challenge progress, for the profile.

Three things the profile shows, and the reasoning behind each:

  Solved per difficulty, against the total available. A bare "12 solved" means
  nothing without the denominator — 12 of 160 and 12 of 15 are different
  achievements.

  A year of daily activity, for the heatmap. Returned sparse: only days with
  something on them. A year is 365 entries and most are empty for most students,
  so sending the empty ones triples the payload to say nothing. The client fills
  the grid.

  Streaks, computed from the activity days. A streak is consecutive calendar
  days with at least one submission — attempting counts, because a day spent
  failing at a hard problem is a day worked.

Everything comes from four queries regardless of how much history a student has:
one grouped count for the activity, one for solved-per-difficulty, one for the
totals, one for the submission tallies.
"""
from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

WINDOW_DAYS = 365
DIFFICULTIES = ('easy', 'medium', 'hard')


def _streaks(days):
    """(current, longest) from a set of dates with activity.

    `current` counts back from today, and from yesterday if nothing has been
    done yet today — otherwise a streak appears broken every morning until the
    student works, which is exactly when they would look at it.
    """
    if not days:
        return 0, 0

    ordered = sorted(days)
    longest = run = 1
    for previous, day in zip(ordered, ordered[1:]):
        run = run + 1 if (day - previous).days == 1 else 1
        longest = max(longest, run)

    today = timezone.localdate()
    anchor = today if today in days else today - timedelta(days=1)
    current = 0
    while anchor in days:
        current += 1
        anchor -= timedelta(days=1)
    return current, longest


def challenge_progress(user, today=None):
    """Everything the profile needs, as plain data."""
    from apps.learning.models import CodingChallenge, CodingSubmission

    today = today or timezone.localdate()
    since = today - timedelta(days=WINDOW_DAYS - 1)

    submissions = CodingSubmission.objects.filter(user=user)

    # Distinct challenges solved, per difficulty, in one query.
    solved_rows = (submissions.filter(status='accepted')
                   .values('challenge__difficulty')
                   .annotate(n=Count('challenge', distinct=True)))
    solved = {d: 0 for d in DIFFICULTIES}
    for row in solved_rows:
        if row['challenge__difficulty'] in solved:
            solved[row['challenge__difficulty']] = row['n']

    available_rows = (CodingChallenge.objects.filter(is_active=True)
                      .values('difficulty').annotate(n=Count('id')))
    available = {d: 0 for d in DIFFICULTIES}
    for row in available_rows:
        if row['difficulty'] in available:
            available[row['difficulty']] = row['n']

    tally = submissions.aggregate(
        total=Count('id'),
        accepted=Count('id', filter=Q(status='accepted')),
        points=Sum('points_earned', filter=Q(status='accepted')),
    )

    # One grouped query for the whole year.
    activity_rows = (submissions.filter(submitted_at__date__gte=since)
                     .annotate(day=TruncDate('submitted_at'))
                     .values('day')
                     .annotate(count=Count('id'),
                               solved=Count('id', filter=Q(status='accepted')))
                     .order_by('day'))

    activity = []
    days_with_activity = set()
    for row in activity_rows:
        day = row['day']
        if day is None:
            continue
        days_with_activity.add(day)
        activity.append({
            'date': day.isoformat(),
            'count': row['count'],
            'solved': row['solved'],
        })

    current, longest = _streaks(days_with_activity)
    total_submissions = tally['total'] or 0
    accepted = tally['accepted'] or 0

    return {
        'solved': {**solved, 'total': sum(solved.values())},
        'available': {**available, 'total': sum(available.values())},
        'submissions': {
            'total': total_submissions,
            'accepted': accepted,
            # Percentage of submissions that passed. Rounded to one place; a
            # student with three submissions does not need four decimals.
            'acceptance_rate': (
                round(accepted * 100 / total_submissions, 1)
                if total_submissions else 0.0),
        },
        'points': tally['points'] or 0,
        'streak': {'current': current, 'longest': longest},
        'activity': activity,
        'window_days': WINDOW_DAYS,
        'today': today.isoformat(),
    }
