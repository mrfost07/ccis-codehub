"""
Seed coding challenges, with expected outputs produced by running the solution.

The important design decision is what an author writes down. A challenge
declares its inputs and a reference solution — **not** its expected outputs.
Those are produced by executing the reference against each input through the
real CodeExecutor, the same one that grades students.

That removes a whole class of broken challenge. An instructor computing thirty
expected outputs by hand gets one wrong eventually, and the result is an
exercise nobody can pass and everybody reports as broken. Here it cannot happen:
the expected output is by construction what a correct program prints.

Each challenge is then checked before it is written:

  - the reference must not be a lookup table (an author can defeat their own
    challenge as easily as a student can)
  - it must actually pass every generated case
  - `check_challenge` must report no errors, and its warnings are shown

Hidden inputs are the anti-cheat. A student sees two or three worked examples;
grading runs several more they never see, so branching on the visible inputs —
which the executor's mutation probe cannot catch, because such output *does*
vary with input — computes nothing on the rest.

    python manage.py seed_challenges                 # dry run, verifies only
    python manage.py seed_challenges --commit
    python manage.py seed_challenges --only two-sum-pair --commit
"""
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.learning.challenge_validation import (
    check_challenge, looks_like_a_lookup_table, verify_reference_solution,
)
from apps.learning.content import challenges as catalogue
from apps.learning.code_executor import CodeExecutor
from apps.learning.models import CodingChallenge


def build(spec, executor):
    """A challenge dict with expected outputs computed by running the solution.

    Returns (challenge, problem). `problem` is None when it is sound.
    """
    solution = spec['solution']
    cases = [(text, False) for text in spec['visible']] + \
            [(text, True) for text in spec['hidden']]

    tests = []
    for stdin_text, is_hidden in cases:
        # Run one case at a time with a placeholder expectation; what we want is
        # the stdout, not a pass/fail.
        result = executor.run('python', solution,
                              [{'input': stdin_text, 'expected_output': '\x00'}])
        first = (result.get('results') or [{}])[0]
        produced = (first.get('stdout') or '').strip()
        if first.get('error') and not produced:
            return None, (f'reference solution failed on input {stdin_text!r}: '
                          f'{first.get("stderr") or first.get("error")}')
        if not produced:
            return None, f'reference solution printed nothing for input {stdin_text!r}'
        tests.append({'input': stdin_text, 'expected_output': produced,
                      'is_hidden': is_hidden})

    challenge = {
        'title': spec['title'],
        'slug': spec.get('slug') or slugify(spec['title']),
        'description': spec['description'],
        'difficulty': spec['difficulty'],
        'category': spec.get('category', 'algorithms'),
        'tags': spec.get('tags', []),
        'constraints': spec.get('constraints', ''),
        'hints': spec.get('hints', []),
        'points': spec.get('points', {'easy': 10, 'medium': 20, 'hard': 35}[spec['difficulty']]),
        'time_limit_seconds': spec.get('time_limit_seconds', 900),
        'supported_languages': ['python'],
        'starter_code': {'python': spec['starter']},
        'solution_code': {'python': solution},
        'test_cases': tests,
    }

    if looks_like_a_lookup_table(challenge):
        return None, 'reference solution looks like a lookup table'

    errors, _ = check_challenge(challenge)
    if errors:
        return None, '; '.join(errors)

    ok, detail = verify_reference_solution(challenge, executor=executor)
    if not ok:
        # Should not happen — the outputs came from this solution — but a
        # challenge that cannot pass its own tests must never reach a student.
        return None, f'reference solution does not pass its own tests: {detail}'

    return challenge, None


class Command(BaseCommand):
    help = 'Seed coding challenges, computing expected outputs by execution'

    def add_arguments(self, parser):
        parser.add_argument('--commit', action='store_true',
                            help='Write to the database. Without it, verify only.')
        parser.add_argument('--only', help='Only this slug.')

    def handle(self, *args, **options):
        specs = catalogue.ALL
        if options['only']:
            specs = [s for s in specs
                     if (s.get('slug') or slugify(s['title'])) == options['only']]
            if not specs:
                self.stdout.write(self.style.ERROR('no such challenge'))
                return

        executor = CodeExecutor()
        built, refused, created, updated = 0, [], 0, 0
        warned = []

        for spec in specs:
            challenge, problem = build(spec, executor)
            slug = spec.get('slug') or slugify(spec['title'])
            if problem:
                refused.append((slug, problem))
                self.stdout.write(self.style.ERROR(f'  refused {slug}: {problem}'))
                continue

            built += 1
            _, warnings = check_challenge(challenge)
            if warnings:
                warned.append((slug, warnings))

            visible = sum(1 for t in challenge['test_cases'] if not t['is_hidden'])
            hidden = len(challenge['test_cases']) - visible
            self.stdout.write(
                f'  {slug[:42]:44} {challenge["difficulty"]:6} '
                f'{visible} shown + {hidden} hidden')

            if options['commit']:
                _, was_created = CodingChallenge.objects.update_or_create(
                    slug=challenge['slug'],
                    defaults={k: v for k, v in challenge.items() if k != 'slug'})
                created += was_created
                updated += not was_created

        self.stdout.write('')
        if options['commit']:
            self.stdout.write(self.style.SUCCESS(
                f'{created} created, {updated} updated, {len(refused)} refused'))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'{built} verified, {len(refused)} refused (dry run — nothing written)'))

        if warned:
            self.stdout.write(self.style.WARNING(f'{len(warned)} with warnings:'))
            for slug, warnings in warned:
                for warning in warnings:
                    self.stdout.write(f'  - {slug}: {warning}')
