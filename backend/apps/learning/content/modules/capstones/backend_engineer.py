"""
Backend Engineer capstone — the judgement that is specific to the role.

Comes last in the path, after version control, HTTP and APIs, relational data
and automated testing. Assumes all four.
"""

MODULE = {
    'title': 'Building and Running a Backend Service',
    'description': 'Putting the pieces together: structuring a service, handling errors, '
                   'protecting it, and knowing what it is doing in production.',
    'duration': 80,
    'difficulty': 'intermediate',
    'skills': ['Backend Development', 'Security', 'Observability'],
    'slides': [
        {
            'title': 'What a Backend Engineer Owns',
            'body': '<p>A backend engineer owns what happens after the request arrives: the '
                    'rules, the data, and whether the whole thing stays up.</p>'
                    '<p>The work is less about writing endpoints than about the decisions '
                    'around them — where a rule lives, what happens when a dependency is '
                    'slow, who is allowed to do this, and how you will find out when it '
                    'breaks. That is what this module is about.</p>',
        },
        {
            'title': 'Layers',
            'body': '<p>Most services separate three concerns.</p>'
                    '<p>The <strong>interface</strong> layer deals with HTTP: reading the '
                    'request, checking the shape of the input, returning a status. The '
                    '<strong>domain</strong> layer holds the rules — what may happen and '
                    'when. The <strong>data</strong> layer talks to the database.</p>'
                    '<p>The reason to keep them apart is testability. A rule expressed in the '
                    'domain layer can be tested by calling a function. The same rule written '
                    'inside a request handler can only be tested by making an HTTP request, '
                    'which is slower and harder to get right.</p>',
        },
        {
            'title': 'Validate at the Edge, Enforce in the Middle',
            'body': '<p>Two different jobs get confused.</p>'
                    '<p><strong>Validation</strong> asks whether the input makes sense — is '
                    'this a date, is the quantity a positive number. It belongs at the edge, '
                    'rejecting nonsense before it travels further.</p>'
                    '<p><strong>Authorisation</strong> asks whether this caller may do this '
                    'thing. It belongs with the rule it protects, not at the edge, because '
                    'the same operation can be reached from more than one place — an '
                    'endpoint, a background job, an admin action. A check written into one '
                    'handler protects only that handler.</p>'
                    '<p>Never trust the client for either. A hidden field, a disabled button '
                    'and a filtered dropdown are conveniences for honest users, not '
                    'security.</p>',
        },
        {
            'title': 'Failing Well',
            'body': '<p>Things will fail: a database will be unreachable, a third party will '
                    'time out, a file will be missing. What matters is how.</p>'
                    '<p>Catch what you can actually handle. A bare catch-all that swallows '
                    'every error turns a crash into silence, which is worse — the operation '
                    'did not work and nobody knows.</p>'
                    '<p>Fail loudly inward and quietly outward. Log the full detail for '
                    'yourself; return the caller something useful and no more. Internal '
                    'paths, stack traces and database messages in a response tell an '
                    'attacker how the system is built.</p>',
        },
        {
            'title': 'Talking to Things That Can Be Slow',
            'body': '<p>Every call that leaves your process — a database, a payment '
                    'provider, another service — can hang. Without a timeout, a slow '
                    'dependency does not make your service slow; it makes it stop, as '
                    'requests pile up waiting on connections that will never answer.</p>'
                    '<p>So: always set a timeout. Retry only operations that are safe to '
                    'repeat, and never in a tight loop — a retry storm turns a struggling '
                    'dependency into a dead one. And decide what happens when it is simply '
                    'unavailable, because "wait indefinitely" is a decision too, just not a '
                    'good one.</p>',
        },
        {
            'title': 'Handling Load',
            'body': '<p>Three habits keep a service standing up under real traffic.</p>'
                    '<p><strong>Page every collection.</strong> An endpoint returning all '
                    'rows is a time bomb with a delay set by how fast the table grows.</p>'
                    '<p><strong>Watch your queries.</strong> N+1 patterns are the usual '
                    'cause of an endpoint that was fine last month.</p>'
                    '<p><strong>Rate-limit what is expensive.</strong> Anything unauthenticated, '
                    'or costly per call, needs a ceiling — otherwise one client, malicious or '
                    'merely buggy, degrades the service for everyone.</p>',
        },
        {
            'title': 'Knowing What It Is Doing',
            'body': '<p>A service you cannot observe is one you debug by guessing.</p>'
                    '<p><strong>Logs</strong> record events. Make them structured and include '
                    'an identifier that ties together every line from one request, or you '
                    'cannot follow a single user\'s journey through the noise. Never log '
                    'passwords, tokens or personal data.</p>'
                    '<p><strong>Metrics</strong> are numbers over time — request rate, error '
                    'rate, how long things take. They answer "is it healthy now" and "is '
                    'this worse than last week".</p>'
                    '<p>Watch percentiles, not averages. If the average response is 200ms and '
                    'the 99th percentile is 8 seconds, one request in a hundred is '
                    'unbearable — and the average will never tell you.</p>',
        },
        {
            'title': 'Handling Secrets and Configuration',
            'body': '<p>Anything that differs between your machine and production — database '
                    'addresses, API keys, feature switches — is configuration, and belongs '
                    'outside the code.</p>'
                    '<p>Environment variables are the usual mechanism. The rule is absolute: '
                    'secrets never go into the repository. Git history is permanent, so a '
                    'committed key is leaked even after it is deleted, and must be '
                    'rotated.</p>'
                    '<p>One setting deserves naming. A debug mode left on in production will '
                    'return stack traces, settings and query contents to anyone who triggers '
                    'an error. It should default to off, and be impossible to enable by '
                    'accident.</p>',
        },
    ],
    'quiz': {
        'title': 'Quiz: Building and Running a Backend Service',
        'description': 'Structure, authorisation, failure, load and observability.',
        'time_limit': 18,
        'questions': [
            {
                'title': 'Why Separate Layers',
                'text': 'Why keep business rules out of the request handler?',
                'choices': [
                               'A rule in the domain layer can be tested by calling a function',
                               'Request handlers cannot contain conditional statements',
                               'It reduces the number of database queries automatically',
                               'HTTP frameworks forbid logic inside a handler',
                           ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Where Authorisation Belongs',
                'text': 'Why put an authorisation check with the rule rather than only in '
                        'the endpoint?',
                'choices': [
                    'Authorisation must happen before validation',
                    'The same operation can be reached from a job or an admin action too',
                    'Endpoints cannot read the current user',
                    'Checks in an endpoint run too slowly',
                ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Trusting the Client',
                'text': 'A form disables the price field so the user cannot change it. Is '
                        'the price safe?',
                'choices': [
                               'Yes, because a disabled field is not submitted',
                               'Yes, provided the page is served over HTTPS',
                               'Yes, as long as the field is also hidden',
                               'No — the request can be sent directly, so the server must check it',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'Swallowing Errors',
                'text': 'Why is catching every exception and continuing usually worse than '
                        'crashing?',
                'choices': [
                    'The operation silently did not work and nobody finds out',
                    'It makes the service consume more memory',
                    'The database rolls back the whole transaction',
                    'Logs are discarded when an exception is caught',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'What to Return on Failure',
                'text': 'Why should an error response not include the stack trace?',
                'choices': [
                    'It would change the status code to 200',
                    'It tells an attacker how the system is built',
                    'Stack traces are too large to send in a response',
                    'The client cannot parse a stack trace',
                ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'Outbound Calls',
                'text': 'What happens when a call to a slow external service has no timeout?',
                'choices': [
                               'Requests pile up waiting, and the whole service can stop responding',
                               'The call is automatically retried until it succeeds',
                               'The caller receives a 504 after a fixed delay',
                               'Only that one request is affected',
                           ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'Retrying',
                'text': 'Why retry only operations that are safe to repeat?',
                'choices': [
                               'Databases reject the same statement twice',
                               'Repeating a non-repeatable operation can duplicate its effect',
                               'Retries are always slower than failing immediately',
                               'A retried request loses its authentication',
                           ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'Reading Latency',
                'text': 'Average response time is 200ms and the 99th percentile is 8 '
                        'seconds. What does that tell you?',
                'choices': [
                    'Every request takes between 200ms and 8 seconds',
                    'The metric is wrong, because a percentile cannot exceed the average',
                    'One request in a hundred is unbearably slow, hidden by the average',
                    'The service is healthy, since the average is low',
                ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'Correlating Logs',
                'text': 'Why include a request identifier in every log line?',
                'choices': [
                               'So logs can be sorted alphabetically',
                               'Because logging frameworks require a unique key',
                               'So log files stay below their size limit',
                               'So all the lines from one request can be followed together',
                           ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'Debug Mode in Production',
                'text': 'Why must debug mode default to off?',
                'choices': [
                               'It prevents environment variables from being read',
                               'It stops the service from writing logs',
                               'It returns stack traces and settings to anyone who triggers an error',
                               'It disables the database connection pool',
                           ],
                'correct': 2,
                'points': 3,
            },
        ],
    },
}
