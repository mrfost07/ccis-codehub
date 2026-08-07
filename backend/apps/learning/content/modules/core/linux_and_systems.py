"""
Linux and system administration — the machine itself.

Reused by: System Administrator, Cloud Engineer, DevOps Engineer, Site
Reliability Engineer, IT Support Engineer, Data Centre Technician, Backend
Engineer, Virtualisation Engineer.
"""

MODULE = {
    'title': 'Linux and System Administration',
    'description': 'Running a server: the filesystem, processes, permissions, packages, '
                   'services and logs.',
    'duration': 90,
    'difficulty': 'beginner',
    'skills': ['Linux', 'System Administration', 'Shell'],
    'slides': [
        {
            'title': 'One Tree, No Drive Letters',
            'body': '<p>Everything on a Linux system hangs off a single root, <code>/</code>. '
                    'There are no drive letters; additional disks are <em>mounted</em> at a '
                    'directory and appear as part of the same tree.</p>'
                    '<p>A few places you will use constantly: <code>/etc</code> holds '
                    'configuration, <code>/var/log</code> holds logs, <code>/home</code> '
                    'holds users\' files, <code>/usr/bin</code> holds programs, and '
                    '<code>/tmp</code> holds things that may vanish on reboot.</p>'
                    '<p>Knowing that configuration lives in /etc and logs in /var/log answers '
                    'a surprising share of "where do I look" questions.</p>',
        },
        {
            'title': 'Users, Groups and Permissions',
            'body': '<p>Every file has an owner, a group, and three sets of permissions: for '
                    'the owner, for the group, and for everyone else. Each set allows read, '
                    'write and execute.</p>'
                    '<p>So <code>rw-r--r--</code> means the owner can read and write, and '
                    'everyone else can only read. On a directory, execute means "may enter", '
                    'which is why a directory without it blocks access to everything inside '
                    'even when the files themselves are readable.</p>'
                    '<p>Groups are how access is granted in practice: put the people who need '
                    'a thing into a group and give the group permission, rather than opening '
                    'the file to everyone.</p>',
            'code': 'ls -l /var/www/html\n'
                    'chmod 640 secrets.conf     # owner rw, group r, others none\n'
                    'chown deploy:www-data app.log',
        },
        {
            'title': 'Root, and Why Not to Be It',
            'body': '<p>The root user bypasses every permission check. That is occasionally '
                    'necessary and mostly dangerous: a typo as root can remove a system, and '
                    'a compromised process running as root compromises everything.</p>'
                    '<p>So work as an ordinary user and raise privileges for the one command '
                    'that needs it, with <code>sudo</code>. That also produces a record of '
                    'who did what, which logging in as root does not.</p>'
                    '<p>The same reasoning applies to services: a web server should run as a '
                    'limited user, so that a flaw in it does not hand over the machine.</p>',
        },
        {
            'title': 'Processes',
            'body': '<p>A running program is a process, with an id, an owner and a parent. '
                    'When a machine is unwell, the question is usually which process is '
                    'responsible.</p>'
                    '<p><code>ps</code> lists processes, <code>top</code> shows them live '
                    'ordered by what they are consuming. A process can be asked to stop '
                    'politely, or killed outright — try politely first, so it can finish '
                    'writing what it was writing.</p>'
                    '<p>Watch for two different problems that look alike: a process using all '
                    'the processor is slow but survivable; a machine out of memory starts '
                    'killing things, and what it kills is not up to you.</p>',
            'code': 'ps aux | head\n'
                    'top\n'
                    'kill 4821         # ask it to stop\n'
                    'kill -9 4821      # make it stop, losing anything unwritten',
        },
        {
            'title': 'Packages',
            'body': '<p>Software is installed from repositories through a package manager — '
                    '<code>apt</code> on Debian and Ubuntu, <code>dnf</code> on Fedora and '
                    'Red Hat.</p>'
                    '<p>The manager resolves dependencies, so installing one thing pulls in '
                    'what it needs, and it knows what it installed, so it can update or '
                    'remove it cleanly.</p>'
                    '<p><code>apt update</code> refreshes the list of what is available; '
                    '<code>apt upgrade</code> installs newer versions of what you have. They '
                    'are different commands and confusing them is why an install sometimes '
                    'fetches a version that no longer exists.</p>',
        },
        {
            'title': 'Services',
            'body': '<p>Long-running programs — a web server, a database — are managed as '
                    'services by systemd. It starts them at boot, restarts them if they die, '
                    'and records what happened.</p>'
                    '<p><code>systemctl status</code> is the first command to run when '
                    'something is not answering: it says whether the service is running, '
                    'whether it has been restarting in a loop, and shows the last few log '
                    'lines.</p>'
                    '<p>Note the difference between <code>start</code> and <code>enable</code>: '
                    'start runs it now, enable makes it start at boot. Forgetting enable is '
                    'why a service that "was fine" is gone after a reboot.</p>',
            'code': 'systemctl status nginx\n'
                    'systemctl restart nginx\n'
                    'systemctl enable nginx    # and again after the next reboot',
        },
        {
            'title': 'Logs',
            'body': '<p>When something failed, the machine almost always wrote down why.</p>'
                    '<p>Service logs are in the journal, reachable with '
                    '<code>journalctl -u <em>service</em></code>; applications often also '
                    'write into <code>/var/log</code>. Following a log while reproducing the '
                    'fault is the fastest way to connect cause and effect.</p>'
                    '<p>Logs also fill disks. A full disk presents as unrelated failures all '
                    'over the system — services refusing to start, databases refusing '
                    'writes — so <code>df -h</code> belongs early in any diagnosis.</p>',
            'code': 'journalctl -u nginx -n 50 --no-pager\n'
                    'tail -f /var/log/syslog\n'
                    'df -h            # is a disk full',
        },
        {
            'title': 'Backups Are Restores',
            'body': '<p>A backup nobody has restored is a hope, not a backup. The only way to '
                    'know it works is to restore it somewhere and look.</p>'
                    '<p>Keep copies somewhere the original machine cannot reach. A backup on '
                    'the same server is lost with the server, and one the server can write to '
                    'freely can be encrypted by whatever compromised it.</p>'
                    '<p>Decide in advance how much data you can afford to lose and how long '
                    'you can afford to be down. Those two answers, not the tooling, determine '
                    'how often you back up and what you need to restore quickly.</p>',
        },
    ],
    'quiz': {
        'title': 'Quiz: Linux and System Administration',
        'description': 'Filesystem, permissions, processes, packages, services and logs.',
        'time_limit': 18,
        'questions': [
            {
                'title': 'Where Configuration Lives',
                'text': 'Which directory conventionally holds system configuration?',
                'choices': ['/etc', '/var/log', '/usr/bin', '/tmp'],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Reading Permissions',
                'text': 'A file shows rw-r--r--. Who can change it?',
                'choices': [
                    'Only the owner',
                    'The owner and the group',
                    'Everyone',
                    'Nobody, until permissions are changed',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'Execute on a Directory',
                'text': 'What does the execute permission mean on a directory?',
                'choices': [
                               'It may be deleted',
                               'It may be entered, so its contents can be reached',
                               'The files inside may be run as programs',
                               'New files may be created in it',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Why Not Work as Root',
                'text': 'Why use sudo for single commands rather than logging in as root?',
                'choices': [
                               'sudo runs commands faster',
                               'Root accounts expire after each session',
                               'A mistake is contained, and there is a record of who did what',
                               'Root cannot run most commands',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'Stopping a Process',
                'text': 'Why ask a process to stop before killing it outright?',
                'choices': [
                               'Because a killed process restarts automatically',
                               'Because it is faster',
                               'So it can finish writing whatever it had in hand',
                               'Because killing outright requires root',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'update Versus upgrade',
                'text': 'What does apt update do?',
                'choices': [
                               'Installs newer versions of installed packages',
                               'Removes packages that are no longer needed',
                               'Updates the kernel only',
                               'Refreshes the list of available packages',
                           ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'start Versus enable',
                'text': 'A service works now but is gone after a reboot. What was missed?',
                'choices': [
                               'systemctl status, which checks it',
                               'systemctl restart, which reloads it',
                               'systemctl enable, which makes it start at boot',
                               'systemctl start, which runs it now',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'First Command When a Service Is Down',
                'text': 'A web server is not answering. What tells you most, fastest?',
                'choices': [
                               'Rebooting the machine',
                               'Reinstalling the package',
                               'Checking the file permissions in /home',
                               'systemctl status, which shows state, restart loops and recent logs',
                           ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'Unrelated Failures Everywhere',
                'text': 'Services will not start and the database refuses writes. What should '
                        'you check early?',
                'choices': [
                               'Whether the package list is stale',
                               'Whether a disk is full',
                               'Whether DNS is resolving',
                               'Whether the firewall is enabled',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'What Makes a Backup Real',
                'text': 'What is the only way to know a backup works?',
                'choices': [
                    'Restore it somewhere and look at the result',
                    'Check that the backup job reported success',
                    'Confirm the file size is larger than last time',
                    'Verify it runs on a schedule',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'Where Backups Belong',
                'text': 'Why keep backups somewhere the server cannot freely write to?',
                'choices': [
                               'It reduces the size of each backup',
                               'Whatever compromises the server could otherwise encrypt them too',
                               'Local disks are slower to read from',
                               'Backups must be on a different filesystem type',
                           ],
                'correct': 1,
                'points': 3,
            },
        ],
    },
}
