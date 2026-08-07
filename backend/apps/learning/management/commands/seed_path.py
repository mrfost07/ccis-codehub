"""
Seed a declared career path.

Replaces one management command per path. Content lives in
`apps/learning/content/paths/`, registered by slug; this command renders it and
writes the rows.

`--check` renders the manifest and compares it to what is in the database
without writing, which is how you tell whether the content files and production
have drifted apart.

    python manage.py seed_path --list
    python manage.py seed_path data-science-and-machine-learning --check
    python manage.py seed_path data-science-and-machine-learning
    python manage.py seed_path --all

Seeding renders the quiz HTML; it does not create the Question rows the student
page grades against. Follow with:

    python manage.py import_quiz_questions --fill-missing
"""
from django.core.management.base import BaseCommand, CommandError

from apps.learning.content import paths as catalogue
from apps.learning.content.builder import (
    ManifestError, check_manifest, render_path, resolve_modules, seed_path,
)


def _counts(manifest):
    """(modules, questions) for a manifest whose modules may be library keys."""
    modules = resolve_modules(manifest)
    return len(modules), sum(len(m['quiz']['questions']) for m in modules)


class Command(BaseCommand):
    help = 'Seed a career path from its declared content'

    def add_arguments(self, parser):
        parser.add_argument('slug', nargs='?', help='Path slug to seed.')
        parser.add_argument('--all', action='store_true',
                            help='Seed every registered path.')
        parser.add_argument('--list', action='store_true',
                            help='List registered paths and exit.')
        parser.add_argument('--check', action='store_true',
                            help='Compare the rendered content to the database '
                                 'and report differences without writing.')
        parser.add_argument('--instructor', default='rfostanes@ssct.edu.ph',
                            help='Email of the instructor who owns the paths.')
        parser.add_argument('--status', default='approved',
                            choices=['draft', 'pending', 'approved'],
                            help='approval_status for the paths.')

    def handle(self, *args, **options):
        if options['list']:
            for slug in catalogue.slugs():
                modules, questions = _counts(catalogue.get(slug))
                self.stdout.write(
                    f'  {slug:44} {modules} modules  {questions} questions')
            return

        if options['all']:
            targets = catalogue.slugs()
        elif options['slug']:
            if not catalogue.get(options['slug']):
                raise CommandError(
                    f'no registered path "{options["slug"]}". '
                    f'Try --list.')
            targets = [options['slug']]
        else:
            raise CommandError('give a slug, or --all, or --list')

        if options['check']:
            self.report_drift(targets)
            return

        from apps.accounts.models import User
        email = options['instructor']
        try:
            instructor = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise CommandError(
                f'No user with email {email}. Create the instructor account '
                f'first, or pass --instructor with an existing address.')
        if instructor.role not in ('instructor', 'admin'):
            self.stdout.write(self.style.WARNING(
                f'  {email} has role "{instructor.role}", not instructor/admin '
                f'— attaching anyway, but check this is the right account.'))

        seeded = 0
        for slug in targets:
            manifest = catalogue.get(slug)
            try:
                path, created = seed_path(manifest, instructor, options['status'])
            except ManifestError as e:
                self.stdout.write(self.style.ERROR(f'{slug}: refused — {e}'))
                continue
            modules, questions = _counts(manifest)
            self.stdout.write(
                f'  {"+" if created else "~"} {path.name[:46]:48} '
                f'{modules} modules, {questions} questions')
            seeded += 1

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'seeded {seeded} path(s)'))
        if seeded:
            self.stdout.write(
                'now run: python manage.py import_quiz_questions --fill-missing')

    def report_drift(self, targets):
        """Render each manifest and say where the database differs.

        Not named `check`: that is BaseCommand's system-check hook, and
        shadowing it breaks the command on the command line while leaving
        call_command working, because call_command skips system checks.
        """
        from apps.learning.models import CareerPath

        drifted = 0
        for slug in targets:
            manifest = catalogue.get(slug)
            problems = check_manifest(manifest)
            if problems:
                self.stdout.write(self.style.ERROR(f'{slug}: unsound manifest'))
                for problem in problems:
                    self.stdout.write(f'    - {problem}')
                drifted += 1
                continue

            path = CareerPath.objects.filter(slug=slug).first()
            if path is None:
                self.stdout.write(f'{slug}: not in the database')
                drifted += 1
                continue

            rendered = render_path(manifest)
            stored = list(path.modules.order_by('order'))
            differences = []
            if len(stored) != len(rendered):
                differences.append(
                    f'{len(stored)} modules stored, {len(rendered)} declared')
            for expected, module in zip(rendered, stored):
                if module.content != expected['content']:
                    differences.append(f'module "{module.title[:34]}": slides differ')
                quiz = module.quizzes.filter(title=expected['quiz_title']).first()
                if quiz is None:
                    differences.append(f'module "{module.title[:34]}": quiz missing')
                elif quiz.content != expected['quiz_content']:
                    differences.append(f'module "{module.title[:34]}": quiz differs')

            if differences:
                drifted += 1
                self.stdout.write(self.style.WARNING(f'{slug}:'))
                for difference in differences:
                    self.stdout.write(f'    - {difference}')
            else:
                self.stdout.write(self.style.SUCCESS(
                    f'{slug}: matches the database exactly'))

        self.stdout.write('')
        self.stdout.write(f'{drifted} of {len(targets)} path(s) differ')
