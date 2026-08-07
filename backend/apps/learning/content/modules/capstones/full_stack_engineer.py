"""
Full-Stack Engineer capstone.

The path around it is composed entirely of modules that already existed —
version control, HTTP and APIs, frontend foundations, relational data — so this
file is the only new content a whole path required. That is the library paying
off.
"""

MODULE = {
    'title': 'Owning a Feature End to End',
    'description': 'Working across the boundary: designing a contract, keeping both '
                   'sides in step, and shipping a change safely.',
    'duration': 80,
    'difficulty': 'intermediate',
    'skills': ['Full-Stack Development', 'API Design', 'Deployment'],
    'slides': [
        {
            'title': 'The Job Is the Boundary',
            'body': '<p>A full-stack engineer is not someone who writes both halves. It is '
                    'someone who owns the seam between them.</p>'
                    '<p>Most defects in a feature that spans client and server live exactly '
                    'there: the two sides disagree about a name, a type, whether a field can '
                    'be absent, or what an error means. Nobody owns that disagreement unless '
                    'somebody is looking at both sides.</p>'
                    '<p>So the skill is less "knows two languages" and more "designs a '
                    'contract and keeps it".</p>',
        },
        {
            'title': 'Design the Contract First',
            'body': '<p>Before writing either side, write down what travels between them: '
                    'the request, the response, and every failure.</p>'
                    '<p>Doing this first is what stops the classic waste — the frontend '
                    'built against a guess, the backend built against a different guess, and '
                    'a day spent reconciling.</p>'
                    '<p>Be explicit about absence. "The field may be missing" and "the field '
                    'may be null" and "the field is always present" are three different '
                    'contracts, and code written against the wrong one breaks on real data '
                    'rather than on your test fixture.</p>',
        },
        {
            'title': 'Where a Rule Should Live',
            'body': '<p>When a rule exists on both sides, decide which side owns it.</p>'
                    '<p>The server owns correctness — it is the only side that cannot be '
                    'bypassed. The client owns responsiveness: it repeats the rule so the '
                    'user gets an answer without a round trip.</p>'
                    '<p>The trap is a rule that only exists on the client. It will be '
                    'bypassed, not necessarily maliciously — a retried request, a script, a '
                    'different client, an older app version that never had the rule.</p>',
        },
        {
            'title': 'Changing a Contract Without Breaking Anyone',
            'body': '<p>Once something is being used, you cannot change it and deploy both '
                    'sides at the same instant. There is always a window where old clients '
                    'talk to a new server, or the reverse.</p>'
                    '<p>Additions are safe: a new optional field is ignored by old clients. '
                    'Removals and renames are not — they break everyone who has not '
                    'updated.</p>'
                    '<p>So change in steps: add the new thing, move callers to it, then '
                    'remove the old one once nothing uses it. On mobile this matters more '
                    'still, because you cannot force an update — an old version may be '
                    'calling your API for months.</p>',
        },
        {
            'title': 'Migrations Are Deployments Too',
            'body': '<p>A schema change ships alongside code, and the two do not land '
                    'simultaneously.</p>'
                    '<p>Adding a nullable column is safe: old code ignores it. Dropping a '
                    'column or making one required is not — old code still writing the old '
                    'shape will fail the moment the migration lands.</p>'
                    '<p>The same expand-then-contract pattern applies. Add the new column, '
                    'write to both, backfill the old rows, move reads across, and only then '
                    'drop the old column. Slower, and it does not take the site down at four '
                    'in the afternoon.</p>',
        },
        {
            'title': 'Where Did the Time Go',
            'body': '<p>When a page is slow, the first question is which side is slow — and '
                    'guessing wastes the afternoon.</p>'
                    '<p>The browser\'s network panel shows how long the server took versus '
                    'how long the client spent afterwards. If the request itself is fast and '
                    'the page still crawls, the cost is in rendering. If the request is '
                    'slow, it is the server, and the usual culprit is queries — an N+1 that '
                    'was invisible with test data.</p>'
                    '<p>Measure before optimising. Most "obvious" performance fixes address '
                    'something that was not the bottleneck.</p>',
        },
        {
            'title': 'Shipping Safely',
            'body': '<p>Small changes are safer than large ones, and not because they contain '
                    'fewer bugs. They are safer because when something breaks, the cause is '
                    'obvious and the change is easy to undo.</p>'
                    '<p>A feature flag lets code ship dark and be switched on separately, so '
                    'deploying and releasing stop being the same event — and switching off '
                    'is faster than rolling back.</p>'
                    '<p>Know how you would undo it before you ship it. If the answer involves '
                    'a data migration that cannot be reversed, that is worth knowing '
                    'beforehand rather than during.</p>',
        },
        {
            'title': 'Owning It After It Ships',
            'body': '<p>The feature is not finished when it is merged. It is finished when '
                    'you know it is working.</p>'
                    '<p>That means watching the error rate afterwards, having something that '
                    'tells you when it fails rather than waiting for a complaint, and '
                    'checking that the thing you built is actually being used the way you '
                    'expected.</p>'
                    '<p>The engineer who owned a feature end to end is also the one who finds '
                    'out fastest that it is broken — which is exactly the point.</p>',
        },
    ],
    'quiz': {
        'title': 'Quiz: Owning a Feature End to End',
        'description': 'Contracts, rule placement, safe changes, migrations and shipping.',
        'time_limit': 18,
        'questions': [
            {
                'title': 'Where the Defects Live',
                'text': 'Why do most defects in a feature spanning client and server appear '
                        'at the boundary?',
                'choices': [
                               'Network requests are inherently unreliable',
                               'The two sides are written in different languages',
                               'Browsers alter requests before sending them',
                               'The two sides disagree about names, types or absence, and nobody owns that',
                           ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'Designing the Contract First',
                'text': 'What does agreeing the request and response shapes before coding '
                        'prevent?',
                'choices': [
                    'Each side being built against a different guess',
                    'The need to write tests for either side',
                    'Any change to the API afterwards',
                    'Errors being returned to the client',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Being Explicit About Absence',
                'text': 'Why distinguish "may be missing", "may be null" and "always present"?',
                'choices': [
                    'Code written against the wrong one breaks on real data',
                    'JSON cannot represent a null value',
                    'Missing fields cause the request to be rejected',
                    'They are three names for the same case',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'A Client-Only Rule',
                'text': 'What is wrong with a validation rule that exists only in the client?',
                'choices': [
                               'It cannot report errors to the user',
                               'It duplicates work the server has already done',
                               'It will be bypassed, including by an old app version that never had it',
                               'It runs too slowly to be useful',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'A Safe Contract Change',
                'text': 'Which change to a response is safe for clients that have not updated?',
                'choices': [
                               'Changing a field from a string to a number',
                               'Adding a new optional field',
                               'Renaming an existing field',
                               'Removing a field nobody seems to use',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Removing a Field',
                'text': 'How do you remove a field from an API that clients are using?',
                'choices': [
                               'Remove it and tell clients to update quickly',
                               'Leave it in place but stop populating it',
                               'Add the replacement, move callers across, then remove the old one',
                               'Remove it and release both sides at the same moment',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'A Risky Migration',
                'text': 'Which schema change is unsafe to deploy while old code is still '
                        'running?',
                'choices': [
                    'Making an existing column required',
                    'Adding a nullable column',
                    'Adding an index to a column',
                    'Adding a new table',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'Finding the Slow Side',
                'text': 'A page is slow. The request returns quickly but the page still '
                        'crawls. Where is the cost?',
                'choices': [
                               'In the database queries',
                               'In the network connection',
                               "In the server's authentication check",
                               'In rendering on the client',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'Why Small Changes Are Safer',
                'text': 'What makes a small change safer than a large one?',
                'choices': [
                               'Small changes can skip the test suite',
                               'When it breaks, the cause is obvious and it is easy to undo',
                               'Small changes contain proportionally fewer bugs',
                               'Small changes do not require review',
                           ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'Feature Flags',
                'text': 'What does a feature flag let you separate?',
                'choices': [
                               'The migration from the schema change',
                               'Deploying the code from releasing the feature',
                               'Writing the code from testing it',
                               'The frontend deployment from the backend one',
                           ],
                'correct': 1,
                'points': 2,
            },
        ],
    },
}
