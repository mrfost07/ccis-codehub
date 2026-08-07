"""
Turn quiz slides into gradeable questions.

Quizzes were seeded with their questions written into `Quiz.content` as HTML
slides. The learning admin renders that HTML, so a quiz looks fully authored
there. The student quiz page reads `quiz.questions` — the Question table — which
was empty for every quiz in the database, so students saw a quiz with no
questions and no way to score one.

This reads the slides and creates the rows the student side needs. The markup
carries everything required: the prompt, the type, the points, and each choice
with `data-correct="true|false"`.

`correct_answer` is set to the correct QuestionChoice's id, because that is what
grading compares against — QuizViewSet._check_answer does
`str(user_answer) == str(question.correct_answer)` and the client submits
`choice.id`. Storing the choice text there would mark every answer wrong.

Idempotent: a quiz that already has questions is left alone, so this can be run
again after new content is seeded.

    python manage.py import_quiz_questions --dry-run
    python manage.py import_quiz_questions
    python manage.py import_quiz_questions --quiz <uuid>
"""
import re
from html.parser import HTMLParser

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.learning.models import Question, QuestionChoice, Quiz


class SlideParser(HTMLParser):
    """Pulls questions out of the seeded slide markup.

    Written against the stdlib parser rather than adding BeautifulSoup for one
    command. The markup is generated, so it is regular: a `module-slide` div per
    question, an `h2` title, a `question-content` block for the prompt, a
    `question-info` block naming the type and points, and `quiz-choice` divs
    carrying `data-correct`.
    """

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.questions = []
        self._question = None
        self._capture = None          # which field the current text belongs to
        # Open <div> count since the slide started. The slide is finished when it
        # returns to zero. An earlier version closed the slide on "the first
        # </div> after some text" and de-duplicated the results with `not in`,
        # which silently merged two questions that happened to read the same.
        self._slide_depth = 0
        self._buffer = []

    # -- helpers ---------------------------------------------------------
    def _classes(self, attrs):
        return (dict(attrs).get('class') or '').split()

    def _flush(self):
        text = re.sub(r'\s+', ' ', ''.join(self._buffer)).strip()
        self._buffer = []
        return text

    # -- parsing ---------------------------------------------------------
    def handle_starttag(self, tag, attrs):
        attrs_d = dict(attrs)
        classes = self._classes(attrs)

        if 'module-slide' in classes:
            self._question = {
                'text': '', 'type': 'multiple_choice', 'points': 1, 'choices': [],
            }
            self._slide_depth = 1
            return

        if self._question is None:
            return

        if tag == 'div':
            self._slide_depth += 1

        if 'question-content' in classes:
            self._capture = 'text'
            self._buffer = []
        elif 'question-info' in classes:
            self._capture = 'info'
            self._buffer = []
        elif 'quiz-choice' in classes:
            self._question['choices'].append({
                'text': '',
                'correct': attrs_d.get('data-correct', 'false').lower() == 'true',
            })
            self._capture = 'choice'
            self._buffer = []

    def handle_endtag(self, tag):
        if self._question is None or tag != 'div':
            return

        self._slide_depth -= 1

        if self._capture == 'text':
            self._question['text'] = self._flush()
            self._capture = None
        elif self._capture == 'info':
            info = self._flush().lower()
            if 'true' in info and 'false' in info:
                self._question['type'] = 'true_false'
            elif 'short answer' in info:
                self._question['type'] = 'short_answer'
            elif 'coding' in info:
                self._question['type'] = 'coding'
            points = re.search(r'(\d+)\s*point', info)
            if points:
                self._question['points'] = int(points.group(1))
            self._capture = None
        elif self._capture == 'choice':
            if self._question['choices']:
                # Drop the "A. " / "B. " prefix the slides render.
                self._question['choices'][-1]['text'] = re.sub(
                    r'^[A-Z][.)]\s*', '', self._flush(),
                )
            self._capture = None

        # Back to zero means this </div> closed the slide.
        if self._slide_depth <= 0:
            self.questions.append(self._question)
            self._question = None
            self._slide_depth = 0

    def handle_data(self, data):
        if self._capture:
            self._buffer.append(data)


# Answers that are not in the slides.
#
# Nine true/false slides carry no data-correct marker on either choice, so the
# answer is not in the content and cannot be derived from it - only authored.
# Every one of these is settled Python semantics rather than a course
# convention, so they are written down here instead of left for somebody to
# retype into the admin. Anything genuinely open to an instructor's judgement
# does not belong in this table; it belongs in the admin.
AUTHORED_ANSWERS = {
    'the value true is a boolean value': True,
    'and is a logical operator in many programming languages': True,
    'in python indentation is crucial for defining code blocks and is not just '
    'a stylistic choice': True,
    # `=` assigns; `==` compares.
    'the single equals sign is used to compare two values for equality in '
    'python': False,
    # elif is only reached when the preceding conditions were false.
    'if the initial if condition in an if elif else chain evaluates to true '
    'python will still check the subsequent elif conditions before executing '
    'the if block': False,
    'a while loop can run forever if its condition never becomes false': True,
    # A function without return gives back None.
    'all python functions must explicitly return a value using the return '
    'keyword': False,
    # input() returns str; the caller converts.
    'the input function always returns a string regardless of what the user '
    'types': True,
    'variables defined inside a function are local to that function and cannot '
    'be accessed directly from outside the function': True,
}


def normalise(text):
    """A question's text reduced to what it is asking.

    Keys are matched on this rather than the raw prompt so that punctuation, the
    "True or False:" lead-in and stray whitespace in the seeds do not decide
    whether a question gets its answer.
    """
    text = re.sub(r'^\s*true or false\s*[:\-]?\s*', '', text.strip().lower())
    return re.sub(r'[^a-z0-9]+', ' ', text).strip()


def apply_authored_answer(item):
    """Mark the authored choice correct. True if one was applied.

    Only true/false questions offering exactly True and False: the table is
    keyed by text, and a text match on some other shape of question would be
    marking an answer by coincidence.
    """
    answer = AUTHORED_ANSWERS.get(normalise(item['text']))
    if answer is None or item['type'] != 'true_false':
        return False

    labels = {c['text'].strip().lower() for c in item['choices']}
    if labels != {'true', 'false'}:
        return False

    for choice in item['choices']:
        choice['correct'] = (choice['text'].strip().lower() == 'true') == answer
    return True


def parse_slides(html):
    """Questions found in one quiz's content. Empty list if there are none."""
    parser = SlideParser()
    parser.feed(html or '')
    parser.close()
    # A slide with no prompt or no choices is not a question — the seeds also use
    # module-slide for prose.
    return [
        q for q in parser.questions
        if q['text'] and (q['choices'] or q['type'] in ('short_answer', 'coding'))
    ]


class Command(BaseCommand):
    help = 'Create Question rows from quiz slide content'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help='Report what would be created and change nothing.')
        parser.add_argument('--quiz', help='Only this quiz id.')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        quizzes = Quiz.objects.all()
        if options['quiz']:
            quizzes = quizzes.filter(id=options['quiz'])

        created_questions = 0
        touched_quizzes = 0
        skipped_existing = 0
        authored = 0
        no_questions = []
        # Questions whose answer is missing from the slide, so somebody has to set
        # it. Named individually — a count alone is not actionable.
        needs_answer = []

        for quiz in quizzes.order_by('learning_module__order', 'title'):
            if quiz.questions.exists():
                skipped_existing += 1
                continue

            parsed = parse_slides(quiz.content)
            if not parsed:
                no_questions.append(quiz.title)
                continue

            self.stdout.write(f'{quiz.title[:58]}: {len(parsed)} question(s)')
            for index, item in enumerate(parsed):
                correct = [c for c in item['choices'] if c['correct']]
                if item['choices'] and not correct:
                    # The slide marks no answer. Fall back to the authored table;
                    # what is not in there cannot be derived, only authored, and
                    # importing it would create a question nobody can pass.
                    if apply_authored_answer(item):
                        authored += 1
                    else:
                        self.stdout.write(self.style.WARNING(
                            f'  - skipped Q{index + 1}: no correct answer in the slide'))
                        needs_answer.append((quiz.title, index + 1, item['text'][:70]))
                        continue

                if dry_run:
                    created_questions += 1
                    continue

                with transaction.atomic():
                    question = Question.objects.create(
                        quiz=quiz,
                        question_text=item['text'],
                        question_type=item['type'],
                        correct_answer='',       # set below, once choices exist
                        points=item['points'],
                        order=index,
                    )
                    correct_id = ''
                    for choice_index, choice in enumerate(item['choices']):
                        row = QuestionChoice.objects.create(
                            question=question,
                            choice_text=choice['text'][:500],
                            is_correct=choice['correct'],
                            order=choice_index,
                        )
                        if choice['correct']:
                            correct_id = str(row.id)

                    if item['type'] == 'true_false':
                        # Graded by lowercased string, and the client submits a
                        # boolean.
                        first_correct = next(
                            (c for c in item['choices'] if c['correct']), None)
                        question.correct_answer = (
                            'true' if first_correct and first_correct['text'].lower().startswith('true')
                            else 'false'
                        )
                    else:
                        question.correct_answer = correct_id
                    question.save(update_fields=['correct_answer'])

                created_questions += 1
            touched_quizzes += 1

        self.stdout.write('')
        verb = 'would create' if dry_run else 'created'
        self.stdout.write(self.style.SUCCESS(
            f'{verb} {created_questions} question(s) across {touched_quizzes} quiz(zes)'))
        if authored:
            self.stdout.write(
                f'answered from the authored table (not in the slides): {authored}')
        if skipped_existing:
            self.stdout.write(f'left alone (already had questions): {skipped_existing}')
        if no_questions:
            self.stdout.write(
                f'no questions found in content: {len(no_questions)}')
            for title in no_questions[:10]:
                self.stdout.write(f'  - {title[:60]}')

        if needs_answer:
            self.stdout.write('')
            self.stdout.write(self.style.WARNING(
                f'{len(needs_answer)} question(s) have no correct answer in the '
                'slide and were NOT imported. Set the answer in the learning '
                'admin, then run this again:'))
            for quiz_title, number, text in needs_answer:
                self.stdout.write(f'  - {quiz_title[:44]} Q{number}: {text}')
