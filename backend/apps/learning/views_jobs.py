"""
Views for Job Fetcher — Phase 6
Endpoints:
  GET  /api/learning/jobs/          — paginated list with skill-match scores
  GET  /api/learning/jobs/{id}/     — single job detail + skill match
  POST /api/learning/jobs/{id}/save/   — bookmark a job
  POST /api/learning/jobs/{id}/unsave/ — remove bookmark
  GET  /api/learning/jobs/saved/       — user's saved jobs
  POST /api/learning/jobs/sync/        — manual trigger (admin only)
"""
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import models as db_models

from .models import JobCache, SavedJob
from .job_service import sync_jobs, compute_skill_match, get_user_skill_names

logger = logging.getLogger(__name__)


class JobViewSet(viewsets.ReadOnlyModelViewSet):
    """Job listings with skill-match scoring and save/unsave actions."""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = JobCache.objects.filter(is_active=True)

        # Search
        q = self.request.query_params.get('q', '').strip()
        if q:
            qs = qs.filter(
                db_models.Q(title__icontains=q) |
                db_models.Q(company__icontains=q) |
                db_models.Q(description__icontains=q)
            )

        # Job type filter
        jtype = self.request.query_params.get('type', '').strip()
        if jtype:
            qs = qs.filter(job_type=jtype)

        # Location filter
        loc = self.request.query_params.get('location', '').strip()
        if loc:
            qs = qs.filter(location__icontains=loc)

        return qs.order_by('-posted_at', '-cached_at')

    def _serialize_job(self, job, user, saved_ids=None, user_skills=None):
        """Convert a JobCache instance to a response dict with skill match."""
        # user_skills is resolved once by the caller; without it this queried
        # the user's achieved skills once per job.
        match = compute_skill_match(user, job, user_skills=user_skills)

        # When the caller supplies saved_ids it is the complete set, so trust
        # it. The previous `A or B` fell through to the database for every job
        # NOT in the set — i.e. for most of them — which defeated the whole
        # point of collecting saved_ids up front.
        if saved_ids is not None:
            is_saved = str(job.id) in saved_ids
        else:
            is_saved = SavedJob.objects.filter(user=user, job=job).exists()

        return {
            'id':               str(job.id),
            'external_id':      job.external_id,
            'title':            job.title,
            'company':          job.company,
            'company_logo':     job.company_logo,
            'location':         job.location,
            'job_type':         job.job_type,
            'salary_min':       job.salary_min,
            'salary_max':       job.salary_max,
            'salary_currency':  job.salary_currency,
            'description':      job.description[:800] if job.description else '',
            'apply_url':        job.apply_url,
            'skills_required':  job.skills_required,
            'posted_at':        job.posted_at.isoformat() if job.posted_at else None,
            'cached_at':        job.cached_at.isoformat(),
            'skill_match':      match,
            'is_saved':         is_saved,
        }

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()

        # Pagination
        page_size = min(int(request.query_params.get('page_size', 20)), 50)
        page      = max(int(request.query_params.get('page', 1)), 1)
        offset    = (page - 1) * page_size
        total     = qs.count()
        jobs      = list(qs[offset: offset + page_size])

        # Pre-fetch user's saved job IDs for fast is_saved check
        saved_ids = set(
            str(sid) for sid in
            SavedJob.objects.filter(user=request.user, job__in=jobs).values_list('job_id', flat=True)
        )

        # Resolved once for the page rather than per job.
        user_skills = get_user_skill_names(request.user)

        return Response({
            'count':      total,
            'page':       page,
            'page_size':  page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'results':    [
                self._serialize_job(j, request.user, saved_ids, user_skills)
                for j in jobs
            ],
        })

    def retrieve(self, request, *args, **kwargs):
        job = self.get_object()
        return Response(self._serialize_job(job, request.user))

    @action(detail=True, methods=['post'])
    def save(self, request, pk=None):
        """Bookmark a job."""
        job = self.get_object()
        _, created = SavedJob.objects.get_or_create(user=request.user, job=job)
        return Response({'saved': True, 'created': created})

    @action(detail=True, methods=['post'])
    def unsave(self, request, pk=None):
        """Remove bookmark."""
        job = self.get_object()
        deleted, _ = SavedJob.objects.filter(user=request.user, job=job).delete()
        return Response({'saved': False, 'removed': deleted > 0})

    @action(detail=False, methods=['get'])
    def saved(self, request):
        """List user's saved jobs."""
        saves = (
            SavedJob.objects
            .filter(user=request.user)
            .select_related('job')
            .order_by('-saved_at')
        )
        # Every row here is saved by definition, so pass the id set rather
        # than letting each row re-check the database.
        user_skills = get_user_skill_names(request.user)
        saved_ids = {str(sv.job_id) for sv in saves}
        data = []
        for sv in saves:
            item = self._serialize_job(sv.job, request.user, saved_ids, user_skills)
            item['saved_at'] = sv.saved_at.isoformat()
            item['notes']    = sv.notes
            item['is_saved'] = True
            data.append(item)
        return Response(data)

    @action(detail=False, methods=['post'],
            permission_classes=[IsAuthenticated])
    def sync(self, request):
        """Manual sync trigger — admin only."""
        if request.user.role not in ('admin', 'instructor'):
            return Response({'error': 'Admin/Instructor only'}, status=status.HTTP_403_FORBIDDEN)
        try:
            result = sync_jobs()
            return Response(result)
        except Exception as exc:
            logger.error(f'Manual sync failed: {exc}')
            return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
