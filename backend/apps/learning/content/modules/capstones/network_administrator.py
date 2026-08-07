"""
Network Administrator capstone (BSIT).

Comes last, after networking, Linux and systems, and security fundamentals.
"""

MODULE = {
    'title': 'Running a Network',
    'description': 'Designing an addressing scheme, segmenting a network, keeping it '
                   'documented, and finding faults on one you did not build.',
    'duration': 85,
    'difficulty': 'intermediate',
    'skills': ['Network Administration', 'Documentation', 'Troubleshooting'],
    'slides': [
        {
            'title': 'What a Network Administrator Owns',
            'body': '<p>The administrator owns whether the network is understandable. Any '
                    'network works on the day it is built; the job is that it still works in '
                    'three years, when the person who built it has left and something has '
                    'gone wrong at eight in the morning.</p>'
                    '<p>That makes documentation, naming and consistent addressing part of '
                    'the engineering, not paperwork done afterwards.</p>',
        },
        {
            'title': 'An Addressing Plan',
            'body': '<p>Decide the scheme before assigning anything, and leave room.</p>'
                    '<p>Give each site, building or purpose its own predictable range, so an '
                    'address tells you where the machine is and what it does. Reserve a block '
                    'for infrastructure — gateways, switches, servers — and hand out the rest '
                    'by DHCP.</p>'
                    '<p>The failure to avoid is a flat network filled in first-come order. It '
                    'works, and then every future change means renumbering, and every fault '
                    'starts with "where is this machine?"</p>',
        },
        {
            'title': 'Segmentation',
            'body': '<p>Splitting a network into segments — commonly with VLANs — limits '
                    'both broadcast noise and how far a problem travels.</p>'
                    '<p>The security argument is the stronger one. On a flat network, a '
                    'compromised laptop can reach the servers, the printers and the CCTV. '
                    'Separating student devices from staff machines from infrastructure means '
                    'a compromise starts somewhere with little to reach.</p>'
                    '<p>Traffic between segments then passes a router or firewall, which is '
                    'exactly where you want to be able to allow, deny and observe it.</p>',
        },
        {
            'title': 'Wireless',
            'body': '<p>Wireless is a shared medium: everyone in range competes for the same '
                    'air, and more access points on the same channel make things worse, not '
                    'better.</p>'
                    '<p>Plan channels so neighbouring access points do not overlap, and place '
                    'them for coverage rather than symmetry. Complaints of "slow wifi" are '
                    'more often contention or a distant client dragging down a cell than '
                    'insufficient bandwidth upstream.</p>'
                    '<p>Use WPA2 or WPA3 with a strong passphrase, or enterprise '
                    'authentication where each user has their own credentials — which also '
                    'means one person leaving does not require telling everybody a new '
                    'password.</p>',
        },
        {
            'title': 'Monitoring',
            'body': '<p>You want to hear about a problem from your monitoring, not from a '
                    'user, and preferably before it becomes an outage.</p>'
                    '<p>Watch whether things are reachable, how loaded the links are, and '
                    'whether error counters on interfaces are climbing — a rising error count '
                    'is often a failing cable or transceiver that has not failed completely '
                    'yet.</p>'
                    '<p>Alert on what someone would act on. An alert that fires constantly '
                    'and is always ignored is worse than none, because it trains people to '
                    'ignore the ones that matter.</p>',
        },
        {
            'title': 'Change, Carefully',
            'body': '<p>Most network outages are caused by a change, which is good news: it '
                    'means the cause is knowable.</p>'
                    '<p>So keep a record of what changed and when, make one change at a time, '
                    'and know how to undo it before you make it. Working on a remote device, '
                    'remember you may be sitting on the branch you are cutting — a firewall '
                    'rule can lock you out of the device you are configuring.</p>'
                    '<p>Back up device configurations. Rebuilding a switch from memory at '
                    'midnight is a bad time to discover nobody kept a copy.</p>',
        },
        {
            'title': 'Finding a Fault',
            'body': '<p>On a network you did not design, structure beats intuition.</p>'
                    '<p>Establish the scope first: one machine, one segment, or everyone? '
                    'That single question splits the problem in half — one machine points at '
                    'the machine, everyone points at something shared.</p>'
                    '<p>Then work up the layers: link, address, gateway, name resolution, '
                    'application. And ask what changed, because the honest answer usually '
                    'ends the investigation.</p>',
        },
        {
            'title': 'Documentation People Actually Use',
            'body': '<p>Useful documentation answers the questions asked in an emergency: '
                    'what is on this network, how is it addressed, what depends on what, and '
                    'who to call.</p>'
                    '<p>A diagram of the segments and their links, an inventory with '
                    'addresses and purposes, and a note of anything deliberately unusual — '
                    'with the reason — covers most of it. The unusual things matter most: '
                    'without the reason, the next person removes it and rediscovers why it '
                    'was there.</p>'
                    '<p>Keep it where it can be reached when the network is down.</p>',
        },
    ],
    'quiz': {
        'title': 'Quiz: Running a Network',
        'description': 'Addressing, segmentation, wireless, monitoring and fault-finding.',
        'time_limit': 18,
        'questions': [
            {
                'title': 'Planning Addresses',
                'text': 'Why give each site or purpose its own predictable address range?',
                'choices': [
                               'It makes routing unnecessary',
                               'An address then tells you where a machine is and what it does',
                               'It increases the number of usable addresses',
                               'DHCP requires one range per building',
                           ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'The Flat Network',
                'text': 'What is the cost of filling a flat network in first-come order?',
                'choices': [
                               'Addresses run out sooner than planned',
                               'DHCP leases expire more quickly',
                               'The network cannot be monitored',
                               'Every future change means renumbering, and faults start with "where is this?"',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'Why Segment',
                'text': 'What is the strongest argument for segmenting a network?',
                'choices': [
                               'Each segment gets its own internet connection',
                               'It removes the need for a firewall',
                               'A compromised device starts somewhere with little it can reach',
                               'Segments make cabling cheaper',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'Traffic Between Segments',
                'text': 'Where does traffic between two segments pass?',
                'choices': [
                    'A router or firewall, where it can be allowed, denied and observed',
                    'Directly, since segments share the same broadcast domain',
                    'Through the DHCP server',
                    'Through the wireless controller',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'More Access Points',
                'text': 'Why can adding access points on the same channel make wireless worse?',
                'choices': [
                               'DHCP cannot serve more than one access point',
                               'They compete for the same shared air',
                               'Each one halves the available bandwidth upstream',
                               'Clients connect to all of them at once',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Enterprise Wireless Authentication',
                'text': 'What is one practical advantage of per-user wireless credentials?',
                'choices': [
                               'It increases the range of each access point',
                               'It allows more devices per channel',
                               'One person leaving does not require telling everybody a new password',
                               'It removes the need for encryption',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'A Rising Error Counter',
                'text': 'Interface errors on a link are climbing steadily. What does that '
                        'often mean?',
                'choices': [
                               'The link is saturated with legitimate traffic',
                               'The device needs a firmware upgrade',
                               'A duplicate IP address is in use',
                               'A cable or transceiver is failing but has not failed completely',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'Alerts Nobody Acts On',
                'text': 'Why is an alert that fires constantly worse than no alert?',
                'choices': [
                               'It prevents other alerts from firing',
                               'It trains people to ignore the alerts that matter',
                               'It consumes monitoring storage',
                               'It slows the devices being monitored',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Working on a Remote Device',
                'text': 'What is the particular risk of changing firewall rules on a device '
                        'you are connected to remotely?',
                'choices': [
                               'The device will reboot automatically',
                               'Only local changes take effect immediately',
                               'The change can lock you out of the device you are configuring',
                               'Remote changes are not saved to the configuration',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'Scoping a Fault',
                'text': 'Which question splits a network problem in half fastest?',
                'choices': [
                    'Is it one machine, one segment, or everyone?',
                    'Has the device been rebooted?',
                    'Which vendor made the switch?',
                    'How old is the cabling?',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'Documenting the Unusual',
                'text': 'Why record the reason for anything deliberately unusual?',
                'choices': [
                    'Without it the next person removes it and rediscovers why it was there',
                    'Auditors require a reason for every setting',
                    'It makes the configuration back up correctly',
                    'Unusual settings expire unless documented',
                ],
                'correct': 0,
                'points': 2,
            },
        ],
    },
}
