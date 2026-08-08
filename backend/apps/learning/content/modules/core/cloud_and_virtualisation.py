"""
Cloud and virtualisation — the shared floor under every hosted-infrastructure role.

Reused by: Cloud Engineer, DevOps Engineer, Site Reliability Engineer,
Virtualisation Engineer, Systems Administrator, Network Administrator,
Database Administrator, Backend Engineer, IT Project Manager.

Assumes networking and linux_and_systems. It deliberately teaches the model
rather than one provider's console: the buttons are renamed every year, and a
student who understands the shared responsibility line can read any provider's
documentation, while one who memorised a menu cannot.
"""

MODULE = {
    'title': 'Cloud and Virtualisation',
    'description': 'How one machine becomes many, what you are actually renting from a '
                   'cloud provider, and where their responsibility ends and yours begins.',
    'duration': 90,
    'difficulty': 'intermediate',
    'skills': ['Cloud Computing', 'Virtualisation', 'Infrastructure as Code'],
    'slides': [
        {
            'title': 'One Machine, Pretending to Be Many',
            'body': '<p>A server sitting at 5% load is mostly wasted metal. Virtualisation '
                    'divides one physical machine so that several operating systems run on '
                    'it at once, each believing it has the hardware to itself.</p>'
                    '<p>The <strong>hypervisor</strong> is the layer that does it. It hands '
                    'each guest a slice of processor, memory and disk, and keeps them '
                    'isolated — a guest that crashes does not take its neighbours with it.</p>'
                    '<p>Everything else in this module follows from that one trick. A cloud '
                    'provider is, at bottom, an enormous number of physical machines, a '
                    'hypervisor on each, and an API in front that rents you the slices.</p>',
        },
        {
            'title': 'Virtual Machines and Containers',
            'body': '<p>Both isolate an application. They draw the line in different places.</p>'
                    '<p>A <strong>virtual machine</strong> brings its own operating system. '
                    'That is heavy — gigabytes, and a boot sequence measured in tens of '
                    'seconds — but the isolation is close to total, and the guest can be a '
                    'different operating system from the host.</p>'
                    '<p>A <strong>container</strong> shares the host kernel and packages only '
                    'the application and its dependencies. Megabytes, and it starts in '
                    'moments. The trade is that every container on a host shares that one '
                    'kernel, so they cannot run a different operating system and the '
                    'isolation is thinner.</p>'
                    '<p>The rule of thumb: containers for your own applications, virtual '
                    'machines when you need a whole different operating system or genuine '
                    'separation between tenants.</p>',
        },
        {
            'title': 'Images, and Why They End "Works on My Machine"',
            'body': '<p>An <strong>image</strong> is a filesystem plus the metadata to start '
                    'it — the application, its runtime, its libraries, frozen together.</p>'
                    '<p>This is what actually kills the "works on my machine" argument. The '
                    'usual cause is an environment difference nobody wrote down: a library '
                    'version, a locale, an environment variable set two years ago. Shipping '
                    'the image ships the environment with the code, so every machine starts '
                    'from the same state.</p>'
                    '<p>It also makes deployment reversible. If a release misbehaves you run '
                    'the previous image again, and it is genuinely the previous thing — not '
                    'an attempt to undo changes by hand.</p>',
            'code': '# The dependencies travel with the code, pinned.\n'
                    'FROM python:3.11-slim\n'
                    'WORKDIR /app\n'
                    'COPY requirements.txt .\n'
                    'RUN pip install --no-cache-dir -r requirements.txt\n'
                    'COPY . .\n'
                    'CMD ["gunicorn", "app.wsgi", "--bind", "0.0.0.0:8000"]',
        },
        {
            'title': 'What You Are Actually Renting',
            'body': '<p>Cloud services are usually sorted by how much of the stack somebody '
                    'else operates.</p>'
                    '<p><strong>IaaS</strong> rents you machines, disks and networks. You '
                    'install and patch the operating system and everything above it. Most '
                    'control, most work.</p>'
                    '<p><strong>PaaS</strong> rents you a place to run an application. The '
                    'operating system and runtime underneath are somebody else\'s problem; '
                    'you deploy code. Less control, far less operational load.</p>'
                    '<p><strong>SaaS</strong> is finished software you sign in to. You '
                    'operate nothing but your own data and accounts.</p>'
                    '<p>None is more advanced than the others. The question is which layer '
                    'you want to be responsible for at three in the morning.</p>',
        },
        {
            'title': 'The Line: Shared Responsibility',
            'body': '<p>This is the most misunderstood idea in cloud computing, and it is '
                    'where real breaches happen.</p>'
                    '<p>The provider secures the cloud: the buildings, the hardware, the '
                    'hypervisor, the network between their machines. You secure what you put '
                    '<em>in</em> it: your data, your access rules, your patches, your '
                    'configuration.</p>'
                    '<p>So a storage bucket left readable by the world is entirely your '
                    'incident. The provider\'s infrastructure worked exactly as designed — it '
                    'was asked to serve the data publicly and it did.</p>'
                    '<p>The line moves as you go up the models. On IaaS you patch the '
                    'operating system; on PaaS you do not. It never moves far enough to cover '
                    'your data or who may reach it. That side is always yours.</p>',
        },
        {
            'title': 'Regions, Zones and What Survives',
            'body': '<p>Providers divide capacity geographically, and the words matter.</p>'
                    '<p>An <strong>availability zone</strong> is an isolated failure domain — '
                    'its own power, cooling and network — close enough to its siblings that '
                    'traffic between them is fast. Spreading across zones survives a data '
                    'centre losing power.</p>'
                    '<p>A <strong>region</strong> is a geographic area containing several '
                    'zones. Spreading across regions survives a disaster affecting a whole '
                    'area, at the cost of real latency between them.</p>'
                    '<p>Region choice is not only about failure. Distance is latency — this '
                    'platform moved from Virginia to Singapore and every request to it got '
                    'faster for users in the Philippines — and data-protection rules may '
                    'require that particular data stays in a particular country.</p>',
        },
        {
            'title': 'Elasticity, and What It Costs',
            'body': '<p>The point of renting is giving capacity back. Scaling is either '
                    'direction:</p>'
                    '<p><strong>Scaling up</strong> makes one machine bigger. Simple, and '
                    'eventually you run out of machine.</p>'
                    '<p><strong>Scaling out</strong> adds more machines behind a load '
                    'balancer. It scales much further, but only works if any instance can '
                    'serve any request — the balancer will not send a user back to the same '
                    'machine twice. State has to live somewhere shared, in a database or a '
                    'cache, not in the memory of one instance.</p>'
                    '<p>The bill is a design output, not an accident. Capacity that is '
                    'provisioned rather than scaled costs the same at three in the morning as '
                    'at noon, and an idle machine bills exactly like a busy one.</p>',
        },
        {
            'title': 'Infrastructure as Code',
            'body': '<p>Clicking through a console is fine once. It does not survive contact '
                    'with a second environment, or with the question "why is staging '
                    'different from production?"</p>'
                    '<p>Describing the infrastructure in a file that is committed to version '
                    'control makes it reviewable, repeatable and rebuildable. The same '
                    'definition produces staging and production, and the difference between '
                    'them is a diff rather than an argument.</p>'
                    '<p><strong>Configuration drift</strong> is when the running '
                    'infrastructure no longer matches its definition — someone fixed '
                    'something by hand at three in the morning and never wrote it down. The '
                    'fix works and the record of it dies with the shift.</p>'
                    '<p>Which is why a hand-tuned server nobody documented is a liability: '
                    'when it finally fails, rebuilding it means rediscovering two years of '
                    'undocumented changes under pressure.</p>',
            'code': '# The environment as a reviewable file, not a memory of clicking.\n'
                    'resource "aws_instance" "app" {\n'
                    '  ami           = "ami-0abcdef1234567890"\n'
                    '  instance_type = "t3.small"\n'
                    '  tags = { Name = "ccis-app", Environment = "production" }\n'
                    '}',
        },
    ],
    'quiz': {
        'title': 'Quiz: Cloud and Virtualisation',
        'description': 'Hypervisors, containers, service models, the responsibility line, '
                       'regions, scaling and infrastructure as code.',
        'time_limit': 20,
        'questions': [
            {
                'title': 'What a Hypervisor Does',
                'text': 'What is the job of a hypervisor?',
                'choices': [
                    'It speeds up a single operating system by removing driver layers',
                    'It encrypts the disk of every guest machine',
                    'It divides one physical machine so several operating systems run on it in isolation',
                    'It replaces the operating system on the host',
                ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'Containers Against Virtual Machines',
                'text': 'What is the core difference between a container and a virtual machine?',
                'choices': [
                    'A container shares the host kernel; a virtual machine brings its own operating system',
                    'A container cannot be given a network address',
                    'A virtual machine is always faster to start',
                    'Containers isolate more strongly than virtual machines',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'Why Ship an Image',
                'text': 'Why does shipping an image solve the "works on my machine" problem?',
                'choices': [
                    'The image runs faster on every machine',
                    'The image compresses the application so it transfers more quickly',
                    'The image prevents the application from writing to disk',
                    'The image carries the dependencies with it, so every environment starts identical',
                ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'Moving from IaaS to PaaS',
                'text': 'Compared with IaaS, what do you stop being responsible for on PaaS?',
                'choices': [
                    'Your application code',
                    'The operating system and runtime underneath your application',
                    'Your data',
                    'Everything, including who is allowed to sign in',
                ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'A Bucket Left Public',
                'text': 'Data leaks from a storage bucket that was configured to allow public '
                        'read access. Under the shared responsibility model, whose incident is it?',
                'choices': [
                    'The provider\'s, because they host the storage',
                    'Nobody\'s — public access is a provider default',
                    'The provider\'s, if the data was not encrypted at rest',
                    'The customer\'s, because access configuration sits on their side of the line',
                ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'Zones Against Regions',
                'text': 'How does deploying across two availability zones differ from deploying '
                        'across two regions?',
                'choices': [
                    'Zones are separate failure domains inside one region with low latency between them; regions are geographically distant',
                    'Zones are always in different countries',
                    'There is no difference; the terms are interchangeable',
                    'Regions share power and cooling, while zones do not',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'A Flat Bill on an Idle Night',
                'text': 'An application is idle overnight but the bill is unchanged. What does '
                        'that most likely indicate?',
                'choices': [
                    'The provider bills a fixed monthly rate regardless of usage',
                    'Capacity is provisioned rather than scaled to demand',
                    'The application has a memory leak',
                    'Idle requests cost the same as real ones',
                ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Why Write the Infrastructure Down',
                'text': 'What does infrastructure as code give you that clicking through a '
                        'console does not?',
                'choices': [
                    'Servers that run measurably faster',
                    'Freedom from needing to understand the infrastructure',
                    'A definition that can be reviewed, repeated and rebuilt',
                    'Automatic backups of all stored data',
                ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'Configuration Drift',
                'text': 'What is configuration drift?',
                'choices': [
                    'The running infrastructure no longer matches what its definition says it should be',
                    'A virtual machine slowly losing network throughput',
                    'The monthly cost of a deployment rising over time',
                    'Containers being moved between hosts by the scheduler',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Out Against Up',
                'text': 'What distinguishes scaling out from scaling up?',
                'choices': [
                    'Scaling out means fitting a faster processor',
                    'They describe the same operation',
                    'Scaling out reduces the number of machines in use',
                    'Scaling out adds more machines; scaling up makes one machine bigger',
                ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'Why State Cannot Live in One Instance',
                'text': 'Why must an application avoid keeping session state in memory if it '
                        'is to scale out behind a load balancer?',
                'choices': [
                    'Stateless applications consume less memory overall',
                    'Any instance must be able to serve any request, because the balancer chooses freely',
                    'Load balancers are unable to forward cookies',
                    'Stateless applications do not require a database',
                ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'The Hand-Tuned Server',
                'text': 'A server configured by hand over two years finally fails. Why is that '
                        'expensive beyond the downtime itself?',
                'choices': [
                    'Virtual machines cannot be restarted once they have failed',
                    'Providers charge a recovery fee for failed instances',
                    'Nothing records how it was built, so rebuilding means rediscovering every undocumented change',
                    'The disk image of a running server cannot be copied',
                ],
                'correct': 2,
                'points': 3,
            },
        ],
    },
}
