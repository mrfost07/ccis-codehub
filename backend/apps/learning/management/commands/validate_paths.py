"""
Check that every active career path is actually completable.

These are the checks that were run by hand against production while fixing the
quiz and certificate bugs, promoted into something that runs on demand and in
CI. Each one corresponds to a failure that reached students:

  no questions          the Question table was empty for every quiz, so a quiz
                        rendered and could not be scored
  ungradeable           short_answer graded by exact string equality against an
                        empty correct_answer: blank scored full marks, a real
                        answer scored zero
  answer not a choice   correct_answer holding choice text rather than the
                        choice id marks every answer wrong
  slides disagree       the learning admin renders the slide HTML and the
                        student page reads Question rows; when they diverge the
                        instructor and the student see different quizzes
  certificate           a path whose certificate renders without the SNSU and
                        CCIS seals or the signature

Exits non-zero if anything fails, so it can gate a deploy.

    python manage.py validate_paths
    python manage.py validate_paths --path <slug>
    python manage.py validate_paths --skip-certificates    # much faster
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.learning.models import CareerPath, Question, Quiz


class Command(BaseCommand):
    help = 'Check that every active career path can be completed and scored'

    def add_arguments(self, parser):
        parser.add_argument('--path', help='Only this path slug.')
        parser.add_argument('--skip-certificates', action='store_true',
                            help='Skip certificate rendering, which is slow.')

    def handle(self, *args, **options):
        paths = CareerPath.objects.filter(is_active=True).order_by('name')
        if options['path']:
            paths = paths.filter(slug=options['path'])

        failures = []
        for path in paths:
            problems = self.inspect(path, options['skip_certificates'])
            modules = path.modules.count()
            questions = Question.objects.filter(
                quiz__learning_module__career_path=path).count()
            mark = self.style.ERROR('FAIL') if problems else self.style.SUCCESS(' ok ')
            self.stdout.write(
                f'  {mark}  {path.name[:44]:46} modules={modules:>2} '
                f'questions={questions:>3}')
            for problem in problems:
                self.stdout.write(f'          - {problem}')
            failures.extend((path.name, p) for p in problems)

        self.stdout.write('')
        if failures:
            self.stdout.write(self.style.ERROR(
                f'{len(failures)} problem(s) across {len(set(f[0] for f in failures))} path(s)'))
            raise SystemExit(1)
        self.stdout.write(self.style.SUCCESS(
            f'all {paths.count()} active path(s) pass'))

    def inspect(self, path, skip_certificates):
        from apps.learning.views import QuizViewSet
        from apps.learning.management.commands.import_quiz_questions import (
            parse_slides,
        )

        problems = []
        check = QuizViewSet()._check_answer
        quizzes = Quiz.objects.filter(
            learning_module__career_path=path).prefetch_related('questions__choices')

        if not path.modules.exists():
            problems.append('no modules')
        if not quizzes.exists():
            problems.append('no quizzes')

        for quiz in quizzes:
            questions = list(quiz.questions.all())
            if not questions:
                problems.append(f'"{quiz.title[:34]}": no questions')
                continue

            for question in questions:
                where = f'"{quiz.title[:26]}" {question.question_text[:34]}'
                choices = list(question.choices.all())

                if question.question_type in ('short_answer', 'coding'):
                    # Graded by exact string equality, which cannot score prose.
                    problems.append(f'{where}: written answer, cannot be scored')
                    continue

                if question.question_type == 'true_false':
                    right = str(question.correct_answer).lower()
                    if right not in ('true', 'false'):
                        problems.append(f'{where}: answer {right!r} is not true/false')
                        continue
                    wrong = 'false' if right == 'true' else 'true'
                else:
                    if not choices:
                        problems.append(f'{where}: no choices')
                        continue
                    if not any(str(c.id) == str(question.correct_answer) for c in choices):
                        problems.append(f'{where}: answer is not one of its choices')
                        continue
                    right = str(question.correct_answer)
                    other = next(c for c in choices if str(c.id) != right)
                    wrong = str(other.id)

                # The check that matters: it must accept the right answer and
                # refuse a wrong one. Either half alone passes trivially.
                if not check(question, right) or check(question, wrong):
                    problems.append(f'{where}: does not grade right-vs-wrong')

            # The admin renders slides; the student answers rows.
            slides = sorted(s['text'] for s in parse_slides(quiz.content) if s['choices'])
            rows = sorted(q.question_text for q in questions)
            if slides and slides != rows:
                problems.append(
                    f'"{quiz.title[:34]}": {len(slides)} question(s) in the slides, '
                    f'{len(rows)} in the database')

        if not skip_certificates:
            problems.extend(self.certificate_problems(path))
        return problems

    def certificate_problems(self, path):
        """The certificate must carry the institutional marks, or it is a
        different document from the one the college signs off."""
        from apps.accounts.models import User
        from apps.learning.models import Certificate
        from apps.learning.utils import certificate_generator as gen

        user = User.objects.first()
        if user is None:
            return []

        def ink(image, cx, cy, box):
            half = box / 2
            crop = image.crop((int(cx - half), int(cy - half),
                               int(cx + half), int(cy + half))).convert('RGB')
            pixels = list(crop.getdata())
            marked = sum(1 for p in pixels
                         if max(abs(p[i] - gen.CREAM[i]) for i in range(3)) > 25)
            return marked / max(len(pixels), 1)

        certificate = Certificate(
            user=user, career_path=path, certificate_id='CCIS-VALIDATE',
            issued_at=timezone.now())
        try:
            image = gen.render_certificate(certificate, path)
        except Exception as e:
            return [f'certificate render failed: {type(e).__name__}: {e}']

        marks = {
            'SNSU seal': ink(image, 300, 250, 230),
            'CCIS seal': ink(image, gen.WIDTH - 300, 250, 230),
            'signature': ink(image, gen.WIDTH - 560, 1076, 170),
            'CodeHub mark': ink(image, gen.WIDTH / 2, 1120, 86),
        }
        return [f'certificate is missing the {name}'
                for name, coverage in marks.items() if coverage <= 0.02]
