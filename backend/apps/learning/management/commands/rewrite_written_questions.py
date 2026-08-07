"""
Rewrite the written-answer quiz slides as multiple choice.

Fourteen slides across Programming Fundamentals ask for prose - "Explain the
difference between a parameter and an argument". `_check_answer` grades
short_answer by exact string equality, so none of them can be scored; they were
removed from the Question table by prune_ungradeable_questions and the import
refuses to recreate them.

This rewrites the slides themselves rather than only creating question rows, so
the learning admin (which renders the slide HTML) and the student quiz page
(which reads the Question table) show the same question. Run the import
afterwards to create the rows:

    python manage.py rewrite_written_questions --dry-run
    python manage.py rewrite_written_questions
    python manage.py import_quiz_questions --fill-missing

Each rewrite keeps what the original was testing and the points it carried. The
slide is regenerated whole, in the markup the other slides use, and then parsed
back and checked before anything is saved - a rewrite that does not read back as
the intended question is refused rather than written.
"""
import re

from django.core.management.base import BaseCommand
from django.db import transaction

from .import_quiz_questions import SlideParser, normalise
from apps.learning.models import Quiz


# Keyed by the original prompt, normalised. `prompt` is what the slide will ask;
# most are the original question with the "explain"/"describe" framing turned
# into something answerable by choosing. `choices` is (text, is_correct), and
# exactly one must be correct.
REWRITES = {
    normalise('What is string concatenation, and how is it typically performed '
              'in programming?'): {
        'title': 'String Concatenation',
        'prompt': 'What is string concatenation, and how is it usually performed '
                  'in Python?',
        'choices': [
            ('Joining two or more strings end to end, usually with the + operator', True),
            ('Converting a string into a number so it can be used in arithmetic', False),
            ('Splitting a string into a list of smaller strings', False),
            ('Removing the whitespace from both ends of a string', False),
        ],
    },
    normalise("Name two other logical operators commonly used in programming "
              "besides 'and'."): {
        'title': 'Logical Operators',
        'prompt': 'Besides <code>and</code>, which pair are also logical '
                  'operators in Python?',
        'choices': [
            ('or and not', True),
            ('+ and -', False),
            ('== and !=', False),
            ('if and else', False),
        ],
    },
    normalise('What is the primary purpose of the modulo operator in programming?'): {
        'title': 'The Modulo Operator',
        'prompt': 'What is the primary purpose of the modulo operator (%)?',
        'choices': [
            ('It gives the remainder left after one number is divided by another', True),
            ('It rounds a number to the nearest whole number', False),
            ('It raises a number to a power', False),
            ('It divides two numbers and discards the remainder', False),
        ],
    },
    normalise('Consider the following Python code snippet:score = 60 if score >= 90: '
              'print("Grade A") elif score >= 80: print("Grade B") elif score >= 70: '
              'print("Grade C") elif score >= 60: print("Grade D") else: '
              'print("Grade F") What will be printed to the console if score = 60?'): {
        'title': 'Reading an if-elif Chain',
        'prompt': 'Given <code>score = 60</code> and a chain that prints Grade A '
                  'for &gt;= 90, Grade B for &gt;= 80, Grade C for &gt;= 70, '
                  'Grade D for &gt;= 60, and otherwise Grade F — what is printed?',
        'choices': [
            ('Grade D', True),
            ('Grade C', False),
            ('Grade F', False),
            ('Grade A', False),
        ],
    },
    normalise('What punctuation mark must be placed at the end of if, elif, and '
              'else lines in Python?'): {
        'title': 'Ending a Condition Line',
        'prompt': 'Which punctuation mark must end an <code>if</code>, '
                  '<code>elif</code> or <code>else</code> line in Python?',
        'choices': [
            ('A colon ( : )', True),
            ('A semicolon ( ; )', False),
            ('A full stop ( . )', False),
            ('A comma ( , )', False),
        ],
    },
    normalise('What specific type of error will Python raise if there is an issue '
              'with inconsistent or incorrect indentation in your code blocks?'): {
        'title': 'Indentation Errors',
        'prompt': 'Which error does Python raise when the indentation of a code '
                  'block is inconsistent or wrong?',
        'choices': [
            ('IndentationError', True),
            ('TypeError', False),
            ('ValueError', False),
            ('NameError', False),
        ],
    },
    normalise('Examine the following Python code:x = 15 y = 10 if x > y: if x > 20: '
              'print("X is very large") else: print("X is larger") elif y > x: '
              'print("Y is larger") else: print("X and Y are equal") What will be '
              'the output when this code is executed?'): {
        'title': 'Nested Conditions',
        'prompt': 'With <code>x = 15</code> and <code>y = 10</code>: if x &gt; y, '
                  'an inner test prints "X is very large" when x &gt; 20 and '
                  '"X is larger" otherwise; an elif prints "Y is larger" and an '
                  'else prints "X and Y are equal". What is the output?',
        'choices': [
            ('X is larger', True),
            ('X is very large', False),
            ('Y is larger', False),
            ('X and Y are equal', False),
        ],
    },
    normalise('In programming, what is the primary purpose of using a loop?'): {
        'title': 'Why Loops Exist',
        'prompt': 'What is the primary purpose of a loop?',
        'choices': [
            ('To repeat a block of code without writing it out each time', True),
            ('To store several values under a single name', False),
            ('To choose between two different blocks of code', False),
            ('To give a block of code a name it can be called by', False),
        ],
    },
    normalise('Briefly explain one key difference between a for loop and a while '
              'loop.'): {
        'title': 'for vs while',
        'prompt': 'Which statement describes a key difference between a '
                  '<code>for</code> loop and a <code>while</code> loop?',
        'choices': [
            ('A for loop runs over a known sequence of items; a while loop '
             'repeats as long as its condition stays true', True),
            ('A for loop can only count upwards, while a while loop can only '
             'count downwards', False),
            ('A while loop always runs at least once, while a for loop may run '
             'zero times', False),
            ('Only a for loop can be nested inside another loop', False),
        ],
    },
    normalise('What is the primary purpose of the range() function when used with '
              'a for loop in Python?'): {
        'title': 'The range() Function',
        'prompt': 'What does <code>range()</code> do when used with a '
                  '<code>for</code> loop?',
        'choices': [
            ('It produces the sequence of numbers the loop counts through', True),
            ('It measures how long the loop takes to run', False),
            ('It stops the loop once a condition becomes false', False),
            ('It returns the largest and smallest values in a list', False),
        ],
    },
    normalise('What common problem would occur if the update statement (e.g., '
              'count += 1) were accidentally omitted from a while loop that '
              'depends on it to terminate?'): {
        'title': 'Forgetting the Update',
        'prompt': 'A while loop depends on <code>count += 1</code> to finish, and '
                  'that line is left out. What happens?',
        'choices': [
            ('The condition never becomes false, so the loop runs forever', True),
            ('The loop body is skipped entirely', False),
            ('Python raises an IndentationError', False),
            ('The loop runs exactly once and then stops', False),
        ],
    },
    normalise('Describe the primary purpose of the input() function in Python.'): {
        'title': 'The input() Function',
        'prompt': 'What is the primary purpose of the <code>input()</code> '
                  'function in Python?',
        'choices': [
            ('It reads a line typed by the user and returns it as a string', True),
            ('It writes a message to the screen for the user to read', False),
            ('It reads the contents of a file from disk', False),
            ('It converts a string into an integer', False),
        ],
    },
    normalise('How do you call a function named greet that takes no arguments? '
              'Provide an example in code.'): {
        'title': 'Calling a Function',
        'prompt': 'How do you call a function named <code>greet</code> that takes '
                  'no arguments?',
        'choices': [
            ('greet()', True),
            ('greet', False),
            ('call greet', False),
            ('def greet()', False),
        ],
    },
    normalise('Explain the difference between a function parameter and a function '
              'argument in Python.'): {
        'title': 'Parameters and Arguments',
        'prompt': 'What is the difference between a function parameter and a '
                  'function argument?',
        'choices': [
            ('The parameter is the name in the function definition; the argument '
             'is the value passed in when it is called', True),
            ('The argument is the name in the function definition; the parameter '
             'is the value passed in when it is called', False),
            ('Parameters belong to built-in functions and arguments only to '
             'functions you write yourself', False),
            ('They mean the same thing; the words are interchangeable', False),
        ],
    },
}

LETTERS = 'ABCDEFGH'

CHOICE = (
    '\n              <div class="quiz-choice" style="padding: 0.75rem; '
    'margin: 0.5rem 0; background: rgba(255,255,255,0.05); border: 1px solid '
    'rgba(255,255,255,0.1); border-radius: 0.5rem; cursor: pointer;" '
    'data-choice-id="{number}" data-correct="{correct}">'
    '\n                <label style="display: flex; align-items: center; '
    'cursor: pointer;">'
    '\n                  <input type="radio" name="question-{slide}" '
    'value="{number}" style="margin-right: 0.75rem; width: 1.25rem; '
    'height: 1.25rem;">'
    '\n                  <span style="font-size: 1rem;">{letter}. {text}</span>'
    '\n                </label>'
    '\n              </div>\n            '
)

SLIDE = (
    '<div class="module-slide" data-slide="{slide}">'
    '\n          <h2 style="color: #60a5fa; margin-bottom: 1rem; '
    'font-size: 1.5rem; font-weight: bold;">'
    '\n            Question {slide}: {title}'
    '\n          </h2>'
    '\n          <div class="question-content" style="margin-bottom: 1.5rem;">'
    '\n            <p>{prompt}</p>'
    '\n          </div>'
    '\n          <div class="question-info" style="display: flex; gap: 1rem; '
    'margin-bottom: 1rem; font-size: 0.875rem; color: #94a3b8;">'
    '\n            <span>\U0001f4dd MULTIPLE CHOICE</span>'
    '\n            <span>⭐ {points} {points_word}</span>'
    '\n          </div>'
    '\n          '
    '\n          <div class="quiz-choices" style="margin-top: 1rem;">'
    '\n            {choices}</div>'
    '\n        </div>'
)


def build_slide(number, title, prompt, points, choices):
    """The replacement slide, in the markup the other slides use."""
    rendered = ''.join(
        CHOICE.format(number=index + 1, slide=number, letter=LETTERS[index],
                      correct='true' if correct else 'false', text=text)
        for index, (text, correct) in enumerate(choices)
    )
    return SLIDE.format(
        slide=number, title=title, prompt=prompt, points=points,
        points_word='point' if points == 1 else 'points',
        choices=rendered.lstrip('\n'),
    )


def slide_number(source, fallback):
    found = re.search(r'data-slide="(\d+)"', source)
    return int(found.group(1)) if found else fallback


def rewrite_content(content):
    """Content with every known written-answer slide replaced.

    Returns (new_content, [titles rewritten]). Replacing from the last slide
    backwards keeps the earlier offsets valid.
    """
    questions = SlideParser().parse(content)
    targets = [
        (question, REWRITES[normalise(question['text'])])
        for question in questions
        # Already multiple choice: leave it. Makes a second run a no-op.
        if not question['choices'] and normalise(question['text']) in REWRITES
    ]

    done = []
    for question, rewrite in reversed(targets):
        original = content[question['start']:question['end']]
        number = slide_number(original, len(done) + 1)
        replacement = build_slide(
            number, rewrite['title'], rewrite['prompt'],
            question['points'], rewrite['choices'],
        )

        # Read it back before trusting it. A replacement that does not parse as
        # the intended question would otherwise go into the database and only
        # show up as a broken quiz.
        parsed = SlideParser().parse(replacement)
        correct = [c for c in parsed[0]['choices'] if c['correct']] if parsed else []
        if (len(parsed) != 1 or parsed[0]['type'] != 'multiple_choice'
                or len(parsed[0]['choices']) != len(rewrite['choices'])
                or len(correct) != 1):
            raise ValueError(
                f'rewritten slide does not read back as one multiple-choice '
                f'question with exactly one answer: {rewrite["title"]}')

        content = content[:question['start']] + replacement + content[question['end']:]
        done.append(rewrite['title'])

    return content, list(reversed(done))


class Command(BaseCommand):
    help = 'Rewrite written-answer quiz slides as multiple choice'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help='Report what would change and write nothing.')

    def handle(self, *args, **options):
        rewritten = 0
        for quiz in Quiz.objects.all().order_by('learning_module__order', 'title'):
            content, done = rewrite_content(quiz.content or '')
            if not done:
                continue

            self.stdout.write(f'{quiz.title[:58]}:')
            for title in done:
                self.stdout.write(f'  - {title}')
            rewritten += len(done)

            if not options['dry_run']:
                with transaction.atomic():
                    quiz.content = content
                    quiz.save(update_fields=['content'])

        verb = 'would rewrite' if options['dry_run'] else 'rewrote'
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'{verb} {rewritten} slide(s)'))
        if rewritten and not options['dry_run']:
            self.stdout.write(
                'now run: python manage.py import_quiz_questions --fill-missing')
