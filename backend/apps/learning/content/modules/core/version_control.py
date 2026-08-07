"""
Git and working with other people — shared by every engineering path.

Reused by: Backend Engineer, Frontend Engineer, Full-Stack Engineer, Mobile
Developer, DevOps Engineer, QA Automation Engineer and most of the BSIT
application roles.
"""

MODULE = {
    'title': 'Version Control with Git',
    'description': 'Tracking changes, working on a branch, and merging work back '
                   'together without losing anyone\'s.',
    'duration': 60,
    'difficulty': 'beginner',
    'skills': ['Git', 'Collaboration'],
    'slides': [
        {
            'title': 'Why Version Control',
            'body': '<p>A version control system records what changed, when, and who '
                    'changed it. Without one, a team shares files by copying them, and '
                    'the copies drift: two people edit the same file, one overwrites the '
                    'other, and the only record of what was lost is in somebody\'s '
                    'memory.</p>'
                    '<p>Git solves three problems at once. It gives you a history you can '
                    'read and undo. It lets several people work on the same codebase at '
                    'the same time. And it makes it safe to try something, because you '
                    'can always get back to what worked.</p>',
        },
        {
            'title': 'Repositories, Commits and the Staging Area',
            'body': '<p>A <strong>repository</strong> is a project plus its whole history. '
                    'A <strong>commit</strong> is one recorded change — a snapshot with a '
                    'message explaining why it was made.</p>'
                    '<p>Git has a step other systems do not: the <strong>staging area</strong>. '
                    'You choose which changes go into the next commit rather than committing '
                    'everything you happen to have touched. That is what lets a commit be one '
                    'coherent idea instead of an afternoon\'s worth of unrelated edits.</p>'
                    '<p>The everyday cycle is: change files, stage what belongs together, '
                    'commit with a message.</p>',
            'code': 'git status              # what has changed\n'
                    'git add src/login.py    # stage one file\n'
                    'git commit -m "Reject logins with an expired token"\n'
                    'git log --oneline       # read the history',
        },
        {
            'title': 'Writing a Commit Message',
            'body': '<p>The message is the part your colleagues — and you in six months — '
                    'actually read. A good one says <em>why</em>, because the diff already '
                    'says what.</p>'
                    '<p>"Fix bug" is useless: which bug, and how? "Reject logins with an '
                    'expired token" tells the next person what changed and lets them find '
                    'it later by searching. Write in the imperative, as if completing the '
                    'sentence "this commit will…".</p>',
        },
        {
            'title': 'Branches',
            'body': '<p>A <strong>branch</strong> is a line of work that can move ahead '
                    'without disturbing the main one. You branch to build a feature or fix '
                    'a bug, and merge back when it is ready.</p>'
                    '<p>This is why a team can work in parallel. Everyone branches off the '
                    'shared main line, works independently, and brings their work back when '
                    'it is finished — instead of everyone editing the same files at once.</p>',
            'code': 'git switch -c fix-expired-tokens   # create a branch and move to it\n'
                    '# ... work, stage, commit ...\n'
                    'git switch main\n'
                    'git merge fix-expired-tokens',
        },
        {
            'title': 'Merging, and Merge Conflicts',
            'body': '<p>Merging brings one branch\'s changes into another. Usually Git works '
                    'it out. When two branches changed <em>the same lines</em> of the same '
                    'file, Git cannot know which version is right, and stops with a '
                    '<strong>merge conflict</strong>.</p>'
                    '<p>A conflict is not an error — it is Git refusing to guess. It marks '
                    'the competing versions in the file and waits. You edit the file to what '
                    'it should be, remove the markers, stage it, and commit.</p>',
        },
        {
            'title': 'Remotes and Pull Requests',
            'body': '<p>A <strong>remote</strong> is a copy of the repository somewhere else — '
                    'usually a shared server such as GitHub. <code>push</code> sends your '
                    'commits to it; <code>pull</code> brings other people\'s down.</p>'
                    '<p>Most teams do not merge into the main branch directly. You push your '
                    'branch and open a <strong>pull request</strong>, where colleagues read '
                    'the change and comment before it is merged. That review is where most '
                    'bugs get caught, and it is why the branch you push should contain one '
                    'coherent piece of work.</p>',
            'code': 'git push -u origin fix-expired-tokens\n'
                    '# open a pull request, get it reviewed, then merge',
        },
        {
            'title': 'What Not to Commit',
            'body': '<p>Two things must never go into a repository: <strong>secrets</strong> '
                    '(passwords, API keys, private keys) and <strong>generated files</strong> '
                    '(build output, dependency folders, virtual environments).</p>'
                    '<p>Secrets are the serious one. Git history is permanent — deleting the '
                    'file in a later commit does not remove it from the history, and anyone '
                    'with the repository can read it. A committed key must be treated as '
                    'leaked and rotated.</p>'
                    '<p>A <code>.gitignore</code> file lists patterns Git should not track, '
                    'which is how you avoid the mistake in the first place.</p>',
        },
    ],
    'quiz': {
        'title': 'Quiz: Version Control with Git',
        'description': 'Commits, branches, merges and the things that must not be committed.',
        'time_limit': 12,
        'questions': [
            {
                'title': 'What a Commit Is',
                'text': 'What does a commit record?',
                'choices': [
                               'A snapshot of the staged changes, with a message explaining them',
                               'Every file on your computer at that moment',
                               'A copy of the project uploaded to a server',
                               'A request for a colleague to review your work',
                           ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'The Staging Area',
                'text': 'What does the staging area let you do?',
                'choices': [
                               'Work on two branches at the same time',
                               'Share your work with the rest of the team',
                               'Choose which changes go into the next commit',
                               'Undo a commit that has already been pushed',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'A Good Message',
                'text': 'Why should a commit message explain why a change was made?',
                'choices': [
                               'Because messages are the only way to undo a commit',
                               'Because the diff already shows what changed',
                               'Because Git rejects messages that describe the code',
                               'Because the message replaces the need for code review',
                           ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'What a Branch Is For',
                'text': 'What does working on a branch allow?',
                'choices': [
                               'Committing without writing a message',
                               'Removing a file from the history permanently',
                               'Running the project without installing dependencies',
                               'Making changes without disturbing the main line of work',
                           ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'Merge Conflicts',
                'text': 'When does Git report a merge conflict?',
                'choices': [
                               'When a branch has more commits than the one it merges into',
                               'When a commit message is missing',
                               'When two branches changed the same lines of the same file',
                               'Whenever two branches are merged at all',
                           ],
                'correct': 2,
                'points': 2,
            },
            {
                'title': 'Push and Pull',
                'text': 'What does git push do?',
                'choices': [
                               "Brings other people's commits down to your machine",
                               'Combines two branches into one',
                               'Stages your changes for the next commit',
                               'Sends your commits to the remote repository',
                           ],
                'correct': 3,
                'points': 2,
            },
            {
                'title': 'Pull Requests',
                'text': 'What is the main purpose of a pull request?',
                'choices': [
                               'To resolve a merge conflict automatically',
                               'To have colleagues review a change before it is merged',
                               'To download the latest version of the repository',
                               'To create a new branch on the remote',
                           ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'A Committed Secret',
                'text': 'You commit an API key, then delete it in the next commit. Is the '
                        'key safe?',
                'choices': [
                    'No — it stays in the history and must be treated as leaked',
                    'Yes — deleting the file removes it from the repository',
                    'Yes, as long as the branch is never pushed to a remote',
                    'Yes, provided the later commit message mentions the removal',
                ],
                'correct': 0,
                'points': 3,
            },
        ],
    },
}
