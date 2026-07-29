"""
Add hidden test cases to the seeded coding challenges.

Every challenge shipped with only visible test cases, which makes a whole class
of cheating work: a student can read the inputs and branch on them —

    a = int(input()); b = int(input())
    if a == 5: print(8)
    else: print(11)

That passes every visible test while computing nothing. The executor's
hardcode detector cannot catch it, because the output *does* change with the
input, which is exactly the signal it uses to clear a submission.

Hidden tests fix it structurally rather than heuristically: the student cannot
branch on inputs they never see.

Expected outputs below were not hand-written — they were produced by running a
reference solution through the real CodeExecutor, then cross-checked by hand.

    python manage.py add_hidden_test_cases            # dry run
    python manage.py add_hidden_test_cases --commit
"""
from django.core.management.base import BaseCommand

from apps.learning.models import CodingChallenge

# slug -> [(input, expected_output), ...]
HIDDEN_CASES = {
    'two-sum': [
        ('[3,2,4], 6', '[1, 2]'),
        ('[3,3], 6', '[0, 1]'),
        ('[-1,-2,-3,-4,-5], -8', '[2, 4]'),
        ('[0,4,3,0], 0', '[0, 3]'),
        ('[1,5,9,14], 23', '[2, 3]'),
    ],
    'subarray-sum-equals-k': [
        ('[1], 0', '0'),
        ('[1,-1,0], 0', '3'),
        ('[3,4,7,2,-3,1,4,2], 7', '4'),
        ('[1,2,1,2,1], 3', '4'),
        ('[-1,-1,1], 0', '1'),
    ],
    'contains-duplicate': [
        ('[1]', 'false'),
        ('[2,2]', 'true'),
        ('[1,2,3,4,5,6,7,8,9,10]', 'false'),
        ('[5,5,5,5]', 'true'),
        ('[10,-10,10]', 'true'),
    ],
}


class Command(BaseCommand):
    help = 'Add hidden test cases to seeded coding challenges (idempotent).'

    def add_arguments(self, parser):
        parser.add_argument('--commit', action='store_true',
                            help='Apply the change (otherwise reports only).')

    def handle(self, *args, **options):
        changed = 0

        for slug, cases in HIDDEN_CASES.items():
            challenge = CodingChallenge.objects.filter(slug=slug).first()
            if not challenge:
                self.stdout.write(self.style.WARNING(f'skip {slug} — not found'))
                continue

            existing = list(challenge.test_cases or [])
            existing_inputs = {(tc.get('input') or '').strip() for tc in existing}

            # Idempotent: adding the same case twice would double-count tests
            # and change every student's score denominator.
            new = [
                {'input': i, 'expected_output': o, 'is_hidden': True}
                for i, o in cases
                if i.strip() not in existing_inputs
            ]

            visible = sum(1 for tc in existing if not tc.get('is_hidden'))
            hidden = sum(1 for tc in existing if tc.get('is_hidden'))
            self.stdout.write(
                f'{challenge.title:<26} visible={visible} hidden={hidden} '
                f'-> adding {len(new)}'
            )

            if new and options['commit']:
                challenge.test_cases = existing + new
                challenge.save(update_fields=['test_cases'])
                changed += 1

        if not options['commit']:
            self.stdout.write(self.style.WARNING(
                '\nDry run — nothing changed. Re-run with --commit to apply.'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(f'\nUpdated {changed} challenge(s).'))
            self.stdout.write(
                'Existing submissions keep their stored scores; only new runs '
                'are graded against the added tests.'
            )
