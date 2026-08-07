"""
Data analysis and reporting — turning data into something someone can decide on.

Reused by: Data Analyst, Business Intelligence Analyst, Reporting Analyst, Data
Steward, Business Analyst, IT Auditor, Digital Transformation Analyst.
"""

MODULE = {
    'title': 'Data Analysis and Reporting',
    'description': 'Asking a question data can answer, cleaning what you get, reading it '
                   'without fooling yourself, and presenting it so it is acted on.',
    'duration': 85,
    'difficulty': 'beginner',
    'skills': ['Data Analysis', 'Reporting', 'Data Quality'],
    'slides': [
        {
            'title': 'Start With the Decision',
            'body': '<p>The first question is not "what does the data say" but "what '
                    'decision is waiting on this, and what would change it".</p>'
                    '<p>If no answer would change what anyone does, the analysis is '
                    'decoration. That sounds harsh and saves enormous amounts of time: most '
                    'requests for "a dashboard of everything" contain one or two numbers '
                    'somebody actually acts on, and the rest is furniture.</p>'
                    '<p>Ask what they will do if the number is high, and what they will do if '
                    'it is low. If the answer is the same, they do not need the number.</p>',
        },
        {
            'title': 'Know What the Data Means',
            'body': '<p>Before analysing a column, find out how it comes to exist: who '
                    'enters it, when, whether it can be left blank, and what the values '
                    'meant historically.</p>'
                    '<p>This is where wrong answers are manufactured. A status field that '
                    'gained a new value two years ago will make a trend appear that is really '
                    'a change of definition. A "date" that is sometimes when a thing happened '
                    'and sometimes when it was recorded will not survive being counted by '
                    'month.</p>'
                    '<p>The people who enter the data know these things and are rarely '
                    'asked.</p>',
        },
        {
            'title': 'Cleaning, and Being Honest About It',
            'body': '<p>Real data has duplicates, blanks, inconsistent spellings and values '
                    'that cannot be true. Cleaning it is most of the work.</p>'
                    '<p>Every cleaning decision changes the answer, so record it. Dropping '
                    'rows with a missing value is a choice: if the value is missing more '
                    'often for one group, dropping them removes that group from your '
                    'conclusion.</p>'
                    '<p>Treat impossible values as a signal, not a nuisance. An age of 200 or '
                    'a date in 1900 usually means a default the system writes when a field '
                    'was skipped — and knowing that tells you something about the process, '
                    'not just the row.</p>',
        },
        {
            'title': 'Averages Hide Things',
            'body': '<p>The mean is pulled by extremes; the median is not. Reporting the '
                    'average salary of a small company containing one founder describes '
                    'nobody who works there.</p>'
                    '<p>Always look at the spread, not only the middle. Two groups with '
                    'identical averages can be completely different — and the difference is '
                    'usually the interesting part.</p>'
                    '<p>Beware the average of an average: the mean of three branch averages '
                    'is not the mean across all customers unless the branches happen to be '
                    'the same size.</p>',
        },
        {
            'title': 'Correlation Is Not Cause',
            'body': '<p>Two things moving together can mean one causes the other, the reverse, '
                    'a third thing causing both, or coincidence.</p>'
                    '<p>The third case is the one that gets acted on. Students who use the '
                    'library score better; libraries do not cause grades, and conscientious '
                    'students do both. Buying more library seats to raise grades spends money '
                    'on the wrong thing.</p>'
                    '<p>Also watch for selection effects. If your data only contains people '
                    'who completed the course, conclusions about "students" exclude everyone '
                    'the course failed — which is precisely the group a question about '
                    'dropout is asking about.</p>',
        },
        {
            'title': 'Charts That Do Not Mislead',
            'body': '<p>Pick the chart for the question. Comparison between categories: bars. '
                    'Change over time: a line. Relationship between two measures: a scatter. '
                    'Parts of a whole, and only with a few parts: pie.</p>'
                    '<p>A bar chart with a truncated axis exaggerates a small difference into '
                    'a dramatic one, which is the most common way an honest analyst misleads '
                    'people by accident. Start bar axes at zero.</p>'
                    '<p>Label the axes, name the units, say what period it covers, and say how '
                    'many observations it rests on. A percentage without a denominator is not '
                    'a finding — 50% improvement can be one case out of two.</p>',
        },
        {
            'title': 'Reports People Use',
            'body': '<p>A report is read by someone with little time who needs to decide '
                    'something.</p>'
                    '<p>Lead with the answer, then the evidence, then the caveats. Burying '
                    'the conclusion under methodology is how reports go unread — the '
                    'methodology matters, and it matters second.</p>'
                    '<p>Say what you are not confident about, and why. An analyst who states '
                    'limits plainly is trusted the next time; one who presents everything as '
                    'certain is believed once.</p>',
        },
        {
            'title': 'The Same Number Twice',
            'body': '<p>When two reports give different figures for "active students", both '
                    'are usually right and are counting different things — one includes '
                    'those on leave, the other does not.</p>'
                    '<p>The fix is agreeing definitions and writing them down where the number '
                    'is published, not producing a third report. Every organisation has a '
                    'meeting somewhere that is really an argument about a definition nobody '
                    'has recorded.</p>'
                    '<p>That is what data governance is for, and it is mostly agreement and '
                    'documentation rather than technology.</p>',
        },
    ],
    'quiz': {
        'title': 'Quiz: Data Analysis and Reporting',
        'description': 'Framing, data quality, statistics that mislead, charts and reports.',
        'time_limit': 18,
        'questions': [
            {
                'title': 'Where to Start',
                'text': 'What should you establish before beginning an analysis?',
                'choices': [
                               'How much data is available',
                               'Who will present the findings',
                               'What decision is waiting on it and what would change it',
                               'Which charting tool to use',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'A Number Nobody Acts On',
                'text': 'A stakeholder would do the same thing whether a figure is high or '
                        'low. What follows?',
                'choices': [
                    'They do not need the figure',
                    'The figure should be reported quarterly instead',
                    'The analysis needs a larger sample',
                    'The figure should be shown as a percentage',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'A Trend That Is Not One',
                'text': 'A status field gained a new value two years ago. What can that '
                        'produce in a trend?',
                'choices': [
                               'Missing values in the earlier period',
                               'Duplicate rows after the change',
                               'A correlation with an unrelated measure',
                               'An apparent change that is really a change of definition',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'Dropping Blank Rows',
                'text': 'Why is dropping rows with a missing value a decision to record?',
                'choices': [
                    'If it is missing more often for one group, that group leaves your conclusion',
                    'It reduces the sample below the required minimum',
                    'Blank values can be recovered later',
                    'It changes the file format',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'An Impossible Value',
                'text': 'A record shows an age of 200. What does that most often indicate?',
                'choices': [
                               'A data entry typo by one person',
                               'A corrupted database row',
                               'A value in different units',
                               'A default the system writes when the field was skipped',
                           ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'Mean Or Median',
                'text': 'Why report the median salary of a small company rather than the mean?',
                'choices': [
                    'The mean is pulled by extremes and may describe nobody who works there',
                    'The median is quicker to calculate',
                    'The mean cannot be computed on small samples',
                    'The median includes people who left',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'The Average of Averages',
                'text': 'Why is the mean of three branch averages usually not the overall mean?',
                'choices': [
                               'Each branch measures a different thing',
                               'Rounding errors accumulate across branches',
                               'Unless the branches are the same size, they should not weigh equally',
                               'Averages cannot be averaged in any circumstance',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'Library Use and Grades',
                'text': 'Students who use the library score better. What is the likeliest '
                        'explanation?',
                'choices': [
                               'Better grades cause library use',
                               'The relationship is a coincidence in the data',
                               'A third factor, such as conscientiousness, drives both',
                               'The library causes better grades',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'Who Is in the Data',
                'text': 'Your data contains only students who completed the course. What '
                        'question can it not answer?',
                'choices': [
                               'Anything about module choice',
                               'Anything about why students drop out',
                               'Anything about final grades',
                               'Anything about time spent studying',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'A Truncated Axis',
                'text': 'What does starting a bar chart axis above zero do?',
                'choices': [
                               'Reverses the order of the bars',
                               'Exaggerates a small difference into a dramatic one',
                               'Makes the chart harder to read at small sizes',
                               'Hides categories with low values',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'A Percentage With No Denominator',
                'text': 'Why is "50% improvement" not a finding on its own?',
                'choices': [
                               'It should be expressed as a ratio',
                               'It can be one case out of two',
                               'Percentages cannot be compared across periods',
                               'It does not name the measure',
                           ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'Structuring a Report',
                'text': 'What order serves a busy reader best?',
                'choices': [
                    'The answer, then the evidence, then the caveats',
                    'The methodology, then the data, then the answer',
                    'The caveats first, so expectations are set',
                    'The charts first, with text as an appendix',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Two Reports, Two Numbers',
                'text': 'Two reports disagree on how many students are active. What is the fix?',
                'choices': [
                               'Produce a third report to arbitrate',
                               'Use whichever figure is more recent',
                               'Average the two figures',
                               'Agree the definition and publish it with the number',
                           ],
                'correct': 3,
                'points': 3,
            },
        ],
    },
}
