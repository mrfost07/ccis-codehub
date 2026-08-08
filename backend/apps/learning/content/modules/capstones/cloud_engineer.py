"""
Cloud Engineer capstone.

Sits on core.networking, core.linux_and_systems and
core.cloud_and_virtualisation. Those teach the model; this is the part that is
only true of the job — designing something that survives a failure, costs what
you meant it to, and can be rebuilt by someone who was not there when it was
built.
"""

MODULE = {
    'title': 'Running Systems in the Cloud',
    'description': 'Designing a deployment that survives failure, recovers to a known '
                   'state, costs what you intended, and can be rebuilt from its '
                   'definition rather than from memory.',
    'duration': 100,
    'difficulty': 'intermediate',
    'skills': ['Cloud Computing', 'Infrastructure as Code', 'Reliability', 'Cost Management'],
    'slides': [
        {
            'title': 'Designing for the Failure You Will Actually Get',
            'body': '<p>Hardware fails, and at cloud scale it fails constantly. The design '
                    'question is never "will this break" but "what happens when it does".</p>'
                    '<p>Start by naming the single points of failure. One web server, one '
                    'database, one availability zone — each is a sentence beginning "if this '
                    'goes, we are down until somebody notices."</p>'
                    '<p>Then decide, deliberately, which of them you are willing to keep. '
                    'Removing every one is expensive, and a student project does not need '
                    'multi-region failover. The professional act is choosing knowingly and '
                    'writing the choice down, rather than discovering it during an '
                    'incident.</p>',
        },
        {
            'title': 'Two Numbers That Decide Your Backup Strategy',
            'body': '<p>Backups are not a checkbox. Two numbers turn them into a design.</p>'
                    '<p><strong>RPO</strong>, recovery point objective: how much data you can '
                    'afford to lose. Nightly backups mean an RPO of up to 24 hours — a '
                    'failure at 5pm loses a day of work.</p>'
                    '<p><strong>RTO</strong>, recovery time objective: how long you can afford '
                    'to be down while restoring.</p>'
                    '<p>Agreeing these with whoever owns the service converts an argument '
                    'about "is it backed up" into an answerable engineering question. And a '
                    'backup nobody has ever restored is a hypothesis, not a backup — the '
                    'restore is the thing worth rehearsing, because that is where you find '
                    'the missing credential.</p>',
        },
        {
            'title': 'Least Privilege, and Why It Is Hard',
            'body': '<p>Every component should hold exactly the permissions it needs, and no '
                    'more. It is easy to say and awkward to do, because the fast way to make '
                    'something work at 2am is to widen its permissions until the error stops.</p>'
                    '<p>That is how an application that only ever reads one storage bucket '
                    'ends up able to delete every bucket in the account. Nothing looks wrong; '
                    'it works. The cost only arrives when that component is compromised, and '
                    'by then the blast radius was decided months earlier.</p>'
                    '<p>Practical version: give a role one job, grant it the narrowest '
                    'permission that makes that job work, and never attach long-lived keys to '
                    'something that could use a short-lived identity instead.</p>',
        },
        {
            'title': 'Knowing It Is Broken Before Your Users Tell You',
            'body': '<p>Monitoring answers "is it up". Observability answers "why is it '
                    'behaving like that", which is the harder and more useful question.</p>'
                    '<p>Three things carry most of the weight. <strong>Metrics</strong> are '
                    'numbers over time — request rate, error rate, latency, saturation. '
                    '<strong>Logs</strong> are what happened, with enough context to trace one '
                    'request. <strong>Alerts</strong> are the subset worth waking a person '
                    'for.</p>'
                    '<p>The discipline is in the last one. An alert that fires daily and is '
                    'always ignored has trained your team to ignore alerts, so it is worse '
                    'than no alert at all. Alert on symptoms users feel — errors and latency '
                    '— not on every internal number that moved.</p>',
        },
        {
            'title': 'The Bill Is Part of the Design',
            'body': '<p>Cloud cost is not a finance problem you inherit at the end of the '
                    'month; it is a consequence of choices made while building.</p>'
                    '<p>The usual sources of waste: machines provisioned for peak and left '
                    'running at night, storage that grew because nothing ever expires, test '
                    'environments nobody switched off, and data transfer between regions that '
                    'nobody costed.</p>'
                    '<p>Tag resources with what they are and who owns them from the first day. '
                    'A bill you cannot break down by service is a bill you cannot reduce, and '
                    'retro-fitting tags across an estate that grew organically is genuinely '
                    'unpleasant work.</p>',
        },
        {
            'title': 'Rebuild, Do Not Repair',
            'body': '<p>The instinct when a server misbehaves is to log in and fix it. On '
                    'infrastructure you can recreate, that instinct is usually wrong.</p>'
                    '<p>A machine repaired by hand becomes a machine nobody can reproduce. Its '
                    'state is the sum of every undocumented intervention, and the next person '
                    'to touch it inherits that archaeology.</p>'
                    '<p>The alternative: fix the definition, then replace the instance from '
                    'it. Slower in the moment, and it means the fix survives — it is in the '
                    'repository, it goes through review, and the next rebuild includes it '
                    'automatically.</p>'
                    '<p>This is what people mean by treating servers as cattle rather than '
                    'pets. It is not callousness about machines; it is refusing to let '
                    'knowledge live only in one server\'s filesystem.</p>',
        },
        {
            'title': 'Migrating Something That Is Already Running',
            'body': '<p>Most cloud work is not greenfield. It is moving something that people '
                    'are using and cannot afford to lose.</p>'
                    '<p>The honest first step is an inventory: what is running, what talks to '
                    'what, and which of it is still needed. Migrations routinely discover '
                    'services nobody can account for, and the safest thing to do with those is '
                    'find their owner, not switch them off and wait for screaming.</p>'
                    '<p>Then move in slices, keeping a way back at each step. Run the new '
                    'alongside the old, shift a fraction of traffic, watch the error rate, and '
                    'only decommission the old system once the new one has held under real '
                    'load. A migration with no rollback is not a plan; it is a bet.</p>',
        },
        {
            'title': 'Capstone: Design a Deployment and Defend It',
            'body': '<p>Take a small web application — a database, an API and a static '
                    'frontend — and produce a design document a reviewer could act on.</p>'
                    '<ol>'
                    '<li>Draw the architecture and mark every single point of failure.</li>'
                    '<li>State the RPO and RTO you are designing for, and say how backups and '
                    'restores meet them.</li>'
                    '<li>List each component\'s permissions and justify why each is the '
                    'narrowest that works.</li>'
                    '<li>Name the three alerts you would actually wake someone for, and say '
                    'what a person does when each fires.</li>'
                    '<li>Estimate the monthly cost, identify the largest line, and describe '
                    'one change that would halve it and what you would give up.</li>'
                    '<li>Say how the whole thing is rebuilt from nothing if the account is '
                    'lost.</li>'
                    '</ol>'
                    '<p>The last point is the test of the rest. If the answer involves '
                    'remembering what was clicked, the design is not finished.</p>',
        },
    ],
    'quiz': {
        'title': 'Quiz: Running Systems in the Cloud',
        'description': 'Failure domains, recovery objectives, least privilege, alerting, '
                       'cost and migration.',
        'time_limit': 20,
        'questions': [
            {
                'title': 'Naming the Weak Point',
                'text': 'What is the purpose of listing single points of failure in a design?',
                'choices': [
                    'To remove every one of them before launching',
                    'To decide knowingly which ones you are accepting, and record the choice',
                    'To satisfy the cloud provider\'s requirements',
                    'To calculate the exact probability of an outage',
                ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'What RPO Measures',
                'text': 'What does a recovery point objective describe?',
                'choices': [
                    'How long the service may be down while you restore it',
                    'How many users can be affected before an incident is declared',
                    'How much data you can afford to lose',
                    'How often the backup job is scheduled to run',
                ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'Nightly Backups',
                'text': 'A system is backed up nightly at midnight and fails at 5pm. What is '
                        'the data loss?',
                'choices': [
                    'None, because backups are continuous',
                    'Only the transactions that were in flight',
                    'Everything since the system was built',
                    'Roughly seventeen hours of work',
                ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'An Untested Backup',
                'text': 'Why is a backup that has never been restored considered unproven?',
                'choices': [
                    'The restore is where missing credentials and broken assumptions surface',
                    'Backup files decay if they are not read periodically',
                    'Providers delete backups that are never accessed',
                    'An unrestored backup is not counted toward the RPO',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'How Permissions Get Too Wide',
                'text': 'An application that only reads one storage bucket can delete every '
                        'bucket in the account. What most likely happened?',
                'choices': [
                    'The provider grants delete rights to all applications by default',
                    'Permissions were widened during troubleshooting until the error stopped, and never narrowed',
                    'Read access implies delete access in most cloud platforms',
                    'The bucket policy expired and defaulted to full access',
                ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'The Alert Nobody Reads',
                'text': 'Why is an alert that fires daily and is always ignored worse than no '
                        'alert at all?',
                'choices': [
                    'It consumes a measurable amount of monitoring budget',
                    'It delays other alerts in the queue',
                    'It trains the team to ignore alerts, including the ones that matter',
                    'It resets the incident counter each time it fires',
                ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'What to Alert On',
                'text': 'Alerts should generally be based on what?',
                'choices': [
                    'Symptoms that users actually feel, such as errors and latency',
                    'Every internal metric that changes by more than ten percent',
                    'Processor usage on each individual machine',
                    'The number of deployments made that day',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Where the Bill Comes From',
                'text': 'Which is the most common source of avoidable cloud cost?',
                'choices': [
                    'Paying for support plans that go unused',
                    'The provider raising published prices without notice',
                    'Encrypting data at rest',
                    'Capacity provisioned for peak and left running when idle',
                ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'Why Tag From Day One',
                'text': 'Why should resources be tagged with purpose and owner from the start?',
                'choices': [
                    'Untagged resources are billed at a higher rate',
                    'A bill you cannot break down by service is a bill you cannot reduce',
                    'Tags are required before a resource can be deleted',
                    'Tagging improves the performance of the resource',
                ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'Repairing By Hand',
                'text': 'Why is logging in to fix a misbehaving server usually the wrong '
                        'instinct on rebuildable infrastructure?',
                'choices': [
                    'Manual access is blocked by most cloud providers',
                    'The change cannot take effect until the machine is restarted anyway',
                    'The fix lives only on that machine, so it is lost on the next rebuild and nobody reviewed it',
                    'It voids the provider\'s availability guarantee',
                ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'An Unaccounted Service',
                'text': 'A migration inventory turns up a running service nobody can account '
                        'for. What is the safest next step?',
                'choices': [
                    'Trace its traffic and find its owner before deciding anything',
                    'Switch it off and see whether anyone complains',
                    'Migrate it unchanged and revisit it later',
                    'Delete it, since undocumented services are by definition unused',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'Cutting Over',
                'text': 'Why run the new system alongside the old and shift traffic gradually?',
                'choices': [
                    'It halves the cost of the migration period',
                    'Providers require a period of parallel running',
                    'It removes the need to test the new system beforehand',
                    'It keeps a way back at every step, so a problem is a rollback rather than an outage',
                ],
                'correct': 3,
                'points': 3,
            },
        ],
    },
}
