"""
Live Coding Lab — a classroom exercise graded by a person, not by a string
comparison.

Every other coding surface on this platform stores an expected output and
compares stdout to it. This one deliberately does not. The instructor writes a
problem in prose, students write and run code freely, and a human decides
whether the answer is right. That single difference is why this is its own app
rather than another flag on CodingChallenge — nearly every assumption in the
challenge model (test cases, pass counts, automatic scoring) is absent here.

See docs/LIVE_CODING_LAB_PLAN.md for the design this implements.
"""
import hashlib
import random
import string
import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q

# No 0/O/1/I/5/S. Students read this off a projector at the back of a room and
# type it under time pressure; the existing quiz code uses the full alphabet
# and generates codes like `O0I1S5`.
JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789'
JOIN_CODE_LENGTH = 6

LANGUAGES = [
    ('python', 'Python'),
    ('javascript', 'JavaScript'),
    ('java', 'Java'),
    ('cpp', 'C++'),
]


def generate_join_code() -> str:
    """A code that is free at the moment it is generated.

    The quiz app's equivalent is named `generate_unique_join_code` but never
    looks in the table — it relies on the unique index and raises IntegrityError
    on the collision. Here the collision is retried instead, and the caller
    still keeps the unique index as the real guarantee.
    """
    for _ in range(20):
        code = ''.join(random.choices(JOIN_CODE_ALPHABET, k=JOIN_CODE_LENGTH))
        if not CodingLab.objects.filter(join_code=code).exists():
            return code
    raise RuntimeError('could not allocate a free join code')


class CodingLab(models.Model):
    """One classroom session."""

    STATES = [
        ('draft', 'Draft'),            # being written, invisible to students
        ('open', 'Open'),              # students may join, not yet coding
        ('running', 'Running'),        # students are working
        ('review', 'Review'),          # submissions closed, marking continues
        ('closed', 'Closed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='coding_labs')
    title = models.CharField(max_length=200)
    instructions = models.TextField(
        blank=True, help_text='Shown in the lobby before the lab starts.')

    join_code = models.CharField(
        max_length=JOIN_CODE_LENGTH, unique=True, db_index=True,
        default=generate_join_code)
    state = models.CharField(max_length=20, choices=STATES, default='draft', db_index=True)

    languages = models.JSONField(
        default=list,
        help_text='Which languages a student may choose. Empty means all supported.')
    allow_late_submissions = models.BooleanField(
        default=True,
        help_text='Whether a student may still submit after the lab moves to review.')

    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'lab_coding_labs'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['instructor', 'state'])]

    def __str__(self):
        return f'{self.title} ({self.join_code})'

    @property
    def accepts_submissions(self) -> bool:
        if self.state == 'running':
            return True
        return self.state == 'review' and self.allow_late_submissions

    def set_for(self, student) -> 'LabProblemSet | None':
        """Which set this student draws.

        Deterministic in (lab, student) rather than random, so it survives a
        reconnect, gives the same answer on every server, and can be recomputed
        months later when a student disputes which problems they were given.
        Nothing is stored to make that true.
        """
        sets = list(self.problem_sets.order_by('label', 'id'))
        if not sets:
            return None
        digest = hashlib.sha256(f'{self.id}:{student.id}'.encode()).hexdigest()
        return sets[int(digest, 16) % len(sets)]


class LabProblemSet(models.Model):
    """"Set A", "Set B" — so neighbours do not get the same problems."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lab = models.ForeignKey(CodingLab, on_delete=models.CASCADE, related_name='problem_sets')
    label = models.CharField(max_length=40)

    class Meta:
        db_table = 'lab_problem_sets'
        ordering = ['label']
        constraints = [
            models.UniqueConstraint(fields=['lab', 'label'], name='lab_unique_set_label'),
        ]

    def __str__(self):
        return f'{self.lab.title} — {self.label}'


class LabProblem(models.Model):
    """A problem statement. Note what is absent: expected output, test cases."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    problem_set = models.ForeignKey(
        LabProblemSet, on_delete=models.CASCADE, related_name='problems')
    order = models.PositiveIntegerField(default=0)

    title = models.CharField(max_length=200)
    statement = models.TextField(help_text='The problem, in prose. Sanitised on write.')
    starter_code = models.JSONField(
        default=dict, blank=True, help_text='language -> starting source')
    reference_solution = models.JSONField(
        default=dict, blank=True,
        help_text="The instructor's own solution. Never sent to a student.")

    class Meta:
        db_table = 'lab_problems'
        ordering = ['problem_set', 'order']
        indexes = [models.Index(fields=['problem_set', 'order'])]

    def __str__(self):
        return self.title


class LabParticipant(models.Model):
    """A student in a lab, and the set they drew."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lab = models.ForeignKey(CodingLab, on_delete=models.CASCADE, related_name='participants')
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='lab_participations')
    problem_set = models.ForeignKey(
        LabProblemSet, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='participants',
        help_text='Assigned on join. Stored so an instructor override survives.')

    joined_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)

    tab_switch_count = models.IntegerField(default=0)
    copy_paste_attempts = models.IntegerField(default=0)
    is_flagged = models.BooleanField(default=False, db_index=True)

    class Meta:
        db_table = 'lab_participants'
        ordering = ['joined_at']
        constraints = [
            models.UniqueConstraint(fields=['lab', 'student'], name='lab_one_seat_per_student'),
        ]

    def __str__(self):
        return f'{self.student} in {self.lab.title}'


class LabSubmission(models.Model):
    """A student's claim that they are done, and what a human decided about it."""

    STATUSES = [
        ('submitted', 'Awaiting review'),
        ('accepted', 'Accepted'),
        ('returned', 'Returned for another attempt'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    participant = models.ForeignKey(
        LabParticipant, on_delete=models.CASCADE, related_name='submissions')
    problem = models.ForeignKey(
        LabProblem, on_delete=models.CASCADE, related_name='submissions')
    attempt_number = models.PositiveIntegerField(default=1)

    language = models.CharField(max_length=20, choices=LANGUAGES)
    code = models.TextField()

    # What the student's browser displayed, kept only to compare against the
    # server's own run. It is a DOM node they can edit, so it is evidence about
    # the student rather than evidence about the code.
    student_output = models.TextField(blank=True)
    # What the server got re-running the code on submit. This is what the
    # instructor reviews.
    server_output = models.TextField(blank=True)
    server_stderr = models.TextField(blank=True)
    outputs_match = models.BooleanField(default=True)

    status = models.CharField(max_length=20, choices=STATUSES, default='submitted', db_index=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='lab_reviews')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    feedback = models.TextField(blank=True)

    class Meta:
        db_table = 'lab_submissions'
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['problem', 'status']),
            models.Index(fields=['participant', 'problem']),
        ]
        constraints = [
            # A problem can be accepted once. Awarding progress is not
            # idempotent by itself, and a double-clicked Accept button is the
            # ordinary way that goes wrong.
            models.UniqueConstraint(
                fields=['participant', 'problem'],
                condition=Q(status='accepted'),
                name='lab_one_acceptance_per_problem',
            ),
            models.UniqueConstraint(
                fields=['participant', 'problem', 'attempt_number'],
                name='lab_unique_attempt_number',
            ),
        ]

    def __str__(self):
        return f'{self.participant.student} — {self.problem.title} ({self.status})'
