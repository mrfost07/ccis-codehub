"""
Networking fundamentals — the shared floor under every BSIT infrastructure role.

Reused by: Network Administrator, Network Engineer, Network Security Engineer,
Cloud Engineer, System Administrator, IT Support Engineer, SOC Analyst,
Wireless and Telecom Technician, DevOps Engineer.
"""

MODULE = {
    'title': 'Networking Fundamentals',
    'description': 'How machines find each other and move data: addressing, routing, '
                   'the protocols in between, and how to work out what is broken.',
    'duration': 90,
    'difficulty': 'beginner',
    'skills': ['Networking', 'TCP/IP', 'Troubleshooting'],
    'slides': [
        {
            'title': 'Layers, and Why They Help',
            'body': '<p>Networking is built in layers, each solving one problem and handing '
                    'the rest down. The physical layer moves signals. The link layer moves '
                    'frames between machines on the same segment. The network layer moves '
                    'packets between networks. The transport layer turns that into a '
                    'conversation between two programs. The application layer is where HTTP, '
                    'DNS and everything you actually use lives.</p>'
                    '<p>The practical value is diagnosis. When something is broken, you ask '
                    'which layer failed, and the answer eliminates most of the possibilities '
                    'at once. A cable problem and a DNS problem look identical from the '
                    'browser and nothing alike one layer down.</p>',
        },
        {
            'title': 'Addresses: MAC and IP',
            'body': '<p>Two kinds of address, doing two different jobs.</p>'
                    '<p>A <strong>MAC address</strong> is burned into the network interface '
                    'and identifies it on the local segment. It does not travel beyond the '
                    'local network.</p>'
                    '<p>An <strong>IP address</strong> identifies a machine on a network and '
                    'is how traffic is routed across the internet. It is assigned, not '
                    'built in, and it changes when the machine moves.</p>'
                    '<p>ARP is the bridge between them: it asks "who has this IP?" on the '
                    'local segment and gets back a MAC address to send the frame to.</p>',
        },
        {
            'title': 'Subnets and the Mask',
            'body': '<p>An IP address is really two parts: which network, and which host on '
                    'it. The subnet mask says where the split falls.</p>'
                    '<p>In <code>192.168.1.10/24</code> the /24 means the first 24 bits are '
                    'the network, so every address from 192.168.1.0 to 192.168.1.255 is on '
                    'the same network — and those hosts can reach each other directly.</p>'
                    '<p>This is what the machine checks first on every packet: is the '
                    'destination on my network? If yes, send it straight there. If no, send '
                    'it to the gateway. A wrong mask produces the classic symptom of being '
                    'able to reach local machines and nothing else.</p>',
        },
        {
            'title': 'The Default Gateway and Routing',
            'body': '<p>The <strong>default gateway</strong> is where a machine sends '
                    'anything it cannot deliver itself — usually the router.</p>'
                    '<p>A router\'s job is to decide, for each packet, which way is onward. '
                    'It holds a routing table of networks and next hops, and a packet crosses '
                    'many routers between you and a server, each making that decision '
                    'independently.</p>'
                    '<p>No default gateway means a machine that works perfectly on its own '
                    'network and cannot reach anything else — which is exactly what a user '
                    'reports as "the internet is down".</p>',
        },
        {
            'title': 'TCP and UDP',
            'body': '<p>Both carry data between programs; they make opposite trade-offs.</p>'
                    '<p><strong>TCP</strong> establishes a connection, numbers what it sends, '
                    'and retransmits anything lost. You get the bytes in order and complete, '
                    'at the cost of delay when the network misbehaves. Web, email and file '
                    'transfer use it.</p>'
                    '<p><strong>UDP</strong> sends and does not check. Packets can be lost, '
                    'duplicated or arrive out of order. That suits live voice and video, '
                    'where a retransmitted piece of audio arrives too late to be worth '
                    'playing.</p>'
                    '<p>A <strong>port</strong> is how the machine knows which program a '
                    'packet belongs to: 80 and 443 for web, 22 for SSH, 53 for DNS.</p>',
        },
        {
            'title': 'DNS',
            'body': '<p>People use names; the network routes numbers. DNS turns one into the '
                    'other.</p>'
                    '<p>The lookup is a chain: your machine asks a resolver, which asks the '
                    'root, then the servers for the top-level domain, then the ones '
                    'authoritative for the domain itself. Answers are cached at every step, '
                    'with a time-to-live that says how long the cache may keep them.</p>'
                    '<p>That caching is why a DNS change does not take effect everywhere at '
                    'once, and why "it works for me but not for them" is so often a stale '
                    'cache rather than a real fault.</p>',
        },
        {
            'title': 'DHCP and NAT',
            'body': '<p><strong>DHCP</strong> hands out addresses. A machine joining a '
                    'network asks, and is leased an IP, a mask, a gateway and DNS servers. '
                    'Without it every device would have to be configured by hand, and two '
                    'machines given the same address will both misbehave.</p>'
                    '<p><strong>NAT</strong> lets many private addresses share one public '
                    'one. Your router rewrites outgoing packets to its own public address, '
                    'remembers the mapping, and rewrites the replies back. It is why home '
                    'and office networks work with a single public IP — and why a machine '
                    'behind NAT cannot be reached from outside unless a port is deliberately '
                    'forwarded.</p>',
        },
        {
            'title': 'Working Out What Is Broken',
            'body': '<p>Diagnose from the bottom up, and each step rules out a layer.</p>'
                    '<p>Is the interface up and does it have an address? Can you reach your '
                    'own gateway? Can you reach an address on the internet by number '
                    '(<code>ping 8.8.8.8</code>)? Can you resolve a name?</p>'
                    '<p>That last pair is the most useful test in the trade. If pinging by '
                    'number works and by name does not, the network is fine and DNS is '
                    'broken — a completely different problem, on a different machine, '
                    'usually fixed by a different person.</p>',
            'code': 'ip addr            # do I have an address\n'
                    'ip route           # where is my gateway\n'
                    'ping 8.8.8.8       # can I reach the internet by number\n'
                    'ping example.com   # can I resolve a name\n'
                    'traceroute example.com   # where does it stop',
        },
    ],
    'quiz': {
        'title': 'Quiz: Networking Fundamentals',
        'description': 'Addressing, subnets, routing, TCP and UDP, DNS, and diagnosis.',
        'time_limit': 18,
        'questions': [
            {
                'title': 'Why Layers',
                'text': 'What is the practical value of thinking in layers when something '
                        'is broken?',
                'choices': [
                               'Each layer can be restarted independently',
                               'Layers make the network faster',
                               'Only one layer can fail at a time',
                               'Identifying the failing layer eliminates most possibilities at once',
                           ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'MAC Versus IP',
                'text': 'What distinguishes a MAC address from an IP address?',
                'choices': [
                               'The MAC is used for routing across the internet',
                               'They are the same address written in two formats',
                               'The MAC identifies an interface locally and does not travel beyond the segment',
                               'The MAC is assigned by DHCP and the IP is built into the hardware',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'What ARP Does',
                'text': 'What does ARP resolve?',
                'choices': [
                    'An IP address to a MAC address on the local segment',
                    'A domain name to an IP address',
                    'A port number to a running program',
                    'A private address to a public one',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Reading a Mask',
                'text': 'A host is 192.168.1.10/24. Which address is on the same network?',
                'choices': [
                               '10.0.1.10',
                               '172.16.1.10',
                               '192.168.1.200',
                               '192.168.2.10',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'No Gateway',
                'text': 'A machine can reach others on its own network but nothing beyond it. '
                        'What is the likeliest cause?',
                'choices': [
                               'DNS is returning the wrong address',
                               'No default gateway is configured',
                               'The network cable is unplugged',
                               'The machine has no MAC address',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Choosing TCP or UDP',
                'text': 'Why does live voice usually use UDP rather than TCP?',
                'choices': [
                               'UDP guarantees packets arrive in order',
                               'A retransmitted piece of audio arrives too late to be useful',
                               'UDP encrypts the audio automatically',
                               'TCP cannot carry audio data',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Ports',
                'text': 'What does a port number identify?',
                'choices': [
                               'Which router the packet should take next',
                               'Which network the host belongs to',
                               'Which program on the machine a packet belongs to',
                               'Which physical socket the cable is in',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'Stale DNS',
                'text': 'A DNS record was changed an hour ago but some users still reach the '
                        'old server. Why?',
                'choices': [
                    'Answers are cached along the chain until their time-to-live expires',
                    'DNS changes only apply to new devices',
                    'The old server is still answering for the domain',
                    'The record must be changed on every resolver by hand',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'What DHCP Provides',
                'text': 'Besides an IP address, what does a DHCP lease typically include?',
                'choices': [
                               'A MAC address and a hostname',
                               'A routing table for the whole internet',
                               'A public address for inbound connections',
                               'A subnet mask, a default gateway and DNS servers',
                           ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'What NAT Does',
                'text': 'What does NAT allow?',
                'choices': [
                    'Many private addresses to share a single public address',
                    'A machine to have two MAC addresses',
                    'Names to be resolved without DNS',
                    'Packets to skip the default gateway',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Ping by Number, Not by Name',
                'text': 'Pinging 8.8.8.8 works but pinging example.com fails. What is broken?',
                'choices': [
                               'The subnet mask',
                               'Name resolution — the network path itself is fine',
                               'The default gateway',
                               'The physical connection',
                           ],
                'correct': 1,
                'points': 3,
            },
        ],
    },
}
