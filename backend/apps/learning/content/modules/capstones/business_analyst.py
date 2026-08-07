"""
Business Analyst capstone (BSIS).

Comes last, after requirements and process analysis, data analysis and
reporting, and relational data.
"""

MODULE = {
    'title': 'Delivering Change in an Organisation',
    'description': 'Making the case, choosing between options, taking a change through '
                   'to acceptance, and getting people to actually adopt it.',
    'duration': 80,
    'difficulty': 'intermediate',
    'skills': ['Business Analysis', 'Stakeholder Management', 'Change'],
    'slides': [
        {
            'title': 'What a Business Analyst Owns',
            'body': '<p>The analyst owns whether the organisation ends up better off — not '
                    'whether a system was delivered.</p>'
                    '<p>Those come apart more often than anyone admits. A system delivered on '
                    'time, to specification, that nobody uses because the process around it '
                    'never changed, is a failure that every project report will record as a '
                    'success.</p>'
                    '<p>So the work runs from before the project exists to after it '
                    'finishes.</p>',
        },
        {
            'title': 'Making the Case',
            'body': '<p>A business case answers one question: why is this a better use of '
                    'money and attention than the alternatives.</p>'
                    '<p>State the problem in the organisation\'s terms and its cost — time, '
                    'errors, money, risk, people leaving. Then the options, including doing '
                    'nothing, which is always available and often wins.</p>'
                    '<p>Be honest about benefits. A number invented to clear an approval gate '
                    'is remembered, and the analyst who produced it is not believed the next '
                    'time. A modest benefit that survives contact with reality is worth more '
                    'than an impressive one that does not.</p>',
        },
        {
            'title': 'Comparing Options Fairly',
            'body': '<p>There are always more options than the one being proposed: change '
                    'the process without software, buy something, build something, or do '
                    'nothing.</p>'
                    '<p>Compare them on the same criteria, and include the costs people '
                    'forget — training, data migration, running it, supporting it, and what '
                    'it costs to get out again later.</p>'
                    '<p>Buying looks cheaper than building until configuration, integration '
                    'and the annual licence are counted; building looks flexible until '
                    'somebody has to maintain it for a decade. The analyst\'s job is to make '
                    'both visible, not to advocate.</p>',
        },
        {
            'title': 'Scope, and What to Do When It Moves',
            'body': '<p>Scope creep is not people being difficult. It is what happens when '
                    'requirements were vague, so every clarification looks like an '
                    'addition.</p>'
                    '<p>Write down what is out of scope as explicitly as what is in. The '
                    'exclusions are what prevent the argument later.</p>'
                    '<p>When a genuine new need appears, do not refuse it and do not absorb '
                    'it silently. Price it — in time, cost and what it displaces — and let '
                    'the person accountable choose. Silent absorption is how projects run '
                    'late for reasons nobody can point at.</p>',
        },
        {
            'title': 'Prioritising',
            'body': '<p>Everything cannot be first, and asking stakeholders to rank their own '
                    'requests produces a list where everything is critical.</p>'
                    '<p>Prioritise against the value delivered and the cost of delay, and '
                    'make the comparison explicit: this before that, because. A priority '
                    'nobody can explain is a priority that will be renegotiated in every '
                    'meeting.</p>'
                    '<p>Getting something small into real use early is worth more than a '
                    'complete design on paper. Real use produces information no workshop '
                    'ever does.</p>',
        },
        {
            'title': 'Acceptance',
            'body': '<p>Acceptance is the moment the organisation says this does what we '
                    'needed. It goes wrong when the criteria are decided at that moment.</p>'
                    '<p>Agree them in advance, in the business\'s language, and test with '
                    'real data and real users doing their real work. A system that passes on '
                    'clean demonstration data and fails on the actual data has not been '
                    'tested — it has been shown.</p>'
                    '<p>Include the awkward cases deliberately: the student with two '
                    'programmes, the refund, the correction after publication. Those are '
                    'where systems break, and they are never in the demonstration.</p>',
        },
        {
            'title': 'People Have to Change Too',
            'body': '<p>Most of the benefit is in the process, and the process is people. A '
                    'new system laid over an unchanged process usually adds work rather than '
                    'removing it.</p>'
                    '<p>Expect resistance, and treat it as information. It is usually rational: '
                    'the new way is slower for them personally, or it makes their work '
                    'visible in a way it was not, or the last change was done badly and '
                    'nobody was listened to.</p>'
                    '<p>Involve the people who do the work early. They know the exceptions, '
                    'and their support is the difference between adoption and an expensive '
                    'system with a spreadsheet still running beside it.</p>',
        },
        {
            'title': 'Afterwards',
            'body': '<p>The question that matters is whether the benefit in the business case '
                    'actually appeared. Almost nobody goes back and checks.</p>'
                    '<p>Doing so serves two purposes. It tells the organisation whether this '
                    'kind of investment works, and it calibrates the next business case — '
                    'including yours.</p>'
                    '<p>Watch for the spreadsheet running alongside the new system. It is the '
                    'clearest possible signal that something the old way did is still '
                    'needed and was not built.</p>',
        },
    ],
    'quiz': {
        'title': 'Quiz: Delivering Change in an Organisation',
        'description': 'Business cases, options, scope, acceptance and adoption.',
        'time_limit': 18,
        'questions': [
            {
                'title': 'What the Analyst Owns',
                'text': 'What does a business analyst ultimately own?',
                'choices': [
                               'Whether the requirements document was approved',
                               'Whether the budget was spent as planned',
                               'Whether the organisation ends up better off',
                               'Whether the system was delivered on time',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'A Success That Is a Failure',
                'text': 'A system is delivered to specification and nobody uses it because '
                        'the process never changed. What is that?',
                'choices': [
                               'A defect in the specification only',
                               'An acceptable outcome, since scope was met',
                               'A failure that project reports will record as a success',
                               'A training problem, solved by more training',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'The Option Always Available',
                'text': 'Which option should every business case include?',
                'choices': [
                               'Building it in house',
                               'Outsourcing the work',
                               'Doing nothing',
                               'Buying a commercial product',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'Inventing a Benefit',
                'text': 'What is the cost of a benefit figure invented to clear an approval '
                        'gate?',
                'choices': [
                    'The analyst is not believed the next time',
                    'The project is cancelled at the next review',
                    'The figure must be restated quarterly',
                    'The benefit becomes contractually binding',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'Costs People Forget',
                'text': 'Which costs are most often left out when comparing options?',
                'choices': [
                               'Project management overhead',
                               'Training, migration, running it, support, and getting out later',
                               'Licence fees and hardware',
                               'Developer salaries',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Where Scope Creep Comes From',
                'text': 'What actually causes scope creep?',
                'choices': [
                               'Stakeholders deliberately asking for more',
                               'Developers building beyond what was asked',
                               'Insufficient project governance',
                               'Vague requirements, so every clarification looks like an addition',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'A Genuine New Requirement',
                'text': 'A real new need appears mid-project. What should the analyst do?',
                'choices': [
                    'Price it and let the accountable person choose',
                    'Refuse it, since scope was agreed',
                    'Absorb it quietly to keep the relationship',
                    'Defer it to a second phase automatically',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'Writing Down Exclusions',
                'text': 'Why state explicitly what is out of scope?',
                'choices': [
                               'Contracts require a list of exclusions',
                               'It reduces the number of requirements to write',
                               'It shortens the approval process',
                               'The exclusions are what prevent the argument later',
                           ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'Shown Versus Tested',
                'text': 'A system passes on clean demonstration data and fails on real data. '
                        'What happened?',
                'choices': [
                               'The system needs more capacity',
                               'It was shown, not tested',
                               'The real data is invalid and needs cleaning',
                               'The acceptance criteria were too strict',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Which Cases to Test',
                'text': 'Which cases should acceptance testing deliberately include?',
                'choices': [
                    'The awkward ones — dual programmes, refunds, corrections after publication',
                    'The most common ones, since they carry most volume',
                    'Only the ones named in the requirements',
                    'A random sample of historic transactions',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'Reading Resistance',
                'text': 'Staff resist a new system. How should that be treated?',
                'choices': [
                               'As a training gap to be closed',
                               'As an obstacle for management to overrule',
                               'As evidence the change was announced too early',
                               'As information — it is usually rational and worth understanding',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'The Spreadsheet Beside the System',
                'text': 'A spreadsheet is still running alongside the new system. What does '
                        'that signal?',
                'choices': [
                               'The system needs a reporting module',
                               'Something the old way did is still needed and was not built',
                               'Staff need further training on the system',
                               'The spreadsheet should be blocked by policy',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'After Delivery',
                'text': 'Why check whether the promised benefit actually appeared?',
                'choices': [
                    'It tells the organisation whether this kind of investment works',
                    'It is required before the project can be closed',
                    'It determines the support budget',
                    'It establishes who was accountable for the outcome',
                ],
                'correct': 0,
                'points': 2,
            },
        ],
    },
}
