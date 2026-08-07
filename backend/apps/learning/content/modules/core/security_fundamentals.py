"""
Security fundamentals — shared by the security roles and needed by all the rest.

Reused by: IT Security Specialist, SOC Analyst, Identity and Access Engineer,
Network Security Engineer, Cybersecurity Analyst, System Administrator, Cloud
Engineer, IT Auditor, Information Security Analyst.
"""

MODULE = {
    'title': 'Security Fundamentals',
    'description': 'Thinking about threats, controlling access, protecting data, and '
                   'what to do when something has already gone wrong.',
    'duration': 85,
    'difficulty': 'beginner',
    'skills': ['Security', 'Access Control', 'Risk'],
    'slides': [
        {
            'title': 'What You Are Protecting',
            'body': '<p>Security is usually framed as three properties. '
                    '<strong>Confidentiality</strong>: only those who should see it can. '
                    '<strong>Integrity</strong>: it has not been changed without '
                    'authorisation. <strong>Availability</strong>: it is there when it is '
                    'needed.</p>'
                    '<p>They pull against each other. A system locked hard enough to be '
                    'perfectly confidential is unavailable; one always available to everybody '
                    'is not confidential. Security work is choosing where on that line a '
                    'given system belongs — which is a question about what it holds and who '
                    'needs it, not a technical question.</p>',
        },
        {
            'title': 'Threat Modelling',
            'body': '<p>Before choosing defences, ask three questions: what is worth taking, '
                    'who would want it, and how would they get at it.</p>'
                    '<p>Answering them stops two common failures. The first is defending '
                    'everything equally, which spends the same effort on the lunch menu as '
                    'on student records. The second is defending against the wrong opponent — '
                    'elaborate protection against a remote attacker, on a machine anyone can '
                    'walk up to and unplug.</p>'
                    '<p>Most real incidents are unglamorous: a reused password, an '
                    'unpatched server, a file share opened to everyone "temporarily".</p>',
        },
        {
            'title': 'Authentication Versus Authorisation',
            'body': '<p>Two words that get used interchangeably and must not be.</p>'
                    '<p><strong>Authentication</strong> establishes who you are. '
                    '<strong>Authorisation</strong> decides what you may do. You authenticate '
                    'once and are authorised many times, differently, per action.</p>'
                    '<p>Confusing them produces a specific and common bug: a system that '
                    'carefully checks you are signed in and then never checks whether this '
                    'particular record is yours. Changing an id in a URL and seeing somebody '
                    'else\'s data is authorisation missing, not authentication.</p>',
        },
        {
            'title': 'Least Privilege',
            'body': '<p>Give every account and every process exactly the access it needs and '
                    'no more.</p>'
                    '<p>The reason is blast radius. Accounts get compromised; when one does, '
                    'what the attacker can reach is whatever that account could reach. An '
                    'administrator account used for daily work turns a phishing email into a '
                    'full compromise.</p>'
                    '<p>Privileges also accumulate. Someone who has changed roles three times '
                    'often still holds the access from all three, which nobody notices until '
                    'it is used. Reviewing access periodically is dull and is the control '
                    'that catches it.</p>',
        },
        {
            'title': 'Passwords and Second Factors',
            'body': '<p>Passwords fail in predictable ways: they are reused across sites, so '
                    'one breach elsewhere becomes a breach here, and they are guessed from '
                    'lists of what people commonly choose.</p>'
                    '<p>Length beats complexity. A long passphrase is both harder to guess '
                    'and easier to remember than a short string of substituted characters, '
                    'and forced monthly rotation mostly produces predictable variations.</p>'
                    '<p>A <strong>second factor</strong> is the single largest improvement '
                    'available: something you have as well as something you know. It means a '
                    'stolen password on its own is not enough. On the storage side, passwords '
                    'must be stored as slow salted hashes — never encrypted, and never as '
                    'written.</p>',
        },
        {
            'title': 'Encryption in Transit and at Rest',
            'body': '<p><strong>In transit</strong> protects data while it moves. TLS is what '
                    'makes HTTPS: without it, anyone between the two ends can read and alter '
                    'the traffic — on shared wifi that is anyone in the room.</p>'
                    '<p><strong>At rest</strong> protects data on the disk, so a stolen laptop '
                    'or a discarded drive does not become a breach.</p>'
                    '<p>Neither protects data in use, by a program that is entitled to read '
                    'it. Encryption is not a substitute for access control — a database '
                    'encrypted at rest hands its contents straight to anyone who can query '
                    'it.</p>',
        },
        {
            'title': 'Patching, and Why It Is the Boring Answer',
            'body': '<p>Most successful attacks use a flaw that was fixed months ago. The '
                    'exploit is public, the patch is public, and the machine was not '
                    'updated.</p>'
                    '<p>So keeping an inventory of what you run, knowing when updates are '
                    'published, and applying them promptly is worth more than most tooling. '
                    'The reason it is skipped is that patching risks breaking things — which '
                    'is an argument for being able to test and roll back, not for not '
                    'patching.</p>'
                    '<p>Anything reachable from the internet deserves the fastest patching, '
                    'because it is being scanned continuously by people who have automated '
                    'the whole process.</p>',
        },
        {
            'title': 'When It Has Already Happened',
            'body': '<p>Assume you will one day be handling an incident rather than '
                    'preventing one. What matters then is having decided things in '
                    'advance.</p>'
                    '<p>Contain first — stop it spreading — then work out what happened, then '
                    'recover. Preserve evidence while you do: wiping a machine immediately '
                    'destroys the only record of how they got in, and guarantees the same '
                    'route works again.</p>'
                    '<p>Write down who decides, who is told, and how people communicate if '
                    'the usual systems are the ones compromised. Deciding that during an '
                    'incident is how hours are lost.</p>',
        },
    ],
    'quiz': {
        'title': 'Quiz: Security Fundamentals',
        'description': 'Threats, access, encryption, patching and incidents.',
        'time_limit': 18,
        'questions': [
            {
                'title': 'The Three Properties',
                'text': 'Which three properties does security usually aim to protect?',
                'choices': [
                               'Authentication, authorisation and accounting',
                               'Prevention, detection and response',
                               'Encryption, hashing and signing',
                               'Confidentiality, integrity and availability',
                           ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'The Trade-Off',
                'text': 'Why is "make it as secure as possible" not a useful goal?',
                'choices': [
                               'Perfect security is achievable but slow to implement',
                               'Users would need training on every control',
                               'The properties pull against each other, so a system locked hard enough becomes unavailable',
                               'Security tools are too expensive to apply everywhere',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'Threat Modelling',
                'text': 'What does asking who would want your data and how they would reach '
                        'it prevent?',
                'choices': [
                               'Having to patch systems',
                               'Users choosing weak passwords',
                               'Spending the same effort on trivia as on what matters',
                               'The need for encryption',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'Changing an Id in a URL',
                'text': 'A signed-in user changes an id in a URL and sees another person\'s '
                        'record. What is missing?',
                'choices': [
                               'A second factor',
                               'Authorisation — the system checked who they are, not what they may see',
                               'Authentication — they should have been asked to sign in',
                               'Encryption in transit',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Least Privilege',
                'text': 'Why does using an administrator account for daily work matter?',
                'choices': [
                               'Administrator accounts are slower to authenticate',
                               'It prevents other administrators from working',
                               'Audit logs cannot record administrator actions',
                               'A single phishing email then becomes a full compromise',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'Accumulated Access',
                'text': 'Why review access periodically?',
                'choices': [
                    'People who change roles usually keep the access from all of them',
                    'Passwords expire and must be reissued',
                    'Groups are deleted automatically over time',
                    'Encryption keys need rotating on the same schedule',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Password Strength',
                'text': 'Why does a long passphrase beat a short complex password?',
                'choices': [
                    'It is harder to guess and easier to remember',
                    'It can be reused safely across sites',
                    'It does not need to be hashed when stored',
                    'It removes the need for a second factor',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Storing Passwords',
                'text': 'How should passwords be stored?',
                'choices': [
                    'As slow salted hashes',
                    'Encrypted, so they can be recovered if forgotten',
                    'As written, in a restricted table',
                    'Hashed quickly, so sign-in stays fast',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'What Encryption at Rest Does Not Do',
                'text': 'A database is encrypted at rest. What does that not protect against?',
                'choices': [
                               'A backup tape being lost',
                               'Anyone who can query the database legitimately',
                               'A stolen physical disk',
                               'A discarded drive being read',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Why Patching Matters Most',
                'text': 'Why is prompt patching worth more than most security tooling?',
                'choices': [
                               'Patching is required before encryption can be enabled',
                               'Most successful attacks use a flaw that was fixed months earlier',
                               'Patches remove the need for access control',
                               'Unpatched systems cannot be monitored',
                           ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'The Order of an Incident',
                'text': 'What is the right order when handling an incident?',
                'choices': [
                               'Wipe the affected machines immediately',
                               'Notify everyone before doing anything else',
                               'Contain it, understand it, then recover',
                               'Recover first, then investigate at leisure',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'Preserving Evidence',
                'text': 'Why not wipe a compromised machine straight away?',
                'choices': [
                               'Wiping takes longer than rebuilding',
                               'The machine may still be needed in production',
                               'Backups cannot be restored onto a wiped machine',
                               'It destroys the only record of how they got in, so the route stays open',
                           ],
                'correct': 3,
                'points': 3,
            },
        ],
    },
}
