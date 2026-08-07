"""
Frontend Engineer capstone.

Comes last, after version control, HTTP and APIs, frontend foundations and
automated testing.
"""

MODULE = {
    'title': 'Shipping a Frontend Application',
    'description': 'Structuring an application, handling the network honestly, and '
                   'testing an interface without testing its markup.',
    'duration': 80,
    'difficulty': 'intermediate',
    'skills': ['Frontend', 'Component Design', 'Testing'],
    'slides': [
        {
            'title': 'What a Frontend Engineer Owns',
            'body': '<p>A frontend engineer owns everything between the API and the person '
                    'using it: whether the interface is understandable, whether it works on '
                    'a bad connection and a cheap phone, and whether it can still be changed '
                    'in a year.</p>'
                    '<p>The hard parts are rarely visual. They are structure, state and '
                    'failure — which is what this module is about.</p>',
        },
        {
            'title': 'Components That Stay Useful',
            'body': '<p>A component is worth extracting when it has one job and a small, '
                    'honest interface. It stops being useful when it grows a flag for every '
                    'place it is used.</p>'
                    '<p>Three or four boolean props that switch behaviour on and off is the '
                    'signal: those are separate components wearing a trench coat. Splitting '
                    'them is almost always cheaper than the conditionals they are '
                    'accumulating.</p>'
                    '<p>Prefer passing content in over adding a prop to describe it. A '
                    'component that accepts children can serve cases its author never '
                    'imagined; one with a <code>variant</code> prop can only serve the list '
                    'it was given.</p>',
        },
        {
            'title': 'Where State Should Live',
            'body': '<p>Put state as close to where it is used as you can, and no closer to '
                    'the top than it needs to be.</p>'
                    '<p>State lifted too high makes everything below it redraw and couples '
                    'unrelated parts of the screen. State pushed too low has to be '
                    'duplicated the moment a sibling needs it.</p>'
                    '<p>Server data is a different animal from interface state. What came '
                    'from the API is a <em>cached copy</em> of something owned elsewhere: it '
                    'goes stale, it needs refetching, and two components asking for the same '
                    'thing should not each hold their own copy. Whether a menu is open is '
                    'interface state, and belongs with the menu.</p>',
        },
        {
            'title': 'Talking to the API Honestly',
            'body': '<p>Every call has four outcomes, and an interface owes the user '
                    'something in all four: nothing yet, loading, succeeded, failed.</p>'
                    '<p>Failure especially. "Something went wrong" tells a user nothing they '
                    'can act on. Say what failed and what they can do — retry, check their '
                    'connection, or that this one is on us and already reported.</p>'
                    '<p>Distinguish the kinds of failure, because they need different '
                    'responses: a validation error should point at the field, a 401 should '
                    'send them to sign in, a 403 should say they do not have access, and a '
                    '5xx should not log them out.</p>',
        },
        {
            'title': 'Optimistic Updates, and Their Cost',
            'body': '<p>Updating the screen before the server confirms makes an interface '
                    'feel instant — the like fills in the moment it is clicked.</p>'
                    '<p>The cost is that you have promised something you cannot yet keep. If '
                    'the request fails you must put it back, and tell the user, or they will '
                    'believe an action happened that did not.</p>'
                    '<p>So it suits small, reversible, low-stakes actions. It does not suit '
                    'anything a user would be upset to have been wrong about — a payment, a '
                    'submission, a deletion.</p>',
        },
        {
            'title': 'Forms',
            'body': '<p>Forms are where interfaces are won and lost, because they are where '
                    'users do work they can lose.</p>'
                    '<p>Validate on blur or submit rather than on every keystroke — telling '
                    'someone their email is invalid while they are still typing it is '
                    'noise.</p>'
                    '<p>Disable the submit button while the request is in flight, or a double '
                    'click sends it twice. Keep what the user typed when the server rejects '
                    'it; clearing a form on error is the fastest way to lose someone. And '
                    'move focus to the first error, so a keyboard user is not hunting.</p>',
        },
        {
            'title': 'Testing an Interface',
            'body': '<p>Test what the user experiences, not how it is built. A test that '
                    'asserts on class names or component internals fails every time somebody '
                    'renames something and passes while the button is broken.</p>'
                    '<p>Find elements the way a user would — by their visible text or their '
                    'accessible role — and assert on what appears. As a bonus, a test that '
                    'cannot find your button by its role has just told you the button is not '
                    'accessible.</p>'
                    '<p>Mock the network, not your own code. Mocking your own modules mostly '
                    'proves the mocks agree with each other.</p>',
        },
        {
            'title': 'Before It Goes Out',
            'body': '<p>A short list catches most of what reaches users.</p>'
                    '<p>Does it work with the keyboard alone? Is every image and control '
                    'labelled? Does it hold together at a narrow width and at a large text '
                    'size? What does it do on a slow connection, and on a failed request? '
                    'What does the empty state look like — the first-run screen with no data '
                    'is the one users see first and the one that is never designed.</p>'
                    '<p>None of these require tooling. They require going and looking.</p>',
        },
    ],
    'quiz': {
        'title': 'Quiz: Shipping a Frontend Application',
        'description': 'Components, state, network handling, forms and testing.',
        'time_limit': 18,
        'questions': [
            {
                'title': 'A Component Growing Flags',
                'text': 'A component has four boolean props that switch its behaviour. What '
                        'does that usually mean?',
                'choices': [
                               'It should be rewritten without any props at all',
                               'It is really several components and should be split',
                               'It needs a fifth prop to cover the remaining case',
                               'The props should be combined into one configuration object',
                           ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'Children Versus Props',
                'text': 'Why prefer passing content in as children over adding a prop to '
                        'describe it?',
                'choices': [
                    'It can serve cases the author never imagined',
                    'Children render faster than props',
                    'Props cannot hold text content',
                    'It removes the need to test the component',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Lifting State Too High',
                'text': 'What is the cost of putting state higher in the tree than it needs '
                        'to be?',
                'choices': [
                               'Child components lose access to it',
                               'It cannot be read asynchronously',
                               'Everything below redraws, and unrelated parts become coupled',
                               'The state can no longer be updated',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'Server Data',
                'text': 'Why is data fetched from an API different from interface state?',
                'choices': [
                               'It cannot be stored in a component',
                               'It is always larger than interface state',
                               'It does not need to be rendered',
                               'It is a cached copy of something owned elsewhere, so it goes stale',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'Responding to a 403',
                'text': 'A request returns 403 Forbidden. What should the interface do?',
                'choices': [
                               'Retry the request with the same credentials',
                               'Say the user does not have access, and keep them signed in',
                               'Send them to the sign-in page',
                               'Log them out and clear their session',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'When Optimistic Updates Fit',
                'text': 'Which action is a good candidate for an optimistic update?',
                'choices': [
                               'Filing an exam submission',
                               'Liking a post',
                               'Submitting a payment',
                               'Deleting an account',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Validating a Form',
                'text': 'Why validate on blur or submit rather than on every keystroke?',
                'choices': [
                    'Telling someone their entry is invalid while they type it is noise',
                    'Validation cannot run before the field loses focus',
                    'Keystroke validation is too slow to compute',
                    'Browsers block validation during typing',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'A Rejected Submission',
                'text': 'The server rejects a form. What should happen to what the user typed?',
                'choices': [
                    'It stays, with focus moved to the first error',
                    'The form clears so they can start again cleanly',
                    'It is submitted again automatically',
                    'It is saved and the user is navigated away',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'Testing by Class Name',
                'text': 'Why is a test that asserts on CSS class names fragile?',
                'choices': [
                               'It runs more slowly than querying by role',
                               'Test runners strip class attributes',
                               'It fails on a rename and passes while the feature is broken',
                               'Class names are not available in the test environment',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'What to Mock',
                'text': 'Why mock the network rather than your own modules?',
                'choices': [
                               'Network mocks are faster to write',
                               'Modules cannot be mocked in a browser environment',
                               'It removes the need for integration tests',
                               'Mocking your own code mostly proves the mocks agree with each other',
                           ],
                'correct': 3,
                'points': 3,
            },
        ],
    },
}
