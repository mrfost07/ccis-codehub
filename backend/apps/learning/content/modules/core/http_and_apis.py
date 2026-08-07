"""
HTTP and REST APIs — the vocabulary every web role needs.

Reused by: Backend Engineer, Frontend Engineer, Full-Stack Engineer, API and
Integration Engineer, Mobile Developer, Platform Engineer, QA Automation
Engineer, and the BSIT web and integration roles.
"""

MODULE = {
    'title': 'HTTP and REST APIs',
    'description': 'How a browser and a server talk, and how to design an interface '
                   'other programs can use.',
    'duration': 70,
    'difficulty': 'beginner',
    'skills': ['HTTP', 'REST APIs', 'JSON'],
    'slides': [
        {
            'title': 'Request and Response',
            'body': '<p>HTTP is a conversation with exactly two turns. A client sends a '
                    '<strong>request</strong>; a server sends back a <strong>response</strong>. '
                    'That is the whole protocol.</p>'
                    '<p>A request carries a method (what you want done), a path (what you '
                    'want it done to), headers (information about the request), and '
                    'sometimes a body (the data itself). A response carries a status code, '
                    'headers, and usually a body.</p>'
                    '<p>HTTP is <strong>stateless</strong>: the server does not remember the '
                    'last request. Anything it needs to know — who you are, what you were '
                    'doing — must be in the request itself. That is why authentication '
                    'tokens are sent on every call.</p>',
        },
        {
            'title': 'Methods and What They Mean',
            'body': '<p>The method says what kind of operation this is.</p>'
                    '<p><strong>GET</strong> reads something and changes nothing. '
                    '<strong>POST</strong> creates something new. <strong>PUT</strong> '
                    'replaces a thing entirely; <strong>PATCH</strong> changes part of it. '
                    '<strong>DELETE</strong> removes it.</p>'
                    '<p>GET changing data is the classic mistake. Browsers, proxies and '
                    'crawlers all assume a GET is safe to repeat — so a "delete" link that '
                    'works by GET will eventually be followed by something that was only '
                    'looking around.</p>',
        },
        {
            'title': 'Status Codes',
            'body': '<p>The status code is the server\'s summary of what happened, and the '
                    'first digit tells you the category.</p>'
                    '<p><strong>2xx</strong> succeeded — 200 OK, 201 Created. '
                    '<strong>3xx</strong> redirected. <strong>4xx</strong> the client got it '
                    'wrong — 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not '
                    'Found. <strong>5xx</strong> the server got it wrong — 500 Internal '
                    'Server Error.</p>'
                    '<p>The 4xx/5xx split matters: 4xx means "fix your request", 5xx means '
                    '"nothing you can do, the fault is here". Returning 200 with an error '
                    'message in the body breaks every client that checks the status.</p>',
        },
        {
            'title': '401 and 403',
            'body': '<p>These two are confused constantly, and the difference is worth '
                    'learning once.</p>'
                    '<p><strong>401 Unauthorized</strong> means the server does not know who '
                    'you are — you are not signed in, or your token is missing or expired. '
                    'Signing in would fix it.</p>'
                    '<p><strong>403 Forbidden</strong> means the server knows exactly who you '
                    'are and you are not allowed. Signing in again changes nothing.</p>'
                    '<p>Getting this wrong has a real cost: a client that logs the user out '
                    'on 403 will throw people out of the application for opening a page they '
                    'simply do not have permission to see.</p>',
        },
        {
            'title': 'REST: Resources and URLs',
            'body': '<p>A REST API models the system as <strong>resources</strong> — nouns — '
                    'and uses HTTP methods as the verbs against them.</p>'
                    '<p>So the path names a thing, and the method says what to do with it. '
                    'A path should not contain a verb: <code>/getUser?id=7</code> is putting '
                    'the verb in the wrong place, when <code>GET /users/7</code> already says '
                    'it.</p>'
                    '<p>Collections are plural, and an item lives under its collection.</p>',
            'code': 'GET    /users        list users\n'
                    'POST   /users        create a user\n'
                    'GET    /users/7      read user 7\n'
                    'PATCH  /users/7      change part of user 7\n'
                    'DELETE /users/7      remove user 7',
        },
        {
            'title': 'JSON',
            'body': '<p>JSON is how most APIs carry data. It has objects (keys and values), '
                    'arrays, strings, numbers, booleans and null — and nothing else.</p>'
                    '<p>The absences catch people out. There is no date type, so dates travel '
                    'as strings, and everyone must agree on the format — ISO 8601 '
                    '(2026-08-07T14:30:00Z) is the usual choice. There are no comments. And '
                    'numbers have no fixed precision, which is why money is often sent as a '
                    'string or as an integer number of centavos.</p>',
            'code': '{\n'
                    '  "id": 7,\n'
                    '  "username": "kim",\n'
                    '  "enrolled": true,\n'
                    '  "joined_at": "2026-08-07T14:30:00Z",\n'
                    '  "roles": ["student"]\n'
                    '}',
        },
        {
            'title': 'Paging',
            'body': '<p>An endpoint that returns every row works fine on your machine with '
                    'twenty records and falls over in production with two hundred thousand. '
                    'Collections should be paged from the start.</p>'
                    '<p>The response carries one page plus enough information to ask for the '
                    'next. There must also be a maximum: if the client chooses the page size '
                    'and the server does not cap it, anyone can request everything at once, '
                    'and the protection is not really there.</p>',
        },
        {
            'title': 'Designing for the Caller',
            'body': '<p>An API is a promise to somebody else\'s code. Two habits keep that '
                    'promise cheap to keep.</p>'
                    '<p><strong>Be consistent.</strong> If one endpoint returns '
                    '<code>created_at</code> and another <code>dateCreated</code>, every '
                    'caller has to special-case them forever.</p>'
                    '<p><strong>Fail usefully.</strong> An error should say which field was '
                    'wrong and why, in a shape the caller can read. "Invalid input" forces '
                    'the person on the other end to guess.</p>',
        },
    ],
    'quiz': {
        'title': 'Quiz: HTTP and REST APIs',
        'description': 'Methods, status codes, resource design and JSON.',
        'time_limit': 15,
        'questions': [
            {
                'title': 'Statelessness',
                'text': 'What does it mean that HTTP is stateless?',
                'choices': [
                               'The server cannot store any data at all',
                               'A request cannot include a body',
                               'Responses are never cached',
                               'The server does not remember previous requests, so each one must carry what it needs',
                           ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'The Safe Method',
                'text': 'Which method is meant to read data without changing anything?',
                'choices': ['POST', 'DELETE', 'PATCH', 'GET'],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'PUT and PATCH',
                'text': 'What is the difference between PUT and PATCH?',
                'choices': [
                    'They are two names for the same operation',
                    'PUT replaces the resource entirely; PATCH changes part of it',
                    'PATCH replaces the resource entirely; PUT changes part of it',
                    'PUT creates a resource; PATCH reads one',
                ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'Reading a Status Code',
                'text': 'What does a status code in the 5xx range mean?',
                'choices': [
                               'The request succeeded but returned no content',
                               'The resource has moved to a different address',
                               'The server failed, and the client cannot fix it by changing the request',
                               'The client sent something invalid and should correct it',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': '401 Versus 403',
                'text': 'A signed-in user opens a page only administrators may see. Which '
                        'status should the server return?',
                'choices': [
                    '404 Not Found, because they cannot see it',
                    '500 Internal Server Error, because the request could not be completed',
                    '403 Forbidden, because the server knows who they are and they are not allowed',
                    '401 Unauthorized, because they should sign in again',
                ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'Naming a Resource',
                'text': 'Which path follows REST conventions for reading user 7?',
                'choices': [
                               'GET /fetchUserById/7',
                               'GET /users/7',
                               'GET /getUser?id=7',
                               'POST /user/read/7',
                           ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'Dates in JSON',
                'text': 'Why do APIs have to agree on a date format such as ISO 8601?',
                'choices': [
                               'Because JSON has no date type, so dates travel as strings',
                               "Because JSON dates are always in the sender's local time zone",
                               'Because JSON rejects any string longer than twenty characters',
                               'Because dates cannot be sent in a response body',
                           ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Capping the Page Size',
                'text': 'Why must a paged endpoint cap the page size the client asks for?',
                'choices': [
                               'Because without a cap a caller can request everything at once',
                               'Because clients cannot be trusted to send a number',
                               'Because HTTP forbids query parameters above a certain value',
                               'Because paging only works when every page is the same size',
                           ],
                'correct': 0,
                'points': 2,
            },
        ],
    },
}
