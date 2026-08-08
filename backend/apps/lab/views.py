"""
Lab API — authoring and joining. Running code and reviewing come in later
phases; this is the surface those will sit on.

Ownership is checked, not just role. `IsInstructorOrAdmin` alone would let any
instructor on the platform edit any other instructor's lab, which is the same
shape as the bug that let any student delete every coding challenge.
"""
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import IsInstructorOrAdmin

from .models import CodingLab, LabParticipant, LabProblem, LabProblemSet
from .serializers import (
    CodingLabSerializer, LabParticipantSerializer, LabProblemSerializer,
    LabProblemSetSerializer, LabProblemStudentSerializer,
)


def _is_owner(user, lab) -> bool:
    """Second guard, behind queryset scoping.

    Today no route reaches this for a non-owner — `get_queryset` already hides
    other instructors' labs, so they 404 first. It is kept because that scoping
    is the kind of thing a later feature widens (a shared instructor dashboard
    would), and this is what would still refuse the write.
    """
    return lab.instructor_id == user.id or user.is_staff or user.role == 'admin'


class CodingLabViewSet(viewsets.ModelViewSet):
    serializer_class = CodingLabSerializer
    permission_classes = [IsAuthenticated]

    WRITE_ACTIONS = {'create', 'update', 'partial_update', 'destroy',
                     'add_set', 'transition'}

    def get_permissions(self):
        if self.action in self.WRITE_ACTIONS:
            return [IsAuthenticated(), IsInstructorOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or getattr(user, 'role', '') in ('instructor', 'admin'):
            # An instructor sees their own. Admins see everything.
            if user.is_staff or user.role == 'admin':
                return CodingLab.objects.all()
            return CodingLab.objects.filter(instructor=user)
        # A student sees only labs they are actually in, and never a draft.
        return CodingLab.objects.filter(
            participants__student=user).exclude(state='draft').distinct()

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)

    def _owned(self, request):
        lab = self.get_object()
        if not _is_owner(request.user, lab):
            return None, Response({'detail': 'Not your lab.'},
                                  status=status.HTTP_403_FORBIDDEN)
        return lab, None

    def update(self, request, *args, **kwargs):
        lab, denied = self._owned(request)
        if denied:
            return denied
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        lab, denied = self._owned(request)
        if denied:
            return denied
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='sets')
    def add_set(self, request, pk=None):
        lab, denied = self._owned(request)
        if denied:
            return denied
        label = (request.data.get('label') or '').strip()
        if not label:
            return Response({'detail': 'A set needs a label, such as "Set A".'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            problem_set = LabProblemSet.objects.create(lab=lab, label=label)
        except IntegrityError:
            return Response({'detail': f'This lab already has a set called "{label}".'},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response(LabProblemSetSerializer(problem_set).data,
                        status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def transition(self, request, pk=None):
        """Move the lab through its states, forwards only.

        Free-form state setting is how a closed lab gets reopened by a stray
        request and starts accepting submissions again.
        """
        lab, denied = self._owned(request)
        if denied:
            return denied

        order = ['draft', 'open', 'running', 'review', 'closed']
        target = request.data.get('state')
        if target not in order:
            return Response({'detail': f'Unknown state: {target}'},
                            status=status.HTTP_400_BAD_REQUEST)
        if order.index(target) <= order.index(lab.state):
            return Response(
                {'detail': f'A lab cannot go from {lab.state} back to {target}.'},
                status=status.HTTP_400_BAD_REQUEST)
        if target == 'running' and not LabProblem.objects.filter(
                problem_set__lab=lab).exists():
            return Response({'detail': 'Add at least one problem before starting.'},
                            status=status.HTTP_400_BAD_REQUEST)

        lab.state = target
        if target == 'running' and lab.started_at is None:
            lab.started_at = timezone.now()
        if target == 'closed':
            lab.closed_at = timezone.now()
        lab.save(update_fields=['state', 'started_at', 'closed_at'])
        return Response(CodingLabSerializer(lab).data)

    @action(detail=False, methods=['post'], url_path='join')
    def join(self, request):
        """Join by code. Idempotent — rejoining after a dropout is normal."""
        code = (request.data.get('join_code') or '').strip().upper()
        lab = CodingLab.objects.filter(join_code=code).first()
        if lab is None or lab.state == 'draft':
            # A draft lab must not be distinguishable from a wrong code.
            return Response({'detail': 'No lab with that code.'},
                            status=status.HTTP_404_NOT_FOUND)
        if lab.state == 'closed':
            return Response({'detail': 'That lab has closed.'},
                            status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            participant, created = LabParticipant.objects.get_or_create(
                lab=lab, student=request.user)
            if participant.problem_set is None:
                participant.problem_set = lab.set_for(request.user)
                participant.save(update_fields=['problem_set'])

        return Response(
            {'lab': CodingLabSerializer(lab).data,
             'participant': LabParticipantSerializer(participant).data,
             'rejoined': not created},
            status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='my-problems')
    def my_problems(self, request, pk=None):
        """The problems this student drew — never anyone else's set."""
        lab = self.get_object()
        participant = LabParticipant.objects.filter(
            lab=lab, student=request.user).first()
        if participant is None:
            return Response({'detail': 'You have not joined this lab.'},
                            status=status.HTTP_403_FORBIDDEN)
        if participant.problem_set is None:
            return Response({'set': None, 'problems': []})

        problems = participant.problem_set.problems.order_by('order')
        return Response({
            'set': participant.problem_set.label,
            'problems': LabProblemStudentSerializer(problems, many=True).data,
        })

    @action(detail=True, methods=['get'])
    def participants(self, request, pk=None):
        lab = self.get_object()
        if not _is_owner(request.user, lab):
            return Response({'detail': 'Not your lab.'},
                            status=status.HTTP_403_FORBIDDEN)
        rows = lab.participants.select_related('student', 'problem_set')
        return Response(LabParticipantSerializer(rows, many=True).data)


class LabProblemViewSet(viewsets.ModelViewSet):
    """Authoring problems. Instructors only, and only within their own labs."""

    serializer_class = LabProblemSerializer
    permission_classes = [IsAuthenticated, IsInstructorOrAdmin]

    def get_queryset(self):
        user = self.request.user
        queryset = LabProblem.objects.select_related('problem_set__lab')
        if user.is_staff or getattr(user, 'role', '') == 'admin':
            return queryset
        return queryset.filter(problem_set__lab__instructor=user)

    def _check_set(self, request):
        problem_set = LabProblemSet.objects.filter(
            id=request.data.get('problem_set')).select_related('lab').first()
        if problem_set is None:
            return None, Response({'detail': 'Unknown problem set.'},
                                  status=status.HTTP_400_BAD_REQUEST)
        if not _is_owner(request.user, problem_set.lab):
            return None, Response({'detail': 'Not your lab.'},
                                  status=status.HTTP_403_FORBIDDEN)
        return problem_set, None

    def create(self, request, *args, **kwargs):
        _, denied = self._check_set(request)
        if denied:
            return denied
        return super().create(request, *args, **kwargs)
