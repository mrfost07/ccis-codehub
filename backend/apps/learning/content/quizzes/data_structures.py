"""
Quizzes for "Comprehensive Data Structures for College Students".

Three long modules, so eight questions each. The material is conceptual rather
than a walkthrough, so the questions lean on the definitions and the operations
the modules set out — LIFO and FIFO, what an ADT is, how hashing and collision
resolution work — rather than on code the modules never show.
"""

QUIZZES = [
    {
        'module': 'Module 1: Foundations of Data Structures & Linear Structures',
        'title': 'Module 1 Quiz: Foundations and Linear Structures',
        'description': 'What a data structure is, why it matters, and how efficiency is described.',
        'time_limit': 15,
        'questions': [
            {
                'title': 'What a Data Structure Is',
                'text': 'What is a data structure?',
                'choices': [
                    'A particular way of organising data so it can be used efficiently',
                    'A programming language for describing algorithms',
                    'A physical device that stores files',
                    'A diagram showing how a program is laid out on screen',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Why They Matter',
                'text': 'According to the module, what happens to an elegant algorithm '
                        'without well-chosen data structures?',
                'choices': [
                    'It can still struggle with performance, especially on large datasets',
                    'It will refuse to compile',
                    'It becomes impossible to write down',
                    'It runs faster, because there is less structure to maintain',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Big O Notation',
                'text': 'What is Big O notation used for in computer science?',
                'choices': [
                    'Classifying algorithms by how their running time or space grows',
                    'Measuring the exact number of seconds an algorithm takes',
                    'Counting how many lines of code an algorithm needs',
                    'Deciding which programming language to use',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Beyond Storage',
                'text': 'The module says data structures are about more than storing data — '
                        'they are about structuring it for fast retrieval, modification '
                        'and processing.',
                'true_false': True,
                'correct': 0,
                'points': 1,
            },
            {
                'title': 'Arrays',
                'text': 'What is the defining feature of an array?',
                'choices': [
                    'Elements are held in order and reached by index',
                    'Elements are reached only by following links from the first one',
                    'Elements are stored as key-value pairs',
                    'Elements can only be added and removed at one end',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Dynamic Arrays',
                'text': 'What does a dynamic array offer that a fixed-size array does not?',
                'choices': [
                    'It can grow as more elements are added',
                    'It can hold values of only one type',
                    'It can be reached by index in constant time',
                    'It stores its elements in sorted order automatically',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Linked Lists',
                'text': 'How are the elements of a linked list connected?',
                'choices': [
                    'Each node holds a reference to the next node',
                    'All elements sit in one contiguous block of memory',
                    'Elements are found by hashing their value to an index',
                    'Elements are arranged as a tree with a single root',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Choosing a Structure',
                'text': 'Why does the module say the choice of data structure matters for '
                        'large datasets in particular?',
                'choices': [
                    'Because the cost of a poor choice grows with the amount of data',
                    'Because large datasets cannot be stored in arrays at all',
                    'Because every structure behaves identically on small inputs and large ones',
                    'Because large datasets always require a database rather than a structure',
                ],
                'correct': 0,
                'points': 2,
            },
        ],
    },
    {
        'module': 'Module 2: Abstract Data Types & Hierarchical Structures',
        'title': 'Module 2 Quiz: Abstract Data Types and Trees',
        'description': 'ADTs, stacks and queues, and hierarchical structures.',
        'time_limit': 15,
        'questions': [
            {
                'title': 'What an ADT Is',
                'text': 'What does an Abstract Data Type describe?',
                'choices': [
                    'What operations can be performed, without saying how they are implemented',
                    'The exact memory layout an implementation must use',
                    'The programming language a structure must be written in',
                    'The hardware a structure is designed to run on',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'The Stack Principle',
                'text': 'Which principle does a stack follow?',
                'choices': ['Last-In, First-Out', 'First-In, First-Out',
                            'Highest priority first', 'Random access by index'],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Stack Operations',
                'text': 'Which operation removes and returns the top element of a stack?',
                'choices': ['Pop', 'Push', 'Peek', 'IsEmpty'],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Looking Without Removing',
                'text': 'Which stack operation returns the top element without removing it?',
                'choices': ['Peek', 'Pop', 'Push', 'Size'],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Where Stacks Are Used',
                'text': 'Which of these does the module give as a use of stacks?',
                'choices': [
                    'Managing function calls, in the call stack',
                    'Scheduling jobs in the order they arrived',
                    'Storing key-value pairs for fast lookup',
                    'Modelling connections in a social network',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'The Queue Principle',
                'text': 'Which principle does a queue follow?',
                'choices': ['First-In, First-Out', 'Last-In, First-Out',
                            'Sorted order by value', 'No defined order'],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Implementing a Stack',
                'text': 'A stack can be implemented using either arrays or linked lists.',
                'true_false': True,
                'correct': 0,
                'points': 1,
            },
            {
                'title': 'Why Abstraction Helps',
                'text': 'What does the module say abstraction gives developers?',
                'choices': [
                    'Modularity and flexibility, by working at a higher level',
                    'Faster hardware for the same price',
                    'A guarantee that the code contains no bugs',
                    'The ability to skip testing the implementation',
                ],
                'correct': 0,
                'points': 2,
            },
        ],
    },
    {
        'module': 'Module 3: Advanced Data Structures: Hashing and Graphs',
        'title': 'Module 3 Quiz: Hashing and Graphs',
        'description': 'Hash tables, collisions, and graphs.',
        'time_limit': 15,
        'questions': [
            {
                'title': 'What a Hash Table Stores',
                'text': 'How does a hash table store data?',
                'choices': [
                    'As key-value pairs',
                    'As a sequence of elements reached by index',
                    'As nodes with a single parent each',
                    'As a set of edges between vertices',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Average-Case Lookup',
                'text': 'What average-case complexity does the module give for retrieval '
                        'from a hash table?',
                'choices': ['O(1)', 'O(n)', 'O(n log n)', 'O(n squared)'],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'The Hash Function',
                'text': 'What does a hash function do?',
                'choices': [
                    'Maps a key to an index in the underlying array',
                    'Sorts the keys into ascending order',
                    'Compresses the value so it takes less space',
                    'Encrypts the value so it cannot be read',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'A Good Hash Function',
                'text': 'Which of these does the module require of a good hash function?',
                'choices': [
                    'It distributes keys uniformly to minimise collisions',
                    'It produces a different value each time for the same key',
                    'It is slow enough to be hard to reverse',
                    'It always returns the first index of the array',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'What a Collision Is',
                'text': 'What is a collision in a hash table?',
                'choices': [
                    'Two different keys hashing to the same index',
                    'Two threads writing to the table at the same moment',
                    'The table running out of memory',
                    'A key being looked up before it has been inserted',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Chaining',
                'text': 'How does chaining resolve a collision?',
                'choices': [
                    'Each slot holds a list, and the colliding pair is added to it',
                    'The table is rebuilt with a different hash function',
                    'The new key overwrites the one already stored',
                    'The new key is rejected and an error is raised',
                ],
                'correct': 0,
                'points': 2,
            },
            {
                'title': 'Consistency',
                'text': 'A hash function must produce the same hash value for the same key '
                        'every time it is called.',
                'true_false': True,
                'correct': 0,
                'points': 1,
            },
            {
                'title': 'Where Hash Tables Are Used',
                'text': 'Which use does the module give for hash tables?',
                'choices': [
                    'Caching, database indexing and compiler symbol tables',
                    'Rendering images on screen',
                    'Sorting a list into ascending order',
                    'Finding the shortest route between two points',
                ],
                'correct': 0,
                'points': 2,
            },
        ],
    },
]
