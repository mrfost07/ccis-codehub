"""
Easy coding challenges.

The tasks are the standard exercises of the field — pair sums, anagrams,
balanced brackets, binary search. The problems themselves are common property;
the statements here are written for this platform rather than copied from
anywhere, and the wording, the input format and the examples are ours.

Each entry declares its INPUTS and a reference solution. Expected outputs are
produced by running that solution through the real executor at seed time, so
they cannot be wrong by hand.

`hidden` inputs are what make the challenge honest. A student sees the visible
ones; grading also runs the hidden ones, so reading the samples and branching on
them computes nothing.

Input format convention, kept the same across every challenge so students learn
it once: the first line holds n, the next line holds n space-separated values,
and any further parameters follow on their own lines.
"""

CHALLENGES = [
    {
        'title': 'Pair That Sums to a Target',
        'slug': 'pair-sums-to-target',
        'difficulty': 'easy',
        'category': 'algorithms',
        'tags': ['array', 'hash-map'],
        'description': (
            'Given a list of integers and a target, find the **two positions** whose '
            'values add up to the target and print them in increasing order, '
            'separated by a space.\n\n'
            'Positions are counted from 0. Exactly one pair will match.\n\n'
            '**Input**\n\n'
            '- line 1: `n`, the number of values\n'
            '- line 2: `n` space-separated integers\n'
            '- line 3: the target\n\n'
            '**Output**\n\n'
            'The two positions, smaller first, separated by a space.\n\n'
            '**Example**\n\n'
            '```\ninput:\n4\n2 7 11 15\n9\n\noutput:\n0 1\n```\n\n'
            'The values at positions 0 and 1 are 2 and 7, and 2 + 7 = 9.'
        ),
        'constraints': '2 <= n <= 10000. Values fit in a 32-bit integer.',
        'hints': ['A dictionary of value to position lets you check for the '
                  'complement in one pass.'],
        'starter': 'n = int(input())\nvalues = list(map(int, input().split()))\n'
                   'target = int(input())\n\n# print the two positions, smaller first\n',
        'solution': (
            'n = int(input())\n'
            'values = list(map(int, input().split()))\n'
            'target = int(input())\n'
            'seen = {}\n'
            'for i, v in enumerate(values):\n'
            '    if target - v in seen:\n'
            '        print(seen[target - v], i)\n'
            '        break\n'
            '    seen[v] = i\n'
        ),
        'visible': ['4\n2 7 11 15\n9', '3\n3 2 4\n6'],
        'hidden': ['2\n3 3\n6', '5\n-1 -2 -3 -4 -5\n-8',
                   '6\n1 5 9 12 20 31\n40', '5\n0 4 3 0 7\n0'],
    },
    {
        'title': 'Are These Two Words Anagrams',
        'slug': 'are-these-anagrams',
        'difficulty': 'easy',
        'category': 'algorithms',
        'tags': ['string', 'hash-map', 'sorting'],
        'description': (
            'Two words are anagrams when one can be rearranged into the other, using '
            'every letter exactly once.\n\n'
            'Read two lowercase words and print `true` if they are anagrams and '
            '`false` otherwise.\n\n'
            '**Input**\n\n- line 1: the first word\n- line 2: the second word\n\n'
            '**Output**\n\n`true` or `false`\n\n'
            '**Example**\n\n```\ninput:\nlisten\nsilent\n\noutput:\ntrue\n```'
        ),
        'constraints': '1 <= length <= 10000. Lowercase English letters only.',
        'hints': ['Counting each letter is faster than sorting, and either works.'],
        'starter': 'a = input().strip()\nb = input().strip()\n\n'
                   '# print true or false\n',
        'solution': (
            'a = input().strip()\n'
            'b = input().strip()\n'
            'print("true" if sorted(a) == sorted(b) else "false")\n'
        ),
        'visible': ['listen\nsilent', 'hello\nbillion'],
        'hidden': ['a\na', 'ab\nba', 'rat\ncar', 'aabbcc\nabcabc', 'abc\nabcd'],
    },
    {
        'title': 'Balanced Brackets',
        'slug': 'balanced-brackets',
        'difficulty': 'easy',
        'category': 'algorithms',
        'tags': ['stack', 'string'],
        'description': (
            'A string of brackets is balanced when every bracket is closed by the '
            'matching kind, in the right order, and nothing is left open.\n\n'
            'Read one line containing only the characters `()[]{}` and print `true` '
            'if it is balanced, `false` otherwise.\n\n'
            '**Input**\n\nOne line of brackets.\n\n**Output**\n\n`true` or `false`\n\n'
            '**Examples**\n\n'
            '```\ninput:\n{[()]}\n\noutput:\ntrue\n```\n\n'
            '```\ninput:\n([)]\n\noutput:\nfalse\n```'
        ),
        'constraints': '1 <= length <= 10000.',
        'hints': ['A stack: push an opening bracket, and on a closing one check it '
                  'matches the top.'],
        'starter': 's = input().strip()\n\n# print true or false\n',
        'solution': (
            's = input().strip()\n'
            'pairs = {")": "(", "]": "[", "}": "{"}\n'
            'stack = []\n'
            'ok = True\n'
            'for ch in s:\n'
            '    if ch in "([{":\n'
            '        stack.append(ch)\n'
            '    else:\n'
            '        if not stack or stack.pop() != pairs.get(ch):\n'
            '            ok = False\n'
            '            break\n'
            'print("true" if ok and not stack else "false")\n'
        ),
        'visible': ['{[()]}', '([)]'],
        'hidden': ['()', '(', ')', '((()))', '{[}]', '(((((((((())))))))))'],
    },
    {
        'title': 'Largest Sum of Any Run',
        'slug': 'largest-run-sum',
        'difficulty': 'easy',
        'category': 'algorithms',
        'tags': ['array', 'dynamic-programming'],
        'description': (
            'Given a list of integers, find the largest sum obtainable from any '
            'contiguous run of one or more values, and print it.\n\n'
            '**Input**\n\n- line 1: `n`\n- line 2: `n` space-separated integers\n\n'
            '**Output**\n\nThe largest run sum.\n\n'
            '**Example**\n\n```\ninput:\n9\n-2 1 -3 4 -1 2 1 -5 4\n\noutput:\n6\n```\n\n'
            'The run `4 -1 2 1` sums to 6, and nothing does better.'
        ),
        'constraints': '1 <= n <= 100000. Values may be negative.',
        'hints': ['At each value, either extend the run so far or start again from '
                  'here — whichever is larger.'],
        'starter': 'n = int(input())\nvalues = list(map(int, input().split()))\n\n'
                   '# print the largest run sum\n',
        'solution': (
            'n = int(input())\n'
            'values = list(map(int, input().split()))\n'
            'best = current = values[0]\n'
            'for v in values[1:]:\n'
            '    current = max(v, current + v)\n'
            '    best = max(best, current)\n'
            'print(best)\n'
        ),
        'visible': ['9\n-2 1 -3 4 -1 2 1 -5 4', '5\n1 2 3 4 5'],
        'hidden': ['1\n-3', '4\n-5 -2 -9 -1', '3\n0 0 0',
                   '6\n5 -1 5 -1 5 -1', '2\n-1 100'],
    },
    {
        'title': 'Find a Value by Halving',
        'slug': 'find-value-by-halving',
        'difficulty': 'easy',
        'category': 'algorithms',
        'tags': ['binary-search', 'array'],
        'description': (
            'Given a sorted list of distinct integers and a target, print the '
            'position of the target, or `-1` if it is not present.\n\n'
            'Positions are counted from 0. The list is sorted in increasing order, '
            'so you should not need to look at every value.\n\n'
            '**Input**\n\n- line 1: `n`\n- line 2: `n` sorted integers\n'
            '- line 3: the target\n\n**Output**\n\nThe position, or `-1`.\n\n'
            '**Example**\n\n```\ninput:\n6\n-1 0 3 5 9 12\n9\n\noutput:\n4\n```'
        ),
        'constraints': '1 <= n <= 100000. Values are distinct and sorted.',
        'hints': ['Compare with the middle value and discard half the range each time.'],
        'starter': 'n = int(input())\nvalues = list(map(int, input().split()))\n'
                   'target = int(input())\n\n# print the position or -1\n',
        'solution': (
            'n = int(input())\n'
            'values = list(map(int, input().split()))\n'
            'target = int(input())\n'
            'lo, hi, found = 0, n - 1, -1\n'
            'while lo <= hi:\n'
            '    mid = (lo + hi) // 2\n'
            '    if values[mid] == target:\n'
            '        found = mid\n'
            '        break\n'
            '    if values[mid] < target:\n'
            '        lo = mid + 1\n'
            '    else:\n'
            '        hi = mid - 1\n'
            'print(found)\n'
        ),
        'visible': ['6\n-1 0 3 5 9 12\n9', '6\n-1 0 3 5 9 12\n2'],
        'hidden': ['1\n5\n5', '1\n5\n-5', '4\n1 2 3 4\n1',
                   '4\n1 2 3 4\n4', '7\n10 20 30 40 50 60 70\n35'],
    },
    {
        'title': 'The Value That Appears Once',
        'slug': 'value-that-appears-once',
        'difficulty': 'easy',
        'category': 'algorithms',
        'tags': ['bit-manipulation', 'array'],
        'description': (
            'Every value in the list appears exactly twice, except one that appears '
            'once. Print that value.\n\n'
            '**Input**\n\n- line 1: `n`\n- line 2: `n` space-separated integers\n\n'
            '**Output**\n\nThe value appearing once.\n\n'
            '**Example**\n\n```\ninput:\n5\n4 1 2 1 2\n\noutput:\n4\n```\n\n'
            'Try to do it without counting every value — exclusive-or has a property '
            'that helps.'
        ),
        'constraints': '1 <= n <= 100000, and n is odd.',
        'hints': ['x ^ x is 0, and x ^ 0 is x. Order does not matter.'],
        'starter': 'n = int(input())\nvalues = list(map(int, input().split()))\n\n'
                   '# print the value that appears once\n',
        'solution': (
            'n = int(input())\n'
            'values = list(map(int, input().split()))\n'
            'answer = 0\n'
            'for v in values:\n'
            '    answer ^= v\n'
            'print(answer)\n'
        ),
        'visible': ['5\n4 1 2 1 2', '3\n2 2 1'],
        'hidden': ['1\n7', '7\n1 1 2 2 3 3 9', '5\n0 1 0 1 5',
                   '9\n5 4 3 2 1 5 4 3 2'],
    },
    {
        'title': 'Reverse the Digits',
        'slug': 'reverse-the-digits',
        'difficulty': 'easy',
        'category': 'basics',
        'tags': ['math'],
        'description': (
            'Read an integer and print it with its digits reversed. A negative number '
            'keeps its sign. Leading zeros produced by reversing are dropped.\n\n'
            '**Input**\n\nOne integer.\n\n**Output**\n\nThe reversed integer.\n\n'
            '**Examples**\n\n```\ninput:\n123\n\noutput:\n321\n```\n\n'
            '```\ninput:\n-4500\n\noutput:\n-54\n```'
        ),
        'constraints': 'The value fits in a 64-bit signed integer.',
        'hints': ['Handle the sign separately from the digits.'],
        'starter': 'n = int(input())\n\n# print the digits reversed\n',
        'solution': (
            'n = int(input())\n'
            'sign = -1 if n < 0 else 1\n'
            'print(sign * int(str(abs(n))[::-1]))\n'
        ),
        'visible': ['123', '-4500'],
        'hidden': ['0', '7', '1000000', '-1', '987654321'],
    },
    {
        'title': 'Count the Vowels',
        'slug': 'count-the-vowels',
        'difficulty': 'easy',
        'category': 'basics',
        'tags': ['string'],
        'description': (
            'Read a line of text and print how many vowels it contains. The vowels '
            'are a, e, i, o and u, in either case.\n\n'
            '**Input**\n\nOne line of text.\n\n**Output**\n\nThe number of vowels.\n\n'
            '**Example**\n\n```\ninput:\nProgramming is fun\n\noutput:\n5\n```'
        ),
        'constraints': '1 <= length <= 10000.',
        'hints': ['Lowercase the character before checking membership.'],
        'starter': 's = input()\n\n# print the number of vowels\n',
        'solution': (
            's = input()\n'
            'print(sum(1 for ch in s.lower() if ch in "aeiou"))\n'
        ),
        'visible': ['Programming is fun', 'xyz'],
        'hidden': ['AEIOU', 'aeiou', 'The quick brown fox jumps over the lazy dog',
                   'bcdfg', 'Surigao del Norte State University'],
    },
    {
        'title': 'Second Largest Value',
        'slug': 'second-largest-value',
        'difficulty': 'easy',
        'category': 'algorithms',
        'tags': ['array'],
        'description': (
            'Print the second largest **distinct** value in the list. If every value '
            'is the same, print `none`.\n\n'
            '**Input**\n\n- line 1: `n`\n- line 2: `n` space-separated integers\n\n'
            '**Output**\n\nThe second largest distinct value, or `none`.\n\n'
            '**Example**\n\n```\ninput:\n5\n3 9 9 4 1\n\noutput:\n4\n```\n\n'
            'The largest distinct value is 9, and the next is 4.'
        ),
        'constraints': '1 <= n <= 100000.',
        'hints': ['Track the largest and second largest in one pass, or work from '
                  'the set of distinct values.'],
        'starter': 'n = int(input())\nvalues = list(map(int, input().split()))\n\n'
                   '# print the second largest distinct value, or none\n',
        'solution': (
            'n = int(input())\n'
            'values = list(map(int, input().split()))\n'
            'distinct = sorted(set(values), reverse=True)\n'
            'print(distinct[1] if len(distinct) > 1 else "none")\n'
        ),
        'visible': ['5\n3 9 9 4 1', '3\n7 7 7'],
        'hidden': ['1\n5', '2\n1 2', '4\n-5 -1 -3 -1',
                   '6\n10 10 9 9 8 8', '5\n0 0 0 0 1'],
    },
    {
        'title': 'Is It a Palindrome',
        'slug': 'is-it-a-palindrome',
        'difficulty': 'easy',
        'category': 'basics',
        'tags': ['string', 'two-pointers'],
        'description': (
            'A phrase is a palindrome when it reads the same forwards and backwards, '
            'ignoring anything that is not a letter or digit, and ignoring case.\n\n'
            'Read one line and print `true` or `false`.\n\n'
            '**Input**\n\nOne line of text.\n\n**Output**\n\n`true` or `false`\n\n'
            '**Example**\n\n```\ninput:\nA man, a plan, a canal: Panama\n\n'
            'output:\ntrue\n```'
        ),
        'constraints': '1 <= length <= 10000.',
        'hints': ['Build a cleaned string first, then compare it with its reverse.'],
        'starter': 's = input()\n\n# print true or false\n',
        'solution': (
            's = input()\n'
            'cleaned = "".join(ch.lower() for ch in s if ch.isalnum())\n'
            'print("true" if cleaned == cleaned[::-1] else "false")\n'
        ),
        'visible': ['A man, a plan, a canal: Panama', 'race a car'],
        'hidden': ['a', 'ab', '12321', 'No lemon, no melon', 'Was it a car or a cat I saw'],
    },
]
