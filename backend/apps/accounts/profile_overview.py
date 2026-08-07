"""
One request for everything the profile shows: learning, projects and community.

Computed from the source tables rather than read from the denormalised counters
on Profile. Those counters were wrong — `total_courses_completed` read 0 for a
student with two finished paths and two certificates, because nothing updates it
when a path completes. A profile that reports zero to somebody who has done the
work is worse than one that reports nothing.

The counters are left alone; other code reads them and this is not the place to
change what writes them. This just stops the profile depending on them.

Cost is a fixed set of counting queries — no per-item work — so it does not grow
with how much a student has done.
"""
from django.db.models import Count, Q, Sum


def _learning(user, public=False):
    from apps.learning.models import (
        Certificate, Enrollment, Quiz, QuizAttempt, UserProgress,
    )

    enrolments = Enrollment.objects.filter(user=user)
    attempts = QuizAttempt.objects.filter(user=user, status='completed')
    scores = attempts.aggregate(n=Count('id'), best=Sum('score'))

    learning = {
        'enrolled': enrolments.count(),
        'completed_paths': enrolments.filter(status='completed').count(),
        'modules_completed': UserProgress.objects.filter(
            user=user, is_completed=True).count(),
        'certificates': Certificate.objects.filter(user=user).count(),
        'quizzes_available': Quiz.objects.count(),
    }
    if not public:
        # Marks are between a student and their instructor. Everything else
        # here is the kind of thing a portfolio is for; this is not.
        learning['quizzes_taken'] = scores['n'] or 0
        learning['average_score'] = (
            round((scores['best'] or 0) / scores['n'], 1) if scores['n'] else None)
    return learning


def _challenges(user):
    from apps.learning.challenge_progress import challenge_progress

    progress = challenge_progress(user)
    return {
        'solved': progress['solved'],
        'available': progress['available'],
        'streak': progress['streak'],
        'acceptance_rate': progress['submissions']['acceptance_rate'],
        'submissions': progress['submissions']['total'],
    }


def _projects(user):
    from apps.projects.models import Project, ProjectMembership, ProjectTask

    owned = Project.objects.filter(owner=user)
    member_of = ProjectMembership.objects.filter(user=user, is_active=True)
    tasks = ProjectTask.objects.filter(assigned_to=user)
    task_counts = tasks.aggregate(
        total=Count('id'),
        done=Count('id', filter=Q(status='done')),
    )

    return {
        'owned': owned.count(),
        'member_of': member_of.count(),
        'active': owned.filter(status__in=['planning', 'in_progress']).count(),
        'completed': owned.filter(status='completed').count(),
        'tasks_assigned': task_counts['total'] or 0,
        'tasks_done': task_counts['done'] or 0,
    }


def _community(user):
    from apps.community.models import Comment, Post, PostLike, UserFollow

    posts = Post.objects.filter(author=user)
    # Likes received across their posts — the number that says whether anyone
    # was reading, which a bare post count does not.
    likes_received = PostLike.objects.filter(post__author=user).count()

    return {
        'posts': posts.count(),
        'comments': Comment.objects.filter(author=user).count(),
        'likes_received': likes_received,
        'followers': UserFollow.objects.filter(following=user).count(),
        'following': UserFollow.objects.filter(follower=user).count(),
    }


def profile_overview(user, public=False):
    """Everything the profile summarises, from the source tables.

    `public` is for viewing somebody else: it drops quiz marks, which are
    between a student and their instructor. The rest — paths finished,
    challenges solved, projects, posts — is what a profile is for.
    """
    return {
        'learning': _learning(user, public=public),
        'challenges': _challenges(user),
        'projects': _projects(user),
        'community': _community(user),
    }
