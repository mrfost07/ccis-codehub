"""
Quizzes for the "Comprehensive Web Development Course".

Three thirty-minute modules — HTML, CSS, JavaScript — so five questions each,
each drawn from the code samples the module shows. Choice labels stay free of
angle brackets: QuizViewer's parser captures a label with [^<]+, so a tag in the
text truncates the option to nothing and it renders blank. Tags are named in
words instead.
"""

QUIZZES = [
    {
        'module': 'Module 1: Introduction to HTML',
        'title': 'Module 1 Quiz: HTML Basics',
        'description': 'Document structure, elements and attributes.',
        'time_limit': 10,
        'questions': [
            {
                'title': 'What HTML Is For',
                'text': 'What does HTML provide for a website?',
                'choices': [
                               'The database the page reads from',
                               'The basic structure of the page and its content',
                               'The colours, fonts and spacing of the page',
                               'The interactive behaviour of the page',
                           ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'The Document Declaration',
                'text': 'Which declaration begins an HTML document?',
                'choices': [
                               'IMPORT html',
                               'BEGIN html',
                               'DOCTYPE html',
                               'PAGE html',
                           ],
                'correct': 2,
                'points': 1,
            },
            {
                'title': 'Where the Title Goes',
                'text': 'In the structure shown, which element contains the title element?',
                'choices': [
                               'body',
                               'footer',
                               'section',
                               'head',
                           ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'Visible Content',
                'text': 'Which element holds the content a visitor actually sees, such as '
                        'headings and paragraphs?',
                'choices': ['body', 'head', 'title', 'meta'],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Attributes',
                'text': 'In the link example, href is an attribute that gives the element '
                        'additional information.',
                'true_false': True,
                'correct': 0,
                'points': 1,
            },
        ],
    },
    {
        'module': 'Module 2: Styling with CSS',
        'title': 'Module 2 Quiz: CSS Basics',
        'description': 'Selectors, properties and the box model.',
        'time_limit': 10,
        'questions': [
            {
                'title': 'What CSS Controls',
                'text': 'What does CSS control?',
                'choices': [
                               'The structure and content of the page',
                               'The server the page is hosted on',
                               'The database queries behind the page',
                               'The presentation of HTML elements, such as colours, fonts and spacing',
                           ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'The Class Selector',
                'text': 'Which character begins a class selector?',
                'choices': [
                               'An asterisk',
                               'A colon',
                               'A full stop',
                               'A hash',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'The ID Selector',
                'text': 'Which character begins an ID selector?',
                'choices': [
                               'A slash',
                               'A hash',
                               'A full stop',
                               'A comma',
                           ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'The Box Model',
                'text': 'Which four parts make up the box model as this module describes it?',
                'choices': [
                               'Margins, borders, padding and content',
                               'Header, body, footer and sidebar',
                               'Colour, font, size and weight',
                               'Selectors, properties, values and rules',
                           ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Selecting by Element',
                'text': 'A selector written as p on its own styles every paragraph on the page.',
                'true_false': True,
                'correct': 0,
                'points': 1,
            },
        ],
    },
    {
        'module': 'Module 3: Introduction to JavaScript',
        'title': 'Module 3 Quiz: JavaScript Basics',
        'description': 'Variables, functions and the DOM.',
        'time_limit': 10,
        'questions': [
            {
                'title': 'Declaring Variables',
                'text': 'Which three keywords does this module give for declaring variables?',
                'choices': [
                               'int, float and string',
                               'define, set and make',
                               'public, private and static',
                               'var, let and const',
                           ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'What a Function Is',
                'text': 'What is a function?',
                'choices': [
                               'A style rule applied to an element',
                               'A file loaded by the browser',
                               'A block of code that performs a task and can be called again',
                               'A value stored under a name',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'Reading the Example',
                'text': "Given function greet(name) { return 'Hello, ' + name + '!'; }, "
                        "what does greet('John') return?",
                'choices': [
                               'Hello, John!',
                               'greet John',
                               'John',
                               'Hello, name!',
                           ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'What the DOM Is',
                'text': 'What is the Document Object Model?',
                'choices': [
                               'A server that delivers the page to the browser',
                               'A programming interface that represents the page so code can change it',
                               'A styling language for laying out pages',
                               'A database that stores the page content',
                           ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'Changing the Page',
                'text': 'The method getElementById finds an element on the page so its '
                        'content can be changed.',
                'true_false': True,
                'correct': 0,
                'points': 1,
            },
        ],
    },
]
