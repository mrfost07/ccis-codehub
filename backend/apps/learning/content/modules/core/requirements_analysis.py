"""
Requirements and process analysis — the floor under the BSIS analysis roles.

Reused by: Business Analyst, Business Process Analyst, Requirements Engineer,
Systems Analyst, Product Owner, ERP Functional Consultant, IT Business Partner,
Digital Transformation Analyst.
"""

MODULE = {
    'title': 'Requirements and Process Analysis',
    'description': 'Finding out what an organisation actually needs, writing it down so '
                   'it cannot be misread, and modelling the process it belongs to.',
    'duration': 85,
    'difficulty': 'beginner',
    'skills': ['Requirements', 'Business Analysis', 'Process Modelling'],
    'slides': [
        {
            'title': 'What an Analyst Is For',
            'body': '<p>Systems fail far more often because they solved the wrong problem '
                    'than because they were built badly. The analyst exists to make the '
                    'first kind of failure less likely.</p>'
                    '<p>That means sitting between people who know the business and people '
                    'who know the technology, and being fluent enough in both to notice when '
                    'they are agreeing to different things using the same words.</p>'
                    '<p>The job is not writing down what people ask for. It is working out '
                    'what they need, which is frequently not what they asked for.</p>',
        },
        {
            'title': 'The Stated Request Is Not the Need',
            'body': '<p>People arrive with a solution already chosen: "we need a dropdown '
                    'here", "we need a report every Monday".</p>'
                    '<p>Behind each is a problem. The Monday report may exist because someone '
                    'is checking whether a threshold was crossed, in which case an alert when '
                    'it is crossed serves them better and costs less.</p>'
                    '<p>So ask what they will do with it, and what happens if they do not '
                    'have it. Asking why several times sounds childish and is the single most '
                    'productive habit in the trade — it either finds the real need or reveals '
                    'that nobody remembers why the thing is done at all.</p>',
        },
        {
            'title': 'Stakeholders',
            'body': '<p>A stakeholder is anyone affected by the system, which is a wider '
                    'group than the people who commissioned it.</p>'
                    '<p>The dangerous omissions are predictable: the people who will actually '
                    'use it every day, the team who must support it afterwards, and whoever '
                    'is accountable for the data being correct. Skip them and you get a '
                    'system that satisfies a manager and is hated by everyone who touches '
                    'it.</p>'
                    '<p>Expect stakeholders to want incompatible things. That conflict is '
                    'information, and surfacing it early is cheaper than discovering it '
                    'during acceptance testing. It is not the analyst\'s job to resolve it '
                    'quietly — it is the job to make the trade-off visible to whoever decides.</p>',
        },
        {
            'title': 'Functional and Non-Functional',
            'body': '<p><strong>Functional</strong> requirements say what the system does: '
                    'a lecturer can publish a grade.</p>'
                    '<p><strong>Non-functional</strong> requirements say how well: how fast, '
                    'for how many users at once, how available, how secure, how accessible.</p>'
                    '<p>The second kind is skipped because it feels like detail, and it is '
                    'the kind that gets projects rejected at the end. A system that does '
                    'everything asked and takes forty seconds a page has failed, and no '
                    'functional requirement records that it has.</p>',
        },
        {
            'title': 'Writing One That Cannot Be Misread',
            'body': '<p>A good requirement is specific, testable and free of solution.</p>'
                    '<p>"The system should be user friendly" cannot be built or tested — two '
                    'people will disagree about whether it was met, at the worst possible '
                    'moment. "A lecturer can publish grades for a class of 60 in under 30 '
                    'seconds" can be checked by anyone.</p>'
                    '<p>Watch for words that hide disagreement: fast, easy, secure, '
                    'appropriate, as needed, etc. Each one is a decision nobody has made yet, '
                    'written down as though it had been.</p>',
        },
        {
            'title': 'User Stories and Acceptance Criteria',
            'body': '<p>A user story names who wants something and why: <em>as a lecturer, I '
                    'want to publish grades, so that students see results without emailing '
                    'me</em>.</p>'
                    '<p>The "so that" is the part with value. It carries the reason, which is '
                    'what lets a developer make a sensible decision when the story turns out '
                    'to be ambiguous — and it survives when the original conversation is '
                    'forgotten.</p>'
                    '<p>Acceptance criteria say how you will know it is done, in advance. '
                    'Written before the work, they are a specification; written afterwards, '
                    'they are a description of whatever got built.</p>',
        },
        {
            'title': 'Modelling the Process',
            'body': '<p>Before changing a process, draw it: the steps, who does each, what '
                    'they hand on, and where it waits.</p>'
                    '<p>Drawing it is usually enough on its own. Handoffs and queues are '
                    'where time is lost, and neither is visible to anyone who only sees their '
                    'own step. A form that takes four minutes of work and sits for six days '
                    'has a queueing problem, not a form problem — and buying software to '
                    'speed up the four minutes changes nothing.</p>'
                    '<p>Model what happens today, honestly, including the workarounds. The '
                    'official process and the real one differ, and the differences are where '
                    'the requirements are hiding.</p>',
        },
        {
            'title': 'Getting It Agreed',
            'body': '<p>Requirements are not finished when written; they are finished when '
                    'the right people have understood and agreed to them.</p>'
                    '<p>Read them back in the stakeholder\'s own language rather than sending '
                    'a document — people sign documents they have not read. Walking through '
                    'concrete examples is the fastest way to expose a misunderstanding, '
                    'because a wrong example is obvious in a way a wrong abstraction is '
                    'not.</p>'
                    '<p>Expect change, and record why each change was made. A requirement '
                    'nobody remembers the reason for is one nobody can safely remove, so it '
                    'stays forever, being paid for.</p>',
        },
    ],
    'quiz': {
        'title': 'Quiz: Requirements and Process Analysis',
        'description': 'Needs, stakeholders, requirement quality, stories and processes.',
        'time_limit': 18,
        'questions': [
            {
                'title': 'Why Systems Fail',
                'text': 'What does the analyst role primarily exist to prevent?',
                'choices': [
                    'Building the wrong thing well',
                    'Writing code that contains defects',
                    'Servers being under-specified',
                    'Projects running past their budget',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Behind the Request',
                'text': 'A manager asks for a report every Monday. What should you establish '
                        'first?',
                'choices': [
                               'Which format they would like it in',
                               'Whether Monday or Tuesday suits better',
                               'Who else should be copied in',
                               'What they will do with it, and what happens without it',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'Asking Why',
                'text': 'What does repeatedly asking why achieve?',
                'choices': [
                               'It replaces the need for acceptance criteria',
                               'It finds the real need, or reveals nobody remembers why it is done',
                               'It slows the project enough to reduce scope',
                               'It establishes who is accountable',
                           ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'Who Gets Left Out',
                'text': 'Which stakeholders are most often omitted?',
                'choices': [
                    'Daily users, the support team, and whoever owns data correctness',
                    'The finance department and the board',
                    'External suppliers and auditors',
                    'The project sponsor',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'Conflicting Stakeholders',
                'text': 'Two stakeholders want incompatible things. What should the analyst do?',
                'choices': [
                    'Make the trade-off visible to whoever decides',
                    'Choose whichever is technically simpler',
                    'Include both and let it be resolved in testing',
                    'Defer to the more senior stakeholder quietly',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'The Kind That Gets Skipped',
                'text': 'Which kind of requirement is most often left out, and gets systems '
                        'rejected at the end?',
                'choices': [
                               'Regulatory requirements',
                               'Reporting requirements',
                               'Non-functional — speed, load, availability, security, accessibility',
                               'Functional — what the system does',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'A Requirement That Cannot Be Tested',
                'text': 'Why is "the system should be user friendly" a poor requirement?',
                'choices': [
                               'It names a stakeholder rather than a behaviour',
                               'Two people can disagree about whether it was met, at the worst moment',
                               'It describes a non-functional property',
                               'It is too short to be a requirement',
                           ],
                'correct': 1,
                'points': 3,
            },
            {
                'title': 'Words That Hide Disagreement',
                'text': 'What does a word like "fast" or "as needed" in a requirement signal?',
                'choices': [
                               'That the requirement should be split in two',
                               'A decision nobody has made yet, written as though it had been',
                               'A non-functional requirement that is complete',
                               'That the requirement came from a technical stakeholder',
                           ],
                'correct': 1,
                'points': 2,
            },
            {
                'title': 'The "So That" Clause',
                'text': 'Why does the "so that" part of a user story carry the most value?',
                'choices': [
                               'It identifies who the story belongs to',
                               'It is what the tester checks against',
                               "It determines the story's priority",
                               'It carries the reason, so an ambiguity can be resolved sensibly later',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'When to Write Acceptance Criteria',
                'text': 'Why write acceptance criteria before the work starts?',
                'choices': [
                    'Written afterwards they merely describe whatever got built',
                    'They cannot be changed once work begins',
                    'Developers cannot start without them',
                    'They replace the need for testing',
                ],
                'correct': 0,
                'points': 3,
            },
            {
                'title': 'Four Minutes, Six Days',
                'text': 'A form takes four minutes of work and six days to complete. What is '
                        'the problem?',
                'choices': [
                               'The form is too long',
                               'The software is too slow',
                               'Too few people are trained to process it',
                               'Queueing and handoffs, not the form itself',
                           ],
                'correct': 3,
                'points': 3,
            },
            {
                'title': 'Modelling Honestly',
                'text': 'Why model the process as it really happens, workarounds included?',
                'choices': [
                               'The official process is usually undocumented',
                               'It shortens the modelling exercise',
                               'The gap between official and real process is where requirements hide',
                               'Workarounds must be documented for auditors',
                           ],
                'correct': 2,
                'points': 3,
            },
            {
                'title': 'Getting Agreement',
                'text': 'Why walk through concrete examples rather than sending a document?',
                'choices': [
                               'Examples are easier to store',
                               'Stakeholders cannot approve documents formally',
                               'A wrong example is obvious in a way a wrong abstraction is not',
                               'Documents take longer to produce',
                           ],
                'correct': 2,
                'points': 2,
            },
        ],
    },
}
