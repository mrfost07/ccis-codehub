"""
Quizzes for "Cloud Computing Fundamentals: A Practical Guide".

Two long modules — ninety and a hundred and twenty minutes — so eight questions
each.

One thing worth stating because it is easy to get wrong from memory: this module
teaches **four** deployment models — public, private, hybrid and multi-cloud. The
textbook fourth is usually community cloud, and asking for that would mark a
student wrong for having read the material. The questions follow the module.
"""

QUIZZES = [
    {
        'module': 'Module 1: Introduction to Cloud Computing',
        'title': 'Module 1 Quiz: Introduction to Cloud Computing',
        'description': 'Characteristics, deployment models, service models, and trade-offs.',
        'time_limit': 15,
        'questions': [
            {
                'title': 'On-Demand Self-Service',
                'text': 'What does on-demand self-service mean?',
                'choices': [
                    'Users can provision resources automatically, without the provider '
                    'having to intervene',
                    'The provider assigns resources after reviewing a written request',
                    'Resources are billed at a flat monthly rate regardless of use',
                    'Users must buy hardware before they can use the service',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Measured Service',
                'text': 'Which essential characteristic describes usage being metered so '
                        'it can be reported and billed?',
                'choices': ['Measured service', 'Resource pooling',
                            'Broad network access', 'Rapid elasticity'],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Rapid Elasticity',
                'text': 'Rapid elasticity refers to which ability?',
                'choices': [
                    'Scaling resources up and down quickly as demand changes',
                    'Reaching services from a wide range of devices',
                    'Sharing one pool of hardware between many customers',
                    'Recovering data after a hardware failure',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'The Public Cloud',
                'text': 'In a public cloud, how are services delivered?',
                'choices': [
                    'Over the internet by a third-party provider, shared among many customers',
                    'On hardware owned and used by a single organisation',
                    'Only within a private network with no internet access',
                    'By combining an on-premises data centre with a provider',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Deployment Models',
                'text': 'Which four deployment models does this module cover?',
                'choices': [
                    'Public, private, hybrid and multi-cloud',
                    'Public, private, shared and virtual',
                    'Compute, storage, networking and security',
                    'IaaS, PaaS, SaaS and FaaS',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Infrastructure as a Service',
                'text': 'Under IaaS, who manages the operating systems, applications and data?',
                'choices': [
                    'The user, while the provider manages the underlying infrastructure',
                    'The provider, while the user only supplies data',
                    'Neither — both are managed automatically with no owner',
                    'The user manages the physical servers and the network hardware',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'The Three Service Models',
                'text': 'Which three service models does the module name?',
                'choices': [
                    'IaaS, PaaS and SaaS',
                    'Public, private and hybrid',
                    'Compute, storage and networking',
                    'Scalability, redundancy and automation',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Regulated Industries',
                'text': 'The module notes that a public cloud may lack the customisation '
                        'and control some highly regulated industries require.',
                'true_false': True,
                'correct': 0,
                'points': 1,
            },
        ],
    },
    {
        'module': 'Module 2: Cloud Architecture and Virtualization',
        'title': 'Module 2 Quiz: Architecture and Virtualisation',
        'description': 'Core components, virtualisation, containers, and designing for scale.',
        'time_limit': 15,
        'questions': [
            {
                'title': 'Core Components',
                'text': 'Which five core components of cloud architecture does the module list?',
                'choices': [
                    'Compute, storage, networking, databases and security',
                    'Public, private, hybrid, multi-cloud and on-premises',
                    'IaaS, PaaS, SaaS, FaaS and CaaS',
                    'Scalability, redundancy, automation, monitoring and cost',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'The Compute Component',
                'text': 'What does the compute component provide?',
                'choices': [
                    'The processing power that runs applications and workloads',
                    'The persistent place where files and objects are kept',
                    'The links that carry traffic between services',
                    'The rules that decide who may access a resource',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'What Virtualisation Does',
                'text': 'What does virtualisation make possible?',
                'choices': [
                    'Running several virtual instances on one physical machine',
                    'Running one application across several physical machines as a single process',
                    'Removing the need for any physical hardware at all',
                    'Storing data without using a file system',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Server Virtualisation',
                'text': 'Server virtualisation partitions a physical server into what?',
                'choices': [
                    'Multiple virtual servers, each running its own operating system',
                    'A single larger server with pooled memory',
                    'Several containers sharing one operating system kernel',
                    'A network of physically separate machines',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Containers and Virtual Machines',
                'text': 'How do containers differ from traditional virtual machines?',
                'choices': [
                    'Containers share the host operating system kernel instead of each '
                    'carrying a full operating system',
                    'Containers each run a full operating system, while virtual machines '
                    'share one',
                    'Containers can only run on physical hardware, never in the cloud',
                    'Containers and virtual machines are two names for the same thing',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Why Containers Caught On',
                'text': 'Which practices does the module say containerisation enables?',
                'choices': [
                    'Microservices architectures, DevOps and continuous delivery',
                    'Manual server provisioning and long release cycles',
                    'Physical data centre construction',
                    'Writing applications without any dependencies',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Vertical Scaling',
                'text': 'What does vertical scaling mean?',
                'choices': [
                    'Giving an existing machine more resources',
                    'Adding more machines alongside the existing ones',
                    'Moving a workload to a different region',
                    'Reducing the number of running instances to save money',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Designing for Scale',
                'text': 'The module treats scalability as the ability of a system to handle '
                        'increased load by adding resources.',
                'true_false': True,
                'correct': 0,
                'points': 1,
            },
        ],
    },
]
