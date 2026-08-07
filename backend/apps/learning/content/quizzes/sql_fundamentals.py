"""
Quizzes for "Fundamentals of SQL".

The modules are short — thirty minutes each — so the quizzes are five questions
rather than eight. A twenty-question exam on a thirty-minute lesson tests
stamina, not learning.

Every question is drawn from what its module actually says. Module 2, for
instance, teaches SELECT, WHERE and ORDER BY against a Customers table, so that
is what it is asked about; nothing here tests JOINs or indexes, which the path
never covers.
"""

QUIZZES = [
    {
        'module': 'Module 1: Introduction to SQL and Databases',
        'title': 'Module 1 Quiz: SQL and Databases',
        'description': 'What a database is, what SQL is for, and the commands you will use.',
        'time_limit': 10,
        'questions': [
            {
                'title': 'What SQL Is',
                'text': 'What is SQL used for?',
                'choices': [
                    'Managing and manipulating relational databases',
                    'Styling the appearance of a web page',
                    'Compiling source code into an executable',
                    'Configuring a network router',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'What a Database Is',
                'text': 'According to this module, what is a database?',
                'choices': [
                    'An organized collection of data stored and accessed electronically',
                    'A single spreadsheet file kept on one computer',
                    'A programming language for building websites',
                    'A physical cabinet used to store printed records',
                ],
                'correct': 0,
                'points': 1,
            },
            {
                'title': 'Extracting Data',
                'text': 'Which SQL command extracts data from a database?',
                'choices': ['SELECT', 'UPDATE', 'DELETE', 'INSERT INTO'],
                'correct': 0,
                'points': 1,
            },
            {
                'title': 'Adding New Data',
                'text': 'Which SQL command inserts new data into a database?',
                'choices': ['INSERT INTO', 'SELECT', 'CREATE DATABASE', 'UPDATE'],
                'correct': 0,
                'points': 1,
            },
            {
                'title': 'Commands and Structures',
                'text': 'SQL can be used to create and modify database structures, '
                        'not only the data inside them.',
                'true_false': True,
                'correct': 0,
                'points': 1,
            },
        ],
    },
    {
        'module': 'Module 2: Querying Data with SQL',
        'title': 'Module 2 Quiz: Querying Data',
        'description': 'Selecting, filtering and sorting rows.',
        'time_limit': 10,
        'questions': [
            {
                'title': 'The Result Set',
                'text': 'What is the table of data returned by a SELECT statement called?',
                'choices': ['A result-set', 'A schema', 'A transaction', 'A primary key'],
                'correct': 0,
                'points': 1,
            },
            {
                'title': 'Filtering Rows',
                'text': 'Which clause extracts only the records that satisfy a condition?',
                'choices': ['WHERE', 'ORDER BY', 'SELECT', 'VALUES'],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Sorting Rows',
                'text': 'Which keyword sorts a result-set in ascending or descending order?',
                'choices': ['ORDER BY', 'WHERE', 'GROUP BY', 'SET'],
                'correct': 0,
                'points': 1,
            },
            {
                'title': 'Reading a Query',
                'text': "What does the statement SELECT * FROM Customers WHERE "
                        "Country='Mexico'; return?",
                'choices': [
                    'Every column, for only the customers whose Country is Mexico',
                    'Only the Country column, for every customer',
                    'Every customer, sorted alphabetically by Country',
                    'The number of customers in Mexico',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'The Asterisk',
                'text': 'In SELECT * FROM Customers; the asterisk means every column '
                        'of the table.',
                'true_false': True,
                'correct': 0,
                'points': 1,
            },
        ],
    },
    {
        'module': 'Module 3: Manipulating Data with SQL',
        'title': 'Module 3 Quiz: Manipulating Data',
        'description': 'Inserting, updating and deleting records.',
        'time_limit': 10,
        'questions': [
            {
                'title': 'Changing Existing Rows',
                'text': 'Which statement modifies records that are already in a table?',
                'choices': ['UPDATE', 'INSERT INTO', 'SELECT', 'DELETE'],
                'correct': 0,
                'points': 1,
            },
            {
                'title': 'Removing Rows',
                'text': 'Which statement removes records from a table?',
                'choices': ['DELETE', 'UPDATE', 'SELECT', 'CREATE DATABASE'],
                'correct': 0,
                'points': 1,
            },
            {
                'title': 'Reading an UPDATE',
                'text': "What does UPDATE Customers SET ContactName='Juan' WHERE "
                        "CustomerName='Cardinal'; do?",
                'choices': [
                    "Changes the ContactName to Juan on the row whose CustomerName is Cardinal",
                    'Adds a new customer called Juan to the table',
                    'Deletes the customer called Cardinal',
                    'Renames the Customers table to Juan',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Naming the Columns',
                'text': 'In an INSERT INTO statement, the column names are listed before '
                        'the VALUES keyword.',
                'true_false': True,
                'correct': 0,
                'points': 1,
            },
            {
                'title': 'Leaving Out the Condition',
                'text': 'What happens when DELETE FROM Customers; is run with no WHERE clause?',
                'choices': [
                    'Every row in the table is deleted',
                    'Nothing is deleted, because a condition is required',
                    'Only the first row is deleted',
                    'The table itself is dropped along with its structure',
                ],
                'correct': 0,
                'points': 2,
            },
        ],
    },
]
