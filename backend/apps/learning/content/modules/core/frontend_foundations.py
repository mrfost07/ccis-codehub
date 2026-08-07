"""
Frontend foundations — the browser as a runtime.

Reused by: Frontend Engineer, Full-Stack Engineer, Mobile Developer, Web
Developer (BSIT), CMS Developer, and the QA roles that drive a browser.

Distinct from the "Comprehensive Web Development Course", which introduces HTML,
CSS and JavaScript from nothing. This assumes those and covers what an engineer
needs on top: layout that holds up, state, the event loop, accessibility, and
why bundle size is a feature.
"""

MODULE = {
    'title': 'Frontend Foundations',
    'description': 'Building interfaces that stay correct as they grow: layout, state, '
                   'asynchronous work, accessibility and performance.',
    'duration': 75,
    'difficulty': 'intermediate',
    'skills': ['JavaScript', 'CSS', 'Accessibility', 'Frontend'],
    'slides': [
        {
            'title': 'The Browser Is a Runtime, Not a Renderer',
            'body': '<p>It helps to stop thinking of the browser as something that displays '
                    'your files and start thinking of it as a machine you are programming.</p>'
                    '<p>It parses your HTML into a tree, applies styles to that tree, works '
                    'out where everything goes, paints it, and then runs your JavaScript '
                    'against the live tree. Every one of those steps costs time, and each '
                    'can be triggered again by a change you make later.</p>'
                    '<p>Most frontend performance work is about not making the browser redo '
                    'those steps more often than it has to.</p>',
        },
        {
            'title': 'Layout: Flow, Flexbox and Grid',
            'body': '<p>CSS gives you three layout systems, and choosing the wrong one is '
                    'where most fragile layouts come from.</p>'
                    '<p><strong>Normal flow</strong> stacks block elements down the page. It '
                    'is the default and it is fine for documents.</p>'
                    '<p><strong>Flexbox</strong> arranges items along one axis — a row or a '
                    'column — and is the right tool for a toolbar, a list, a card\'s '
                    'contents.</p>'
                    '<p><strong>Grid</strong> arranges items in two dimensions at once, and '
                    'is the right tool for a page skeleton: sidebar, header, content.</p>'
                    '<p>Reaching for absolute positioning to force something into place is '
                    'usually a sign the wrong system was chosen — and it breaks the moment '
                    'the content changes size.</p>',
        },
        {
            'title': 'Responsive Means Content-Driven',
            'body': '<p>Designing for "phone, tablet, desktop" produces layouts that break on '
                    'the next device that does not fit those boxes.</p>'
                    '<p>A better habit is to add a breakpoint where <em>the content</em> '
                    'starts to look wrong — when a line gets too long to read, or cards get '
                    'too narrow — regardless of what device that happens to be.</p>'
                    '<p>Build the narrow layout first. Widening a simple layout is '
                    'straightforward; cramming a wide one into a small screen means undoing '
                    'decisions.</p>',
        },
        {
            'title': 'State Is the Hard Part',
            'body': '<p>Interfaces are not hard because of drawing. They are hard because of '
                    'state: what is loaded, what is loading, what failed, what the user has '
                    'typed but not saved.</p>'
                    '<p>Two rules carry a long way. <strong>Keep one source of truth</strong> '
                    '— the same fact stored in two places will disagree, and the bug will be '
                    'found by a user, not by you. <strong>Derive whatever you can</strong> — '
                    'if a value can be computed from state you already hold, compute it '
                    'rather than storing it and keeping it in step.</p>'
                    '<p>And every request has four outcomes, not one: not started, loading, '
                    'succeeded, failed. An interface that only draws the success case will '
                    'show an empty screen with no explanation the first time the network '
                    'hiccups.</p>',
        },
        {
            'title': 'The Event Loop',
            'body': '<p>JavaScript in the browser runs on a single thread. That thread also '
                    'handles clicks, typing, scrolling and painting.</p>'
                    '<p>So a long synchronous operation does not just delay itself — it '
                    'freezes the entire page. The user clicks and nothing happens; the '
                    'browser eventually offers to kill the tab.</p>'
                    '<p>Anything slow must not block: network calls are asynchronous, and '
                    'heavy computation belongs in smaller chunks or in a worker. When an '
                    'interface "feels janky", the cause is almost always something occupying '
                    'the thread that paints.</p>',
        },
        {
            'title': 'Accessibility Is Not a Feature You Add Later',
            'body': '<p>Using the right element gives you most of accessibility for free. A '
                    'button element is focusable, is reachable by keyboard, announces itself '
                    'as a button and fires on Enter and Space. A div styled to look like a '
                    'button does none of that until you reimplement all of it, badly.</p>'
                    '<p>The rest is mostly discipline: every image needs alt text (empty if '
                    'it is decorative), every input needs a label, and every interactive '
                    'thing must be reachable and usable with a keyboard alone.</p>'
                    '<p>Contrast matters too — text that is beautiful on your monitor may be '
                    'unreadable on a cheap laptop in daylight, which is what most students '
                    'are using.</p>',
        },
        {
            'title': 'You Are Sending Your Code Over a Phone Network',
            'body': '<p>Bundle size is not an engineering vanity metric. Every kilobyte is '
                    'time on a slow connection, on a device that then has to parse and run '
                    'it.</p>'
                    '<p>Two habits do most of the work. <strong>Split the bundle</strong> so a '
                    'visitor downloads the page they asked for, not the whole application. '
                    'And <strong>watch what you add</strong> — a library pulled in for one '
                    'helper function can cost more than the feature is worth.</p>'
                    '<p>Images usually dominate anyway. Sized correctly, in a modern format, '
                    'and loaded lazily when off-screen, they stop being the largest thing on '
                    'the page.</p>',
        },
        {
            'title': 'Never Trust the Browser',
            'body': '<p>Everything the client sends can be changed by whoever is sending it. '
                    'Form validation, disabled buttons, hidden fields and filtered dropdowns '
                    'are conveniences for honest users — they are not security.</p>'
                    '<p>Validate in the browser so people get quick feedback, and validate '
                    'again on the server because that is the only check that counts.</p>'
                    '<p>The other direction matters as well: putting text you did not write '
                    'into the page as HTML is how cross-site scripting happens. Insert it as '
                    'text, or sanitise it, and never build markup by joining strings with '
                    'user input.</p>',
        },
    ],
    'quiz': {
        'title': 'Quiz: Frontend Foundations',
        'description': 'Layout, state, the event loop, accessibility, performance and trust.',
        'time_limit': 15,
        'questions': [
            {
                'title': 'Choosing a Layout System',
                'text': 'Which layout system is the right choice for a page skeleton with a '
                        'sidebar, header and content area?',
                'choices': [
                               'Absolute positioning, because it puts each area exactly in place',
                               'Grid, because it arranges items in two dimensions at once',
                               'Flexbox, because it arranges items along one axis',
                               'Normal flow, because it stacks elements down the page',
                           ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'A Sign of the Wrong Choice',
                'text': 'Why is reaching for absolute positioning to force an element into '
                        'place usually a mistake?',
                'choices': [
                               'It prevents the element from being styled with CSS',
                               'It stops the element from being clickable',
                               'It breaks as soon as the content changes size',
                               'It is not supported by modern browsers',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'Where a Breakpoint Belongs',
                'text': 'Where should a responsive breakpoint be added?',
                'choices': [
                    'Where the content starts to look wrong, whatever device that is',
                    'At the exact widths of the most popular phones',
                    'Only at 768px, which is the standard tablet boundary',
                    'Wherever the design file happens to change',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'One Source of Truth',
                'text': 'Why store a given fact in only one place?',
                'choices': [
                               'JavaScript cannot hold the same value in two variables',
                               'Frameworks refuse to render duplicated state',
                               'Two copies will eventually disagree, and a user will find it first',
                               'Storing it twice uses too much memory in the browser',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'The States of a Request',
                'text': 'What does an interface that only draws the success case do when the '
                        'network is slow or fails?',
                'choices': [
                               'Retries the request automatically until it succeeds',
                               "Displays the browser's own error page",
                               'Falls back to the last successful response',
                               'Shows an empty screen with no explanation',
                           ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'The Single Thread',
                'text': 'Why does a long synchronous operation freeze the whole page?',
                'choices': [
                    'The same thread handles clicks, scrolling and painting',
                    'The browser stops the network while JavaScript runs',
                    'Each operation opens a new rendering process',
                    'CSS cannot be applied while JavaScript is running',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'Buttons',
                'text': 'What does a real button element give you that a styled div does not?',
                'choices': [
                               'A default colour scheme that matches the operating system',
                               'Automatic form submission without any JavaScript',
                               'Protection against double clicks',
                               'Keyboard focus and activation, and the right announcement to assistive tools',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'Bundle Size',
                'text': 'Why does splitting a bundle help a visitor on a slow connection?',
                'choices': [
                               'Smaller files are cached for longer by default',
                               'They download the page they asked for rather than the whole application',
                               'Split files are compressed more aggressively by the server',
                               'The browser can run several bundles in parallel threads',
                           ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'Client-Side Validation',
                'text': 'A form validates the price field in the browser. Can the server skip '
                        'checking it?',
                'choices': [
                               'Yes, if the page is served over HTTPS',
                               'No — the request can be sent without the form at all',
                               'Yes, provided the validation runs before submission',
                               'Yes, as long as the field is also marked required',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Rendering Untrusted Text',
                'text': 'Why not insert text you did not write into the page as HTML?',
                'choices': [
                    'It allows cross-site scripting',
                    'It makes the page slower to paint',
                    'It prevents the text from being styled',
                    'It breaks the accessibility tree',
                ],
                'correct': 0,
                'points': 3,
            },
        ],
    },
}
