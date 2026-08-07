"""
QA Automation Engineer capstone (BSCS).

Every other module in its path already existed — version control, automated
testing, HTTP and APIs, frontend foundations.
"""

MODULE = {
    'title': 'Building a Test Suite People Trust',
    'description': 'Deciding what to automate, writing checks that survive change, and '
                   'keeping a suite fast and believable.',
    'duration': 80,
    'difficulty': 'intermediate',
    'skills': ['Test Automation', 'Quality', 'CI'],
    'slides': [
        {
            'title': 'What Automation Is Actually For',
            'body': '<p>Automated tests do not find new bugs. People find new bugs. '
                    'Automation stops the ones already found from coming back, cheaply, '
                    'forever.</p>'
                    '<p>That framing decides what to automate: the things that would be '
                    'expensive to break, and the things you would otherwise re-check by hand '
                    'every release. Not everything, and not the parts changing daily.</p>'
                    '<p>The measure of a suite is not how many tests it has. It is whether '
                    'the team believes a green run means the software works — and whether '
                    'they stop and look when it goes red.</p>',
        },
        {
            'title': 'The Shape of a Suite',
            'body': '<p>Many fast unit tests, fewer integration tests, a few end-to-end '
                    'journeys. The proportions matter because the costs differ by orders of '
                    'magnitude.</p>'
                    '<p>An end-to-end test is the most convincing and the most expensive: '
                    'slow, and able to fail for a dozen reasons unrelated to the change. A '
                    'suite that is mostly end-to-end takes an hour, fails twice a week for no '
                    'reason, and gets ignored.</p>'
                    '<p>Push each check to the cheapest level that can catch the fault. '
                    'Validation logic does not need a browser.</p>',
        },
        {
            'title': 'Choosing the Journeys',
            'body': '<p>For the few end-to-end tests you write, choose by consequence: what '
                    'would be worst to have broken on a Monday morning.</p>'
                    '<p>Signing in. Submitting an exam. Recording a grade. Taking a payment. '
                    'Those justify their cost. A test that a footer link is present does '
                    'not — it will break during a redesign, be fixed by deleting it, and will '
                    'never have caught anything.</p>',
        },
        {
            'title': 'Selectors and Waits',
            'body': '<p>Two decisions cause most of the flakiness in browser tests.</p>'
                    '<p><strong>Find elements the way a user does</strong> — by visible text '
                    'or accessible role, not by CSS path or generated class name. A selector '
                    'tied to structure breaks on every restyle while the feature is fine.</p>'
                    '<p><strong>Never wait a fixed number of seconds.</strong> A sleep is '
                    'either too short on a slow day or wasted on a fast one. Wait for the '
                    'condition — the element appearing, the request finishing — so the test '
                    'takes as long as it needs and no longer.</p>',
        },
        {
            'title': 'Flakiness Is a Defect',
            'body': '<p>A test that fails one run in twenty is worse than a missing test, '
                    'because it teaches everyone to re-run rather than look.</p>'
                    '<p>Once that habit forms, the suite has stopped being evidence. People '
                    'press the button again, it goes green, and a real failure passes '
                    'through the same way.</p>'
                    '<p>So treat a flaky test as a bug to be fixed or removed, not tolerated. '
                    'The usual causes are timing, shared state between tests, and tests '
                    'depending on the order they run in.</p>',
        },
        {
            'title': 'Independent Tests, Owned Data',
            'body': '<p>Every test should set up what it needs and be runnable alone, in any '
                    'order.</p>'
                    '<p>Tests that share a fixture develop invisible dependencies: one passes '
                    'only because another ran first and left something behind. That suite '
                    'breaks the day someone runs it in parallel, and the failure looks '
                    'random.</p>'
                    '<p>Never test against data you do not control. A test asserting on "the '
                    'first student in the list" passes until somebody enrols.</p>',
        },
        {
            'title': 'Speed Is a Feature',
            'body': '<p>A suite that takes forty minutes is run once a day. One that takes '
                    'four is run on every change, which is where the value is — a failure '
                    'found in four minutes is found by the person who caused it, while they '
                    'still remember what they did.</p>'
                    '<p>Run tests in parallel, keep the slow ones separate from the fast ones, '
                    'and put the fast ones on every push with the full set on a schedule.</p>',
        },
        {
            'title': 'Reporting a Failure',
            'body': '<p>A failing test\'s job is to say what broke, quickly.</p>'
                    '<p>The name should state the expected behaviour, and the assertion should '
                    'say what it wanted and what it got. For browser tests, capture a '
                    'screenshot and the console output at the moment of failure — otherwise '
                    'every investigation starts by reproducing locally.</p>'
                    '<p>And when a test catches a real defect, say so. A suite whose value is '
                    'invisible is the first thing cut when a release is late.</p>',
        },
    ],
    'quiz': {
        'title': 'Quiz: Building a Test Suite People Trust',
        'description': 'What to automate, suite shape, flakiness, speed and reporting.',
        'time_limit': 16,
        'questions': [
            {
                'title': 'What Automation Buys',
                'text': 'What do automated tests mainly provide?',
                'choices': [
                               'They remove the need for manual testing',
                               'They prove the requirements were correct',
                               'They stop bugs already found from coming back',
                               'They discover new defects nobody has seen',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'Measuring a Suite',
                'text': 'What is the real measure of a test suite?',
                'choices': [
                               'How many tests it contains',
                               'What percentage of lines it covers',
                               'How quickly it was written',
                               'Whether the team believes green means working, and stops when it is red',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'A Suite That Is Mostly End-to-End',
                'text': 'What happens to a suite made mostly of end-to-end tests?',
                'choices': [
                               'It cannot be run in continuous integration',
                               'It takes an hour, fails for unrelated reasons, and gets ignored',
                               'It catches more defects than any other arrangement',
                               'It becomes impossible to run in parallel',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Which Level',
                'text': 'Where should a check live?',
                'choices': [
                               'At whichever level is quickest to write',
                               'At the cheapest level that can catch the fault',
                               'At the highest level, so it is most realistic',
                               'At every level, for defence in depth',
                           ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'Choosing Journeys',
                'text': 'How should the few end-to-end tests be chosen?',
                'choices': [
                               'By which features are newest',
                               'By which are easiest to automate',
                               'By consequence — what would be worst to have broken',
                               'By how often the page is visited',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'Finding Elements',
                'text': 'Why locate elements by visible text or accessible role?',
                'choices': [
                    'A selector tied to structure breaks on every restyle',
                    'It runs faster than a CSS selector',
                    'Generated class names are not available in tests',
                    'It allows tests to run without a browser',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'Waiting',
                'text': 'Why never wait a fixed number of seconds in a test?',
                'choices': [
                               'Test runners forbid sleeping',
                               'It prevents tests running in parallel',
                               'It makes screenshots unreliable',
                               'It is either too short on a slow day or wasted on a fast one',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'The Cost of Flakiness',
                'text': 'Why is a test that fails one run in twenty worse than no test?',
                'choices': [
                    'It teaches everyone to re-run rather than look, so real failures pass through',
                    'It consumes more time in continuous integration',
                    'It cannot be fixed once merged',
                    'It reduces the coverage percentage',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'Shared Fixtures',
                'text': 'What goes wrong when tests share setup between them?',
                'choices': [
                               'The suite uses more memory than necessary',
                               'Coverage is counted twice',
                               'Failures cannot be reported individually',
                               'One passes only because another ran first, and parallel runs break it',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'Testing Against Live Data',
                'text': 'Why not assert on "the first student in the list"?',
                'choices': [
                               'It requires administrator access to run',
                               'It passes until somebody enrols',
                               'Lists are not ordered consistently by the database',
                               'The first row is often a header',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Why Speed Matters',
                'text': 'What does a four-minute suite give you that a forty-minute one does not?',
                'choices': [
                               'Lower infrastructure cost',
                               'Fewer flaky results',
                               'Failures found by the person who caused them, while they remember',
                               'More tests running per day',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'Failure Output',
                'text': 'Why capture a screenshot and console output when a browser test fails?',
                'choices': [
                    'Otherwise every investigation starts by reproducing it locally',
                    'It is required to mark the test as failed',
                    'It prevents the test from being re-run',
                    'It reduces flakiness in later runs',
                ],
                'correct': 0,
                'points': 2,
            },
        ],
    },
}
