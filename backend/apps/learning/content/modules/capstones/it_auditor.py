"""
IT Auditor capstone (BSIS).

Every other module in its path already existed — security fundamentals,
requirements and process analysis, data analysis and reporting.
"""

MODULE = {
    'title': 'Auditing Controls and Evidence',
    'description': 'Testing whether a control actually works, gathering evidence that '
                   'stands up, and writing findings people act on.',
    'duration': 75,
    'difficulty': 'intermediate',
    'skills': ['IT Audit', 'Controls', 'Evidence'],
    'slides': [
        {
            'title': 'What an Auditor Is For',
            'body': '<p>An auditor answers one question: does this control actually work, or '
                    'does it merely exist on paper?</p>'
                    '<p>The distance between those is where risk lives. A policy saying access '
                    'is reviewed quarterly, in an organisation where it has not been reviewed '
                    'for two years, is worse than no policy — it produces confidence that is '
                    'not warranted.</p>'
                    '<p>The job is not to catch people out. It is to give the organisation an '
                    'honest picture of where it actually stands.</p>',
        },
        {
            'title': 'Design Versus Operation',
            'body': '<p>A control fails in two distinct ways, and they need different fixes.</p>'
                    '<p><strong>Design</strong>: the control, even performed perfectly, would '
                    'not prevent the thing it is meant to prevent. A review that only checks '
                    'whether accounts exist, not what they can do, cannot catch excessive '
                    'privilege.</p>'
                    '<p><strong>Operation</strong>: the design is sound and it is not being '
                    'done — or is done as a formality, signed without being read.</p>'
                    '<p>Say which one you found. "Access review is ineffective" tells nobody '
                    'whether to redesign the process or start doing it.</p>',
        },
        {
            'title': 'Evidence, Not Assurance',
            'body': '<p>"We do that" is not evidence. Evidence is something you can inspect '
                    'that would look different if the control had not been performed.</p>'
                    '<p>System-generated evidence beats a person\'s account: a log the system '
                    'wrote, an export of current permissions, an approval record with a '
                    'timestamp. Screenshots are weak — undated, unattributed and easily '
                    'produced after the fact.</p>'
                    '<p>Get evidence yourself where you can. An export someone prepares for '
                    'you has already been filtered, usually without any intent to '
                    'mislead.</p>',
        },
        {
            'title': 'Sampling',
            'body': '<p>You cannot test everything, so you test a sample and reason about the '
                    'whole from it. That reasoning only holds if the sample is chosen '
                    'properly.</p>'
                    '<p>Let the auditee pick the items and you have tested the best ones. '
                    'Select them yourself, from a complete population, using a method decided '
                    'before you look.</p>'
                    '<p>Check the population first. A sample drawn from an incomplete list '
                    'tells you about that list, and the items missing from it are exactly the '
                    'ones worth seeing.</p>',
        },
        {
            'title': 'Automated Controls Need Testing Once, Manual Ones Repeatedly',
            'body': '<p>A control the system enforces — the software will not let you approve '
                    'your own expense — either works or does not, and one well-designed test '
                    'establishes which.</p>'
                    '<p>A control a person performs can be done well in January and skipped in '
                    'August, so it needs testing across the period, not on one date.</p>'
                    '<p>Watch for a third case: an automated control somebody can turn off. '
                    'Then the real control is who can change the configuration, and that is '
                    'what you should be testing.</p>',
        },
        {
            'title': 'Segregation of Duties',
            'body': '<p>Some combinations of access are dangerous together even though each '
                    'is reasonable alone: creating a supplier and approving a payment, '
                    'writing code and deploying it to production unreviewed, granting access '
                    'and reviewing who has it.</p>'
                    '<p>This is invisible on any single system, which is why it is missed. It '
                    'shows only when you look at what one person can do across all of '
                    'them.</p>'
                    '<p>Small organisations often cannot separate these, and saying "you must" '
                    'is useless advice. The answer there is a compensating control — someone '
                    'independent reviewing what was done afterwards.</p>',
        },
        {
            'title': 'Writing a Finding',
            'body': '<p>A finding has four parts: what you observed, what should be the case, '
                    'why the gap matters, and what to do.</p>'
                    '<p>The "why it matters" is what gets it fixed, and it must be in the '
                    'organisation\'s terms rather than the auditor\'s. "Twelve leavers retain '
                    'system access, three with permission to change grades" is acted on. '
                    '"Access management is not aligned with best practice" is filed.</p>'
                    '<p>Rate findings by the risk if the gap were exploited, not by how many '
                    'items you found. One person able to alter grades unnoticed outranks two '
                    'hundred dormant read-only accounts.</p>',
        },
        {
            'title': 'Being Useful Rather Than Right',
            'body': '<p>An audit that is technically correct and entirely ignored has failed '
                    'at its purpose.</p>'
                    '<p>Show findings to the people responsible before the report is final. '
                    'Not to soften them — to check them. Auditors misunderstand systems '
                    'regularly, and a finding that turns out to be wrong costs the '
                    'credibility of every other finding in the report.</p>'
                    '<p>Agree who owns each action and by when. A recommendation with no owner '
                    'is a sentence, and it will be in the same words in next year\'s '
                    'report.</p>',
        },
    ],
    'quiz': {
        'title': 'Quiz: Auditing Controls and Evidence',
        'description': 'Control failure, evidence, sampling, segregation and findings.',
        'time_limit': 16,
        'questions': [
            {
                'title': 'The Question an Audit Answers',
                'text': 'What is an auditor fundamentally establishing?',
                'choices': [
                               'Whether the systems are technically modern',
                               'Whether a control actually works or merely exists on paper',
                               'Whether staff are following instructions',
                               'Whether the organisation complies with every standard',
                           ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'A Policy Nobody Follows',
                'text': 'Why is an unfollowed policy worse than no policy?',
                'choices': [
                               'It prevents a better control from being written',
                               'It makes the audit take longer',
                               'It produces confidence that is not warranted',
                               'It creates a legal obligation that cannot be met',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'Which Kind of Failure',
                'text': 'A review checks that accounts exist but not what they can do. What '
                        'kind of failure is that?',
                'choices': [
                               'Evidence — the results were not retained',
                               'Scope — the wrong systems were included',
                               'Design — performed perfectly, it still would not catch excessive privilege',
                               'Operation — the control is sound but not being done',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'Naming the Failure',
                'text': 'Why does "access review is ineffective" fail as a finding?',
                'choices': [
                               'It names a control rather than a system',
                               'It lacks a severity rating',
                               'It has no assigned owner',
                               'It does not say whether to redesign the process or start doing it',
                           ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'What Counts as Evidence',
                'text': 'What makes something evidence?',
                'choices': [
                               'It is recorded in the policy document',
                               'It was described consistently by two people',
                               'It would look different if the control had not been performed',
                               'It was provided by the process owner',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'Why Screenshots Are Weak',
                'text': 'What is the problem with a screenshot as audit evidence?',
                'choices': [
                    'It is undated, unattributed and easily produced afterwards',
                    'It cannot be stored in the audit file',
                    'It shows only one system at a time',
                    'It requires the auditee\'s permission',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'Who Picks the Sample',
                'text': 'What happens if the auditee selects the items to be tested?',
                'choices': [
                               'Nothing, provided the count is large enough',
                               'You have tested the best ones',
                               'The sample is statistically valid but small',
                               'The test period becomes unrepresentative',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Checking the Population',
                'text': 'Why verify the completeness of the list before sampling from it?',
                'choices': [
                    'The items missing from it are exactly the ones worth seeing',
                    'Incomplete lists cannot be sampled randomly',
                    'The sample size depends on the total',
                    'It confirms the system generated the list',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'Testing a Manual Control',
                'text': 'Why test a manual control across the period rather than on one date?',
                'choices': [
                    'It can be done well in January and skipped in August',
                    'Single-date testing is prohibited by standards',
                    'Manual controls change design frequently',
                    'It produces a larger sample',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'An Automated Control Somebody Can Disable',
                'text': 'If an automated control can be switched off, what is the real control?',
                'choices': [
                    'Who can change the configuration',
                    'How often the control runs',
                    'Whether the control is documented',
                    'How the control reports exceptions',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'Why Segregation Issues Are Missed',
                'text': 'Why is a segregation of duties problem often invisible?',
                'choices': [
                               'The permissions involved are rarely logged',
                               'Each individual permission is undocumented',
                               'It only arises in large organisations',
                               'It only shows when you look across all systems at once',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'When Separation Is Impossible',
                'text': 'A small team cannot separate two conflicting duties. What is the '
                        'appropriate answer?',
                'choices': [
                               'Accepting the risk with no further action',
                               'Requiring the organisation to hire more staff',
                               'Removing one of the duties from the system',
                               'A compensating control — independent review of what was done',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'Rating a Finding',
                'text': 'How should findings be rated?',
                'choices': [
                               'By how difficult it will be to fix',
                               'By the risk if the gap were exploited',
                               'By how many instances were found',
                               'By how long the gap has existed',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Showing Findings Early',
                'text': 'Why review findings with the responsible people before finalising?',
                'choices': [
                               'It shortens the closing meeting',
                               'A finding that turns out wrong costs the credibility of all the others',
                               'It is required before a report can be issued',
                               'It gives them time to remediate first',
                           ],
                'correct': 1,
                'points': 3,
            },
        ],
    },
}
