"""
IT Support Engineer capstone (BSIT).

Comes last, after networking, Linux and systems, and security fundamentals. The
technical ground is shared; what is specific to this role is diagnosis under
pressure and dealing with people.
"""

MODULE = {
    'title': 'Supporting People and Their Machines',
    'description': 'Turning a complaint into a diagnosis, fixing causes rather than '
                   'symptoms, and leaving a record the next person can use.',
    'duration': 75,
    'difficulty': 'beginner',
    'skills': ['IT Support', 'Troubleshooting', 'Communication'],
    'slides': [
        {
            'title': 'The Report Is Not the Problem',
            'body': '<p>"The internet is down" might mean the network is unreachable, one '
                    'site is refusing to load, a password has expired, or a cable has been '
                    'kicked out. The words describe an experience, not a fault.</p>'
                    '<p>So the first job is turning a report into a symptom you can test: '
                    'what exactly did you do, what did you expect, what happened instead, '
                    'when did it last work, and does it happen every time?</p>'
                    '<p>That last pair does most of the work. "It worked yesterday" points at '
                    'a change; "only sometimes" points at something intermittent — a marginal '
                    'cable, a failing disk, a wireless edge — and rules out most '
                    'configuration.</p>',
        },
        {
            'title': 'Halve the Problem',
            'body': '<p>Diagnosis is a search, and the fastest search halves what is left '
                    'each time.</p>'
                    '<p>Is it this machine or every machine? This user or every user? This '
                    'application or all of them? Each answer eliminates a whole category '
                    'rather than one candidate.</p>'
                    '<p>Trying fixes at random feels faster and is not: it changes several '
                    'things at once, so if the fault goes away you do not know why, and it '
                    'will be back.</p>',
        },
        {
            'title': 'Reproduce Before You Fix',
            'body': '<p>If you cannot make the fault happen, you cannot know you have fixed '
                    'it. Watching the user do it is worth ten described attempts, and often '
                    'reveals that what they are doing is not what they said.</p>'
                    '<p>Reproducing also protects you from the most demoralising outcome in '
                    'support: declaring something fixed because it happened not to occur '
                    'while you were watching.</p>',
        },
        {
            'title': 'Symptom Or Cause',
            'body': '<p>Rebooting fixes an enormous amount, and fixes nothing permanently.</p>'
                    '<p>It is a legitimate first move when someone needs to work now. It '
                    'becomes a problem when it is the whole answer: the machine that needs '
                    'rebooting weekly has something wrong with it, and the third ticket is '
                    'the moment to ask what.</p>'
                    '<p>The signal is repetition. One occurrence is an event; the same '
                    'machine or the same fault appearing repeatedly is a cause nobody has '
                    'looked for.</p>',
        },
        {
            'title': 'Accounts and Access',
            'body': '<p>A large share of support is people unable to get in, and it is where '
                    'support and security meet.</p>'
                    '<p>Know the difference between the reasons: a wrong password, an expired '
                    'password, a locked account after failed attempts, and an account that '
                    'was never given access to that system. They present identically to the '
                    'user and need different fixes.</p>'
                    '<p>Verify identity before resetting anything. A confident phone call '
                    'asking for a password reset is a standard attack, and the whole control '
                    'rests on the person answering it. Follow the procedure even when it '
                    'feels rude — especially then.</p>',
        },
        {
            'title': 'Do Not Lose Their Data',
            'body': '<p>The one unrecoverable mistake in support is destroying work.</p>'
                    '<p>Before reimaging, reinstalling or resetting anything, ask what is on '
                    'it and where it is saved. "It is all in the cloud" is worth verifying '
                    'rather than accepting — the desktop folder usually is not.</p>'
                    '<p>Take a copy first when there is any doubt. Ten minutes of copying is '
                    'always cheaper than a lost dissertation, and you will not get a second '
                    'chance to decide.</p>',
        },
        {
            'title': 'Writing the Ticket',
            'body': '<p>A ticket is a message to whoever sees this fault next, who may well '
                    'be you.</p>'
                    '<p>Record the symptom as reported, what you checked and ruled out, what '
                    'you changed, and whether it is actually resolved. "Fixed" tells the next '
                    'person nothing; "power supply replaced, fault was intermittent shutdown '
                    'under load" saves them the whole diagnosis.</p>'
                    '<p>Written up consistently, tickets stop being a queue and become data — '
                    'the same fault on twelve machines is a purchasing problem, and only the '
                    'records reveal it.</p>',
        },
        {
            'title': 'Talking to People Who Are Frustrated',
            'body': '<p>People arrive at support already blocked, often late for something. '
                    'The technical fix is half the job.</p>'
                    '<p>Say what you are doing and why, in their terms. Give an honest '
                    'estimate rather than an optimistic one. If you do not know, say so and '
                    'say what you will do next — that is far better received than a confident '
                    'guess that turns out wrong.</p>'
                    '<p>And do not make them feel stupid, even implicitly. The user who is '
                    'embarrassed to report something is the one who does not mention the '
                    'strange email they clicked until it matters a great deal.</p>',
        },
    ],
    'quiz': {
        'title': 'Quiz: Supporting People and Their Machines',
        'description': 'Diagnosis, causes, accounts, data and records.',
        'time_limit': 15,
        'questions': [
            {
                'title': 'What a Report Tells You',
                'text': 'A user says "the internet is down". What does that describe?',
                'choices': [
                               'A network layer fault',
                               'A DNS failure',
                               'A problem affecting everyone',
                               'An experience, which has to be turned into a testable symptom',
                           ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'Only Sometimes',
                'text': 'A fault happens only occasionally. What does that suggest?',
                'choices': [
                               'An expired password',
                               'A missing software update',
                               'Something intermittent, such as a marginal cable or failing disk',
                               'A configuration error',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'Halving the Problem',
                'text': 'Which question eliminates the most possibilities at once?',
                'choices': [
                    'Is it this machine or every machine?',
                    'Has the machine been restarted?',
                    'How old is the computer?',
                    'Which browser is being used?',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Trying Several Fixes',
                'text': 'Why not change several things at once to fix it faster?',
                'choices': [
                               'The machine cannot apply two changes together',
                               'If it goes away you will not know why, so it will come back',
                               'Changes must be approved individually',
                               'It takes longer than changing one thing',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Reproducing First',
                'text': 'Why reproduce a fault before fixing it?',
                'choices': [
                               'It proves the user was mistaken',
                               'Otherwise you cannot know whether you fixed it',
                               'Tickets cannot be closed without a reproduction',
                               'It is required before escalating',
                           ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'The Third Reboot',
                'text': 'A machine has needed rebooting weekly for a month. What does that mean?',
                'choices': [
                               'Rebooting is the correct long-term fix',
                               'The user is doing something wrong',
                               'There is a cause nobody has looked for yet',
                               'The machine needs replacing on age grounds',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'Cannot Sign In',
                'text': 'Which of these present identically to the user but need different fixes?',
                'choices': [
                    'A wrong password, an expired one, a locked account, and no access granted',
                    'A slow network and a fast one',
                    'A laptop and a desktop',
                    'A browser and an application',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'A Call Asking for a Reset',
                'text': 'Someone phones, sounds confident and asks for a password reset. What '
                        'do you do?',
                'choices': [
                               'Refuse all resets by phone permanently',
                               'Verify their identity by the agreed procedure first',
                               'Reset it, since they knew the username',
                               'Reset it and email the new password',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Before Reimaging',
                'text': 'A user says their work is "all in the cloud". What should you do '
                        'before wiping the machine?',
                'choices': [
                               'Ask them to sign a form',
                               'Reimage and restore afterwards if needed',
                               'Verify it, and copy anything in doubt',
                               'Proceed, since they confirmed it',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'Writing It Up',
                'text': 'Why is "fixed" a poor resolution note?',
                'choices': [
                    'The next person to see the fault learns nothing from it',
                    'It is too short for most ticket systems',
                    'It cannot be searched',
                    'It prevents the ticket from being reopened',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Tickets as Data',
                'text': 'What does consistent ticket writing make visible?',
                'choices': [
                               'Which users report the most issues',
                               'How quickly each technician works',
                               'Which software is most popular',
                               'The same fault on twelve machines, which is a purchasing problem',
                           ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'Why Not Make Someone Feel Stupid',
                'text': 'What is the practical cost of embarrassing a user?',
                'choices': [
                               'They will submit more tickets than necessary',
                               'They will contact a different technician',
                               'They will refuse to restart their machine',
                               'They will not mention the strange email they clicked until it matters',
                           ],
                'correct': 3,
                'points': 3,
            },
        ],
    },
}
