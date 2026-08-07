"""
Remove imported questions the grader scores backwards.

`_check_answer` grades a short_answer question by comparing the submitted text
to `correct_answer` exactly. The quiz slides carry no model answer, so the
import stored an empty string — which marks a blank submission *correct* and a
real answer wrong. Fourteen of these reached production.

The import now refuses to create them. This clears the ones already there.

Questions a student has already answered are left alone and reported: deleting
one would cascade the answer away and silently change a submitted attempt.

    python manage.py prune_ungradeable_questions --dry-run
    python manage.py prune_ungradeable_questions
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.learning.models import Answer, Question


class Command(BaseCommand):
    help = 'Delete imported questions with no answer the grader can use'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help='Report what would be deleted and change nothing.')

    def handle(self, *args, **options):
        candidates = Question.objects.filter(correct_answer='').exclude(
            choices__is_correct=True).select_related('quiz').distinct()

        answered_ids = set(
            Answer.objects.filter(question__in=candidates)
            .values_list('question_id', flat=True))

        removable = [q for q in candidates if q.id not in answered_ids]
        answered = [q for q in candidates if q.id in answered_ids]

        for question in removable:
            self.stdout.write(
                f'  {question.quiz.title[:40]:42} {question.question_text[:60]}')

        if not options['dry_run'] and removable:
            with transaction.atomic():
                Question.objects.filter(id__in=[q.id for q in removable]).delete()

        verb = 'would delete' if options['dry_run'] else 'deleted'
        self.stdout.write(self.style.SUCCESS(f'{verb} {len(removable)} question(s)'))

        if answered:
            self.stdout.write(self.style.WARNING(
                f'{len(answered)} left in place — a student has already answered '
                'them, and deleting would change a submitted attempt:'))
            for question in answered:
                self.stdout.write(f'  - {question.question_text[:70]}')
