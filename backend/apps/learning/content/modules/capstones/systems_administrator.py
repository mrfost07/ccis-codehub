"""
Systems Administrator capstone (BSIT).

Every other module in its path already existed — Linux and systems, networking,
security fundamentals.
"""

MODULE = {
    'title': 'Keeping Servers Running',
    'description': 'Building servers that can be rebuilt, watching them, planning for '
                   'failure, and changing them without breaking anything.',
    'duration': 80,
    'difficulty': 'intermediate',
    'skills': ['System Administration', 'Automation', 'Operations'],
    'slides': [
        {
            'title': 'Rebuildable, Not Precious',
            'body': '<p>The test of a server is whether you could rebuild it from scratch and '
                    'get the same machine.</p>'
                    '<p>A server nobody dares touch, configured by hand over three years by '
                    'people who have left, is a liability whatever it is running. When it '
                    'fails — and it will — nobody knows what was on it, and the outage lasts '
                    'as long as the archaeology.</p>'
                    '<p>So write down how it is built, in a script or a configuration tool '
                    'rather than a document. A document drifts from reality quietly; a script '
                    'that has stopped matching fails loudly the next time it runs.</p>',
        },
        {
            'title': 'Automate the Third Time',
            'body': '<p>Doing something by hand once is fine. Twice is fine. The third time '
                    'is a signal.</p>'
                    '<p>Automation is not only about time saved. A script does the same thing '
                    'every time, can be reviewed before it runs, and is a record of what was '
                    'done. Manual work on ten servers produces ten slightly different '
                    'servers, and the differences surface months later as one machine '
                    'behaving oddly.</p>'
                    '<p>Start with the repetitive and low-risk. Automating something you do '
                    'not yet understand well just makes the mistake faster.</p>',
        },
        {
            'title': 'Capacity Before It Bites',
            'body': '<p>Disks fill, memory runs out, connections are exhausted. Each presents '
                    'as something unrelated and urgent.</p>'
                    '<p>A full disk is the classic: services refuse to start, the database '
                    'stops accepting writes, logs stop being written — and nothing says "disk '
                    'full" unless you look.</p>'
                    '<p>Watch the trend, not the moment. Ninety per cent full is not an '
                    'emergency; ninety per cent and rising two points a day is a scheduled '
                    'outage in five days\' time, and it is much cheaper to deal with now.</p>',
        },
        {
            'title': 'Monitoring That Tells You Something',
            'body': '<p>Monitor what a person would act on, and alert only on that.</p>'
                    '<p>The failure mode is not too little monitoring but too much alerting. '
                    'A channel that fires forty times a day is not read, and the one alert '
                    'that mattered is in there somewhere.</p>'
                    '<p>Distinguish "someone must act now" from "look at this tomorrow". Only '
                    'the first should wake anyone. If an alert has fired fifty times and '
                    'nobody has ever acted on it, it is not an alert — it is noise with a '
                    'notification attached.</p>',
        },
        {
            'title': 'Change, and Getting Back',
            'body': '<p>Most outages follow a change. That is encouraging: it means the cause '
                    'is usually knowable and often reversible.</p>'
                    '<p>Change one thing at a time, keep a record of what and when, and know '
                    'the way back before you start. "We will work it out if it breaks" is a '
                    'plan that gets made at two in the afternoon and executed at two in the '
                    'morning.</p>'
                    '<p>Test where you can afford to be wrong. A staging machine that differs '
                    'from production in important ways is worse than none, because it '
                    'produces confidence that does not transfer.</p>',
        },
        {
            'title': 'Backups, and the Restore Nobody Tried',
            'body': '<p>The backup is not the deliverable. The restore is.</p>'
                    '<p>Restore into a scratch environment on a schedule and confirm the data '
                    'is really there and usable. Backups fail silently for months — a job '
                    'reporting success while writing an empty archive is common enough that '
                    'it should be assumed until disproved.</p>'
                    '<p>Know two numbers before an incident: how much data you can afford to '
                    'lose, and how long you can afford to be down. They determine how often '
                    'you back up and how fast you must be able to restore, and they are '
                    'business decisions rather than technical ones.</p>',
        },
        {
            'title': 'Patching Without Drama',
            'body': '<p>Patching is skipped because it might break something, and skipping is '
                    'how machines are compromised by flaws fixed a year ago.</p>'
                    '<p>The way out is a routine rather than a decision: a regular window, '
                    'patch the least important machines first, and be able to roll back. Then '
                    'patching stops being an event that gets postponed.</p>'
                    '<p>Anything reachable from the internet goes first, and quickly. It is '
                    'being scanned continuously, and there is no such thing as too obscure to '
                    'find.</p>',
        },
        {
            'title': 'Leaving It Better Documented Than You Found It',
            'body': '<p>The person diagnosing this at 3am may be you, having forgotten '
                    'everything.</p>'
                    '<p>Record what each machine is for, what depends on it, how to reach it, '
                    'and anything deliberately unusual — with the reason. The reason is the '
                    'part that matters: without it, the next person removes the odd setting '
                    'and rediscovers why it was there.</p>'
                    '<p>Keep it somewhere reachable when the system it describes is down. '
                    'Documentation stored only on the failed server is a lesson everyone '
                    'learns exactly once.</p>',
        },
    ],
    'quiz': {
        'title': 'Quiz: Keeping Servers Running',
        'description': 'Rebuildability, automation, capacity, change, backups and patching.',
        'time_limit': 16,
        'questions': [
            {
                'title': 'The Test of a Server',
                'text': 'What is the test of a well-run server?',
                'choices': [
                               'Only one person knows how to configure it',
                               'You could rebuild it from scratch and get the same machine',
                               'It has not been restarted in a year',
                               'It runs the latest version of everything',
                           ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'Script Or Document',
                'text': 'Why record a build as a script rather than a document?',
                'choices': [
                               'Documents cannot be version controlled',
                               'Scripts do not need to be reviewed',
                               'A document drifts quietly; a script that stops matching fails loudly',
                               'Scripts are quicker to write',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'When to Automate',
                'text': 'Besides time, what does automating a repeated task give you?',
                'choices': [
                               'Lower licensing costs',
                               'The same result every time, reviewable in advance, and a record',
                               'Fewer servers to manage',
                               'Permission to skip testing',
                           ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'Ten Servers by Hand',
                'text': 'What does configuring ten servers manually produce?',
                'choices': [
                    'Ten slightly different servers, with differences surfacing months later',
                    'Ten identical servers, more slowly',
                    'Servers that cannot be monitored centrally',
                    'A configuration that cannot be documented',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'The Unrelated Emergency',
                'text': 'Services will not start and the database refuses writes. What is the '
                        'classic cause?',
                'choices': [
                               'An expired certificate',
                               'A DNS misconfiguration',
                               'A firewall rule change',
                               'A full disk',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'Reading Capacity',
                'text': 'A disk is 90% full and rising two points a day. What is that?',
                'choices': [
                               'Normal behaviour needing no action',
                               'A monitoring error, since disks do not fill linearly',
                               'A scheduled outage in five days, much cheaper to handle now',
                               'An emergency requiring immediate action tonight',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'Too Much Alerting',
                'text': 'What is the usual monitoring failure?',
                'choices': [
                    'Alerting so often that nobody reads it',
                    'Monitoring too few machines',
                    'Collecting metrics too frequently',
                    'Storing history for too long',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'A Misleading Staging Environment',
                'text': 'Why is a staging machine that differs from production in important '
                        'ways worse than none?',
                'choices': [
                               'It delays the release by a day',
                               'It produces confidence that does not transfer',
                               'It doubles the cost of hosting',
                               'It cannot run the same tests',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'What the Deliverable Is',
                'text': 'In backups, what is the actual deliverable?',
                'choices': [
                    'The restore',
                    'The backup job completing',
                    'The archive being written off site',
                    'The retention schedule',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'A Job That Reports Success',
                'text': 'What should be assumed about a backup job that reports success?',
                'choices': [
                               'That the data is safe, since the job checks itself',
                               'That it can be left unverified for a year',
                               'That the archive size will grow steadily',
                               'That it may be writing an empty archive, until a restore disproves it',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'Two Numbers',
                'text': 'Which two numbers determine your backup and restore design?',
                'choices': [
                               'The size of the database and the speed of the disk',
                               'The number of servers and the retention period',
                               'The cost of storage and the cost of bandwidth',
                               'How much data you can lose, and how long you can be down',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'Making Patching Routine',
                'text': 'How does patching stop being an event that gets postponed?',
                'choices': [
                               'Patching only when a vulnerability is announced',
                               'Delegating it to the vendor',
                               'A regular window, least important machines first, and a way back',
                               'Applying every patch the day it is published',
                           ],
                'correct': 2,
                'points': 2,
            },
        ],
    },
}
