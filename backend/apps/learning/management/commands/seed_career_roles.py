"""
Seed the career map: the jobs each CCIS program leads to.

Roles only. Paths, modules and quizzes come later — a role's career_path stays
null until one is seeded, and the map is useful before any of them exist.

Idempotent: keyed on slug, so re-running updates copy rather than duplicating
rows, and never touches career_path. That matters — once a role is wired to a
seeded path, re-running this command must not unwire it.

    python manage.py seed_career_roles
    python manage.py seed_career_roles --prune   # deactivate roles no longer listed
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from apps.learning.models import CareerRole

# (category, name, summary, [skills], demand)
#
# Grouped into fields rather than one long list, because the middle level of the
# tree exists to keep any single branch scannable. A program with twenty-five
# roles under one heading is a list, not a map.
#
# Names must be unique within a program (see CareerRole's constraint). The same
# title across two programs is fine and intended — a BSIT and a BSIS graduate can
# both become a Database Administrator, and each needs its own card and its own
# path.
CATALOGUE = {
    # BSCS — the computing core: algorithms, software construction, AI, systems.
    'bscs': [
        ('Software Engineering', 'Backend Engineer',
         'Builds the APIs, business logic and data access behind an application.',
         ['Python', 'Databases', 'REST APIs', 'Testing'], 'high'),
        ('Software Engineering', 'Frontend Engineer',
         'Builds the interfaces people actually use, and makes them fast and accessible.',
         ['JavaScript', 'React', 'CSS', 'Accessibility'], 'high'),
        ('Software Engineering', 'Full-Stack Engineer',
         'Works across interface and server, owning a feature end to end.',
         ['TypeScript', 'Django', 'SQL', 'Git'], 'high'),
        ('Software Engineering', 'Mobile Developer',
         'Builds Android or iOS applications, including how they behave offline.',
         ['Kotlin', 'Flutter', 'Mobile UI', 'APIs'], 'high'),
        ('Software Engineering', 'API and Integration Engineer',
         'Connects systems that were never designed to talk to each other.',
         ['REST', 'GraphQL', 'Webhooks', 'Auth'], 'steady'),
        ('Software Engineering', 'Platform Engineer',
         'Builds the internal tools and services other engineers build on.',
         ['Kubernetes', 'CI/CD', 'Go', 'Observability'], 'high'),
        ('Software Engineering', 'Software Architect',
         'Decides the structure a system will live with for years.',
         ['System design', 'Trade-offs', 'Patterns', 'Documentation'], 'steady'),

        ('Data and AI', 'Data Scientist',
         'Turns messy data into models and findings a decision can rest on.',
         ['Python', 'Statistics', 'pandas', 'Visualisation'], 'high'),
        ('Data and AI', 'Machine Learning Engineer',
         'Takes models out of notebooks into production, where they must stay reliable.',
         ['PyTorch', 'MLOps', 'Feature pipelines', 'Evaluation'], 'high'),
        ('Data and AI', 'Data Engineer',
         'Builds the pipelines and warehouses everyone else queries.',
         ['SQL', 'ETL', 'Airflow', 'Warehousing'], 'high'),
        ('Data and AI', 'MLOps Engineer',
         'Keeps models deployed, monitored and retrainable rather than one-off.',
         ['Docker', 'Model registry', 'Monitoring', 'CI/CD'], 'emerging'),
        ('Data and AI', 'NLP Engineer',
         'Builds systems that read and generate language.',
         ['Transformers', 'Tokenisation', 'Embeddings', 'Evaluation'], 'high'),
        ('Data and AI', 'Computer Vision Engineer',
         'Builds systems that interpret images and video.',
         ['OpenCV', 'CNNs', 'Annotation', 'Deployment'], 'emerging'),
        ('Data and AI', 'Applied AI Engineer',
         'Builds products on top of foundation models, and evaluates what they do.',
         ['LLM APIs', 'RAG', 'Prompt design', 'Evaluation'], 'high'),

        ('Systems and Security', 'DevOps Engineer',
         'Owns how code reaches production and stays healthy once it is there.',
         ['Linux', 'Docker', 'CI/CD', 'Monitoring'], 'high'),
        ('Systems and Security', 'Site Reliability Engineer',
         'Treats uptime as an engineering problem, with budgets and measurements.',
         ['SLOs', 'Incident response', 'Automation', 'Tracing'], 'high'),
        ('Systems and Security', 'Cybersecurity Analyst',
         'Finds and closes weaknesses before somebody else finds them.',
         ['Networking', 'Threat analysis', 'Linux', 'Cryptography'], 'high'),
        ('Systems and Security', 'Penetration Tester',
         'Attacks systems on purpose, with permission, and writes up what worked.',
         ['Exploitation', 'Recon', 'Scripting', 'Reporting'], 'high'),
        ('Systems and Security', 'Embedded Systems Developer',
         'Writes software for hardware, where memory and timing are the constraints.',
         ['C', 'Microcontrollers', 'RTOS', 'Electronics'], 'steady'),
        ('Systems and Security', 'Systems Programmer',
         'Works close to the machine: kernels, compilers, runtimes, performance.',
         ['C or Rust', 'Concurrency', 'Profiling', 'OS internals'], 'steady'),

        ('Graphics and Interactive', 'Game Developer',
         'Builds interactive real-time systems: graphics, physics and gameplay.',
         ['C#', 'Unity', 'Linear algebra', 'Optimisation'], 'steady'),
        ('Graphics and Interactive', 'Graphics Engineer',
         'Writes the rendering code that decides how a frame is drawn.',
         ['Shaders', 'GPU', 'Maths', 'C++'], 'emerging'),
        ('Graphics and Interactive', 'AR and VR Developer',
         'Builds experiences that place software into physical space.',
         ['Unity', '3D maths', 'Interaction design', 'Devices'], 'emerging'),

        ('Quality and Research', 'QA Automation Engineer',
         'Writes the tests that let a team change code without fear.',
         ['Test design', 'Playwright', 'CI', 'Debugging'], 'steady'),
        ('Quality and Research', 'Performance Engineer',
         'Finds out why it is slow, with measurements rather than guesses.',
         ['Profiling', 'Load testing', 'Caching', 'Databases'], 'steady'),
        ('Quality and Research', 'AI Research Assistant',
         'Reads the literature, reproduces results and runs experiments.',
         ['Maths', 'Papers', 'Experiment design', 'Python'], 'emerging'),
        ('Quality and Research', 'Algorithm Engineer',
         'Turns a hard computational problem into something that runs in time.',
         ['Complexity', 'Data structures', 'Optimisation', 'Proofs'], 'steady'),

        ('Emerging', 'Robotics Software Engineer',
         'Writes the software that senses, plans and moves.',
         ['ROS', 'Control', 'Sensors', 'C++'], 'emerging'),
        ('Emerging', 'Blockchain Developer',
         'Builds contracts and systems where the ledger is the source of truth.',
         ['Solidity', 'Cryptography', 'EVM', 'Auditing'], 'emerging'),
    ],
    # BSIT — making technology run: infrastructure, networks, applications, support.
    'bsit': [
        ('Infrastructure and Cloud', 'Cloud Engineer',
         'Designs and runs systems on AWS, Azure or GCP, and keeps the bill sane.',
         ['AWS', 'Networking', 'Terraform', 'Linux'], 'high'),
        ('Infrastructure and Cloud', 'Cloud Solutions Architect',
         'Chooses the shape of a cloud system before anyone builds it.',
         ['Architecture', 'Cost modelling', 'Security', 'Migration'], 'high'),
        ('Infrastructure and Cloud', 'DevOps Engineer',
         'Automates build, deploy and monitoring so releases stop being events.',
         ['CI/CD', 'Docker', 'Observability', 'Bash'], 'high'),
        ('Infrastructure and Cloud', 'Systems Administrator',
         'Runs the servers and services an organisation depends on daily.',
         ['Linux', 'Windows Server', 'Backups', 'Scripting'], 'steady'),
        ('Infrastructure and Cloud', 'Virtualisation Engineer',
         'Runs the hypervisors and virtual estates everything else sits on.',
         ['VMware', 'Proxmox', 'Storage', 'Capacity planning'], 'steady'),

        ('Networks', 'Network Administrator',
         'Keeps the network up, segmented and understood.',
         ['TCP/IP', 'Routing', 'Firewalls', 'Troubleshooting'], 'steady'),
        ('Networks', 'Network Engineer',
         'Designs and changes networks rather than only maintaining them.',
         ['BGP', 'VLANs', 'Load balancing', 'Documentation'], 'high'),
        ('Networks', 'Network Security Engineer',
         'Defends the perimeter, and everything that no longer has one.',
         ['Firewalls', 'VPN', 'IDS/IPS', 'Zero trust'], 'high'),
        ('Networks', 'Wireless and Telecom Technician',
         'Installs and tunes the wireless and voice infrastructure people rely on.',
         ['Wi-Fi', 'VoIP', 'Site survey', 'RF basics'], 'steady'),

        ('Applications', 'Web Developer',
         'Builds and maintains the web applications an organisation runs on.',
         ['HTML/CSS', 'JavaScript', 'PHP or Python', 'MySQL'], 'high'),
        ('Applications', 'Mobile Developer',
         'Ships the mobile side of a product and keeps it working across devices.',
         ['Flutter', 'REST APIs', 'Mobile UX', 'App stores'], 'steady'),
        ('Applications', 'ERP and Low-Code Developer',
         'Configures and extends platforms like Odoo or Power Platform.',
         ['ERP modules', 'Integrations', 'SQL', 'Process mapping'], 'emerging'),
        ('Applications', 'CMS Developer',
         'Builds and maintains sites on WordPress, Drupal or similar.',
         ['PHP', 'Themes', 'Plugins', 'SEO basics'], 'steady'),
        ('Applications', 'Systems Integration Specialist',
         'Makes bought and built software work as one system.',
         ['APIs', 'Middleware', 'File transfer', 'Mapping'], 'steady'),

        ('Security and Governance', 'IT Security Specialist',
         'Hardens systems, runs access control and responds when something happens.',
         ['Hardening', 'IAM', 'Incident response', 'Auditing'], 'high'),
        ('Security and Governance', 'SOC Analyst',
         'Watches the alerts, decides which ones are real, and escalates.',
         ['SIEM', 'Triage', 'Log analysis', 'Playbooks'], 'high'),
        ('Security and Governance', 'Identity and Access Engineer',
         'Owns who can reach what, and proves it.',
         ['SSO', 'MFA', 'Directory services', 'Least privilege'], 'emerging'),

        ('Data and Storage', 'Database Administrator',
         'Keeps data correct, fast, backed up and recoverable.',
         ['SQL', 'Indexing', 'Backup/restore', 'Tuning'], 'steady'),
        ('Data and Storage', 'Backup and Recovery Specialist',
         'Makes sure the restore actually works, not just the backup.',
         ['Backup tools', 'RPO/RTO', 'Testing', 'Documentation'], 'steady'),
        ('Data and Storage', 'Data Centre Technician',
         'Racks, cables, powers and replaces the physical layer.',
         ['Hardware', 'Cabling', 'Power and cooling', 'Ticketing'], 'steady'),

        ('Support and Operations', 'IT Support Engineer',
         'The person who actually fixes it, and writes down how.',
         ['Diagnostics', 'Ticketing', 'Hardware', 'Communication'], 'high'),
        ('Support and Operations', 'Service Desk Analyst',
         'First contact for everything broken, and the triage that follows.',
         ['ITIL basics', 'Ticketing', 'Remote support', 'Prioritisation'], 'high'),
        ('Support and Operations', 'IT Operations Coordinator',
         'Keeps assets, licences and routine operations from drifting.',
         ['Asset tracking', 'Licensing', 'Scheduling', 'Reporting'], 'steady'),

        ('Quality and Emerging', 'QA Engineer',
         'Designs and runs the testing that decides whether a release ships.',
         ['Test cases', 'Automation', 'Bug reporting', 'Regression'], 'steady'),
        ('Quality and Emerging', 'RPA Developer',
         'Automates the repetitive work people should not be doing by hand.',
         ['Power Automate', 'Process mapping', 'Exceptions', 'Logging'], 'emerging'),
        ('Quality and Emerging', 'IoT Technician',
         'Deploys and maintains connected devices and the data they send.',
         ['Sensors', 'MQTT', 'Gateways', 'Troubleshooting'], 'emerging'),
    ],
    # BSIS — where the business and the system meet: analysis, data, process, delivery.
    'bsis': [
        ('Business Analysis', 'Business Analyst',
         'Turns what a business needs into something a team can build.',
         ['Requirements', 'Process modelling', 'Stakeholders', 'Documentation'], 'high'),
        ('Business Analysis', 'Systems Analyst',
         'Sits between users and developers, and makes the two agree.',
         ['Use cases', 'UML', 'Gap analysis', 'SQL'], 'high'),
        ('Business Analysis', 'Requirements Engineer',
         'Writes requirements precise enough to build and test against.',
         ['Elicitation', 'Traceability', 'Acceptance criteria', 'Review'], 'steady'),
        ('Business Analysis', 'Business Process Analyst',
         'Maps how work happens now, and how it should.',
         ['BPMN', 'Process mining', 'Interviews', 'Metrics'], 'steady'),

        ('Data and Reporting', 'Business Intelligence Analyst',
         'Builds the dashboards a business steers by.',
         ['Power BI', 'SQL', 'Data modelling', 'Storytelling'], 'high'),
        ('Data and Reporting', 'Data Analyst',
         'Answers questions with data, and says how confident the answer is.',
         ['Excel', 'SQL', 'Statistics', 'Visualisation'], 'high'),
        ('Data and Reporting', 'Reporting Analyst',
         'Owns the recurring reports an organisation actually runs on.',
         ['SQL', 'Automation', 'Validation', 'Documentation'], 'steady'),
        ('Data and Reporting', 'Data Steward',
         'Owns what a field means, and keeps it meaning that.',
         ['Data dictionary', 'Quality rules', 'Lineage', 'Governance'], 'emerging'),
        ('Data and Reporting', 'Database Administrator',
         'Keeps organisational data correct, available and recoverable.',
         ['SQL', 'Backups', 'Access control', 'Performance'], 'steady'),

        ('Process and Governance', 'IT Auditor',
         'Checks that controls exist, work, and can be evidenced.',
         ['Controls', 'Compliance', 'Risk assessment', 'Reporting'], 'steady'),
        ('Process and Governance', 'IT Compliance Analyst',
         'Keeps the organisation inside the rules it is held to.',
         ['Frameworks', 'Policy', 'Evidence', 'Gap analysis'], 'steady'),
        ('Process and Governance', 'IT Risk Analyst',
         'Names what could go wrong, how likely it is, and what it would cost.',
         ['Risk registers', 'Assessment', 'Mitigation', 'Reporting'], 'emerging'),
        ('Process and Governance', 'Quality Assurance Analyst',
         'Checks that a delivered system matches what was agreed.',
         ['Test planning', 'UAT', 'Defect triage', 'Sign-off'], 'steady'),

        ('Product and Delivery', 'Product Owner',
         'Owns the backlog, and decides what is worth building next.',
         ['Prioritisation', 'User stories', 'Agile', 'Metrics'], 'high'),
        ('Product and Delivery', 'IT Project Coordinator',
         'Keeps scope, schedule and people moving in the same direction.',
         ['Planning', 'Risk', 'Reporting', 'Coordination'], 'steady'),
        ('Product and Delivery', 'IT Project Manager',
         'Owns delivery: the plan, the budget and the awkward conversations.',
         ['Scope', 'Budgeting', 'Stakeholders', 'Change control'], 'high'),
        ('Product and Delivery', 'Scrum Master',
         'Makes the process work for the team rather than against it.',
         ['Scrum', 'Facilitation', 'Impediments', 'Metrics'], 'steady'),

        ('Enterprise Systems', 'ERP Functional Consultant',
         'Maps how a business works onto what an ERP can do.',
         ['ERP modules', 'Process design', 'Training', 'Testing'], 'emerging'),
        ('Enterprise Systems', 'CRM Analyst',
         'Makes the customer system reflect how sales and support really work.',
         ['CRM config', 'Reporting', 'Workflows', 'Data hygiene'], 'steady'),
        ('Enterprise Systems', 'Salesforce Administrator',
         'Configures, secures and reports on a Salesforce estate.',
         ['Objects and flows', 'Permissions', 'Reports', 'Releases'], 'emerging'),
        ('Enterprise Systems', 'Systems Implementation Specialist',
         'Takes a chosen system from contract to people using it.',
         ['Configuration', 'Data migration', 'Cutover', 'Training'], 'steady'),

        ('Strategy and Emerging', 'Digital Transformation Analyst',
         'Finds where technology would change how work is done, not just its tools.',
         ['Process analysis', 'Change management', 'Business cases', 'Roadmaps'], 'emerging'),
        ('Strategy and Emerging', 'IT Business Partner',
         'The person a department talks to when it needs technology to move.',
         ['Relationship management', 'Demand shaping', 'Prioritisation', 'Communication'], 'emerging'),
        ('Strategy and Emerging', 'Information Security Analyst',
         'Governs security from the business side: policy, awareness and risk.',
         ['Policy', 'Awareness', 'Risk', 'Standards'], 'high'),
    ],
}


class Command(BaseCommand):
    help = 'Seed or update the career map roles for BSCS, BSIT and BSIS.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--prune', action='store_true',
            help='Deactivate roles that are no longer in the catalogue '
                 '(deactivate, never delete — a role may be referenced by a path)',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        seen_slugs = []
        created = updated = 0

        for program, roles in CATALOGUE.items():
            for order, (category, name, summary, skills, demand) in enumerate(roles):
                slug = slugify(f'{program}-{name}')
                if slug in seen_slugs:
                    # Two names that slugify identically would silently overwrite
                    # each other via update_or_create, leaving one role missing
                    # with no error. Fail loudly instead.
                    raise ValueError(
                        f'duplicate slug {slug!r} — two roles in {program} reduce '
                        f'to the same slug; rename one'
                    )
                seen_slugs.append(slug)
                _, was_created = CareerRole.objects.update_or_create(
                    slug=slug,
                    defaults={
                        'program_type': program,
                        'category': category,
                        'name': name,
                        'summary': summary,
                        'core_skills': list(skills),
                        'demand': demand,
                        'order': order,
                        'is_active': True,
                        # career_path is deliberately absent: re-running this must
                        # not unwire a role from a path that has been seeded.
                    },
                )
                created += was_created
                updated += (not was_created)

        pruned = 0
        if options['prune']:
            # Deactivated, never deleted: a CareerPath may point at it, and
            # hiding a card is reversible while losing the row is not.
            pruned = CareerRole.objects.exclude(slug__in=seen_slugs).update(is_active=False)

        total = CareerRole.objects.filter(is_active=True).count()
        linked = CareerRole.objects.filter(is_active=True, career_path__isnull=False).count()

        self.stdout.write(self.style.SUCCESS(
            f'career roles: {created} created, {updated} updated'
            + (f', {pruned} deactivated' if options['prune'] else '')
        ))
        for program in CATALOGUE:
            count = CareerRole.objects.filter(program_type=program, is_active=True).count()
            categories = CareerRole.objects.filter(
                program_type=program, is_active=True,
            ).values_list('category', flat=True).distinct().count()
            self.stdout.write(f'  {program}: {count} roles across {categories} fields')
        self.stdout.write(
            f'  {linked}/{total} roles have a learning path — the rest render as '
            f'"path coming soon" until one is seeded'
        )
