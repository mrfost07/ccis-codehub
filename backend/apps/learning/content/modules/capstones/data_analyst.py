"""
Data Analyst capstone (BSIS).

Comes last, after relational data, data analysis and reporting, and
requirements analysis. The path around it is composed entirely of modules that
already exist.
"""

MODULE = {
    'title': 'Working as a Data Analyst',
    'description': 'Turning a vague request into an answerable question, building '
                   'something repeatable, and being trusted with the result.',
    'duration': 80,
    'difficulty': 'intermediate',
    'skills': ['Data Analysis', 'SQL', 'Communication'],
    'slides': [
        {
            'title': 'The Request Arrives Vague',
            'body': '<p>Requests come as "can you look into enrolment" or "why are numbers '
                    'down". Neither is answerable as stated.</p>'
                    '<p>Convert it into a question with a definite shape: which measure, for '
                    'which population, over which period, compared with what. "Down" needs a '
                    'baseline — down against last year, against target, or against last '
                    'month, which are three different investigations with three different '
                    'answers.</p>'
                    '<p>Read the question back before starting. Ten minutes there saves a day '
                    'of answering the wrong one accurately.</p>',
        },
        {
            'title': 'Know Where the Numbers Come From',
            'body': '<p>Trace a figure to its source before you publish it. Which table, '
                    'populated by which process, at what point in the workflow.</p>'
                    '<p>Timing is the usual trap. A record created when an application is '
                    'submitted and a record created when it is approved give different '
                    'monthly totals, and both are correct for different questions. If '
                    'approvals happen in batches, the second will show spikes that are pure '
                    'administration.</p>'
                    '<p>Reconcile against something known before trusting anything new. If '
                    'your total does not match the figure the registry already publishes, '
                    'find out why first — the difference is often the whole finding.</p>',
        },
        {
            'title': 'Make It Repeatable',
            'body': '<p>Any analysis worth doing will be asked for again, with different '
                    'dates.</p>'
                    '<p>So write it as a query or a script rather than clicking through a '
                    'spreadsheet. Repeatable work can be checked, corrected and rerun; '
                    'manual work has to be redone and produces slightly different answers '
                    'each time.</p>'
                    '<p>Keep the steps from raw data to result. When somebody asks why the '
                    'number changed since last month, that record is the only way to answer, '
                    'and the question is always asked.</p>',
        },
        {
            'title': 'Check Yourself Before Publishing',
            'body': '<p>Analysts are wrong most often in ways that look right.</p>'
                    '<p>A few checks catch most of it. Do the parts sum to the total? Is the '
                    'row count what you expected — did a join quietly multiply rows? Does the '
                    'answer agree roughly with a rough estimate made by hand? Does it agree '
                    'with what people who do the work believe, and if not, can you explain '
                    'the difference?</p>'
                    '<p>That last one is the most valuable. When your number contradicts '
                    'someone\'s experience, one of you is wrong, and finding out which is the '
                    'work.</p>',
        },
        {
            'title': 'The Join That Multiplies',
            'body': '<p>The most common way a report becomes silently wrong: a join to a '
                    'table with more than one matching row, which duplicates the rows on the '
                    'other side.</p>'
                    '<p>A student with two enrolments joined to payments now contributes '
                    'their payment twice, and the revenue total is too high with nothing '
                    'looking broken.</p>'
                    '<p>Count rows before and after every join. If the number went up, you '
                    'have fanned out, and any sum computed afterwards is wrong.</p>',
        },
        {
            'title': 'Dashboards Are a Commitment',
            'body': '<p>A one-off answer is finished when delivered. A dashboard has to keep '
                    'being right, through schema changes, definition changes and staff '
                    'changes.</p>'
                    '<p>So build fewer, and only where someone will look regularly and act. '
                    'Every unused dashboard still costs maintenance, and a broken one erodes '
                    'trust in every other number you publish.</p>'
                    '<p>Put the definition next to the number. "Active students" on a screen, '
                    'with no definition, generates the same argument every quarter.</p>',
        },
        {
            'title': 'Handling Data About People',
            'body': '<p>Most of this data is about students and staff, and being an analyst '
                    'does not entitle you to all of it.</p>'
                    '<p>Take the minimum needed. Aggregate where you can — a distribution by '
                    'programme answers most questions without naming anyone. Small groups '
                    'need care: a breakdown that leaves one person in a cell has identified '
                    'them, whatever the column headings say.</p>'
                    '<p>Do not move personal data into a personal spreadsheet or laptop '
                    'because it is convenient. Convenience is how data ends up somewhere '
                    'nobody can account for.</p>',
        },
        {
            'title': 'Delivering the Answer',
            'body': '<p>The analysis is finished when someone can act on it, not when the '
                    'query returns.</p>'
                    '<p>Lead with the answer to the question asked. Show the evidence next, '
                    'simply enough to be followed. Then say what you are unsure about, and '
                    'what would resolve it.</p>'
                    '<p>If the answer is "the data cannot tell us this", say so plainly. That '
                    'is a real result and a useful one; producing a confident number from '
                    'data that does not support it is how analysts lose the standing that '
                    'makes them worth asking.</p>',
        },
    ],
    'quiz': {
        'title': 'Quiz: Working as a Data Analyst',
        'description': 'Framing, sources, repeatability, self-checking, privacy and delivery.',
        'time_limit': 18,
        'questions': [
            {
                'title': 'Making a Request Answerable',
                'text': 'A stakeholder asks "why are numbers down". What is missing?',
                'choices': [
                               'A deadline for the answer',
                               'Access to the database',
                               'A baseline — down against what',
                               'A preferred chart type',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'Shaping the Question',
                'text': 'Which four things make a request answerable?',
                'choices': [
                               'Which chart, which colours, which format, which audience',
                               'Which measure, which population, which period, compared with what',
                               'Which table, which column, which server, which tool',
                               'Who asked, when, why, and for whom',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Submitted Or Approved',
                'text': 'Applications are approved in batches. What will a monthly count of '
                        'approval dates show?',
                'choices': [
                               'A smoother trend than submission dates',
                               'The same totals as submission dates',
                               'Missing months where no batch ran',
                               'Spikes that are pure administration, not demand',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'Reconciling',
                'text': 'Your total does not match the figure the registry publishes. What '
                        'should you do?',
                'choices': [
                    'Find out why before publishing — the difference is often the finding',
                    'Publish yours, since it comes from the source data',
                    'Publish the registry figure instead',
                    'Average the two and note the discrepancy',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'Why Repeatable',
                'text': 'Why write an analysis as a query or script rather than clicking '
                        'through a spreadsheet?',
                'choices': [
                               'Scripts run faster on the database',
                               'It removes the need to document the steps',
                               'It can be checked, corrected and rerun rather than redone',
                               'Spreadsheets cannot handle large datasets',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'The Row Count Went Up',
                'text': 'After a join, your row count is higher than before. What does that '
                        'mean for any sum you compute?',
                'choices': [
                               'It is fine, since the join added matching rows',
                               'It is only wrong if the join was an outer join',
                               'It is fine provided you use a distinct count',
                               'It is wrong — rows have fanned out and values are counted twice',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'Contradicting Experience',
                'text': 'Your number contradicts what the people doing the work believe. What '
                        'is the right response?',
                'choices': [
                    'One of you is wrong, and finding out which is the work',
                    'Trust the data, since perception is unreliable',
                    'Trust the staff, since they see the process daily',
                    'Report both figures without comment',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'The Cost of a Dashboard',
                'text': 'Why build fewer dashboards rather than more?',
                'choices': [
                               'Each consumes database capacity',
                               'Users cannot navigate more than a few',
                               'Licences are charged per dashboard',
                               'Each must keep being right, and a broken one erodes trust in every number',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'A Number Without a Definition',
                'text': 'Why publish the definition next to the figure?',
                'choices': [
                    'Otherwise the same argument recurs every quarter',
                    'Auditors require definitions on screen',
                    'It makes the dashboard load faster',
                    'It prevents the figure being exported',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'A Cell With One Person',
                'text': 'A breakdown leaves a single person in one cell. What has happened?',
                'choices': [
                               'Nothing, since no name is shown',
                               'They have been identified, whatever the column headings say',
                               'The sample is too small to report a percentage',
                               'The aggregation level should be increased for readability',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Copying Data Locally',
                'text': 'Why not move personal data onto your own laptop for convenience?',
                'choices': [
                               'It breaks the connection to the source system',
                               'It ends up somewhere nobody can account for',
                               'Local machines cannot process it quickly enough',
                               'The data would become out of date',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'When the Data Cannot Answer',
                'text': 'The data cannot support a conclusion. What should you report?',
                'choices': [
                               'A best estimate, clearly labelled as such',
                               'Nothing, until better data is collected',
                               'That plainly — it is a real and useful result',
                               'The closest number available, with a caveat',
                           ],
                'correct': 2,
                'points': 3,
            },
        ],
    },
}
