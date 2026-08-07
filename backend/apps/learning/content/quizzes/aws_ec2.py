"""
Quizzes for "Hosting a Website on AWS EC2".

Three thirty-minute modules, so five questions each. The path is a walkthrough,
and the questions follow it: the commands the student actually ran, and the
choices they actually made, rather than AWS trivia the modules never mention.
"""

QUIZZES = [
    {
        'module': 'Module 1: Setting Up Your AWS Account and EC2 Instance',
        'title': 'Module 1 Quiz: Your Account and First Instance',
        'description': 'Creating an account, launching an instance, and connecting to it.',
        'time_limit': 10,
        'questions': [
            {
                'title': 'The Free Tier Instance',
                'text': 'Which instance type does this module use because it is '
                        'eligible for the free tier?',
                'choices': ['t2.micro', 'm5.large', 'c5.xlarge', 'r5.2xlarge'],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'What an AMI Is',
                'text': 'When launching an instance, what does choosing an Amazon '
                        'Machine Image (AMI) decide?',
                'choices': [
                    'The operating system the instance starts from, such as Ubuntu',
                    'How much you will be billed each month',
                    'Which region the instance runs in',
                    'The public IP address the instance is given',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'The Key Pair',
                'text': 'What is the .pem key pair file downloaded during launch used for?',
                'choices': [
                    'Connecting to the instance over SSH',
                    'Paying the AWS bill',
                    'Storing the website files',
                    'Choosing the instance type',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'The SSH Command',
                'text': 'In ssh -i /path/to/your-key.pem ubuntu@your-instance-public-ip, '
                        'what does the -i flag supply?',
                'choices': [
                    'The private key file to authenticate with',
                    'The instance ID to connect to',
                    'The interactive mode to open',
                    'The IP address of the server',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Downloading the Key',
                'text': 'You should download the key pair when launching the instance, '
                        'because it is needed for SSH access.',
                'true_false': True,
                'correct': 0,
                'points': 1,
            },
        ],
    },
    {
        'module': 'Module 2: Configuring Your EC2 Instance for Web Hosting',
        'title': 'Module 2 Quiz: Turning It Into a Web Server',
        'description': 'Installing the web server, opening the firewall, serving a page.',
        'time_limit': 10,
        'questions': [
            {
                'title': 'Installing Apache',
                'text': 'Which command installs Apache on the Ubuntu instance?',
                'choices': [
                    'sudo apt install apache2 -y',
                    'sudo apt remove apache2 -y',
                    'sudo systemctl stop apache2',
                    'sudo ufw allow apache2',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Refreshing the Package List',
                'text': 'What does sudo apt update do before the install?',
                'choices': [
                    'Refreshes the list of available packages',
                    'Upgrades every installed package to its newest version',
                    'Installs Apache',
                    'Restarts the instance',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Opening the Firewall',
                'text': "Why does the module run sudo ufw allow 'Apache Full'?",
                'choices': [
                    'To let HTTP and HTTPS traffic reach the web server',
                    'To install the Apache web server',
                    'To create the index.html file',
                    'To connect to the instance over SSH',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Where Pages Live',
                'text': 'Which directory does the module put index.html in so Apache serves it?',
                'choices': ['/var/www/html', '/home/ubuntu', '/etc/apache2', '/usr/bin'],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Reaching the Site',
                'text': 'Once the page is in place, the site can be reached at the '
                        "instance's public IP address.",
                'true_false': True,
                'correct': 0,
                'points': 1,
            },
        ],
    },
    {
        'module': 'Module 3: Deploying and Managing Your Website',
        'title': 'Module 3 Quiz: Deploying and Keeping It Running',
        'description': 'Uploading files, applying updates, watching the instance.',
        'time_limit': 10,
        'questions': [
            {
                'title': 'Uploading Files',
                'text': 'Which command does the module use to copy website files to '
                        'the instance?',
                'choices': ['scp', 'ping', 'chmod', 'grep'],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Copying a Folder',
                'text': 'In scp -i key.pem -r ./site ubuntu@ip:/var/www/html, what does '
                        'the -r flag do?',
                'choices': [
                    'Copies the directory and everything inside it',
                    'Removes the files after copying them',
                    'Renames the files on arrival',
                    'Restarts the web server afterwards',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Applying Updates',
                'text': 'Which command upgrades the installed packages on the server?',
                'choices': [
                    'sudo apt upgrade -y',
                    'sudo apt search apache2',
                    'sudo scp -r /var/www/html',
                    'sudo ufw status',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Watching the Instance',
                'text': 'Where does the module say to monitor CPU usage and network traffic?',
                'choices': [
                    'The AWS EC2 dashboard',
                    'The Apache configuration file',
                    'The index.html page',
                    'The .pem key file',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Why Update',
                'text': 'The module recommends updating the server regularly for security '
                        'and performance.',
                'true_false': True,
                'correct': 0,
                'points': 1,
            },
        ],
    },
]
