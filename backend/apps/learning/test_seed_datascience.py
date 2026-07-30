"""
Verify the seeded course content against the parsers that actually consume it.

Quiz questions are not stored relationally anywhere in this project - they live
as HTML inside Quiz.content, and the frontend regexes ARE the schema. So content
can be silently unusable: a wrong attribute order, an inline <code> tag in a
choice label, or the words TRUE and FALSE appearing in a multiple-choice
question are each enough to make a quiz grade incorrectly while looking fine.

These tests port the regexes from frontend/src/components/QuizViewer.tsx
verbatim and assert that every seeded question round-trips: right type, right
number of choices, full choice text, and exactly one correct answer in the
position the seed data declares.

If QuizViewer's parsing changes, these fail - which is the point. Keep them in
step with it.
"""
import re

from django.test import TestCase

from apps.learning.management.commands.seed_datascience_path import (
    MODULES,
    PATH,
    render_quiz,
    render_slides,
)

# --- ported verbatim from QuizViewer.parseQuestions ------------------------
SLIDE_RE = re.compile(
    r'<div class="module-slide" data-slide="(\d+)">(.*?)(?=<div class="module-slide"|$)',
    re.S,
)
CHOICE_RE = re.compile(
    r'data-choice-id="([^"]*)"[^>]*data-correct="([^"]*)"[^>]*>.*?([A-Z])\.\s*([^<]+)',
    re.S,
)
TITLE_RE = re.compile(r'Question \d+:\s*([^<]+)')
POINTS_RE = re.compile(r'(\d+)\s*points?', re.I)


def sniff_type(slide_content):
    """QuizViewer decides the question type by looking for these strings."""
    if 'TRUE' in slide_content and 'FALSE' in slide_content:
        return 'true_false'
    if 'SHORT ANSWER' in slide_content:
        return 'short_answer'
    if 'ESSAY' in slide_content:
        return 'essay'
    if 'ENUMERATION' in slide_content:
        return 'enumeration'
    return 'multiple_choice'


class SeededQuizzesParseCorrectly(TestCase):
    def test_every_question_is_parsed_and_graded_as_declared(self):
        for module in MODULES:
            quiz = module['quiz']
            html = render_quiz(quiz['questions'])
            slides = SLIDE_RE.findall(html)

            self.assertEqual(
                len(slides), len(quiz['questions']),
                f'{quiz["title"]}: parser found {len(slides)} questions, '
                f'expected {len(quiz["questions"])}',
            )

            for index, (declared, (_number, slide)) in enumerate(
                zip(quiz['questions'], slides), start=1
            ):
                where = f'{quiz["title"]} Q{index}'

                title = TITLE_RE.search(slide)
                self.assertIsNotNone(title, f'{where}: title not parseable')
                self.assertEqual(title.group(1).strip(), declared['title'], where)

                expected_type = 'true_false' if declared.get('true_false') else 'multiple_choice'
                self.assertEqual(
                    sniff_type(slide), expected_type,
                    f'{where}: parsed as {sniff_type(slide)}, declared {expected_type}. '
                    f'A multiple-choice question containing the words TRUE and FALSE '
                    f'in capitals is misread as true/false.',
                )

                points = POINTS_RE.search(slide)
                self.assertIsNotNone(points, f'{where}: points not parseable')
                self.assertEqual(int(points.group(1)), declared.get('points', 1), where)

                choices = CHOICE_RE.findall(slide)
                expected_choices = (
                    ['True', 'False'] if declared.get('true_false') else declared['choices']
                )
                self.assertEqual(
                    len(choices), len(expected_choices),
                    f'{where}: parser extracted {len(choices)} choices, '
                    f'expected {len(expected_choices)}. Check that data-choice-id '
                    f'precedes data-correct on the same tag.',
                )

                correct_positions = [
                    position for position, (_id, flag, _letter, _text)
                    in enumerate(choices) if flag == 'true'
                ]
                self.assertEqual(
                    correct_positions, [declared['correct']],
                    f'{where}: marked correct at {correct_positions}, '
                    f'declared {declared["correct"]}',
                )

                for position, (_id, _flag, letter, text) in enumerate(choices):
                    self.assertEqual(
                        letter, 'ABCDEFGH'[position],
                        f'{where}: choice {position} labelled {letter}',
                    )
                    self.assertEqual(
                        text.strip(), expected_choices[position],
                        f'{where}: choice {position} text truncated to {text.strip()!r}. '
                        f'The final capture is [^<]+, so an inline tag in a label '
                        f'cuts the text short.',
                    )

    def test_no_question_nests_a_slide_div(self):
        # The slide regex reads up to the NEXT module-slide div, so a nested one
        # would silently truncate the question it sits inside.
        for module in MODULES:
            html = render_quiz(module['quiz']['questions'])
            for _number, slide in SLIDE_RE.findall(html):
                self.assertNotIn('module-slide', slide, module['quiz']['title'])


class SeededQuizzesAreNotGuessable(TestCase):
    """
    A quiz can parse perfectly and still be worthless.

    The first draft of this seed had 92% of its answers at option A and the
    correct option was longer than the average option in 19 of 20 questions -
    so a student could score in the nineties by always picking the longest
    first choice, without reading anything. Both are easy to reintroduce when
    adding a question, and neither shows up in any other test.
    """

    def multiple_choice(self):
        for module in MODULES:
            for question in module['quiz']['questions']:
                if not question.get('true_false'):
                    yield module['quiz']['title'], question

    def test_answer_key_is_spread_across_the_options(self):
        from collections import Counter

        positions = Counter(q['correct'] for _title, q in self.multiple_choice())
        total = sum(positions.values())

        self.assertEqual(
            sorted(positions), [0, 1, 2, 3],
            f'answers only ever appear at positions {sorted(positions)} - '
            f'every option should be correct sometimes',
        )
        worst = max(positions.values()) / total
        self.assertLess(
            worst, 0.40,
            f'{worst:.0%} of answers sit at one position. Always guessing that '
            f'letter would score {worst:.0%} without reading the questions.',
        )

    def test_true_false_answers_are_not_all_the_same(self):
        answers = {
            q['correct']
            for module in MODULES
            for q in module['quiz']['questions']
            if q.get('true_false')
        }
        self.assertEqual(
            answers, {0, 1},
            'every true/false answer is the same value, so the statement never '
            'has to be read',
        )

    def test_the_correct_option_is_not_systematically_the_longest(self):
        tells = []
        for title, question in self.multiple_choice():
            choices = question['choices']
            correct = question['correct']
            others = [len(c) for i, c in enumerate(choices) if i != correct]
            ratio = len(choices[correct]) / (sum(others) / len(others))
            if ratio > 1.25:
                tells.append(f'{title} / {question["title"]} ({ratio:.2f}x)')

        self.assertEqual(
            tells, [],
            'the correct option runs far longer than its distractors here, '
            'which makes it guessable by shape alone:\n  ' + '\n  '.join(tells),
        )

    def test_every_module_tests_most_of_its_slides(self):
        for module in MODULES:
            questions = len(module['quiz']['questions'])
            slides = len(module['slides'])
            self.assertGreaterEqual(
                questions, 8,
                f'{module["title"]}: {questions} questions for {slides} slides '
                f'leaves most of the material untested',
            )


class SeededQuizzesGradeOnTheServer(TestCase):
    """
    The seed renders markup for the browser; the server now grades it.

    Both read the same HTML with the same regexes, but from different files -
    QuizViewer.tsx and apps/learning/quiz_content.py. If they ever disagree a
    student sees one result and gets recorded with another, so this asserts the
    server reaches 100% on the answers the seed declares correct.
    """

    def test_answering_as_declared_scores_full_marks(self):
        from apps.learning.quiz_content import score_submission

        for module in MODULES:
            quiz = module['quiz']
            content = render_quiz(quiz['questions'])
            answers = {
                number: [str(question['correct'] + 1)]
                for number, question in enumerate(quiz['questions'], start=1)
            }
            percentage, earned, total, detail = score_submission(content, answers)

            ungradable = [q['number'] for q in detail if not q['answerable']]
            self.assertEqual(ungradable, [], f'{quiz["title"]}: no answer key on {ungradable}')
            self.assertEqual(
                percentage, 100,
                f'{quiz["title"]}: server graded the declared answers as '
                f'{percentage}% ({earned}/{total}). The server parser and the '
                f'seed renderer disagree about this markup.',
            )

    def test_answering_everything_wrong_scores_zero(self):
        from apps.learning.quiz_content import score_submission

        for module in MODULES:
            quiz = module['quiz']
            content = render_quiz(quiz['questions'])
            answers = {}
            for number, question in enumerate(quiz['questions'], start=1):
                count = 2 if question.get('true_false') else len(question['choices'])
                wrong = next(i for i in range(count) if i != question['correct'])
                answers[number] = [str(wrong + 1)]

            percentage, _earned, _total, _detail = score_submission(content, answers)
            self.assertEqual(percentage, 0, quiz['title'])


class SeededModulesAreMultiSlide(TestCase):
    def test_each_module_has_several_slides_with_titles_and_bodies(self):
        for module in MODULES:
            html = render_slides(module['slides'])
            slides = SLIDE_RE.findall(html)

            self.assertEqual(len(slides), len(module['slides']), module['title'])
            self.assertGreaterEqual(
                len(slides), 5,
                f'{module["title"]}: only {len(slides)} slides. The brief was '
                f'explicitly not to compact a module into one slide.',
            )

            for (_number, slide), declared in zip(slides, module['slides']):
                self.assertIn('class="slide-title"', slide, module['title'])
                self.assertIn('class="slide-content"', slide, module['title'])
                self.assertIn(declared['title'], slide, module['title'])

    def test_slides_are_numbered_from_one_without_gaps(self):
        for module in MODULES:
            numbers = [n for n, _ in SLIDE_RE.findall(render_slides(module['slides']))]
            self.assertEqual(
                numbers, [str(i) for i in range(1, len(module['slides']) + 1)],
                module['title'],
            )

    def test_slide_bodies_do_not_repeat_the_title_as_a_heading(self):
        # SlideViewer renders slide-title as the page heading and strips a
        # duplicate <h2> that matches it - but not an <h1>. Opening every body
        # with <h1>Same Title</h1> therefore printed the heading twice on
        # screen, which is exactly how this shipped the first time.
        for module in MODULES:
            for slide in module['slides']:
                self.assertNotIn(
                    '<h1>', slide['body'],
                    f'{module["title"]} / {slide["title"]}: the slide title is '
                    f'already rendered above the body, so an <h1> here shows twice',
                )
                self.assertNotIn(
                    f'<h2>{slide["title"]}', slide['body'],
                    f'{module["title"]} / {slide["title"]}: duplicated heading',
                )

    def test_code_samples_are_html_escaped(self):
        # A bare < in a code sample would be parsed as a tag and swallow content.
        for module in MODULES:
            html = render_slides(module['slides'])
            for block in re.findall(r'<pre class="ql-syntax"[^>]*>(.*?)</pre>', html, re.S):
                self.assertNotIn(
                    '<', block,
                    f'{module["title"]}: unescaped < inside a code sample',
                )


class SeedCommandIsUsable(TestCase):
    def test_seeding_creates_the_path_modules_and_quizzes(self):
        from django.core.management import call_command

        from apps.accounts.models import User
        from apps.learning.models import CareerPath, LearningModule, Quiz

        instructor = User.objects.create_user(
            username='seed_instructor', email='rfostanes@ssct.edu.ph',
            password='x', role='instructor',
        )

        call_command('seed_datascience_path', verbosity=0)

        path = CareerPath.objects.get(name=PATH['name'])
        self.assertEqual(path.instructor, instructor)
        self.assertEqual(path.approval_status, 'approved')
        self.assertTrue(path.is_published)
        self.assertEqual(path.total_modules, len(MODULES))

        modules = LearningModule.objects.filter(career_path=path).order_by('order')
        self.assertEqual(modules.count(), len(MODULES))
        for module in modules:
            self.assertIn('module-slide', module.content)
            self.assertEqual(Quiz.objects.filter(learning_module=module).count(), 1)

    def test_seeding_twice_updates_instead_of_duplicating(self):
        from django.core.management import call_command

        from apps.accounts.models import User
        from apps.learning.models import CareerPath, LearningModule, Quiz

        User.objects.create_user(
            username='seed_instructor2', email='rfostanes@ssct.edu.ph',
            password='x', role='instructor',
        )

        call_command('seed_datascience_path', verbosity=0)
        call_command('seed_datascience_path', verbosity=0)

        self.assertEqual(CareerPath.objects.filter(name=PATH['name']).count(), 1)
        self.assertEqual(LearningModule.objects.count(), len(MODULES))
        self.assertEqual(Quiz.objects.count(), len(MODULES))

    def test_seeding_fails_loudly_when_the_instructor_does_not_exist(self):
        from django.core.management import call_command
        from django.core.management.base import CommandError

        with self.assertRaises(CommandError):
            call_command('seed_datascience_path', verbosity=0)
