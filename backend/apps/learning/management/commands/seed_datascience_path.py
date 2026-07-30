"""
Seed the "Data Science and Machine Learning" career path.

Content is declared as data at the bottom of this file and rendered into the
exact HTML the app already reads. That matters more than it sounds: nothing in
this system stores questions relationally (Quiz.questions is empty for every
existing quiz), so a quiz is only as good as its markup.

The two contracts this file has to satisfy, both reverse-engineered from the
code that consumes them rather than guessed:

  Module slides - ModuleLearningEnhanced renders module.content directly and
  SlideViewer splits on the same markers:
      <div class="module-slide" data-slide="N">
        <h2 class="slide-title">..</h2>
        <div class="slide-content">..</div>
        <hr class="slide-separator" />
      </div>

  Quiz questions - QuizViewer.parseQuestions does the grading, so its regexes
  are the specification:
      slides   /<div class="module-slide" data-slide="(\\d+)">([\\s\\S]*?)(?=<div class="module-slide"|$)/
      choices  /data-choice-id="([^"]*)"[^>]*data-correct="([^"]*)"[^>]*>[\\s\\S]*?([A-Z])\\.\\s*([^<]+)/

  Three consequences that are easy to get wrong:
    1. data-choice-id must appear BEFORE data-correct on the same tag.
    2. Choice label text must be plain - the final capture is [^<]+, so an
       inline <code> tag truncates the text to nothing. Existing quizzes wrap
       choices in <code> and therefore render blank options.
    3. Question type is sniffed from the slide text: uppercase TRUE and FALSE
       both present means true/false. So a multiple-choice question must never
       contain both words in caps, and a true/false question must.

Idempotent: re-running updates the same rows instead of duplicating, matched on
the path slug and each module's order.

    python manage.py seed_datascience_path
    python manage.py seed_datascience_path --instructor someone@ssct.edu.ph
    python manage.py seed_datascience_path --status pending
"""
import html

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

CHOICE_LETTERS = 'ABCDEFGH'

# Inline styles are copied from the quizzes the instructor dashboard already
# produces, so seeded quizzes look identical to hand-made ones.
CHOICE_STYLE = (
    'padding: 0.75rem; margin: 0.5rem 0; background: rgba(255,255,255,0.05); '
    'border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; cursor: pointer;'
)
LABEL_STYLE = 'display: flex; align-items: center; cursor: pointer;'
RADIO_STYLE = 'margin-right: 0.75rem; width: 1.25rem; height: 1.25rem;'
H2_STYLE = 'color: #60a5fa; margin-bottom: 1rem; font-size: 1.5rem; font-weight: bold;'
INFO_STYLE = (
    'display: flex; gap: 1rem; margin-bottom: 1rem; font-size: 0.875rem; color: #94a3b8;'
)


def render_slides(slides):
    """Module body: one module-slide block per slide."""
    blocks = []
    for index, slide in enumerate(slides, start=1):
        body = slide['body']
        if slide.get('code'):
            body += (
                '<pre class="ql-syntax" spellcheck="false">'
                f'{html.escape(slide["code"])}\n</pre>'
            )
        blocks.append(
            f'<div class="module-slide" data-slide="{index}">\n'
            f'        <h2 class="slide-title">{slide["title"]}</h2>\n'
            f'        <div class="slide-content">\n'
            f'          {body}\n'
            f'        </div>\n'
            f'        <hr class="slide-separator" />\n'
            f'      </div>'
        )
    return '\n\n'.join(blocks)


def render_quiz(questions):
    """Quiz body: one module-slide block per question, gradable by QuizViewer."""
    blocks = []
    for number, question in enumerate(questions, start=1):
        is_true_false = question.get('true_false', False)
        choices = ['True', 'False'] if is_true_false else question['choices']
        kind = 'TRUE / FALSE' if is_true_false else 'MULTIPLE CHOICE'
        points = question.get('points', 1)
        unit = 'point' if points == 1 else 'points'

        rendered_choices = []
        for position, text in enumerate(choices):
            correct = 'true' if position == question['correct'] else 'false'
            rendered_choices.append(
                f'            <div class="quiz-choice" style="{CHOICE_STYLE}" '
                f'data-choice-id="{position + 1}" data-correct="{correct}">\n'
                f'              <label style="{LABEL_STYLE}">\n'
                f'                <input type="radio" name="question-{number}" '
                f'value="{position + 1}" style="{RADIO_STYLE}">\n'
                f'                <span style="font-size: 1rem;">'
                f'{CHOICE_LETTERS[position]}. {text}</span>\n'
                f'              </label>\n'
                f'            </div>'
            )

        blocks.append(
            f'<div class="module-slide" data-slide="{number}">\n'
            f'          <h2 style="{H2_STYLE}">\n'
            f'            Question {number}: {question["title"]}\n'
            f'          </h2>\n'
            f'          <div class="question-content" style="margin-bottom: 1.5rem;">\n'
            f'            <p>{question["text"]}</p>\n'
            f'          </div>\n'
            f'          <div class="question-info" style="{INFO_STYLE}">\n'
            f'            <span>{kind}</span>\n'
            f'            <span>{points} {unit}</span>\n'
            f'          </div>\n'
            f'          <div class="quiz-choices" style="margin-top: 1rem;">\n'
            + '\n'.join(rendered_choices) + '\n'
            f'          </div>\n'
            f'          <hr class="slide-separator" />\n'
            f'        </div>'
        )
    return '\n\n'.join(blocks)


class Command(BaseCommand):
    help = 'Seed the Data Science and Machine Learning career path with modules and quizzes.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--instructor', default='rfostanes@ssct.edu.ph',
            help='Email of the instructor who owns the path (default: rfostanes@ssct.edu.ph).',
        )
        parser.add_argument(
            '--status', default='approved',
            choices=['draft', 'pending', 'approved'],
            help='approval_status for the path. Default approved so students can enrol at once; '
                 'use pending to exercise the approval flow.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from apps.accounts.models import User
        from apps.learning.models import CareerPath, LearningModule, Quiz

        email = options['instructor']
        try:
            instructor = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise CommandError(
                f'No user with email {email}. Create the instructor account first, '
                f'or pass --instructor with an existing address.'
            )
        if instructor.role not in ('instructor', 'admin'):
            self.stdout.write(self.style.WARNING(
                f'  {email} has role "{instructor.role}", not instructor/admin - '
                f'attaching anyway, but check this is the right account.'
            ))

        status = options['status']
        path, created = CareerPath.objects.update_or_create(
            slug=slugify(PATH['name']),
            defaults={
                'name': PATH['name'],
                'description': PATH['description'],
                'program_type': PATH['program_type'],
                'difficulty_level': PATH['difficulty_level'],
                'estimated_duration': PATH['estimated_duration'],
                'points_reward': PATH['points_reward'],
                'skills_granted': PATH['skills_granted'],
                'icon': PATH['icon'],
                'color': PATH['color'],
                'total_modules': len(MODULES),
                'max_modules': len(MODULES),
                'instructor': instructor,
                'approval_status': status,
                'approved_by': instructor if status == 'approved' else None,
                'approved_at': timezone.now() if status == 'approved' else None,
                'is_active': True,
                'is_featured': True,
            },
        )
        self.stdout.write(
            f'{"created" if created else "updated"} path: {path.name} '
            f'[{status}] instructor={instructor.email}'
        )

        for order, spec in enumerate(MODULES):
            module, module_created = LearningModule.objects.update_or_create(
                career_path=path, order=order,
                defaults={
                    'title': spec['title'],
                    'description': spec['description'],
                    'module_type': 'text',
                    'difficulty_level': spec.get('difficulty', 'beginner'),
                    'content': render_slides(spec['slides']),
                    'duration_minutes': spec['duration'],
                    'points_reward': spec.get('points', 20),
                    'skills_taught': spec.get('skills', []),
                    'is_locked': False,
                },
            )
            quiz_spec = spec['quiz']
            quiz, quiz_created = Quiz.objects.update_or_create(
                learning_module=module, title=quiz_spec['title'],
                defaults={
                    'description': quiz_spec['description'],
                    'content': render_quiz(quiz_spec['questions']),
                    'time_limit_minutes': quiz_spec.get('time_limit', 15),
                    'passing_score': quiz_spec.get('passing_score', 70),
                    'max_attempts': quiz_spec.get('max_attempts', 3),
                    'randomize_questions': False,
                },
            )
            self.stdout.write(
                f'  {"+" if module_created else "~"} {module.title[:52]:<54}'
                f'{len(spec["slides"])} slides, '
                f'{len(quiz_spec["questions"])} questions '
                f'({"new" if quiz_created else "updated"} quiz)'
            )

        total_slides = sum(len(m['slides']) for m in MODULES)
        total_questions = sum(len(m['quiz']['questions']) for m in MODULES)
        self.stdout.write(self.style.SUCCESS(
            f'\ndone: {len(MODULES)} modules, {total_slides} slides, '
            f'{total_questions} quiz questions'
        ))
        if status != 'approved':
            self.stdout.write(self.style.WARNING(
                f'  path is "{status}" - students will not see it until it is approved'
            ))


# ---------------------------------------------------------------------------
# Content
# ---------------------------------------------------------------------------

PATH = {
    'name': 'Data Science and Machine Learning',
    'description': (
        'A practical, project-oriented introduction to data science and machine learning. '
        'You will learn to load and clean real data, explore it honestly, build regression '
        'and classification models with scikit-learn, judge them with the right metrics, '
        'and tune and package a model for use. No prior statistics background is assumed, '
        'only comfort with basic Python.'
    ),
    'program_type': 'bscs',
    'difficulty_level': 'intermediate',
    'estimated_duration': 8,
    'points_reward': 250,
    'icon': '',
    'color': '#8b5cf6',
    'skills_granted': [
        {'name': 'Python', 'category': 'Programming Language', 'level': 'intermediate'},
        {'name': 'pandas', 'category': 'Data Analysis', 'level': 'intermediate'},
        {'name': 'NumPy', 'category': 'Data Analysis', 'level': 'beginner'},
        {'name': 'scikit-learn', 'category': 'Machine Learning', 'level': 'intermediate'},
        {'name': 'Data Visualization', 'category': 'Data Analysis', 'level': 'beginner'},
        {'name': 'Model Evaluation', 'category': 'Machine Learning', 'level': 'intermediate'},
    ],
}

MODULES = [
    # ---------------------------------------------------------------- module 1
    {
        'title': 'Module 1: Foundations of Data Science',
        'description': 'What data science is, the workflow it follows, the kinds of data you '
                       'will meet, and the Python tools used throughout this path.',
        'duration': 50,
        'difficulty': 'beginner',
        'points': 20,
        'skills': ['Python', 'NumPy', 'pandas'],
        'slides': [
            {
                'title': 'What Data Science Actually Is',
                'body': '<h1>What Data Science Actually Is</h1>'
                        '<p>Data science is the practice of turning recorded observations into '
                        'decisions. It sits where three things overlap: the subject you are '
                        'studying, the statistics that let you reason about uncertainty, and the '
                        'programming that lets you do it at scale.</p>'
                        '<p>The part beginners underestimate is the first one. A model that is '
                        'technically excellent and asks the wrong question is worthless. Most of '
                        'the value in a data project comes from framing the problem well.</p>'
                        '<ul>'
                        '<li><strong>Descriptive</strong> - what happened? Enrolment fell 12% last term.</li>'
                        '<li><strong>Diagnostic</strong> - why did it happen? It fell only in evening sections.</li>'
                        '<li><strong>Predictive</strong> - what will happen next? These 40 students are likely to drop.</li>'
                        '<li><strong>Prescriptive</strong> - what should we do? Contact them in week three.</li>'
                        '</ul>'
                        '<p>Machine learning powers the last two. The first two are usually where you start.</p>',
            },
            {
                'title': 'The Data Science Workflow',
                'body': '<h1>The Data Science Workflow</h1>'
                        '<p>Almost every project moves through the same six stages, and it is '
                        'normal to loop backwards more than once.</p>'
                        '<ol>'
                        '<li><strong>Ask</strong> - state the question and how you will know the answer is good enough.</li>'
                        '<li><strong>Collect</strong> - gather the data and record where it came from.</li>'
                        '<li><strong>Clean</strong> - fix types, missing values and duplicates.</li>'
                        '<li><strong>Explore</strong> - summarise and plot until you understand the shape of it.</li>'
                        '<li><strong>Model</strong> - fit something that answers the question.</li>'
                        '<li><strong>Communicate</strong> - explain it to whoever has to act on it.</li>'
                        '</ol>'
                        '<p>Surveys of working practitioners consistently put cleaning and '
                        'exploring at roughly 80% of the effort. Modelling is the small, '
                        'photogenic part at the end.</p>',
            },
            {
                'title': 'Kinds of Data You Will Meet',
                'body': '<h1>Kinds of Data You Will Meet</h1>'
                        '<p>How data is shaped determines what you can do with it.</p>'
                        '<ul>'
                        '<li><strong>Structured</strong> - rows and columns, like a grades table. Easiest to model.</li>'
                        '<li><strong>Semi-structured</strong> - JSON or XML, with a shape that varies between records.</li>'
                        '<li><strong>Unstructured</strong> - text, images, audio. Needs conversion into numbers first.</li>'
                        '</ul>'
                        '<p>Within a table, each column is one of two kinds, and confusing them '
                        'is a classic beginner error:</p>'
                        '<ul>'
                        '<li><strong>Numerical</strong> - continuous (height, GPA) or discrete (count of absences).</li>'
                        '<li><strong>Categorical</strong> - nominal with no order (course, city) or ordinal with an order (year level, letter grade).</li>'
                        '</ul>'
                        '<p>A student ID looks numerical but is nominal. Averaging it is meaningless, '
                        'and a model handed raw IDs will happily invent a pattern that is not there.</p>',
            },
            {
                'title': 'Your Toolkit: NumPy and pandas',
                'body': '<h1>Your Toolkit: NumPy and pandas</h1>'
                        '<p>NumPy provides fast numeric arrays. pandas builds the DataFrame on '
                        'top of it: a labelled table that is the workhorse of Python data work.</p>'
                        '<p>These few operations cover most of what you will do day to day.</p>',
                'code': 'import numpy as np\n'
                        'import pandas as pd\n\n'
                        '# A DataFrame is a table with named columns\n'
                        'df = pd.DataFrame({\n'
                        '    "student": ["Ana", "Ben", "Cruz", "Dina"],\n'
                        '    "year": [1, 2, 2, 3],\n'
                        '    "gpa": [1.75, 2.10, 1.50, 2.85],\n'
                        '})\n\n'
                        'df.head()          # first rows\n'
                        'df.info()          # column types and non-null counts\n'
                        'df.describe()      # numeric summary\n\n'
                        '# Select and filter\n'
                        'df["gpa"]                      # one column\n'
                        'df[df["year"] == 2]            # rows matching a condition\n'
                        'df.sort_values("gpa").head(3)  # three best GPAs (lower is better here)\n\n'
                        '# Group and aggregate: the single most useful move in pandas\n'
                        'df.groupby("year")["gpa"].mean()',
            },
            {
                'title': 'Describing Data with Statistics',
                'body': '<h1>Describing Data with Statistics</h1>'
                        '<p>Before modelling anything, describe it. Two questions: where is the '
                        'centre, and how spread out is it?</p>'
                        '<ul>'
                        '<li><strong>Mean</strong> - the average. Sensitive to extreme values.</li>'
                        '<li><strong>Median</strong> - the middle value. Barely moves when one value is extreme.</li>'
                        '<li><strong>Mode</strong> - the most common value. The only one that works for categories.</li>'
                        '<li><strong>Standard deviation</strong> - typical distance from the mean.</li>'
                        '</ul>'
                        '<p>The gap between mean and median is a signal. If a class has nine '
                        'students earning 20,000 and one earning 500,000, the mean income is '
                        '68,000 and the median is 20,000. The median describes the class; the '
                        'mean describes the outlier. Report both when they disagree.</p>',
                'code': 'df["gpa"].mean()      # centre, pulled by extremes\n'
                        'df["gpa"].median()    # centre, resistant to extremes\n'
                        'df["gpa"].std()       # spread\n'
                        'df["year"].mode()     # most common - works for categories too\n\n'
                        '# Quartiles show the shape in one line\n'
                        'df["gpa"].quantile([0.25, 0.5, 0.75])',
            },
            {
                'title': 'Seeing Data: Choosing the Right Plot',
                'body': '<h1>Seeing Data: Choosing the Right Plot</h1>'
                        '<p>A plot answers a question. Pick the plot from the question, not from '
                        'what looks impressive.</p>'
                        '<ul>'
                        '<li><strong>Histogram</strong> - how is one numeric column distributed?</li>'
                        '<li><strong>Box plot</strong> - how do distributions compare across groups, and where are the outliers?</li>'
                        '<li><strong>Scatter plot</strong> - do two numeric columns move together?</li>'
                        '<li><strong>Bar chart</strong> - how do counts or averages compare across categories?</li>'
                        '<li><strong>Line chart</strong> - how does something change over time?</li>'
                        '</ul>'
                        '<p>Anscombe\'s quartet is worth looking up: four datasets with nearly '
                        'identical means, variances and correlations that look completely '
                        'different when plotted. Summary statistics alone will mislead you.</p>',
                'code': 'import matplotlib.pyplot as plt\n\n'
                        'df["gpa"].plot(kind="hist", bins=10, title="GPA distribution")\n'
                        'plt.xlabel("GPA")\n'
                        'plt.show()\n\n'
                        '# Compare groups\n'
                        'df.boxplot(column="gpa", by="year")\n'
                        'plt.show()',
            },
            {
                'title': 'Mistakes That Cost Beginners the Most',
                'body': '<h1>Mistakes That Cost Beginners the Most</h1>'
                        '<p>These four account for a large share of wrong conclusions in student '
                        'projects. Each one is avoidable once you know to look.</p>'
                        '<ul>'
                        '<li><strong>Reading summaries without plotting.</strong> Different data, identical statistics.</li>'
                        '<li><strong>Treating IDs as numbers.</strong> Codes are labels, not quantities.</li>'
                        '<li><strong>Reading causation into correlation.</strong> Two things moving together may share a hidden cause.</li>'
                        '<li><strong>Judging a model on the data it learned from.</strong> That measures memory, not skill.</li>'
                        '</ul>'
                        '<p>The last one is the subject of Module 3, and it is the single most '
                        'common flaw in first machine-learning projects.</p>',
            },
        ],
        'quiz': {
            'title': 'Module 1 Quiz: Foundations of Data Science',
            'description': 'Check your understanding of the workflow, data types and descriptive statistics.',
            'questions': [
                {
                    'title': 'Where the Effort Goes',
                    'text': 'In a typical data science project, which stages consume most of the time?',
                    'choices': [
                        'Cleaning and exploring the data',
                        'Choosing which algorithm to use',
                        'Tuning the model hyperparameters',
                        'Writing the final report',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'Classifying a Column',
                    'text': 'A table stores a student number such as 2021-00457. How should this column be treated?',
                    'choices': [
                        'As a nominal category, because it is a label rather than a quantity',
                        'As a continuous numeric value, so averages can be computed',
                        'As an ordinal value, because larger numbers were issued later',
                        'As a discrete count of enrolments',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'Mean Versus Median',
                    'text': 'Nine students earn 20,000 and one earns 500,000. Which statistic better describes what a typical student earns?',
                    'choices': [
                        'The median, because one extreme value barely moves it',
                        'The mean, because it uses every observation',
                        'The standard deviation, because it measures spread',
                        'The mode, because incomes are categorical',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'Choosing a Plot',
                    'text': 'You want to know whether study hours and exam scores move together. Which plot answers that directly?',
                    'choices': [
                        'A scatter plot of study hours against exam scores',
                        'A histogram of exam scores',
                        'A bar chart of average scores per section',
                        'A line chart of scores over the semester',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'Summary Statistics Alone',
                    'text': 'Two datasets can share nearly identical means, variances and correlations while looking completely different when plotted.',
                    'true_false': True,
                    'correct': 0,
                },
            ],
        },
    },
    # ---------------------------------------------------------------- module 2
    {
        'title': 'Module 2: Data Wrangling and Exploratory Analysis',
        'description': 'Handling missing values and outliers, encoding categories, scaling '
                       'features, and exploring a dataset honestly before you model it.',
        'duration': 55,
        'difficulty': 'beginner',
        'points': 25,
        'skills': ['pandas', 'Data Visualization'],
        'slides': [
            {
                'title': 'Why Cleaning Is the Job',
                'body': '<h1>Why Cleaning Is the Job</h1>'
                        '<p>Real data arrives broken. Fields are blank because a form was '
                        'optional, dates are text, the same course is written four ways, and a '
                        'weight column contains a value of 999 that means "not measured".</p>'
                        '<p>Every one of these silently changes a model\'s conclusions. Cleaning '
                        'is not a chore before the real work - it <em>is</em> a large part of the '
                        'real work, and it is where domain knowledge pays off.</p>'
                        '<p>Rule to adopt now: never overwrite your raw file. Load it, clean it '
                        'in code, and save the cleaned copy separately. That way every decision '
                        'you made is written down and repeatable.</p>',
            },
            {
                'title': 'Missing Values: Delete, Impute or Flag',
                'body': '<h1>Missing Values: Delete, Impute or Flag</h1>'
                        '<p>You have three options, and the right one depends on <em>why</em> the '
                        'value is missing.</p>'
                        '<ul>'
                        '<li><strong>Drop rows</strong> - fine when few rows are affected and they are missing at random.</li>'
                        '<li><strong>Drop the column</strong> - reasonable when most of it is empty.</li>'
                        '<li><strong>Impute</strong> - fill with the median for numbers, the mode for categories.</li>'
                        '<li><strong>Flag</strong> - add a boolean column recording that it was missing.</li>'
                        '</ul>'
                        '<p>Flagging matters more than beginners expect. If students who skipped '
                        'the optional income question also tend to drop out, the <em>fact of the '
                        'blank</em> carries information. Impute the value and you throw that away.</p>',
                'code': 'df.isna().sum()                       # how much is missing, per column\n\n'
                        '# Median is safer than mean for skewed columns\n'
                        'df["gpa"] = df["gpa"].fillna(df["gpa"].median())\n\n'
                        '# Categories take the most common value\n'
                        'df["course"] = df["course"].fillna(df["course"].mode()[0])\n\n'
                        '# Keep the information that it was blank\n'
                        'df["income_missing"] = df["income"].isna()\n'
                        'df["income"] = df["income"].fillna(df["income"].median())',
            },
            {
                'title': 'Outliers: Error or Signal?',
                'body': '<h1>Outliers: Error or Signal?</h1>'
                        '<p>An outlier is a value far from the rest. Before removing one, decide '
                        'which kind it is.</p>'
                        '<ul>'
                        '<li><strong>Data error</strong> - an age of 210, a negative fee. Fix or remove.</li>'
                        '<li><strong>Genuine rarity</strong> - a real student who genuinely scored full marks. Keep it.</li>'
                        '</ul>'
                        '<p>Deleting real extremes because they are inconvenient is quietly '
                        'dishonest, and in fraud or failure detection the outliers are the entire '
                        'point of the exercise.</p>'
                        '<p>The interquartile range gives a defensible rule: flag anything below '
                        'Q1 minus 1.5 x IQR or above Q3 plus 1.5 x IQR, then look at what you '
                        'flagged before deciding.</p>',
                'code': 'q1 = df["gpa"].quantile(0.25)\n'
                        'q3 = df["gpa"].quantile(0.75)\n'
                        'iqr = q3 - q1\n\n'
                        'low = q1 - 1.5 * iqr\n'
                        'high = q3 + 1.5 * iqr\n\n'
                        '# Inspect first - never delete blindly\n'
                        'suspicious = df[(df["gpa"] &lt; low) | (df["gpa"] &gt; high)]\n'
                        'print(suspicious)',
            },
            {
                'title': 'Encoding Categorical Variables',
                'body': '<h1>Encoding Categorical Variables</h1>'
                        '<p>Models take numbers, so categories must be converted. How you convert '
                        'changes what the model believes.</p>'
                        '<ul>'
                        '<li><strong>One-hot encoding</strong> - one new 0/1 column per category. Use for nominal data with no order.</li>'
                        '<li><strong>Ordinal encoding</strong> - map to 1, 2, 3. Use only when the order is real.</li>'
                        '</ul>'
                        '<p>Encoding cities as 1, 2, 3 tells the model that city 3 is somehow '
                        '"more" than city 1 and that city 2 sits between them. It will use that '
                        'fiction. Year level, by contrast, genuinely is ordered, so 1 to 4 is '
                        'correct there.</p>',
                'code': '# Nominal: no order, so one column per value\n'
                        'encoded = pd.get_dummies(df, columns=["course"], drop_first=True)\n\n'
                        '# Ordinal: the order is real, so a single mapped column is right\n'
                        'levels = {"freshman": 1, "sophomore": 2, "junior": 3, "senior": 4}\n'
                        'df["year_level"] = df["year_name"].map(levels)',
            },
            {
                'title': 'Scaling, and Why Some Models Care',
                'body': '<h1>Scaling, and Why Some Models Care</h1>'
                        '<p>Suppose income runs to hundreds of thousands and GPA runs from 1 to 5. '
                        'Any model that measures distance will be dominated by income purely '
                        'because its numbers are bigger.</p>'
                        '<ul>'
                        '<li><strong>Standardisation</strong> - subtract the mean, divide by the standard deviation. Centres at 0.</li>'
                        '<li><strong>Normalisation</strong> - squeeze into the range 0 to 1.</li>'
                        '</ul>'
                        '<p>k-nearest neighbours, support vector machines and anything using '
                        'gradient descent need this. Decision trees and random forests do not, '
                        'because they split one column at a time and never compare magnitudes '
                        'across columns.</p>',
                'code': 'from sklearn.preprocessing import StandardScaler, MinMaxScaler\n\n'
                        'scaler = StandardScaler()\n'
                        'scaled = scaler.fit_transform(df[["income", "gpa"]])\n\n'
                        '# Fit on training data only - see Module 5 on leakage\n'
                        'minmax = MinMaxScaler()\n'
                        'bounded = minmax.fit_transform(df[["income", "gpa"]])',
            },
            {
                'title': 'Exploratory Data Analysis in Practice',
                'body': '<h1>Exploratory Data Analysis in Practice</h1>'
                        '<p>EDA is a conversation with the dataset. You are trying to find out '
                        'what it can and cannot tell you, and what is wrong with it, before you '
                        'commit to a model.</p>'
                        '<p>A workable order: shape and types, then missingness, then one column '
                        'at a time, then pairs of columns, then relationships with whatever you '
                        'are trying to predict.</p>',
                'code': 'df.shape                       # rows, columns\n'
                        'df.dtypes                      # is anything stored as the wrong type?\n'
                        'df.isna().mean().sort_values()  # proportion missing, worst last\n'
                        'df.describe(include="all")     # numeric and categorical summaries\n\n'
                        '# How does the target differ across a category?\n'
                        'df.groupby("course")["gpa"].agg(["count", "mean", "std"])\n\n'
                        '# Which columns move with the target?\n'
                        'df.corr(numeric_only=True)["gpa"].sort_values(ascending=False)',
            },
            {
                'title': 'Correlation Is Not Causation',
                'body': '<h1>Correlation Is Not Causation</h1>'
                        '<p>Correlation measures whether two columns move together, from -1 '
                        '(opposite) through 0 (unrelated) to +1 (identical direction). It says '
                        'nothing about what causes what.</p>'
                        '<p>Ice cream sales correlate with drowning deaths. Neither causes the '
                        'other; hot weather drives both. That hidden third variable is called a '
                        'confounder, and looking for one should be your reflex whenever a '
                        'correlation surprises you.</p>'
                        '<p>Two more traps. Correlation only detects <em>straight-line</em> '
                        'relationships, so a strong curved relationship can score near zero. And '
                        'in a big enough dataset, tiny meaningless correlations become '
                        'statistically significant. Always ask whether the size of the effect '
                        'matters, not just whether it exists.</p>',
            },
        ],
        'quiz': {
            'title': 'Module 2 Quiz: Data Wrangling and Exploratory Analysis',
            'description': 'Missing data, outliers, encoding, scaling and reading correlations.',
            'questions': [
                {
                    'title': 'Informative Blanks',
                    'text': 'Students who skip an optional income question are more likely to drop out. What is the best way to handle those blanks?',
                    'choices': [
                        'Add a column flagging the value as missing, then impute the income',
                        'Drop every row where income is blank',
                        'Impute the median and change nothing else',
                        'Replace the blanks with zero',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'Encoding Without Inventing Order',
                    'text': 'A column holds the city a student comes from, with no natural ordering. Which encoding is appropriate?',
                    'choices': [
                        'One-hot encoding, one 0/1 column per city',
                        'Ordinal encoding, mapping cities to 1, 2, 3',
                        'Standardisation of the city codes',
                        'Leaving the city names as text for the model to read',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'Which Models Need Scaling',
                    'text': 'Which model is essentially unaffected by whether you scale your features?',
                    'choices': [
                        'A decision tree, because it splits one column at a time',
                        'k-nearest neighbours, because it computes distances',
                        'A support vector machine with an RBF kernel',
                        'Linear regression trained by gradient descent',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'Reading a Correlation',
                    'text': 'Ice cream sales and drowning deaths rise together every summer. What does this correlation establish?',
                    'choices': [
                        'Nothing causal - a third factor, hot weather, drives both',
                        'That ice cream consumption causes drowning',
                        'That drowning deaths cause ice cream sales',
                        'That the correlation must be a calculation error',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'Outliers and Judgement',
                    'text': 'Any value flagged as an outlier by the interquartile range rule should be deleted before modelling.',
                    'true_false': True,
                    'correct': 1,
                },
            ],
        },
    },
    # ---------------------------------------------------------------- module 3
    {
        'title': 'Module 3: Supervised Learning with Regression',
        'description': 'Predicting numbers: linear regression, how models learn, why you must '
                       'hold data back, and how to measure error honestly.',
        'duration': 60,
        'difficulty': 'intermediate',
        'points': 30,
        'skills': ['scikit-learn', 'Model Evaluation'],
        'slides': [
            {
                'title': 'Supervised, Unsupervised, and What They Need',
                'body': '<h1>Supervised, Unsupervised, and What They Need</h1>'
                        '<p><strong>Supervised learning</strong> learns from examples where the '
                        'answer is already known. You show it thousands of houses with their '
                        'prices, and it learns to price a new one.</p>'
                        '<p><strong>Unsupervised learning</strong> has no answer column. It finds '
                        'structure instead, such as grouping customers who behave alike.</p>'
                        '<p>Supervised problems come in two forms, and the distinction decides '
                        'every later choice you make:</p>'
                        '<ul>'
                        '<li><strong>Regression</strong> - predict a quantity. How much? How many? This module.</li>'
                        '<li><strong>Classification</strong> - predict a category. Which one? Module 4.</li>'
                        '</ul>'
                        '<p>Vocabulary you will see everywhere: the input columns are '
                        '<em>features</em> (X), the column you predict is the <em>target</em> (y).</p>',
            },
            {
                'title': 'Linear Regression: The Intuition',
                'body': '<h1>Linear Regression: The Intuition</h1>'
                        '<p>Draw the straight line that passes as close as possible to all your '
                        'points. That is linear regression.</p>'
                        '<p>With one feature it is the familiar y = mx + b, renamed: the '
                        '<em>coefficient</em> m says how much the prediction moves per unit of x, '
                        'and the <em>intercept</em> b is the prediction when x is zero.</p>'
                        '<p>With several features each gets its own coefficient, and the model '
                        'becomes a weighted sum. The appeal is interpretability: a coefficient of '
                        '1,500 on "square metres" states plainly that each extra square metre '
                        'adds 1,500 to the predicted price, holding everything else fixed.</p>'
                        '<p>Its limit is in the name. If the true relationship bends, a straight '
                        'line cannot follow it, and you will need the models in Module 4.</p>',
            },
            {
                'title': 'How the Model Learns',
                'body': '<h1>How the Model Learns</h1>'
                        '<p>"Learning" here means searching for the coefficients that make the '
                        'predictions least wrong. Two ingredients make that concrete.</p>'
                        '<p>The <strong>cost function</strong> scores how wrong the model '
                        'currently is. For regression it is usually mean squared error: average '
                        'the squared gap between predicted and actual. Squaring keeps errors from '
                        'cancelling out and punishes large misses hardest.</p>'
                        '<p><strong>Gradient descent</strong> then improves the coefficients. '
                        'Stand on a hillside in fog, feel which way is downhill, take a small '
                        'step, repeat. The step size is the <em>learning rate</em>: too small and '
                        'training crawls, too large and it overshoots and never settles.</p>',
                'code': '# The idea, in a few lines, for one feature\n'
                        'import numpy as np\n\n'
                        'def gradient_descent(x, y, rate=0.01, steps=1000):\n'
                        '    m, b = 0.0, 0.0\n'
                        '    n = len(x)\n'
                        '    for _ in range(steps):\n'
                        '        prediction = m * x + b\n'
                        '        error = prediction - y\n'
                        '        m -= rate * (2 / n) * np.sum(error * x)\n'
                        '        b -= rate * (2 / n) * np.sum(error)\n'
                        '    return m, b\n\n'
                        '# scikit-learn solves this for you, and does it better',
            },
            {
                'title': 'Why You Must Hold Data Back',
                'body': '<h1>Why You Must Hold Data Back</h1>'
                        '<p>Score a model on the same rows it trained on and you learn nothing '
                        'about whether it will work tomorrow. A model can memorise its training '
                        'set perfectly and still be useless on anything new.</p>'
                        '<p>So split the data before training. A common division is 80% to train '
                        'on and 20% held back to test with. The test set is touched once, at the '
                        'end.</p>'
                        '<p>Treat the test set as a sealed exam paper. Every time you peek at it '
                        'and adjust the model in response, you leak a little of its information '
                        'into your choices, and its verdict becomes a little more optimistic than '
                        'reality.</p>',
                'code': 'from sklearn.model_selection import train_test_split\n\n'
                        'X = df[["study_hours", "attendance", "prior_gpa"]]\n'
                        'y = df["final_score"]\n\n'
                        '# random_state fixes the shuffle so the split is reproducible\n'
                        'X_train, X_test, y_train, y_test = train_test_split(\n'
                        '    X, y, test_size=0.2, random_state=42\n'
                        ')\n\n'
                        'print(len(X_train), "training rows;", len(X_test), "held back")',
            },
            {
                'title': 'Building It with scikit-learn',
                'body': '<h1>Building It with scikit-learn</h1>'
                        '<p>Every model in scikit-learn follows the same three-step shape: create '
                        'it, <code>fit</code> it on the training data, <code>predict</code> with '
                        'it. Learn the pattern once and every other model is familiar.</p>',
                'code': 'from sklearn.linear_model import LinearRegression\n'
                        'from sklearn.metrics import mean_absolute_error, r2_score\n\n'
                        'model = LinearRegression()\n'
                        'model.fit(X_train, y_train)          # learn from the training rows\n\n'
                        'predictions = model.predict(X_test)  # apply to unseen rows\n\n'
                        'print("MAE:", mean_absolute_error(y_test, predictions))\n'
                        'print("R2 :", r2_score(y_test, predictions))\n\n'
                        '# What did it learn? Coefficients are readable\n'
                        'for name, weight in zip(X.columns, model.coef_):\n'
                        '    print(f"{name}: {weight:.3f}")',
            },
            {
                'title': 'Measuring Error: MAE, RMSE and R-squared',
                'body': '<h1>Measuring Error: MAE, RMSE and R-squared</h1>'
                        '<p>Three metrics, answering three different questions.</p>'
                        '<ul>'
                        '<li><strong>MAE</strong> - average size of the error, in the original units. Easy to explain: "off by 4.2 points on average".</li>'
                        '<li><strong>RMSE</strong> - like MAE but squares the errors first, so large misses count for much more.</li>'
                        '<li><strong>R-squared</strong> - the share of the variation the model explains, from 0 to 1.</li>'
                        '</ul>'
                        '<p>Choose by consequence. If being wrong by 50 is far worse than being '
                        'wrong by 5 twice, use RMSE, because it will notice. If every unit of '
                        'error costs the same, MAE describes reality better.</p>'
                        '<p>Report R-squared alongside one of them, never alone: it tells you '
                        'about proportion explained but nothing about the size of a typical miss.</p>',
            },
            {
                'title': 'Underfitting and Overfitting',
                'body': '<h1>Underfitting and Overfitting</h1>'
                        '<p>Two ways to fail, with opposite symptoms.</p>'
                        '<p><strong>Underfitting</strong> - the model is too simple for the '
                        'pattern. It scores badly on training data and badly on test data. A '
                        'straight line through a curve.</p>'
                        '<p><strong>Overfitting</strong> - the model is too flexible and has '
                        'memorised noise. It scores brilliantly on training data and poorly on '
                        'test data. This is the common one.</p>'
                        '<p>The gap between training and test scores is your diagnostic. Small '
                        'gap and both poor means underfitting: add features or a more flexible '
                        'model. Large gap means overfitting: simplify, gather more data, or '
                        'regularise. Module 5 covers the tools.</p>',
            },
        ],
        'quiz': {
            'title': 'Module 3 Quiz: Regression and Model Fit',
            'description': 'Train/test discipline, how models learn, error metrics, and diagnosing fit.',
            'questions': [
                {
                    'title': 'Purpose of the Test Set',
                    'text': 'Why must a model be evaluated on data it did not train on?',
                    'choices': [
                        'Because scoring on training data measures memorisation, not future performance',
                        'Because training data is usually of lower quality',
                        'Because it makes the model train faster',
                        'Because scikit-learn raises an error otherwise',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'Diagnosing the Gap',
                    'text': 'A model scores R-squared of 0.98 on training data and 0.41 on test data. What is happening?',
                    'choices': [
                        'Overfitting - it has memorised noise in the training set',
                        'Underfitting - it is too simple for the pattern',
                        'The test set is too large',
                        'The learning rate is too small',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'Choosing an Error Metric',
                    'text': 'Occasional very large prediction errors are far more costly than several small ones. Which metric reflects that best?',
                    'choices': [
                        'RMSE, because squaring makes large errors dominate',
                        'MAE, because it weights every error equally',
                        'R-squared, because it is a proportion',
                        'Accuracy, because it counts correct predictions',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'Reading a Coefficient',
                    'text': 'In a linear regression predicting price, the coefficient on floor area is 1,500. What does that mean?',
                    'choices': [
                        'Each additional unit of floor area adds 1,500 to the prediction, other features held constant',
                        'Floor area explains 1,500 percent of the variation in price',
                        'The model made 1,500 errors during training',
                        'Floor area must be scaled before it can be used',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'Regression Versus Classification',
                    'text': 'Predicting how many days a student will be absent this term is a regression problem.',
                    'true_false': True,
                    'correct': 0,
                },
            ],
        },
    },
    # ---------------------------------------------------------------- module 4
    {
        'title': 'Module 4: Classification and Honest Metrics',
        'description': 'Predicting categories with logistic regression, trees and k-NN, and why '
                       'accuracy is the wrong metric more often than students expect.',
        'duration': 60,
        'difficulty': 'intermediate',
        'points': 30,
        'skills': ['scikit-learn', 'Model Evaluation'],
        'slides': [
            {
                'title': 'When the Answer Is a Category',
                'body': '<h1>When the Answer Is a Category</h1>'
                        '<p>Classification predicts which group something belongs to: will this '
                        'student pass or fail, is this message spam, which of five species is '
                        'this flower.</p>'
                        '<ul>'
                        '<li><strong>Binary</strong> - two outcomes. Pass or fail.</li>'
                        '<li><strong>Multi-class</strong> - one of several. Which letter grade.</li>'
                        '<li><strong>Multi-label</strong> - several at once. Which topics a paper covers.</li>'
                        '</ul>'
                        '<p>Most classifiers do not output a bare label. They output a '
                        '<em>probability</em>, and a threshold turns it into a decision. That '
                        'threshold is yours to choose, and choosing it well is often worth more '
                        'than switching algorithms.</p>',
            },
            {
                'title': 'Logistic Regression',
                'body': '<h1>Logistic Regression</h1>'
                        '<p>Despite the name, this is a classifier. It computes a weighted sum '
                        'like linear regression, then squashes the result through the sigmoid '
                        'function into the range 0 to 1, giving a probability.</p>'
                        '<p>Predict "pass" when that probability exceeds your threshold - 0.5 by '
                        'default, but 0.5 is a convention, not a law.</p>'
                        '<p>It remains the sensible first model for binary problems: fast, hard '
                        'to overfit, and its coefficients still mean something, which matters '
                        'when a human has to justify the decision.</p>',
                'code': 'from sklearn.linear_model import LogisticRegression\n\n'
                        'model = LogisticRegression(max_iter=1000)\n'
                        'model.fit(X_train, y_train)\n\n'
                        'labels = model.predict(X_test)                  # 0 or 1\n'
                        'chances = model.predict_proba(X_test)[:, 1]     # probability of class 1\n\n'
                        '# Move the threshold when one kind of mistake costs more\n'
                        'strict = (chances &gt; 0.7).astype(int)',
            },
            {
                'title': 'Decision Trees and Random Forests',
                'body': '<h1>Decision Trees and Random Forests</h1>'
                        '<p>A <strong>decision tree</strong> asks a sequence of yes/no questions, '
                        'splitting the data to separate the classes. It reads like a flowchart, '
                        'which makes it easy to explain to non-technical people - a real '
                        'advantage in an academic setting.</p>'
                        '<p>Left unchecked, a single tree will keep splitting until every leaf is '
                        'pure, which is overfitting by construction.</p>'
                        '<p>A <strong>random forest</strong> fixes this by training many trees, '
                        'each on a random subset of rows and columns, then taking a vote. The '
                        'individual trees are noisy in different directions, so the errors '
                        'largely cancel. It is a strong, forgiving default for tabular data.</p>',
                'code': 'from sklearn.ensemble import RandomForestClassifier\n\n'
                        'forest = RandomForestClassifier(\n'
                        '    n_estimators=200,     # number of trees\n'
                        '    max_depth=None,       # let them grow; the vote controls overfitting\n'
                        '    random_state=42,\n'
                        ')\n'
                        'forest.fit(X_train, y_train)\n\n'
                        '# Which features actually mattered?\n'
                        'for name, score in sorted(\n'
                        '    zip(X.columns, forest.feature_importances_),\n'
                        '    key=lambda pair: -pair[1],\n'
                        '):\n'
                        '    print(f"{name}: {score:.3f}")',
            },
            {
                'title': 'k-Nearest Neighbours',
                'body': '<h1>k-Nearest Neighbours</h1>'
                        '<p>The simplest idea in machine learning: to classify a new point, find '
                        'the k training points closest to it and take the majority label.</p>'
                        '<p>There is no training phase at all - the model is the data. That makes '
                        'it easy to reason about but slow to predict on large datasets, since '
                        'every prediction measures distance to every stored point.</p>'
                        '<p>Two things decide whether it works. Small k follows noise; large k '
                        'blurs real boundaries. And because it is built on distance, k-NN is '
                        '<em>useless on unscaled features</em> - the column with the biggest '
                        'numbers silently becomes the only one that matters.</p>',
                'code': 'from sklearn.neighbors import KNeighborsClassifier\n'
                        'from sklearn.preprocessing import StandardScaler\n\n'
                        '# Scaling is mandatory here, not optional\n'
                        'scaler = StandardScaler()\n'
                        'X_train_scaled = scaler.fit_transform(X_train)\n'
                        'X_test_scaled = scaler.transform(X_test)\n\n'
                        'knn = KNeighborsClassifier(n_neighbors=5)\n'
                        'knn.fit(X_train_scaled, y_train)\n'
                        'print(knn.score(X_test_scaled, y_test))',
            },
            {
                'title': 'The Confusion Matrix',
                'body': '<h1>The Confusion Matrix</h1>'
                        '<p>One table showing exactly how a classifier succeeds and fails. For a '
                        'binary problem it has four cells.</p>'
                        '<ul>'
                        '<li><strong>True positive</strong> - predicted at risk, and the student was.</li>'
                        '<li><strong>True negative</strong> - predicted safe, and the student was.</li>'
                        '<li><strong>False positive</strong> - predicted at risk, but the student was fine. A false alarm.</li>'
                        '<li><strong>False negative</strong> - predicted safe, but the student dropped out. A miss.</li>'
                        '</ul>'
                        '<p>The two mistakes are not equally bad, and which one you can tolerate '
                        'is a decision about the real world, not about statistics. A false alarm '
                        'costs an unnecessary advising session. A miss costs a student.</p>',
                'code': 'from sklearn.metrics import confusion_matrix, classification_report\n\n'
                        'print(confusion_matrix(y_test, labels))\n'
                        '# [[TN FP]\n'
                        '#  [FN TP]]\n\n'
                        'print(classification_report(y_test, labels))',
            },
            {
                'title': 'Why Accuracy Lies',
                'body': '<h1>Why Accuracy Lies</h1>'
                        '<p>Suppose 2% of students drop out. A model that predicts "nobody drops '
                        'out" is 98% accurate and completely worthless. Whenever classes are '
                        'imbalanced, accuracy flatters uselessness.</p>'
                        '<p>Use metrics that look at the class you care about:</p>'
                        '<ul>'
                        '<li><strong>Precision</strong> - of those flagged at risk, what share really were? Punishes false alarms.</li>'
                        '<li><strong>Recall</strong> - of those really at risk, what share did we catch? Punishes misses.</li>'
                        '<li><strong>F1</strong> - the harmonic mean of the two, for when you need one number.</li>'
                        '<li><strong>ROC-AUC</strong> - how well the model ranks positives above negatives, across all thresholds.</li>'
                        '</ul>'
                        '<p>Precision and recall trade off against each other. Lower the threshold '
                        'and you catch more real cases while raising more false alarms. For '
                        'dropout prevention, recall usually wins: missing a struggling student is '
                        'worse than an extra conversation.</p>',
            },
            {
                'title': 'Putting a Classifier Together',
                'body': '<h1>Putting a Classifier Together</h1>'
                        '<p>The full shape of a small classification project, end to end. Note '
                        '<code>stratify</code> - it keeps the class balance the same in both '
                        'splits, which matters when one class is rare.</p>',
                'code': 'from sklearn.model_selection import train_test_split\n'
                        'from sklearn.ensemble import RandomForestClassifier\n'
                        'from sklearn.metrics import classification_report, roc_auc_score\n\n'
                        'X = df[["attendance", "prior_gpa", "submissions_late"]]\n'
                        'y = df["dropped_out"]\n\n'
                        'X_train, X_test, y_train, y_test = train_test_split(\n'
                        '    X, y, test_size=0.2, random_state=42, stratify=y\n'
                        ')\n\n'
                        'model = RandomForestClassifier(n_estimators=200, random_state=42)\n'
                        'model.fit(X_train, y_train)\n\n'
                        'print(classification_report(y_test, model.predict(X_test)))\n'
                        'print("ROC-AUC:", roc_auc_score(\n'
                        '    y_test, model.predict_proba(X_test)[:, 1]\n'
                        '))',
            },
        ],
        'quiz': {
            'title': 'Module 4 Quiz: Classification and Metrics',
            'description': 'Choosing classifiers, reading a confusion matrix, and picking metrics that are honest.',
            'questions': [
                {
                    'title': 'The Imbalance Trap',
                    'text': 'Two percent of students drop out. A model predicts that nobody drops out and reports 98 percent accuracy. What should you conclude?',
                    'choices': [
                        'Accuracy is misleading here; the model never identifies the class of interest',
                        'The model is excellent and ready to deploy',
                        'The test set must be too small',
                        'Accuracy should be replaced with mean squared error',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'Precision or Recall',
                    'text': 'You are flagging students at risk of dropping out so advisers can reach them. Missing a struggling student is much worse than an unnecessary meeting. Which metric should you favour?',
                    'choices': [
                        'Recall, because it penalises missed at-risk students',
                        'Precision, because it penalises false alarms',
                        'Accuracy, because it summarises everything',
                        'R-squared, because it measures explained variance',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'A Costly Cell',
                    'text': 'In this dropout model, which confusion-matrix cell represents the most damaging error?',
                    'choices': [
                        'False negative - predicted safe, but the student dropped out',
                        'False positive - predicted at risk, but the student was fine',
                        'True positive - correctly flagged as at risk',
                        'True negative - correctly identified as safe',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'Scaling and k-NN',
                    'text': 'Why must features be scaled before using k-nearest neighbours?',
                    'choices': [
                        'It classifies by distance, so the largest-valued column would dominate',
                        'Unscaled data makes the training step fail',
                        'It requires every feature to be a probability',
                        'Scaling is what converts categories into numbers',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'How a Forest Helps',
                    'text': 'A random forest reduces overfitting by averaging many trees trained on different random subsets of the data.',
                    'true_false': True,
                    'correct': 0,
                },
            ],
        },
    },
    # ---------------------------------------------------------------- module 5
    {
        'title': 'Module 5: Validation, Tuning and Deployment',
        'description': 'Cross-validation, the bias-variance trade-off, hyperparameter search, '
                       'pipelines that prevent leakage, saving a model, and the ethics of using it.',
        'duration': 65,
        'difficulty': 'intermediate',
        'points': 35,
        'skills': ['Model Evaluation', 'scikit-learn'],
        'slides': [
            {
                'title': 'Cross-Validation',
                'body': '<h1>Cross-Validation</h1>'
                        '<p>A single train/test split gives you one number, and that number '
                        'depends on which rows happened to land in the test set. With a small '
                        'dataset the luck of the split can swamp the difference between two '
                        'models.</p>'
                        '<p><strong>k-fold cross-validation</strong> removes the luck. Split the '
                        'data into k parts, train k times, each time holding out a different '
                        'part, then average the scores. Every row is used for testing exactly '
                        'once.</p>'
                        '<p>Five or ten folds is standard. For imbalanced classes use the '
                        'stratified version, which keeps the class proportions in every fold. '
                        'Report the spread as well as the mean - a model averaging 0.80 with a '
                        'range of 0.60 to 0.95 is not the same as one steady at 0.80.</p>',
                'code': 'from sklearn.model_selection import cross_val_score, StratifiedKFold\n\n'
                        'folds = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)\n'
                        'scores = cross_val_score(model, X, y, cv=folds, scoring="f1")\n\n'
                        'print("per fold:", scores.round(3))\n'
                        'print(f"mean {scores.mean():.3f} (+/- {scores.std():.3f})")',
            },
            {
                'title': 'The Bias-Variance Trade-off',
                'body': '<h1>The Bias-Variance Trade-off</h1>'
                        '<p>Prediction error has two reducible parts, and they pull in opposite '
                        'directions.</p>'
                        '<p><strong>Bias</strong> is error from being too simple - the model '
                        'cannot represent the real pattern. High bias shows up as underfitting.</p>'
                        '<p><strong>Variance</strong> is error from being too sensitive - change '
                        'the training data slightly and the model changes a lot. High variance '
                        'shows up as overfitting.</p>'
                        '<p>Making a model more flexible lowers bias and raises variance. The '
                        'goal is not zero of either but the point where their sum is smallest. '
                        'This is why "use the most powerful model available" is bad advice: past '
                        'a point, added flexibility buys variance you cannot afford.</p>',
            },
            {
                'title': 'Hyperparameter Tuning',
                'body': '<h1>Hyperparameter Tuning</h1>'
                        '<p>Parameters are learned from data. <em>Hyperparameters</em> are the '
                        'settings you choose before training: the number of trees, the depth '
                        'limit, k in k-NN, the regularisation strength.</p>'
                        '<ul>'
                        '<li><strong>Grid search</strong> - try every combination you list. Thorough, and expensive as the grid grows.</li>'
                        '<li><strong>Random search</strong> - sample combinations at random. Usually finds something nearly as good far faster.</li>'
                        '</ul>'
                        '<p>Tune using cross-validation on the training data only. If you tune '
                        'against the test set, its score stops being an estimate of future '
                        'performance and becomes a description of how hard you searched.</p>',
                'code': 'from sklearn.model_selection import GridSearchCV\n\n'
                        'grid = {\n'
                        '    "n_estimators": [100, 200, 400],\n'
                        '    "max_depth": [None, 8, 16],\n'
                        '    "min_samples_leaf": [1, 2, 4],\n'
                        '}\n\n'
                        'search = GridSearchCV(\n'
                        '    RandomForestClassifier(random_state=42),\n'
                        '    grid, cv=5, scoring="f1", n_jobs=-1,\n'
                        ')\n'
                        'search.fit(X_train, y_train)   # training data only\n\n'
                        'print(search.best_params_)\n'
                        'print(f"best CV f1: {search.best_score_:.3f}")',
            },
            {
                'title': 'Pipelines and Data Leakage',
                'body': '<h1>Pipelines and Data Leakage</h1>'
                        '<p><strong>Data leakage</strong> is when information from outside the '
                        'training set sneaks into training. The model looks brilliant in '
                        'development and disappoints in production.</p>'
                        '<p>The classic version is scaling before splitting. Fit a scaler on the '
                        'whole dataset and it has already seen the test set\'s mean and spread - '
                        'the test score is now contaminated.</p>'
                        '<p>A <strong>pipeline</strong> makes this mistake hard to commit. It '
                        'chains preprocessing and model into one object, and when cross-validation '
                        'trains on a fold, every step is fitted on that fold alone.</p>',
                'code': 'from sklearn.pipeline import Pipeline\n'
                        'from sklearn.preprocessing import StandardScaler\n'
                        'from sklearn.impute import SimpleImputer\n\n'
                        'pipe = Pipeline([\n'
                        '    ("impute", SimpleImputer(strategy="median")),\n'
                        '    ("scale", StandardScaler()),\n'
                        '    ("model", LogisticRegression(max_iter=1000)),\n'
                        '])\n\n'
                        '# Every step is fitted per fold - no leakage\n'
                        'scores = cross_val_score(pipe, X, y, cv=5, scoring="f1")\n'
                        'print(scores.mean().round(3))',
            },
            {
                'title': 'Saving and Loading a Model',
                'body': '<h1>Saving and Loading a Model</h1>'
                        '<p>A trained model is an object you can write to disk and load later, so '
                        'nothing has to be retrained to make a prediction.</p>'
                        '<p>Save the whole pipeline, not just the estimator. If you save only the '
                        'model you must remember to reproduce the imputing and scaling exactly at '
                        'prediction time, and one day you will not.</p>'
                        '<p>Record the library versions alongside it. A model pickled by one '
                        'scikit-learn version may refuse to load in another, and that failure '
                        'usually surfaces at the worst moment.</p>',
                'code': 'import joblib\n\n'
                        'pipe.fit(X_train, y_train)\n'
                        'joblib.dump(pipe, "dropout_model.joblib")\n\n'
                        '# Later, in a different process\n'
                        'loaded = joblib.load("dropout_model.joblib")\n'
                        'risk = loaded.predict_proba([[0.72, 2.4, 3]])[0][1]\n'
                        'print(f"risk: {risk:.1%}")',
            },
            {
                'title': 'Serving a Model Behind an API',
                'body': '<h1>Serving a Model Behind an API</h1>'
                        '<p>Deployment usually means putting the model behind an HTTP endpoint so '
                        'other software can ask it questions. Load the model once when the '
                        'process starts, not per request.</p>'
                        '<p>Three things separate a demo from something usable: validate the '
                        'input before predicting, return the probability rather than only a '
                        'label so the caller can apply its own threshold, and log inputs and '
                        'outputs so you can tell later whether the model is drifting.</p>',
                'code': '# Sketch of a Django view serving predictions\n'
                        'import joblib\n'
                        'from rest_framework.decorators import api_view\n'
                        'from rest_framework.response import Response\n\n'
                        'MODEL = joblib.load("dropout_model.joblib")   # once, at import\n\n'
                        '@api_view(["POST"])\n'
                        'def predict_risk(request):\n'
                        '    try:\n'
                        '        features = [[\n'
                        '            float(request.data["attendance"]),\n'
                        '            float(request.data["prior_gpa"]),\n'
                        '            int(request.data["submissions_late"]),\n'
                        '        ]]\n'
                        '    except (KeyError, TypeError, ValueError):\n'
                        '        return Response({"error": "invalid features"}, status=400)\n\n'
                        '    probability = MODEL.predict_proba(features)[0][1]\n'
                        '    return Response({"risk": round(float(probability), 4)})',
            },
            {
                'title': 'Ethics and Responsibility',
                'body': '<h1>Ethics and Responsibility</h1>'
                        '<p>A model that predicts which students will fail can be used to support '
                        'them or to quietly write them off. The mathematics is identical; the '
                        'consequence is not.</p>'
                        '<ul>'
                        '<li><strong>Bias in, bias out.</strong> A model trained on past decisions learns past prejudices and applies them at scale.</li>'
                        '<li><strong>Proxies leak protected traits.</strong> Remove gender and a model may reconstruct it from other columns.</li>'
                        '<li><strong>Feedback loops.</strong> Flagged students get extra help and pass, then the model looks wrong for flagging them.</li>'
                        '<li><strong>Explanation is owed.</strong> Anyone affected by an automated decision deserves to know why.</li>'
                        '</ul>'
                        '<p>Practical habits: check performance separately for each subgroup, not '
                        'just overall; document what the model is and is not for; and keep a '
                        'human in the loop for decisions that materially affect a person.</p>',
            },
        ],
        'quiz': {
            'title': 'Module 5 Quiz: Validation, Tuning and Responsible Use',
            'description': 'Cross-validation, bias and variance, tuning without cheating, leakage, and ethics.',
            'questions': [
                {
                    'title': 'Why Cross-Validate',
                    'text': 'What problem does k-fold cross-validation solve compared with a single train/test split?',
                    'choices': [
                        'The score no longer depends on which rows happened to land in one test set',
                        'It removes the need to clean the data',
                        'It guarantees the model will not overfit',
                        'It makes training k times faster',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'Where Leakage Comes From',
                    'text': 'A scaler is fitted on the whole dataset before splitting into train and test. What is the consequence?',
                    'choices': [
                        'Leakage - the test score is optimistic because scaling saw the test data',
                        'Nothing; scaling does not affect evaluation',
                        'The model will underfit because features are too uniform',
                        'Training will fail with a shape error',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'Flexibility and Error',
                    'text': 'Making a model substantially more flexible usually has which effect?',
                    'choices': [
                        'Bias falls and variance rises',
                        'Both bias and variance fall',
                        'Both bias and variance rise',
                        'Bias rises and variance falls',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'Tuning Honestly',
                    'text': 'Which data should hyperparameter search be run against?',
                    'choices': [
                        'The training data, using cross-validation within it',
                        'The held-back test set, since that is what will be reported',
                        'The full dataset, to use every row',
                        'A fresh random sample drawn after testing',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'Fairness Checks',
                    'text': 'Removing a protected attribute such as gender from the features guarantees the model cannot discriminate on it.',
                    'true_false': True,
                    'correct': 1,
                },
            ],
        },
    },
]
