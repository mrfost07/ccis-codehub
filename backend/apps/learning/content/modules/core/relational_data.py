"""
Relational data for application developers — modelling, querying, and the
mistakes that only appear under load.

Reused by: Backend Engineer, Full-Stack Engineer, Data Engineer, Database
Administrator, Business Intelligence Analyst, Reporting Analyst.

Distinct from the "Fundamentals of SQL" path, which teaches the language from
scratch. This is about using a database well from inside an application: schema
design, indexes, transactions, and the N+1 problem.
"""

MODULE = {
    'title': 'Relational Data for Applications',
    'description': 'Designing a schema, querying it efficiently, and the failure modes '
                   'that only show up with real data.',
    'duration': 75,
    'difficulty': 'intermediate',
    'skills': ['Databases', 'SQL', 'Data Modelling'],
    'slides': [
        {
            'title': 'Tables, Rows and Keys',
            'body': '<p>A relational database stores data in tables. Each row is one thing; '
                    'each column is one fact about it.</p>'
                    '<p>A <strong>primary key</strong> identifies a row uniquely. A '
                    '<strong>foreign key</strong> is a column holding another table\'s '
                    'primary key, and that is how tables relate: an order row holds the id '
                    'of the customer who placed it.</p>'
                    '<p>Foreign keys are also a guarantee. With one in place the database '
                    'will refuse to store an order pointing at a customer who does not '
                    'exist — so that particular corruption becomes impossible rather than '
                    'merely unlikely.</p>',
        },
        {
            'title': 'One Fact in One Place',
            'body': '<p>The core rule of schema design: store each fact once.</p>'
                    '<p>Copying a customer\'s address onto every order feels convenient until '
                    'they move. Now some rows say one thing and some say another, and there '
                    'is no way to tell which is right. Store the address on the customer, '
                    'and have orders point at the customer.</p>'
                    '<p>The exception is history. An invoice should keep the address it was '
                    'sent to, because that is a fact about the invoice, not a copy of a fact '
                    'about the customer.</p>',
        },
        {
            'title': 'Relationships',
            'body': '<p><strong>One to many</strong> is the common case: a customer has many '
                    'orders. The foreign key goes on the many side — each order stores its '
                    'customer id.</p>'
                    '<p><strong>Many to many</strong> needs a third table. A student takes '
                    'many courses and a course has many students, so a table of enrolments '
                    'holds a student id and a course id, one row per pairing.</p>'
                    '<p>That join table is often the right place for facts about the '
                    'relationship itself — when the student enrolled, what grade they '
                    'received.</p>',
            'code': 'students(id, name)\n'
                    'courses(id, title)\n'
                    'enrolments(id, student_id, course_id, enrolled_at, grade)',
        },
        {
            'title': 'Joins',
            'body': '<p>A join reads related rows from more than one table in a single '
                    'query.</p>'
                    '<p>An <strong>inner join</strong> returns only rows with a match on both '
                    'sides. A <strong>left join</strong> returns every row from the left '
                    'table, with nulls where the right has no match.</p>'
                    '<p>The choice is a question about your data. "Customers and their '
                    'orders" as an inner join silently drops every customer who has never '
                    'ordered — which is usually exactly the group you were asking about.</p>',
            'code': 'SELECT c.name, COUNT(o.id) AS orders\n'
                    'FROM customers c\n'
                    'LEFT JOIN orders o ON o.customer_id = c.id\n'
                    'GROUP BY c.name;',
        },
        {
            'title': 'Indexes',
            'body': '<p>Without an index the database reads every row to find the ones you '
                    'want. That is fine for a thousand rows and ruinous for a million.</p>'
                    '<p>An index is a lookup structure over one or more columns, so matching '
                    'rows are found directly. Index the columns you filter and join on — '
                    'foreign keys especially, which are joined constantly and often left '
                    'unindexed.</p>'
                    '<p>Indexes are not free. Each one takes space and must be updated on '
                    'every insert, update and delete. Indexing every column makes writes '
                    'slow to make reads fast, which is rarely the trade you meant.</p>',
        },
        {
            'title': 'Transactions',
            'body': '<p>Some operations are only correct if they all happen or none do. '
                    'Moving money means a debit and a credit; doing one without the other is '
                    'worse than doing neither.</p>'
                    '<p>A <strong>transaction</strong> groups statements so they commit '
                    'together or roll back together. If anything fails part-way, the '
                    'database returns to how it was.</p>'
                    '<p>The rule of thumb: if a half-finished version of an operation would '
                    'leave the data wrong, it belongs in a transaction.</p>',
        },
        {
            'title': 'The N+1 Query Problem',
            'body': '<p>This is the performance bug most application developers ship at '
                    'least once.</p>'
                    '<p>You fetch a list of fifty orders — one query. Then, displaying each, '
                    'you read its customer\'s name — fifty more. Fifty-one queries where two '
                    'would do. It is invisible in development with ten rows and obvious in '
                    'production, where each query costs a network round trip.</p>'
                    '<p>The fix is to ask for the related data up front, in a join or a '
                    'second query for all of them at once. Every mature ORM has a way to do '
                    'this; the skill is noticing that you need it.</p>',
        },
        {
            'title': 'Never Build SQL by Concatenation',
            'body': '<p>Putting user input into a query string is how SQL injection happens, '
                    'and it remains one of the most damaging vulnerabilities in web '
                    'applications.</p>'
                    '<p>If a search box\'s contents are pasted into the query text, someone '
                    'can type SQL instead of a search term and have the database run it — '
                    'reading tables they should never see, or dropping them.</p>'
                    '<p>Use parameterised queries. The values travel separately from the '
                    'statement, so the database never mistakes data for instructions. This '
                    'is not a special case for untrusted input: it is how every query should '
                    'be written.</p>',
            'code': "# wrong - the input becomes part of the statement\n"
                    "cursor.execute(\"SELECT * FROM users WHERE name = '\" + name + \"'\")\n"
                    "\n"
                    "# right - the value is passed separately\n"
                    "cursor.execute('SELECT * FROM users WHERE name = %s', [name])",
        },
    ],
    'quiz': {
        'title': 'Quiz: Relational Data for Applications',
        'description': 'Keys, relationships, joins, indexes, transactions and N+1.',
        'time_limit': 15,
        'questions': [
            {
                'title': 'Foreign Keys',
                'text': 'What does a foreign key constraint guarantee?',
                'choices': [
                               'A row cannot point at a related row that does not exist',
                               'The column is unique across the whole table',
                               'The column is indexed automatically in every database',
                               'The related row can never be updated',
                           ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Storing a Fact Once',
                'text': 'Why is copying a customer\'s address onto every order a problem?',
                'choices': [
                               'It makes the orders table impossible to index',
                               'Foreign keys stop working once a value is duplicated',
                               'When the address changes, the copies disagree and none is authoritative',
                               'Databases refuse to store the same text in two tables',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'Where the Foreign Key Goes',
                'text': 'In a one-to-many relationship, which side holds the foreign key?',
                'choices': [
                               'Neither; a separate join table is always required',
                               'The many side — each order stores its customer id',
                               'The one side — each customer stores its order ids',
                               'Both sides store a key to the other',
                           ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'Many to Many',
                'text': 'How is a many-to-many relationship represented?',
                'choices': [
                               'With a third table holding one row per pairing',
                               'With a foreign key on each of the two tables',
                               'By repeating rows in whichever table is larger',
                               'By combining the two tables into one',
                           ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Choosing a Join',
                'text': 'You want every customer with a count of their orders, including '
                        'those who have never ordered. Which join?',
                'choices': [
                               'An inner join between customers and orders',
                               'An inner join, then filter out the nulls',
                               'No join is needed; count the orders table alone',
                               'A left join from customers to orders',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'The Cost of Indexes',
                'text': 'Why not simply index every column?',
                'choices': [
                               'Indexes make queries return rows in the wrong order',
                               'Indexed columns cannot be used in a join',
                               'Each index costs space and must be updated on every write',
                               'Databases allow only one index per table',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'When to Use a Transaction',
                'text': 'Which operation most needs to be wrapped in a transaction?',
                'choices': [
                    'Reading a list of customers for a report',
                    'Counting the rows in a table',
                    'Selecting a single row by its primary key',
                    'Debiting one account and crediting another',
                ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'Recognising N+1',
                'text': 'A page lists 50 orders and issues 51 queries. What is happening?',
                'choices': [
                               'Each order is fetching its related row in a separate query',
                               'The database is missing a primary key on orders',
                               'The transaction is being retried fifty times',
                               'The connection pool is opening one connection per row',
                           ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'SQL Injection',
                'text': 'Why does a parameterised query prevent SQL injection?',
                'choices': [
                    'It runs the query with reduced database permissions',
                    'The value travels separately from the statement, so it is never run as SQL',
                    'It removes dangerous words from the input before running it',
                    'It limits how long the input string may be',
                ],
                'correct': 1,
                'points': 3,
            },
        ],
    },
}
