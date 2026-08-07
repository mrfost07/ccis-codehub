"""
Check that every coding challenge in the database can be solved and cannot be cheated.

Three questions per challenge, each answered by running code rather than by
inspecting fields:

  1. Can it be solved? The stored reference solution must pass every test,
     hidden ones included. A challenge that fails this is unpassable, and the
     students who report it will be right.

  2. Can it be cheated by printing? A program that prints the first visible
     expected output, ignoring input entirely, must not pass.

  3. Can it be cheated by branching on the samples? A program that answers
     correctly for the visible inputs and nonsense otherwise must not pass —
     this is what hidden tests exist for, and the executor's mutation probe
     cannot catch it.

Exits non-zero if anything fails, so it can gate a deploy.

    python manage.py validate_challenges
    python manage.py validate_challenges --slug two-sum
    python manage.py validate_challenges --quick     # skip the cheat probes
"""
from django.core.management.base import BaseCommand

from apps.learning.challenge_validation import check_challenge
from apps.learning.code_executor import CodeExecutor
from apps.learning.models import CodingChallenge


def as_dict(challenge):
    return {
        'title': challenge.title,
        'description': challenge.description,
        'test_cases': challenge.test_cases or [],
        'solution_code': challenge.solution_code or {},
    }


def printing_cheat(challenge):
    """A program that prints the first visible answer and reads nothing."""
    visible = [t for t in (challenge.test_cases or []) if not t.get('is_hidden')]
    if not visible:
        return None
    answer = (visible[0].get('expected_output') or '').strip()
    if not answer:
        return None
    lines = answer.split('\n')
    body = '\n'.join(f'print({line!r})' for line in lines)
    return body


def branching_cheat(challenge):
    """Correct on the visible inputs, wrong everywhere else.

    Reads stdin so the executor's ignores-input tier does not fire, and varies
    its output with the input so the mutation probe clears it. Only hidden tests
    can catch this.
    """
    tests = challenge.test_cases or []
    visible = [t for t in tests if not t.get('is_hidden')]
    if not visible:
        return None
    table = {(t.get('input') or ''): (t.get('expected_output') or '') for t in visible}
    return (
        'import sys\n'
        'data = sys.stdin.read()\n'
        f'table = {table!r}\n'
        'key = data.rstrip("\\n")\n'
        'if key in table:\n'
        '    print(table[key])\n'
        'else:\n'
        '    print(len(data))\n'
    )


class Command(BaseCommand):
    help = 'Verify every coding challenge is solvable and not cheatable'

    def add_arguments(self, parser):
        parser.add_argument('--slug', help='Only this challenge.')
        parser.add_argument('--quick', action='store_true',
                            help='Skip the cheat probes (much faster).')

    def handle(self, *args, **options):
        challenges = CodingChallenge.objects.filter(is_active=True).order_by('slug')
        if options['slug']:
            challenges = challenges.filter(slug=options['slug'])

        executor = CodeExecutor()
        failures = []
        unsolvable = cheatable_print = cheatable_branch = no_reference = 0

        for challenge in challenges:
            data = as_dict(challenge)
            errors, _ = check_challenge(data)
            if errors:
                failures.append((challenge.slug, '; '.join(errors)))
                continue

            solution = (challenge.solution_code or {}).get('python')
            if solution:
                result = executor.run('python', solution, challenge.test_cases)
                if not result.get('all_passed'):
                    unsolvable += 1
                    failures.append((
                        challenge.slug,
                        f'reference solution passes only '
                        f'{result["passed"]}/{result["total"]} ({result["status"]})'))
                    continue
            else:
                no_reference += 1

            if options['quick']:
                continue

            cheat = printing_cheat(challenge)
            if cheat:
                result = executor.run('python', cheat, challenge.test_cases)
                if result.get('all_passed'):
                    cheatable_print += 1
                    failures.append((challenge.slug,
                                     'passes by printing the sample answer'))

            cheat = branching_cheat(challenge)
            if cheat:
                result = executor.run('python', cheat, challenge.test_cases)
                if result.get('all_passed'):
                    cheatable_branch += 1
                    failures.append((challenge.slug,
                                     'passes by branching on the visible inputs'))

        total = challenges.count()
        self.stdout.write('')
        self.stdout.write(f'  checked                        {total}')
        self.stdout.write(f'  unsolvable (reference fails)   {unsolvable}')
        if not options['quick']:
            self.stdout.write(f'  passable by printing           {cheatable_print}')
            self.stdout.write(f'  passable by branching          {cheatable_branch}')
        self.stdout.write(f'  without a reference solution   {no_reference}')
        self.stdout.write('')

        if failures:
            self.stdout.write(self.style.ERROR(f'{len(failures)} problem(s):'))
            for slug, why in failures:
                self.stdout.write(f'  - {slug}: {why}')
            raise SystemExit(1)

        self.stdout.write(self.style.SUCCESS('every challenge is solvable and guarded'))
