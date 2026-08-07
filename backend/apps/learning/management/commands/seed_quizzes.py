"""
Attach declared quizzes to modules that already exist.

For the five paths that were authored before the content system and have real
teaching material but no quizzes. Module content is not touched: the quiz is
matched to its module by title and only the Quiz row is written.

Refuses before writing if a module named in the pack is missing, or if any
question would be unanswerable. A quiz that half-applied would be worse than
none, because the path would look assessable and not be.

    python manage.py seed_quizzes --list
    python manage.py seed_quizzes --all --dry-run
    python manage.py seed_quizzes --all
    python manage.py seed_quizzes <path-slug>

Writes the quiz HTML; the Question rows the student page grades against come
from the import. Follow with:

    python manage.py import_quiz_questions --fill-missing
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.learning.content import quizzes as catalogue
from apps.learning.content.builder import check_questions, render_quiz
from apps.learning.models import CareerPath, LearningModule, Quiz


class Command(BaseCommand):
    help = 'Attach declared quizzes to the modules of an existing path'

    def add_arguments(self, parser):
        parser.add_argument('slug', nargs='?', help='Path slug.')
        parser.add_argument('--all', action='store_true',
                            help='Every path with a declared quiz pack.')
        parser.add_argument('--list', action='store_true',
                            help='List the packs and exit.')
        parser.add_argument('--dry-run', action='store_true',
                            help='Report what would be written and change nothing.')

    def handle(self, *args, **options):
        if options['list']:
            for slug in catalogue.slugs():
                pack = catalogue.get(slug)
                questions = sum(len(q['questions']) for q in pack)
                self.stdout.write(
                    f'  {slug:52} {len(pack)} quizzes  {questions} questions')
            return

        if options['all']:
            targets = catalogue.slugs()
        elif options['slug']:
            if not catalogue.get(options['slug']):
                raise CommandError(
                    f'no quiz pack for "{options["slug"]}". Try --list.')
            targets = [options['slug']]
        else:
            raise CommandError('give a path slug, or --all, or --list')

        plans, problems = [], []
        for slug in targets:
            plan, trouble = self.plan(slug)
            plans.append((slug, plan))
            problems.extend(trouble)

        if problems:
            self.stdout.write(self.style.ERROR('refusing to write:'))
            for problem in problems:
                self.stdout.write(f'  - {problem}')
            raise CommandError(f'{len(problems)} problem(s)')

        written = 0
        for slug, plan in plans:
            self.stdout.write(f'{slug}:')
            for module, spec in plan:
                self.stdout.write(
                    f'  {module.title[:48]:50} {len(spec["questions"])} questions')
                if options['dry_run']:
                    continue
                with transaction.atomic():
                    Quiz.objects.update_or_create(
                        learning_module=module, title=spec['title'],
                        defaults={
                            'description': spec['description'],
                            'content': render_quiz(spec['questions']),
                            'time_limit_minutes': spec.get('time_limit', 15),
                            'passing_score': spec.get('passing_score', 70),
                            'max_attempts': spec.get('max_attempts', 3),
                            'randomize_questions': False,
                        },
                    )
                written += 1

        self.stdout.write('')
        verb = 'would write' if options['dry_run'] else 'wrote'
        total = sum(len(p) for _, p in plans)
        self.stdout.write(self.style.SUCCESS(
            f'{verb} {total if options["dry_run"] else written} quiz(zes)'))
        if written:
            self.stdout.write(
                'now run: python manage.py import_quiz_questions --fill-missing')

    def plan(self, slug):
        """Pair each declared quiz with its module, and collect any problems."""
        path = CareerPath.objects.filter(slug=slug).first()
        if path is None:
            return [], [f'{slug}: no such career path']

        plan, problems = [], []
        for spec in catalogue.get(slug):
            matches = LearningModule.objects.filter(
                career_path=path, title=spec['module'])
            if not matches.exists():
                problems.append(f'{slug}: no module titled "{spec["module"][:46]}"')
                continue
            if matches.count() > 1:
                # Which one gets the quiz would be arbitrary.
                problems.append(
                    f'{slug}: {matches.count()} modules titled "{spec["module"][:40]}"')
                continue
            problems.extend(check_questions(spec['questions'], f'{slug} {spec["title"][:34]}'))
            plan.append((matches.first(), spec))
        return plan, problems
