"""
Database Administrator capstone (BSIT).

Every other module in its path already existed — relational data, Linux and
systems, security fundamentals.
"""

MODULE = {
    'title': 'Running a Database in Production',
    'description': 'Keeping a database fast, safe and recoverable, and changing its '
                   'shape without stopping the application.',
    'duration': 80,
    'difficulty': 'intermediate',
    'skills': ['Database Administration', 'Performance', 'Recovery'],
    'slides': [
        {
            'title': 'What the DBA Owns',
            'body': '<p>The database usually holds the one thing an organisation cannot '
                    'recreate. Applications can be rebuilt from source; the data cannot be '
                    'rebuilt from anything.</p>'
                    '<p>So the priorities are, in order: do not lose it, do not let the wrong '
                    'people read it, and keep it fast enough. Performance work that risks the '
                    'first two is not a good trade, however impressive the numbers.</p>',
        },
        {
            'title': 'Finding the Slow Query',
            'body': '<p>Databases are slow for a small number of reasons, and guessing which '
                    'wastes days. Measure first.</p>'
                    '<p>Most engines log queries above a duration threshold, and that log '
                    'usually shows a handful of statements accounting for most of the load. '
                    'Watch total time, not the single worst query: a query taking 50ms and '
                    'running ten thousand times an hour costs far more than one taking five '
                    'seconds nightly.</p>'
                    '<p>Then read the plan. It says whether the engine used an index or read '
                    'the whole table, which is normally the answer.</p>',
        },
        {
            'title': 'Indexes, and Their Bill',
            'body': '<p>An index turns a full scan into a lookup, and every one is paid for '
                    'on every write.</p>'
                    '<p>Index what you filter, join and sort on — foreign keys above all, '
                    'which are joined constantly and often left unindexed. Then check the '
                    'ones you have: engines record index usage, and an index nothing has used '
                    'in months is pure cost.</p>'
                    '<p>Column order matters in a composite index. One on (student, term) '
                    'helps a query filtering by student, and does nothing for one filtering '
                    'only by term.</p>',
        },
        {
            'title': 'Locks and Blocking',
            'body': '<p>When a database "hangs" and nothing is obviously busy, it is usually '
                    'blocking: one transaction holds a lock another is waiting for.</p>'
                    '<p>The cause is nearly always a transaction held open too long — one '
                    'that starts, does some work, waits for something slow such as an API '
                    'call, and only then commits. Everything needing those rows queues behind '
                    'it.</p>'
                    '<p>So keep transactions short and do slow work outside them. Long-running '
                    'reports on the production database can block the writes that are the '
                    'actual business.</p>',
        },
        {
            'title': 'Backups You Have Restored',
            'body': '<p>A backup is a claim until somebody has restored it.</p>'
                    '<p>Restore to a scratch server on a schedule and check the data is really '
                    'there — not just that the file exists. Time it too: knowing a restore '
                    'takes six hours is something to discover on a Tuesday, not during an '
                    'outage.</p>'
                    '<p>Full backups alone give a recovery point of however long since the '
                    'last one. Transaction logs let you roll forward to a chosen moment, which '
                    'is what you want after somebody runs an UPDATE with no WHERE clause.</p>',
        },
        {
            'title': 'Changing the Schema Without an Outage',
            'body': '<p>A migration ships alongside code, and the two never land at exactly '
                    'the same instant. Some changes are safe in that window and some are '
                    'not.</p>'
                    '<p>Adding a nullable column is safe: old code ignores it. Dropping a '
                    'column, renaming one, or making one required is not — old code still '
                    'writing the old shape fails immediately.</p>'
                    '<p>Expand, then contract: add the new column, write to both, backfill, '
                    'move reads across, and only then drop the old one. Slower, and it does '
                    'not take the application down.</p>',
        },
        {
            'title': 'Big Changes on Big Tables',
            'body': '<p>An operation that is instant on a test table can lock a production '
                    'table for minutes, which for the application is an outage.</p>'
                    '<p>Backfilling a column across ten million rows in one statement holds '
                    'locks and fills the transaction log. Do it in batches, with a pause '
                    'between, so other work continues.</p>'
                    '<p>Test on a copy at production scale. A migration that ran in two '
                    'seconds against a thousand test rows tells you nothing about ten '
                    'million.</p>',
        },
        {
            'title': 'Who Can Read It',
            'body': '<p>Applications should connect with an account that can do exactly what '
                    'the application does, and no more. A web application does not need '
                    'permission to drop tables.</p>'
                    '<p>People should not query production directly as a habit. Give analysts '
                    'a replica or a restored copy: it protects the live system from an '
                    'expensive query and limits who can read personal data.</p>'
                    '<p>Encryption at rest protects a stolen disk. It does nothing against '
                    'someone who can query the database — which is why permissions, not '
                    'encryption, are the control that matters here.</p>',
        },
    ],
    'quiz': {
        'title': 'Quiz: Running a Database in Production',
        'description': 'Performance, indexes, locking, backups, migrations and access.',
        'time_limit': 16,
        'questions': [
            {
                'title': 'The Priorities',
                'text': 'What is the correct order of a DBA\'s priorities?',
                'choices': [
                    'Do not lose it, do not let the wrong people read it, keep it fast',
                    'Keep it fast, do not lose it, control access',
                    'Control access, keep it fast, do not lose it',
                    'Do not lose it, keep it fast, control access',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Which Query Costs Most',
                'text': 'Which is usually the bigger problem: a 5-second query run nightly, or '
                        'a 50ms query run ten thousand times an hour?',
                'choices': [
                               'It depends only on the table size',
                               'The 50ms query, because total time is what matters',
                               'The 5-second query, because it is slowest',
                               'Neither, since both are within normal ranges',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Reading a Plan',
                'text': 'What does a query plan chiefly tell you?',
                'choices': [
                               'Whether the query holds a lock',
                               'How large the result set will be',
                               'Whether an index was used or the whole table was read',
                               'How many users are connected',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'An Unused Index',
                'text': 'An index has not been used in months. What is it?',
                'choices': [
                               'Insurance against a future query',
                               'Harmless, since unused indexes are not maintained',
                               'Evidence the statistics need refreshing',
                               'Pure cost, paid on every write',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'Composite Index Order',
                'text': 'An index on (student, term) helps which query?',
                'choices': [
                    'One filtering by student',
                    'One filtering only by term',
                    'Both equally',
                    'Neither, unless both columns are filtered',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'The Database That Hangs',
                'text': 'The database appears to hang but nothing is busy. What is the usual '
                        'cause?',
                'choices': [
                               'Too many connections in the pool',
                               'Blocking — a transaction holding a lock others are waiting for',
                               'The disk being full',
                               'A missing index on a large table',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Slow Work Inside a Transaction',
                'text': 'Why not call an external API in the middle of an open transaction?',
                'choices': [
                    'Everything needing those rows queues behind it',
                    'Transactions cannot make network calls',
                    'The API call will be rolled back on failure',
                    'It doubles the transaction log size',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'Timing a Restore',
                'text': 'Why time a restore in advance?',
                'choices': [
                               'It confirms the backup file is not corrupt',
                               'It is required to set the retention period',
                               'Restores get slower as backups age',
                               'Discovering it takes six hours is better on a Tuesday than during an outage',
                           ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'After a Bad UPDATE',
                'text': 'Someone runs an UPDATE with no WHERE clause. What lets you recover to '
                        'the moment before?',
                'choices': [
                               'An index rebuild',
                               'A replica, which will have the same change',
                               'Transaction logs, rolled forward to a chosen point',
                               'The most recent full backup alone',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'A Risky Migration',
                'text': 'Which change is unsafe while old code is still running?',
                'choices': [
                               'Adding a new index',
                               'Creating a new table',
                               'Making an existing column required',
                               'Adding a nullable column',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'Backfilling Ten Million Rows',
                'text': 'Why do a large backfill in batches?',
                'choices': [
                    'One statement holds locks and fills the transaction log',
                    'Batches run faster in total',
                    'The engine rejects very large statements',
                    'It avoids needing an index',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'The Application Account',
                'text': 'What permissions should an application\'s database account have?',
                'choices': [
                               'Whatever the framework requests by default',
                               'Exactly what the application does, and no more',
                               'Full administrative rights, for flexibility',
                               'Read-only, with writes through a separate service',
                           ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'Encryption Versus Permissions',
                'text': 'A database is encrypted at rest. Who can still read everything?',
                'choices': [
                               'Anyone with physical access to the disk',
                               'Anyone who obtains a backup file',
                               'Nobody, until the key is provided',
                               'Anyone who can query it',
                           ],
                'correct': 3,
                'points': 3,
            },
        ],
    },
}
