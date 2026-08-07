"""
Automated testing — shared by every role that ships code.

Reused by: Backend Engineer, Frontend Engineer, Full-Stack Engineer, QA
Automation Engineer, DevOps Engineer, Site Reliability Engineer, Mobile
Developer.
"""

MODULE = {
    'title': 'Automated Testing',
    'description': 'Writing tests that catch real defects, and recognising the ones '
                   'that pass no matter what.',
    'duration': 60,
    'difficulty': 'intermediate',
    'skills': ['Testing', 'Quality'],
    'slides': [
        {
            'title': 'What Tests Are Actually For',
            'body': '<p>A test is not there to show the code works today. You can see that '
                    'by running it. A test is there so that when somebody changes the code '
                    'in six months, they find out immediately if they broke something.</p>'
                    '<p>That is the whole return: tests are what make a codebase safe to '
                    'change. A project without them does not get slower because the code is '
                    'bad — it gets slower because nobody dares touch anything.</p>',
        },
        {
            'title': 'Arrange, Act, Assert',
            'body': '<p>Most tests have the same three parts. <strong>Arrange</strong> the '
                    'situation, <strong>act</strong> by doing the one thing under test, and '
                    '<strong>assert</strong> what should now be true.</p>'
                    '<p>Keeping them separate and doing one action per test is what makes a '
                    'failure readable. When a test with six actions fails, you know '
                    'something is wrong; when a test with one action fails, you know what.</p>',
            'code': 'def test_an_expired_token_is_rejected():\n'
                    '    user = make_user()                      # arrange\n'
                    '    token = issue_token(user, expired=True)\n'
                    '\n'
                    '    result = authenticate(token)            # act\n'
                    '\n'
                    '    assert result is None                   # assert',
        },
        {
            'title': 'Name the Behaviour, Not the Function',
            'body': '<p>A test name is read when it fails, usually by someone who did not '
                    'write it and is in a hurry.</p>'
                    '<p><code>test_login</code> tells them nothing. '
                    '<code>test_an_expired_token_is_rejected</code> tells them what the '
                    'system is supposed to do, so a failure is a sentence about broken '
                    'behaviour rather than an invitation to go and read the test.</p>',
        },
        {
            'title': 'Tests That Cannot Fail',
            'body': '<p>The worst test is not one that fails. It is one that passes whatever '
                    'the code does — it costs time to run, and it buys nothing while looking '
                    'like it does.</p>'
                    '<p>They creep in easily. A test that asserts a mock was called only '
                    'checks the mock. A test that asserts <code>result is not None</code> '
                    'passes for every wrong answer that is not None. A test written by '
                    'copying the implementation\'s logic into the assertion will agree with '
                    'the code no matter how wrong the code is.</p>',
        },
        {
            'title': 'Checking a Test by Breaking the Code',
            'body': '<p>There is a simple way to find out whether a test is real: break the '
                    'thing it claims to test, on purpose, and check that it fails.</p>'
                    '<p>Invert a condition, return a constant, delete the guard clause. If '
                    'the test still passes, it was never testing that. Put the code back.</p>'
                    '<p>This costs a minute and is the only way to be sure. A test you have '
                    'never seen fail is a test you have never checked.</p>',
        },
        {
            'title': 'Unit, Integration and End-to-End',
            'body': '<p><strong>Unit</strong> tests exercise one piece in isolation. They are '
                    'fast and pinpoint the fault, but they cannot tell you the pieces fit '
                    'together.</p>'
                    '<p><strong>Integration</strong> tests exercise several pieces together — '
                    'code with a real database, say. Slower, and they catch what unit tests '
                    'structurally cannot.</p>'
                    '<p><strong>End-to-end</strong> tests drive the whole system as a user '
                    'would. The most convincing and the most expensive: slow, and prone to '
                    'failing for reasons unrelated to the change.</p>'
                    '<p>You want many of the first, some of the second, and a few of the '
                    'third — covering the journeys that would be worst to break.</p>',
        },
        {
            'title': 'Edge Cases',
            'body': '<p>Code usually works on the example the author had in mind. Defects '
                    'live at the edges.</p>'
                    '<p>For anything that takes a collection: what happens with nothing in '
                    'it, with one item, with far more than expected? For anything numeric: '
                    'zero, negatives, the boundary itself. For anything with input: empty, '
                    'far too long, the wrong type, characters from another alphabet.</p>'
                    '<p>Boundaries deserve particular attention. If the rule is "at least '
                    '18", test 17, 18 and 19 — off-by-one errors hide exactly there.</p>',
        },
        {
            'title': 'Tests in the Pipeline',
            'body': '<p>Tests that only run when someone remembers are not really running. '
                    'Continuous integration executes them on every push, so a break is found '
                    'in minutes by the person who caused it, while the change is still fresh '
                    'in their mind.</p>'
                    '<p>One discipline keeps this working: a failing suite is fixed, not '
                    'ignored. Once a team gets used to a red pipeline, the pipeline has '
                    'stopped telling them anything.</p>',
        },
    ],
    'quiz': {
        'title': 'Quiz: Automated Testing',
        'description': 'What tests are for, how to tell a real one from a useless one.',
        'time_limit': 15,
        'questions': [
            {
                'title': 'The Point of a Test',
                'text': 'What is the main long-term value of an automated test?',
                'choices': [
                               'It proves the code works on the day it is written',
                               'It replaces the need for code review',
                               'It documents how the function is implemented',
                               'It tells a future change that it broke something',
                           ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'The Three Parts',
                'text': 'What are the three parts of the arrange-act-assert pattern?',
                'choices': [
                    'Set up the situation, do the thing under test, check what should be true',
                    'Write the test, run the test, fix the test',
                    'Unit test, integration test, end-to-end test',
                    'Given a bug, reproduce it, then close it',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Naming',
                'text': 'Why is test_an_expired_token_is_rejected a better name than test_login?',
                'choices': [
                    'It guarantees the test covers more code',
                    'A failure then states which behaviour broke',
                    'Longer names run faster in most test runners',
                    'Test runners order tests alphabetically by name',
                ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'A Test That Buys Nothing',
                'text': 'Why is a test that passes regardless of what the code does worse '
                        'than no test?',
                'choices': [
                               'It costs time to run and gives confidence it has not earned',
                               'It makes the test suite fail intermittently',
                               'It prevents other tests in the file from running',
                               'It cannot be committed to version control',
                           ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'Checking a Test',
                'text': 'How can you tell whether a test really tests what it claims?',
                'choices': [
                               'Confirm it runs faster than the other tests',
                               'Break that behaviour deliberately and confirm the test fails',
                               'Check that it passes when run twice in a row',
                               'Measure how many lines of code it covers',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'A Weak Assertion',
                'text': 'Why is asserting only that a result is not None usually too weak?',
                'choices': [
                               'It cannot be used inside a unit test',
                               'It makes the test slower to run',
                               'Every wrong answer that is not None passes it',
                               'It raises an error when the result is a number',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'Kinds of Test',
                'text': 'What does an integration test do that a unit test cannot?',
                'choices': [
                    'Show that several pieces work correctly together',
                    'Pinpoint exactly which line of code is wrong',
                    'Run without any test framework',
                    'Complete faster than a unit test',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Boundaries',
                'text': 'A rule says a user must be at least 18. Which values best test it?',
                'choices': [
                               '1, 2 and 3',
                               '18 only',
                               '50 and 100',
                               '17, 18 and 19',
                           ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'A Red Pipeline',
                'text': 'Why must a failing test suite be fixed rather than ignored?',
                'choices': [
                               'Failing tests are automatically deleted after a time',
                               'The pipeline runs more slowly while tests are failing',
                               'Once a team is used to failures, the suite stops telling them anything',
                               'A failing suite prevents anyone from pushing code',
                           ],
                'correct': 2,
                'points': 2,
            },
        ],
    },
}
