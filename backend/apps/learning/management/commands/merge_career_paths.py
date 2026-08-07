"""
Fold one career path into another.

Two paths were seeded under the name "Comprehensive Data Structures for College
Students" - one bscs, one bsit, both active, both with students enrolled. A
student searching the catalogue sees the same course twice and cannot tell which
one to take.

Merging moves the losing path's student records onto the winner and deactivates
it. It does NOT move modules: the two paths have different module sets, and
appending one to the other would produce a path with duplicate lessons in an
arbitrary order. Anyone part-way through the losing path keeps their enrolment
and their completion percentage, and continues on the winner's modules.

The losing path is deactivated rather than deleted. Its modules, quizzes and
questions stay reachable to an admin, and the merge can be undone by hand if the
wrong one was picked.

    python manage.py merge_career_paths --from <slug> --into <slug> --dry-run
    python manage.py merge_career_paths --from <slug> --into <slug>
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.learning.models import (
    CareerPath, CareerRole, Certificate, Enrollment, UserProgress,
)


class Command(BaseCommand):
    help = 'Move one career path\'s student records onto another and retire it'

    def add_arguments(self, parser):
        parser.add_argument('--from', dest='source', required=True,
                            help='Slug of the path to retire.')
        parser.add_argument('--into', dest='target', required=True,
                            help='Slug of the path to keep.')
        parser.add_argument('--dry-run', action='store_true',
                            help='Report what would move and change nothing.')

    def handle(self, *args, **options):
        if options['source'] == options['target']:
            raise CommandError('--from and --into are the same path')
        try:
            source = CareerPath.objects.get(slug=options['source'])
            target = CareerPath.objects.get(slug=options['target'])
        except CareerPath.DoesNotExist as e:
            raise CommandError(f'no such career path: {e}')

        # A student on both paths would violate the one-enrolment-per-path
        # uniqueness on the way in, so those stay where they are and are
        # reported. Same for progress rows and certificates.
        def movable(model):
            existing = set(model.objects.filter(career_path=target)
                           .values_list('user_id', flat=True))
            rows = list(model.objects.filter(career_path=source))
            return ([r for r in rows if r.user_id not in existing],
                    [r for r in rows if r.user_id in existing])

        moves, clashes = {}, {}
        for model in (Enrollment, UserProgress, Certificate):
            moves[model], clashes[model] = movable(model)

        self.stdout.write(f'from  {source.name[:44]} ({source.slug})')
        self.stdout.write(f'into  {target.name[:44]} ({target.slug})')
        self.stdout.write('')
        for model in (Enrollment, UserProgress, Certificate):
            label = model.__name__
            self.stdout.write(
                f'  {label:14} move {len(moves[model]):>3}   '
                f'already on target {len(clashes[model]):>3}')

        roles = CareerRole.objects.filter(career_path=source)
        if roles.exists():
            self.stdout.write(f'  {"CareerRole":14} repoint {roles.count()}')

        if options['dry_run']:
            self.stdout.write('')
            self.stdout.write(self.style.SUCCESS('dry run — nothing changed'))
            return

        with transaction.atomic():
            for model in (Enrollment, UserProgress, Certificate):
                for row in moves[model]:
                    row.career_path = target
                    row.save(update_fields=['career_path'])
            roles.update(career_path=target)
            source.is_active = False
            source.save(update_fields=['is_active'])

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'merged; {source.slug} is now inactive'))
        if any(clashes.values()):
            self.stdout.write(self.style.WARNING(
                'some rows stayed on the retired path — those students were '
                'already on the target and merging would have collided:'))
            for model, rows in clashes.items():
                for row in rows:
                    self.stdout.write(f'  - {model.__name__} for {row.user.username}')
