"""
SOC Analyst capstone (BSIT).

Every other module in its path already existed — security fundamentals,
networking, Linux and systems.
"""

MODULE = {
    'title': 'Detecting and Responding to Attacks',
    'description': 'Finding the signal in ordinary noise, triaging what you find, and '
                   'handling an incident without making it worse.',
    'duration': 80,
    'difficulty': 'intermediate',
    'skills': ['Security Operations', 'Incident Response', 'Log Analysis'],
    'slides': [
        {
            'title': 'What a SOC Analyst Does',
            'body': '<p>The job is not stopping attacks at the perimeter. It is noticing that '
                    'something is already happening, deciding quickly how serious it is, and '
                    'acting before it spreads.</p>'
                    '<p>That means most of the work is reading ordinary activity closely '
                    'enough to see what does not belong — and the hard part is that almost '
                    'everything unusual is innocent.</p>',
        },
        {
            'title': 'Know What Normal Looks Like',
            'body': '<p>You cannot spot the abnormal without knowing the normal. A login at '
                    '3am is routine in a data centre and worth a look for an office '
                    'administrator.</p>'
                    '<p>So build a picture first: who works when, which machines talk to '
                    'which, how much traffic is usual, what the batch jobs do at night. '
                    'Analysts new to an environment generate false alarms for weeks precisely '
                    'because they have not built it yet.</p>'
                    '<p>Write it down. Otherwise the knowledge is in one person\'s head and '
                    'leaves when they do.</p>',
        },
        {
            'title': 'What Attacks Look Like in Logs',
            'body': '<p>Some patterns are worth knowing by sight.</p>'
                    '<p>Many failed logins then one success: a password guessed. The same '
                    'password tried against many accounts: spraying, which evades lockouts '
                    'because no single account fails much. A successful login from an '
                    'improbable location minutes after a normal one: a stolen session or '
                    'credential.</p>'
                    '<p>After access, the shape changes: connections to internal machines the '
                    'account never touches, unusual volumes leaving the network, or an '
                    'account suddenly being granted privileges. Those matter more than the '
                    'entry, because they mean it worked.</p>',
        },
        {
            'title': 'Triage',
            'body': '<p>Most alerts are not incidents. Triage is deciding, fast, which is '
                    'which.</p>'
                    '<p>Three questions do most of it: is it true, how bad if it is, and is it '
                    'still happening? An alert that is real, serious and ongoing outranks '
                    'everything else on the queue, whatever the tool\'s own severity says.</p>'
                    '<p>Beware two failure modes. Dismissing an alert because it looks like '
                    'the usual false positive is how real ones are missed. Escalating '
                    'everything is how nobody comes when you call.</p>',
        },
        {
            'title': 'Contain First',
            'body': '<p>The order is containment, then understanding, then recovery. It is '
                    'tempting to investigate while an attacker is still working — that is how '
                    'a compromise becomes several.</p>'
                    '<p>Containment is usually isolating a machine or disabling an account, '
                    'and it is a judgement: cutting a production server off stops the spread '
                    'and stops the business. Know who is entitled to make that call before '
                    'you need to.</p>'
                    '<p>Do not tip off the attacker unnecessarily. Someone who realises they '
                    'have been seen will destroy evidence and move faster.</p>',
        },
        {
            'title': 'Do Not Destroy the Evidence',
            'body': '<p>The instinct to reimage immediately is strong and usually wrong.</p>'
                    '<p>Wiping the machine destroys the record of how they got in. Without '
                    'that, the same route works again next week and you will not know why. '
                    'Capture what you need first — logs, memory if you can, a disk image for '
                    'anything serious.</p>'
                    '<p>Note who did what and when as you go. During an incident that feels '
                    'like overhead; afterwards it is the only account of what happened, and '
                    'it is what a regulator, an insurer or a court will ask for.</p>',
        },
        {
            'title': 'Communicating During an Incident',
            'body': '<p>Decide in advance who decides, who is told, and how you will talk if '
                    'the usual systems are the compromised ones. Working that out during an '
                    'incident costs hours.</p>'
                    '<p>Say what you know, what you do not, and when you will next update. '
                    'Early speculation gets repeated as fact and then has to be walked '
                    'back — which costs more credibility than saying "we do not know '
                    'yet".</p>'
                    '<p>Reporting obligations often have deadlines measured in hours. Know '
                    'whether yours do before the clock starts.</p>',
        },
        {
            'title': 'Afterwards',
            'body': '<p>The review after an incident is where the value is, and it is the '
                    'part most often skipped once things are working again.</p>'
                    '<p>Ask how they got in, how long they were there before anyone noticed, '
                    'and what would have caught it sooner. The second question is usually the '
                    'uncomfortable one and the most useful.</p>'
                    '<p>Look for the cause, not the culprit. A review that finds someone to '
                    'blame teaches everyone to be quieter next time, which lengthens the gap '
                    'between the next compromise and anyone hearing about it.</p>',
        },
    ],
    'quiz': {
        'title': 'Quiz: Detecting and Responding to Attacks',
        'description': 'Baselines, attack patterns, triage, containment and review.',
        'time_limit': 16,
        'questions': [
            {
                'title': 'The Job',
                'text': 'What is a SOC analyst mainly doing?',
                'choices': [
                               'Configuring firewalls and access rules',
                               'Patching systems before flaws are exploited',
                               'Noticing something is already happening and acting before it spreads',
                               'Preventing all attacks at the perimeter',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'Why Baselines Matter',
                'text': 'Why do analysts new to an environment generate false alarms for weeks?',
                'choices': [
                               'They have not completed vendor training',
                               'They have not yet built a picture of what normal looks like',
                               'They lack access to the right tools',
                               'The alerting thresholds are set too low by default',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Password Spraying',
                'text': 'The same password is tried against many accounts. Why does this evade '
                        'lockouts?',
                'choices': [
                               'Lockouts only apply to administrator accounts',
                               'The attempts come from different addresses',
                               'Failed logins are not recorded for unknown users',
                               'No single account accumulates many failures',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'What Matters More Than the Entry',
                'text': 'Which activity signals that an intrusion has succeeded?',
                'choices': [
                               'A password reset request',
                               'An expired certificate warning',
                               'Connections to internal machines the account never touches',
                               'Repeated failed login attempts',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'Triage Questions',
                'text': 'Which three questions do most of triage?',
                'choices': [
                    'Is it true, how bad if it is, and is it still happening',
                    'Who reported it, when, and to whom',
                    'Which tool raised it, at what severity, and how often',
                    'Which system, which user, and which location',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Escalating Everything',
                'text': 'What is the cost of escalating every alert?',
                'choices': [
                               'Alerts are suppressed automatically',
                               'The tool lowers its own severity ratings',
                               'Nobody comes when you call',
                               'The queue takes longer to clear',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'The Order',
                'text': 'What is the correct order when an incident is confirmed?',
                'choices': [
                    'Contain, then understand, then recover',
                    'Understand fully, then contain, then recover',
                    'Recover service first, then investigate',
                    'Notify everyone, then contain',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'Tipping Them Off',
                'text': 'Why avoid letting an attacker know they have been noticed?',
                'choices': [
                               'They may report the organisation publicly',
                               'It invalidates the alert in the tool',
                               'It resets the containment timer',
                               'They will destroy evidence and move faster',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'Reimaging Immediately',
                'text': 'What does wiping a compromised machine straight away cost you?',
                'choices': [
                               'The ability to restore from backup',
                               "The machine's place in the asset inventory",
                               'The chance to patch it properly',
                               'The record of how they got in, so the same route works again',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'Notes During an Incident',
                'text': 'Why record who did what and when, as you go?',
                'choices': [
                    'It is the only account afterwards, and regulators or insurers will ask',
                    'It speeds up containment',
                    'It is required before escalating',
                    'It prevents duplicated work between analysts',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Early Speculation',
                'text': 'Why avoid speculating early about what happened?',
                'choices': [
                    'It gets repeated as fact and costs more credibility to walk back',
                    'It slows the technical investigation',
                    'It breaches reporting obligations',
                    'It contaminates the evidence',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'The Most Useful Review Question',
                'text': 'Which question after an incident is usually most uncomfortable and '
                        'most valuable?',
                'choices': [
                               'Who approved the change that allowed it',
                               'How long were they there before anyone noticed',
                               'Which vulnerability did they use',
                               'How much did the outage cost',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Cause Or Culprit',
                'text': 'Why should a review look for the cause rather than someone to blame?',
                'choices': [
                               'It shortens the review meeting',
                               'Blame teaches everyone to be quieter, lengthening the next detection gap',
                               'Individuals are rarely responsible for incidents',
                               'Blame is prohibited by most security standards',
                           ],
                'correct': 1,
                'points': 3,
            },
        ],
    },
}
