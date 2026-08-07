"""
Remove placeholder quizzes that were never written.

Ten quizzes across four paths have empty `content`, no questions and no
attempts - rows created when a module was set up and never filled in. A student
enrolled on those paths sees a quiz in the module, opens it, and gets nothing.
A module with no quiz is honest; a module with an empty quiz is a broken
promise.

Only ever removes a quiz that is empty on all three counts. One with attempts
against it is somebody's record and stays, whatever state it is in.

    python manage.py prune_empty_quizzes --dry-run
    python manage.py prune_empty_quizzes
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.learning.models import Quiz, QuizAttempt


class Command(BaseCommand):
    help = 'Delete quizzes with no content, no questions and no attempts'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help='Report what would be deleted and change nothing.')

    def handle(self, *args, **options):
        blank = Quiz.objects.filter(content='').select_related(
            'learning_module__career_path')

        attempted = set(
            QuizAttempt.objects.filter(quiz__in=blank).values_list('quiz_id', flat=True))

        removable, kept = [], []
        for quiz in blank:
            if quiz.id in attempted or quiz.questions.exists():
                kept.append(quiz)
            else:
                removable.append(quiz)

        for quiz in removable:
            path = quiz.learning_module.career_path
            self.stdout.write(f'  {path.name[:38]:40} {quiz.title[:34]}')

        if not options['dry_run'] and removable:
            with transaction.atomic():
                Quiz.objects.filter(id__in=[q.id for q in removable]).delete()

        verb = 'would delete' if options['dry_run'] else 'deleted'
        self.stdout.write(self.style.SUCCESS(f'{verb} {len(removable)} empty quiz(zes)'))

        if kept:
            self.stdout.write(self.style.WARNING(
                f'{len(kept)} left in place — they have attempts or questions:'))
            for quiz in kept:
                self.stdout.write(f'  - {quiz.title[:60]}')
