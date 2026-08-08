"""
Serializers for the lab.

Two things are load-bearing here.

The instructor's `reference_solution` must never reach a student. This codebase
has already shipped that exact bug once: quiz questions were serialised with
`fields = '__all__'`, which put `correct_answer` in a response any signed-in
user could read. So problems have two serializers and the student one does not
mention the field at all — an allowlist, not a blocklist, because a blocklist
silently readmits every field somebody adds later.

Problem statements are instructor-authored HTML rendered in a student's
browser. They are sanitised on write against a small allowlist, since an
instructor account is not a licence to run script in a student's session.
"""
import re

from rest_framework import serializers

from .models import (
    CodingLab, LabParticipant, LabProblem, LabProblemSet, LabSubmission,
)

# Enough to write a problem: emphasis, lists, code, paragraphs, tables.
ALLOWED_TAGS = {
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'code', 'pre', 'ul', 'ol', 'li',
    'h2', 'h3', 'h4', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'hr', 'span',
}

_TAG = re.compile(r'</?([a-zA-Z0-9]+)([^>]*)>')
_EVENT_ATTR = re.compile(r'\son\w+\s*=\s*(".*?"|\'.*?\'|[^\s>]+)', re.IGNORECASE | re.DOTALL)
_JS_URL = re.compile(r'(href|src)\s*=\s*(["\']?)\s*javascript:', re.IGNORECASE)


def sanitize_statement(html: str) -> str:
    """Strip anything that could execute, keeping ordinary formatting.

    Written by hand because the project has no sanitiser dependency. It is an
    allowlist over tag names plus removal of event handlers and javascript:
    URLs — deliberately blunt. If richer authoring is ever needed, add `nh3`
    rather than widening this.
    """
    if not html:
        return ''

    html = _EVENT_ATTR.sub('', html)
    html = _JS_URL.sub(r'\1=\2', html)

    def keep(match):
        tag = match.group(1).lower()
        return match.group(0) if tag in ALLOWED_TAGS else ''

    # Drop the contents of script/style outright, not just their tags.
    html = re.sub(r'<(script|style)\b.*?</\1>', '', html,
                  flags=re.IGNORECASE | re.DOTALL)
    return _TAG.sub(keep, html)


class LabProblemStudentSerializer(serializers.ModelSerializer):
    """What a student may see. reference_solution is absent by construction."""

    class Meta:
        model = LabProblem
        fields = ['id', 'order', 'title', 'statement', 'starter_code']


class LabProblemSerializer(serializers.ModelSerializer):
    """The authoring shape, for the instructor who owns the lab."""

    class Meta:
        model = LabProblem
        fields = ['id', 'problem_set', 'order', 'title', 'statement',
                  'starter_code', 'reference_solution']

    def validate_statement(self, value):
        return sanitize_statement(value)


class LabProblemSetSerializer(serializers.ModelSerializer):
    problems = LabProblemSerializer(many=True, read_only=True)
    problem_count = serializers.IntegerField(source='problems.count', read_only=True)

    class Meta:
        model = LabProblemSet
        fields = ['id', 'lab', 'label', 'problems', 'problem_count']


class CodingLabSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(source='instructor.username', read_only=True)
    participant_count = serializers.IntegerField(source='participants.count', read_only=True)
    set_count = serializers.IntegerField(source='problem_sets.count', read_only=True)

    class Meta:
        model = CodingLab
        fields = ['id', 'title', 'instructions', 'join_code', 'state', 'languages',
                  'allow_late_submissions', 'created_at', 'started_at', 'closed_at',
                  'instructor', 'instructor_name', 'participant_count', 'set_count']
        read_only_fields = ['id', 'join_code', 'instructor', 'created_at',
                            'started_at', 'closed_at']

    def validate_instructions(self, value):
        return sanitize_statement(value)

    def validate_languages(self, value):
        from .models import LANGUAGES
        supported = {key for key, _ in LANGUAGES}
        unknown = [lang for lang in value if lang not in supported]
        if unknown:
            raise serializers.ValidationError(
                f'unsupported: {", ".join(unknown)}. Choose from {", ".join(sorted(supported))}.')
        return value


class LabParticipantSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)
    set_label = serializers.CharField(source='problem_set.label', read_only=True, default=None)

    class Meta:
        model = LabParticipant
        fields = ['id', 'lab', 'student', 'student_name', 'problem_set', 'set_label',
                  'joined_at', 'last_seen_at', 'tab_switch_count',
                  'copy_paste_attempts', 'is_flagged']
        read_only_fields = fields


class LabSubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source='participant.student.username', read_only=True)
    problem_title = serializers.CharField(source='problem.title', read_only=True)

    class Meta:
        model = LabSubmission
        fields = ['id', 'participant', 'student_name', 'problem', 'problem_title',
                  'attempt_number', 'language', 'code',
                  'student_output', 'server_output', 'server_stderr', 'outputs_match',
                  'status', 'submitted_at', 'reviewer', 'reviewed_at', 'feedback']
        read_only_fields = ['id', 'attempt_number', 'server_output', 'server_stderr',
                            'outputs_match', 'status', 'submitted_at', 'reviewer',
                            'reviewed_at']
