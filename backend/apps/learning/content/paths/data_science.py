"""
Content for the Data Science and Machine Learning path.

Moved verbatim out of `seed_datascience_path.py` when the seeding machinery was
generalised. The bytes of every slide and question are unchanged; only where
they live has moved, so the rendered HTML is identical to what is already in the
database.
"""

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
                'body': ''
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
            'description': 'The workflow, data types, descriptive statistics and choosing a plot.',
            'questions': [
                {
                    'title': 'Levels of Analysis',
                    'text': 'A report names the forty students most likely to withdraw next term. Which level of analysis is that?',
                    'choices': [
                    'Diagnostic, because it explains why last term enrolment moved',
                    'Predictive, because it estimates an outcome that has not happened',
                    'Descriptive, because it summarises what the records already hold',
                    'Prescriptive, because it recommends one specific intervention',
                ],
                    'correct': 1,
                },
                {
                    'title': 'Where the Effort Goes',
                    'text': 'Across the six stages of a data project, which two consume the largest share of the work?',
                    'choices': [
                        'Asking the question and communicating the result',
                        'Collecting the data and choosing an algorithm',
                        'Modelling and tuning the model parameters',
                        'Cleaning the data and exploring it',
                    ],
                    'correct': 3,
                },
                {
                    'title': 'Classifying an Identifier',
                    'text': 'A table stores student numbers such as 2021-00457. How should that column be treated?',
                    'choices': [
                    'As nominal, because the value labels a person rather than counting',
                    'As continuous, so that averages and totals can be computed from it',
                    'As ordinal, because numbers issued later are arithmetically larger',
                    'As discrete, because it counts registrations in the order received',
                ],
                    'correct': 0,
                },
                {
                    'title': 'Summarising by Group',
                    'text': 'You need the average GPA for each year level. Which pandas expression produces it?',
                    'choices': [
                        'df.describe() restricted to the gpa column',
                        'df.sort_values("year") followed by df["gpa"].mean()',
                        'df.groupby("year")["gpa"].mean()',
                        'df[df["year"]]["gpa"].median()',
                    ],
                    'correct': 2,
                },
                {
                    'title': 'Mean Against Median',
                    'text': 'Nine graduates earn about 20,000 and one earns 500,000. Which figure better describes a typical graduate?',
                    'choices': [
                        'The mean, because every observation contributes to it',
                        'The median, because a single extreme value barely shifts it',
                        'The standard deviation, because it captures how spread out pay is',
                        'The mode, because salaries repeat across the group',
                    ],
                    'correct': 1,
                },
                {
                    'title': 'Choosing a Plot',
                    'text': 'You want to see whether study hours and exam scores rise together. Which plot answers that most directly?',
                    'choices': [
                        'A scatter plot of study hours against exam score',
                        'A histogram of the exam scores on their own',
                        'A bar chart of the mean score for each section',
                        'A line chart of scores across the semester',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'A Column That Misleads a Model',
                    'text': 'Why can feeding raw student ID numbers into a model actively cause harm?',
                    'choices': [
                    'Identifiers are often missing for students who enrolled recently',
                    'Models cannot parse values that contain a hyphen without encoding',
                    'The column holds too many distinct values to store or index well',
                    'The model reads the codes as magnitudes and fits a pattern that is not there',
                ],
                    'correct': 3,
                },
                {
                    'title': 'Statistics Without Plots',
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
            'description': 'Missing values, outliers, encoding, scaling and reading correlations honestly.',
            'questions': [
                {
                    'title': 'Blanks That Carry Information',
                    'text': 'Students who leave an optional income field blank turn out to be likelier to withdraw. What is the best treatment?',
                    'choices': [
                    'Drop every row where the field is blank, keeping only complete records',
                    'Replace the blanks with zero so the column stays fully numeric',
                    'Add a column recording that it was blank, then impute the value',
                    'Drop the income column, since a partly empty feature cannot be trusted',
                ],
                    'correct': 2,
                },
                {
                    'title': 'Imputing a Skewed Column',
                    'text': 'A salary column has a long tail of very high values and some blanks. Which fill value distorts it least?',
                    'choices': [
                        'The median of the observed salaries',
                        'The mean of the observed salaries',
                        'The largest observed salary in the column',
                        'Zero, so that the gap remains visible',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'Encoding Without Inventing Order',
                    'text': 'A column records which city a student comes from, with no meaningful ordering. Which encoding suits it?',
                    'choices': [
                    'Ordinal encoding, mapping each city to 1, 2, 3 in alphabetical order',
                    'Standardising the numeric city codes so they centre on zero',
                    'Leaving the names as text and letting the model interpret them',
                    'One-hot encoding, with one indicator column for each city',
                ],
                    'correct': 3,
                },
                {
                    'title': 'When Order Is Real',
                    'text': 'Year level runs freshman, sophomore, junior, senior. Which encoding preserves what matters?',
                    'choices': [
                        'One-hot encoding, so that no ordering is implied',
                        'Ordinal encoding, mapping the levels to 1 through 4',
                        'Dropping the column, since text cannot be modelled',
                        'Hashing the labels into fixed-width numeric codes',
                    ],
                    'correct': 1,
                },
                {
                    'title': 'Which Model Ignores Scale',
                    'text': 'Which model is essentially unaffected by whether the features have been scaled?',
                    'choices': [
                        'k-nearest neighbours, which compares distances between rows',
                        'A support vector machine using an RBF kernel',
                        'Linear regression trained by gradient descent',
                        'A decision tree, which splits one column at a time',
                    ],
                    'correct': 3,
                },
                {
                    'title': 'Judging an Outlier',
                    'text': 'The interquartile rule flags a student with perfect attendance and top marks. What should you do?',
                    'choices': [
                    'Delete the row, because flagged values distort the fitted model',
                    'Replace both values with the column medians to pull them inward',
                    'Keep it, because a genuine rare case is data rather than an error',
                    'Cap both values at the flag boundary so the row still counts',
                ],
                    'correct': 2,
                },
                {
                    'title': 'Reading a Correlation',
                    'text': 'Ice cream sales and drowning deaths rise together every summer. What does the correlation establish?',
                    'choices': [
                        'That the correlation must be a calculation mistake',
                        'Nothing causal, because a third factor drives both',
                        'That rising ice cream sales cause drownings',
                        'That rising drownings drive ice cream sales',
                    ],
                    'correct': 1,
                },
                {
                    'title': 'Limits of a Correlation Coefficient',
                    'text': 'A correlation near zero proves that two columns have no relationship of any kind.',
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
            'description': 'Train and test discipline, how a model learns, error metrics and diagnosing fit.',
            'questions': [
                {
                    'title': 'Purpose of a Held-Back Set',
                    'text': 'Why must a model be scored on rows it never trained on?',
                    'choices': [
                    'Because training rows are collected less carefully than later ones',
                    'Because scikit-learn refuses to score a model on its training data',
                    'Because evaluating on fewer rows shortens the time training takes',
                    'Because scoring on training rows measures recall of them, not skill',
                ],
                    'correct': 3,
                },
                {
                    'title': 'Diagnosing the Gap',
                    'text': 'A model reaches R-squared of 0.98 on training rows and 0.41 on held-back rows. What is happening?',
                    'choices': [
                    'Underfitting, because the model is too simple to fit the pattern',
                    'Overfitting, because it absorbed noise particular to those rows',
                    'The held-back set is too large for the score to settle reliably',
                    'The learning rate is so low that training stopped early',
                ],
                    'correct': 1,
                },
                {
                    'title': 'What Gradient Descent Adjusts',
                    'text': 'During training by gradient descent, what is actually changed on each step?',
                    'choices': [
                    'The number of rows drawn into each training batch',
                    'The metric that will be used to report the final error',
                    'The coefficients, nudged in the direction that lowers the cost',
                    'The proportion of the data that is held back for testing',
                ],
                    'correct': 2,
                },
                {
                    'title': 'Choosing an Error Metric',
                    'text': 'Occasional very large misses are far more costly than several small ones. Which metric reflects that?',
                    'choices': [
                        'RMSE, because squaring lets large errors dominate',
                        'MAE, because it weights every error equally',
                        'R-squared, because it reports a proportion explained',
                        'Accuracy, because it counts the predictions that were right',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'Reading a Coefficient',
                    'text': 'In a regression predicting price, the coefficient on floor area is 1,500. What does that state?',
                    'choices': [
                    'Floor area explains 1,500 percent of the variation in the price',
                    'Each extra unit of area adds 1,500 to the prediction, others fixed',
                    'The model made 1,500 separate errors over the training run',
                    'Floor area must be rescaled by 1,500 before the model uses it',
                ],
                    'correct': 1,
                },
                {
                    'title': 'Recognising Underfitting',
                    'text': 'Which pair of scores points to underfitting rather than overfitting?',
                    'choices': [
                        'Training 0.97 and test 0.55',
                        'Training 0.99 and test 0.98',
                        'Training 0.51 and test 0.49',
                        'Training 0.88 and test 0.42',
                    ],
                    'correct': 2,
                },
                {
                    'title': 'Why the Test Set Stays Sealed',
                    'text': 'What goes wrong if you check the test score after every change and adjust the model in response?',
                    'choices': [
                    'The test score drifts up and stops estimating real performance',
                    'The model can no longer be retrained from the original raw data',
                    'The split stops being reproducible from one run to the next',
                    'The coefficients can no longer be read as effects on the target',
                ],
                    'correct': 0,
                },
                {
                    'title': 'Naming the Task',
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
            'description': 'Choosing a classifier, reading a confusion matrix, and metrics that stay honest.',
            'questions': [
                {
                    'title': 'The Imbalance Trap',
                    'text': 'Two percent of students withdraw. A model predicts that nobody withdraws and reports 98 percent accuracy. What follows?',
                    'choices': [
                    'Accuracy misleads here, since the model never finds the rare class',
                    'The model performs well and is ready to be put into use',
                    'The held-back set was too small for the score to mean anything',
                    'Accuracy should be swapped for mean squared error on the labels',
                ],
                    'correct': 0,
                },
                {
                    'title': 'Precision Against Recall',
                    'text': 'Advisers will contact every student the model flags. Missing someone in difficulty is far worse than an unnecessary meeting. Which metric should lead?',
                    'choices': [
                        'Precision, since it penalises unnecessary contacts',
                        'Accuracy, since it summarises overall correctness',
                        'Recall, since it penalises students who were missed',
                        'R-squared, since it reports the variance explained',
                    ],
                    'correct': 2,
                },
                {
                    'title': 'The Costly Cell',
                    'text': 'In that dropout model, which confusion-matrix cell carries the greatest human cost?',
                    'choices': [
                        'True negative, correctly identified as not at risk',
                        'False negative, predicted safe but the student withdrew',
                        'False positive, flagged at risk but the student was fine',
                        'True positive, correctly flagged as at risk',
                    ],
                    'correct': 1,
                },
                {
                    'title': 'Scaling and Distance',
                    'text': 'Why must features be scaled before using k-nearest neighbours?',
                    'choices': [
                    'Unscaled columns make the fitting step fail with a value error',
                    'Every feature has to be expressed as a probability between 0 and 1',
                    'Scaling is the step that turns categories into usable numbers',
                    'It classifies by distance, so the largest-valued column dominates',
                ],
                    'correct': 3,
                },
                {
                    'title': 'How an Ensemble Helps',
                    'text': 'What makes a random forest less prone to overfitting than a single deep decision tree?',
                    'choices': [
                    'It caps every tree at a shallow depth so none can memorise rows',
                    'It discards rows that look like outliers before any tree is grown',
                    'It averages trees grown on different subsets, so errors offset',
                    'It rescales the features before each candidate split is chosen',
                ],
                    'correct': 2,
                },
                {
                    'title': 'Moving the Threshold',
                    'text': 'You lower the decision threshold from 0.5 to 0.3. What generally happens?',
                    'choices': [
                    'Recall rises and precision falls, because more cases get flagged',
                    'Both recall and precision rise, because the model grows more certain',
                    'Recall falls and precision rises, because flags become much rarer',
                    'Neither changes, because the threshold only affects the display',
                ],
                    'correct': 0,
                },
                {
                    'title': 'Keeping a Rare Class in Both Splits',
                    'text': 'Only three percent of rows belong to the positive class. Which argument to train_test_split protects that balance?',
                    'choices': [
                    'shuffle, so that the rows are mixed thoroughly before splitting',
                    'random_state, so that the same split can be reproduced later',
                    'test_size, so that the held-back portion contains more rows',
                    'stratify, so that both splits keep the original class proportions',
                ],
                    'correct': 3,
                },
                {
                    'title': 'What Logistic Regression Outputs',
                    'text': 'Logistic regression returns a probability, which a threshold then converts into a predicted class.',
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
                'body': ''
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
            'description': 'Cross-validation, bias and variance, tuning without cheating, leakage and ethics.',
            'questions': [
                {
                    'title': 'What Cross-Validation Fixes',
                    'text': 'What problem does k-fold cross-validation address compared with a single split?',
                    'choices': [
                    'It removes the need to clean or impute the data beforehand',
                    'The score stops depending on which rows landed in one test set',
                    'It guarantees that the resulting model will not overfit at all',
                    'It makes the whole training run finish roughly k times faster',
                ],
                    'correct': 1,
                },
                {
                    'title': 'Where Leakage Enters',
                    'text': 'A scaler is fitted on the entire dataset before the train and test split. What is the consequence?',
                    'choices': [
                    'Training fails, because the scaled arrays no longer match in shape',
                    'The model underfits, because the features became too uniform',
                    'Nothing at all, because scaling cannot affect how a model scores',
                    'The test score is optimistic, because scaling already saw those rows',
                ],
                    'correct': 3,
                },
                {
                    'title': 'Flexibility and Error',
                    'text': 'Making a model substantially more flexible usually has which effect?',
                    'choices': [
                        'Bias falls while variance rises',
                        'Both bias and variance fall together',
                        'Both bias and variance rise together',
                        'Bias rises while variance falls',
                    ],
                    'correct': 0,
                },
                {
                    'title': 'Tuning Honestly',
                    'text': 'Which data should a hyperparameter search be scored against?',
                    'choices': [
                        'The full dataset, so that no row is wasted',
                        'The held-back test set, since that is what gets reported',
                        'The training data, using cross-validation inside it',
                        'A fresh sample drawn after testing has finished',
                    ],
                    'correct': 2,
                },
                {
                    'title': 'What a Pipeline Buys',
                    'text': 'Why does wrapping imputing, scaling and the model in a Pipeline reduce the risk of leakage?',
                    'choices': [
                    'Every step is fitted on the training fold alone during validation',
                    'It caches the fitted steps so that they never need refitting again',
                    'It drops rows containing missing values before anything is fitted',
                    'It chooses sensible hyperparameters without running any search',
                ],
                    'correct': 0,
                },
                {
                    'title': 'What to Save to Disk',
                    'text': 'You are saving a trained model for later use. What should be written out?',
                    'choices': [
                        'Only the estimator, since preprocessing can be redone by hand',
                        'The whole pipeline, so preprocessing travels with the model',
                        'Only the learned coefficients, as plain numbers',
                        'The training data, so the model can be refitted on load',
                    ],
                    'correct': 1,
                },
                {
                    'title': 'A Feedback Loop',
                    'text': 'Flagged students receive extra support and go on to pass. Why does that complicate judging the model later?',
                    'choices': [
                    'The support changed the outcome, so the flags now look like errors',
                    'The model must be retrained with a different algorithm each term',
                    'The flagged rows cannot be retained once the term has finished',
                    'Accuracy cannot be computed at all once any outcome has changed',
                ],
                    'correct': 0,
                },
                {
                    'title': 'Fairness by Omission',
                    'text': 'Removing a protected attribute such as gender from the features guarantees the model cannot discriminate on it.',
                    'true_false': True,
                    'correct': 1,
                },
            ],
        },
    },
]

MANIFEST = dict(PATH, slug='data-science-and-machine-learning', modules=MODULES)
