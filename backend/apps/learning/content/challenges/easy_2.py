"""
Easy coding challenges, continued.

Same conventions as `easy.py`: inputs and a reference solution only, expected
outputs computed by execution at seed time, hidden inputs doing the anti-cheat
work. Statements are written for this platform; the tasks themselves are the
standard exercises of the field.
"""


def _c(slug, title, tags, description, starter, solution, visible, hidden,
       constraints='', hints=(), category='algorithms'):
    return {
        'slug': slug, 'title': title, 'difficulty': 'easy', 'category': category,
        'tags': list(tags), 'description': description, 'constraints': constraints,
        'hints': list(hints), 'starter': starter, 'solution': solution,
        'visible': visible, 'hidden': hidden,
    }


N_LIST = 'n = int(input())\nvalues = list(map(int, input().split()))\n'
IO_N_LIST = ('**Input**\n\n- line 1: `n`\n- line 2: `n` space-separated integers\n\n'
             '**Output**\n\n')

CHALLENGES = [
    _c('sum-of-a-list', 'Sum of a List', ['array', 'math'],
       'Print the sum of the values.\n\n' + IO_N_LIST + 'The total.\n\n'
       '**Example**\n\n```\ninput:\n4\n1 2 3 4\n\noutput:\n10\n```',
       N_LIST + '\n# print the sum\n',
       N_LIST + 'print(sum(values))\n',
       ['4\n1 2 3 4', '3\n-1 -2 -3'],
       ['1\n0', '5\n10 20 30 40 50', '2\n-100 100', '6\n1 1 1 1 1 1'],
       constraints='1 <= n <= 100000.'),

    _c('largest-value', 'Largest Value', ['array'],
       'Print the largest value in the list.\n\n' + IO_N_LIST + 'The largest value.\n\n'
       '**Example**\n\n```\ninput:\n5\n3 9 2 9 4\n\noutput:\n9\n```',
       N_LIST + '\n# print the largest value\n',
       N_LIST + 'print(max(values))\n',
       ['5\n3 9 2 9 4', '3\n-5 -2 -9'],
       ['1\n42', '4\n0 0 0 0', '6\n1 2 3 4 5 6', '5\n-1 -1 -1 -1 0']),

    _c('count-above-average', 'How Many Beat the Average', ['array', 'math'],
       'Print how many values are strictly greater than the average of the list.\n\n'
       + IO_N_LIST + 'The count.\n\n'
       '**Example**\n\n```\ninput:\n5\n1 2 3 4 10\n\noutput:\n1\n```\n\n'
       'The average is 4, and only 10 beats it.',
       N_LIST + '\n# print how many beat the average\n',
       N_LIST + 'avg = sum(values) / len(values)\n'
       'print(sum(1 for v in values if v > avg))\n',
       ['5\n1 2 3 4 10', '4\n2 2 2 2'],
       ['1\n5', '6\n1 1 1 9 9 9', '3\n-3 0 3', '5\n100 1 1 1 1']),

    _c('reverse-a-list', 'Reverse a List', ['array'],
       'Print the values in reverse order, space-separated on one line.\n\n'
       + IO_N_LIST + 'The reversed values.\n\n'
       '**Example**\n\n```\ninput:\n4\n1 2 3 4\n\noutput:\n4 3 2 1\n```',
       N_LIST + '\n# print the values reversed\n',
       N_LIST + 'print(" ".join(map(str, values[::-1])))\n',
       ['4\n1 2 3 4', '3\n-1 0 1'],
       ['1\n7', '5\n5 4 3 2 1', '2\n9 9', '6\n1 2 3 4 5 6']),

    _c('fizzbuzz-line', 'FizzBuzz to N', ['math', 'string'],
       'For each number from 1 to `n`, print `Fizz` when it divides by 3, `Buzz` '
       'when it divides by 5, `FizzBuzz` when it divides by both, and the number '
       'otherwise. Print them space-separated on one line.\n\n'
       '**Input**\n\nOne integer `n`.\n\n**Output**\n\nThe sequence.\n\n'
       '**Example**\n\n```\ninput:\n5\n\noutput:\n1 2 Fizz 4 Buzz\n```',
       'n = int(input())\n\n# print the sequence\n',
       'n = int(input())\n'
       'out = []\n'
       'for i in range(1, n + 1):\n'
       '    if i % 15 == 0:\n        out.append("FizzBuzz")\n'
       '    elif i % 3 == 0:\n        out.append("Fizz")\n'
       '    elif i % 5 == 0:\n        out.append("Buzz")\n'
       '    else:\n        out.append(str(i))\n'
       'print(" ".join(out))\n',
       ['5', '15'],
       ['1', '3', '30', '7'],
       constraints='1 <= n <= 1000.'),

    _c('factorial-of-n', 'Factorial', ['math', 'recursion'],
       'Print `n!`, the product of every integer from 1 to `n`. `0!` is 1.\n\n'
       '**Input**\n\nOne integer `n`.\n\n**Output**\n\nThe factorial.\n\n'
       '**Example**\n\n```\ninput:\n5\n\noutput:\n120\n```',
       'n = int(input())\n\n# print n!\n',
       'n = int(input())\n'
       'result = 1\n'
       'for i in range(2, n + 1):\n    result *= i\n'
       'print(result)\n',
       ['5', '0'],
       ['1', '10', '20', '3'],
       constraints='0 <= n <= 100.'),

    _c('nth-fibonacci', 'Nth Fibonacci Number', ['math', 'dynamic-programming'],
       'The sequence starts 0, 1, and each later value is the sum of the two before '
       'it. Print the value at position `n`, counting from 0.\n\n'
       '**Input**\n\nOne integer `n`.\n\n**Output**\n\nThe value at that position.\n\n'
       '**Example**\n\n```\ninput:\n7\n\noutput:\n13\n```',
       'n = int(input())\n\n# print the nth Fibonacci number\n',
       'n = int(input())\n'
       'a, b = 0, 1\n'
       'for _ in range(n):\n    a, b = b, a + b\n'
       'print(a)\n',
       ['7', '0'],
       ['1', '10', '50', '2'],
       constraints='0 <= n <= 90.',
       hints=['Iterating is far faster than naive recursion.']),

    _c('is-prime', 'Is It Prime', ['math'],
       'Print `true` if the number is prime and `false` otherwise. A prime has '
       'exactly two divisors, 1 and itself, so 1 is not prime.\n\n'
       '**Input**\n\nOne integer `n`.\n\n**Output**\n\n`true` or `false`\n\n'
       '**Example**\n\n```\ninput:\n29\n\noutput:\ntrue\n```',
       'n = int(input())\n\n# print true or false\n',
       'n = int(input())\n'
       'prime = n > 1\n'
       'i = 2\n'
       'while i * i <= n:\n'
       '    if n % i == 0:\n        prime = False\n        break\n'
       '    i += 1\n'
       'print("true" if prime else "false")\n',
       ['29', '1'],
       ['2', '0', '100', '97', '9'],
       constraints='0 <= n <= 1000000.',
       hints=['Testing divisors up to the square root is enough.']),

    _c('gcd-of-two', 'Greatest Common Divisor', ['math'],
       'Print the largest integer that divides both values.\n\n'
       '**Input**\n\n- line 1: the first integer\n- line 2: the second\n\n'
       '**Output**\n\nTheir greatest common divisor.\n\n'
       '**Example**\n\n```\ninput:\n48\n18\n\noutput:\n6\n```',
       'a = int(input())\nb = int(input())\n\n# print the gcd\n',
       'a = int(input())\nb = int(input())\n'
       'while b:\n    a, b = b, a % b\n'
       'print(abs(a))\n',
       ['48\n18', '7\n13'],
       ['100\n10', '17\n17', '0\n5', '270\n192'],
       constraints='0 <= values <= 1000000.',
       hints=['Euclid: replace the pair with (b, a mod b) until b is zero.']),

    _c('count-words', 'Count the Words', ['string'],
       'Print how many words the line contains. Words are separated by one or more '
       'spaces.\n\n**Input**\n\nOne line of text.\n\n**Output**\n\nThe word count.\n\n'
       '**Example**\n\n```\ninput:\nthe quick brown fox\n\noutput:\n4\n```',
       's = input()\n\n# print the word count\n',
       's = input()\nprint(len(s.split()))\n',
       ['the quick brown fox', 'one'],
       ['a b  c   d', 'hello   world', 'x', 'many   spaces   between   words'],
       category='basics'),

    _c('title-case-words', 'Capitalise Each Word', ['string'],
       'Print the line with the first letter of every word in upper case and the '
       'rest in lower case. Words are separated by single spaces.\n\n'
       '**Input**\n\nOne line of text.\n\n**Output**\n\nThe capitalised line.\n\n'
       '**Example**\n\n```\ninput:\nhello wide world\n\noutput:\nHello Wide World\n```',
       's = input()\n\n# print the capitalised line\n',
       's = input()\n'
       'print(" ".join(w[:1].upper() + w[1:].lower() for w in s.split(" ")))\n',
       ['hello wide world', 'ALL CAPS HERE'],
       ['a', 'mIxEd CaSe WoRdS', 'one', 'the quick brown fox jumps'],
       category='basics'),

    _c('remove-duplicates-keep-order', 'Remove Duplicates, Keep Order',
       ['array', 'hash-map'],
       'Print the values with later duplicates removed, keeping the order of first '
       'appearance, space-separated.\n\n' + IO_N_LIST + 'The de-duplicated values.\n\n'
       '**Example**\n\n```\ninput:\n6\n3 1 3 2 1 4\n\noutput:\n3 1 2 4\n```',
       N_LIST + '\n# print the values without later duplicates\n',
       N_LIST + 'seen = set()\nout = []\n'
       'for v in values:\n'
       '    if v not in seen:\n        seen.add(v)\n        out.append(v)\n'
       'print(" ".join(map(str, out)))\n',
       ['6\n3 1 3 2 1 4', '4\n1 1 1 1'],
       ['1\n9', '5\n1 2 3 4 5', '6\n-1 -1 0 0 1 1', '3\n5 4 5']),

    _c('most-common-value', 'Most Common Value', ['array', 'hash-map'],
       'Print the value that appears most often. If several tie, print the smallest '
       'of them.\n\n' + IO_N_LIST + 'The most common value.\n\n'
       '**Example**\n\n```\ninput:\n7\n1 3 3 2 2 3 1\n\noutput:\n3\n```',
       N_LIST + '\n# print the most common value\n',
       N_LIST + 'counts = {}\n'
       'for v in values:\n    counts[v] = counts.get(v, 0) + 1\n'
       'best = max(counts, key=lambda v: (counts[v], -v))\n'
       'print(best)\n',
       ['7\n1 3 3 2 2 3 1', '4\n5 5 2 2'],
       ['1\n8', '5\n1 1 2 2 3', '6\n-1 -1 -2 -2 -3 -3', '3\n7 7 7']),

    _c('sum-of-digits', 'Sum of the Digits', ['math', 'string'],
       'Print the sum of the digits of a non-negative integer.\n\n'
       '**Input**\n\nOne integer.\n\n**Output**\n\nThe digit sum.\n\n'
       '**Example**\n\n```\ninput:\n9875\n\noutput:\n29\n```',
       'n = int(input())\n\n# print the sum of the digits\n',
       'n = int(input())\nprint(sum(int(d) for d in str(n)))\n',
       ['9875', '0'],
       ['1', '999999', '1000000', '12345'],
       category='basics'),

    _c('celsius-to-fahrenheit', 'Celsius to Fahrenheit', ['math'],
       'Convert a temperature from Celsius to Fahrenheit and print it rounded to one '
       'decimal place. The formula is F = C * 9 / 5 + 32.\n\n'
       '**Input**\n\nOne integer, the temperature in Celsius.\n\n'
       '**Output**\n\nThe temperature in Fahrenheit, to one decimal place.\n\n'
       '**Example**\n\n```\ninput:\n100\n\noutput:\n212.0\n```',
       'c = int(input())\n\n# print the temperature in Fahrenheit\n',
       'c = int(input())\nprint(f"{c * 9 / 5 + 32:.1f}")\n',
       ['100', '0'],
       ['-40', '37', '25', '-273'],
       category='basics'),

    _c('count-occurrences', 'Count Occurrences of a Value', ['array'],
       'Print how many times the target appears in the list.\n\n'
       '**Input**\n\n- line 1: `n`\n- line 2: `n` integers\n- line 3: the target\n\n'
       '**Output**\n\nThe count.\n\n'
       '**Example**\n\n```\ninput:\n6\n1 2 2 3 2 4\n2\n\noutput:\n3\n```',
       N_LIST + 'target = int(input())\n\n# print the count\n',
       N_LIST + 'target = int(input())\nprint(values.count(target))\n',
       ['6\n1 2 2 3 2 4\n2', '3\n1 2 3\n9'],
       ['1\n5\n5', '5\n0 0 0 0 0\n0', '4\n-1 -1 1 1\n-1', '3\n7 8 9\n8']),

    _c('swap-first-and-last', 'Swap the Ends', ['array'],
       'Print the list with its first and last values exchanged, space-separated. A '
       'list of one value is printed unchanged.\n\n'
       + IO_N_LIST + 'The list with the ends swapped.\n\n'
       '**Example**\n\n```\ninput:\n5\n1 2 3 4 5\n\noutput:\n5 2 3 4 1\n```',
       N_LIST + '\n# print the list with the ends swapped\n',
       N_LIST + 'if len(values) > 1:\n'
       '    values[0], values[-1] = values[-1], values[0]\n'
       'print(" ".join(map(str, values)))\n',
       ['5\n1 2 3 4 5', '1\n9'],
       ['2\n1 2', '3\n-1 0 1', '4\n7 7 7 8', '6\n1 2 3 4 5 6']),

    _c('running-totals', 'Running Totals', ['array', 'prefix-sum'],
       'Print the running total after each value, space-separated.\n\n'
       + IO_N_LIST + 'The running totals.\n\n'
       '**Example**\n\n```\ninput:\n4\n1 2 3 4\n\noutput:\n1 3 6 10\n```',
       N_LIST + '\n# print the running totals\n',
       N_LIST + 'total = 0\nout = []\n'
       'for v in values:\n    total += v\n    out.append(total)\n'
       'print(" ".join(map(str, out)))\n',
       ['4\n1 2 3 4', '3\n-1 -1 -1'],
       ['1\n5', '5\n1 0 1 0 1', '4\n10 -10 10 -10', '2\n100 200']),

    _c('longest-word', 'Longest Word', ['string'],
       'Print the longest word in the line. If several are equally long, print the '
       'first of them.\n\n**Input**\n\nOne line of text.\n\n'
       '**Output**\n\nThe longest word.\n\n'
       '**Example**\n\n```\ninput:\nthe quick brown foxes\n\noutput:\nquick\n```',
       's = input()\n\n# print the longest word\n',
       's = input()\n'
       'best = ""\n'
       'for w in s.split():\n'
       '    if len(w) > len(best):\n        best = w\n'
       'print(best)\n',
       ['the quick brown foxes', 'a bb ccc'],
       ['single', 'aa bb cc', 'x yy zzz wwww', 'equal equal'],
       category='basics'),

    _c('sort-a-list', 'Sort a List', ['array', 'sorting'],
       'Print the values in increasing order, space-separated.\n\n'
       + IO_N_LIST + 'The sorted values.\n\n'
       '**Example**\n\n```\ninput:\n5\n3 1 4 1 5\n\noutput:\n1 1 3 4 5\n```',
       N_LIST + '\n# print the sorted values\n',
       N_LIST + 'print(" ".join(map(str, sorted(values))))\n',
       ['5\n3 1 4 1 5', '3\n-1 -5 -3'],
       ['1\n0', '4\n4 3 2 1', '6\n1 1 1 1 1 1', '5\n100 -100 0 50 -50']),

    _c('missing-number-in-range', 'The Missing Number', ['array', 'math'],
       'The list holds every number from 0 to `n` except one. Print the missing '
       'number.\n\n' + IO_N_LIST + 'The missing number.\n\n'
       '**Example**\n\n```\ninput:\n3\n3 0 1\n\noutput:\n2\n```\n\n'
       'Here `n` is 3, so the numbers 0 to 3 should appear and 2 does not.',
       N_LIST + '\n# print the missing number\n',
       N_LIST + 'print(n * (n + 1) // 2 - sum(values))\n',
       ['3\n3 0 1', '2\n0 1'],
       ['1\n0', '1\n1', '5\n0 1 2 3 5', '4\n4 3 2 1'],
       hints=['The sum of 0..n is known, so subtract what you actually have.']),

    _c('char-frequency', 'Most Frequent Character', ['string', 'hash-map'],
       'Print the character that appears most often in the line, ignoring spaces. If '
       'several tie, print whichever comes first alphabetically.\n\n'
       '**Input**\n\nOne line of text.\n\n**Output**\n\nThe character.\n\n'
       '**Example**\n\n```\ninput:\nhello world\n\noutput:\nl\n```',
       's = input()\n\n# print the most frequent character\n',
       's = input()\n'
       'counts = {}\n'
       'for ch in s:\n'
       '    if ch != " ":\n        counts[ch] = counts.get(ch, 0) + 1\n'
       'print(max(sorted(counts), key=lambda c: counts[c]))\n',
       ['hello world', 'aabb'],
       ['abc', 'zzz', 'the quick brown fox', 'mississippi']),

    _c('power-of-two', 'Is It a Power of Two', ['math', 'bit-manipulation'],
       'Print `true` if the number is a power of two, and `false` otherwise. A power '
       'of two is 1, 2, 4, 8 and so on.\n\n'
       '**Input**\n\nOne integer.\n\n**Output**\n\n`true` or `false`\n\n'
       '**Example**\n\n```\ninput:\n16\n\noutput:\ntrue\n```',
       'n = int(input())\n\n# print true or false\n',
       'n = int(input())\n'
       'print("true" if n > 0 and n & (n - 1) == 0 else "false")\n',
       ['16', '18'],
       ['1', '0', '-4', '1024', '3'],
       hints=['A power of two has exactly one bit set.']),

    _c('merge-two-sorted', 'Merge Two Sorted Lists', ['array', 'two-pointers'],
       'Both lists are already sorted. Print the values of both, merged into one '
       'increasing sequence, space-separated.\n\n'
       '**Input**\n\n- line 1: `n`\n- line 2: `n` sorted integers\n'
       '- line 3: `m`\n- line 4: `m` sorted integers\n\n'
       '**Output**\n\nThe merged sequence.\n\n'
       '**Example**\n\n```\ninput:\n3\n1 3 5\n3\n2 4 6\n\noutput:\n1 2 3 4 5 6\n```',
       'n = int(input())\na = list(map(int, input().split()))\n'
       'm = int(input())\nb = list(map(int, input().split()))\n\n'
       '# print the merged sequence\n',
       'n = int(input())\na = list(map(int, input().split()))\n'
       'm = int(input())\nb = list(map(int, input().split()))\n'
       'out = []\ni = j = 0\n'
       'while i < len(a) and j < len(b):\n'
       '    if a[i] <= b[j]:\n        out.append(a[i]); i += 1\n'
       '    else:\n        out.append(b[j]); j += 1\n'
       'out.extend(a[i:]); out.extend(b[j:])\n'
       'print(" ".join(map(str, out)))\n',
       ['3\n1 3 5\n3\n2 4 6', '2\n1 2\n3\n3 4 5'],
       ['1\n1\n1\n1', '3\n-5 -3 -1\n2\n0 2', '1\n9\n3\n1 2 3',
        '4\n1 1 1 1\n2\n1 1'],
       hints=['Walk both lists with one index each, always taking the smaller head.']),

    _c('rotate-list-left', 'Rotate a List Left', ['array'],
       'Print the list rotated `k` places to the left, space-separated. Rotating left '
       'by one moves the first value to the end.\n\n'
       '**Input**\n\n- line 1: `n`\n- line 2: `n` integers\n- line 3: `k`\n\n'
       '**Output**\n\nThe rotated list.\n\n'
       '**Example**\n\n```\ninput:\n5\n1 2 3 4 5\n2\n\noutput:\n3 4 5 1 2\n```',
       N_LIST + 'k = int(input())\n\n# print the rotated list\n',
       N_LIST + 'k = int(input()) % len(values)\n'
       'print(" ".join(map(str, values[k:] + values[:k])))\n',
       ['5\n1 2 3 4 5\n2', '4\n1 2 3 4\n0'],
       ['1\n7\n3', '3\n1 2 3\n3', '4\n1 2 3 4\n5', '6\n1 2 3 4 5 6\n1'],
       hints=['k may exceed the length; take it modulo n.']),

    _c('count-even-and-odd', 'Count Even and Odd', ['array', 'math'],
       'Print how many values are even and how many are odd, separated by a space.\n\n'
       + IO_N_LIST + 'Two numbers: evens then odds.\n\n'
       '**Example**\n\n```\ninput:\n5\n1 2 3 4 5\n\noutput:\n2 3\n```',
       N_LIST + '\n# print the counts of even and odd\n',
       N_LIST + 'evens = sum(1 for v in values if v % 2 == 0)\n'
       'print(evens, len(values) - evens)\n',
       ['5\n1 2 3 4 5', '3\n2 4 6'],
       ['1\n0', '4\n-2 -1 0 1', '5\n1 1 1 1 1', '6\n2 2 2 3 3 3'],
       category='basics'),

    _c('string-contains-substring', 'Does It Contain That', ['string'],
       'Print `true` if the second line appears anywhere inside the first, and '
       '`false` otherwise.\n\n'
       '**Input**\n\n- line 1: the text\n- line 2: the thing to look for\n\n'
       '**Output**\n\n`true` or `false`\n\n'
       '**Example**\n\n```\ninput:\nprogramming\ngram\n\noutput:\ntrue\n```',
       'text = input()\nneedle = input()\n\n# print true or false\n',
       'text = input()\nneedle = input()\n'
       'print("true" if needle in text else "false")\n',
       ['programming\ngram', 'hello\nworld'],
       ['abc\nabc', 'abc\nd', 'aaa\naa', 'university\nsit'],
       category='basics'),

    _c('sum-of-range', 'Sum From A to B', ['math'],
       'Print the sum of every integer from `a` to `b` inclusive. `a` may be larger '
       'than `b`, in which case count downwards.\n\n'
       '**Input**\n\n- line 1: `a`\n- line 2: `b`\n\n**Output**\n\nThe sum.\n\n'
       '**Example**\n\n```\ninput:\n1\n5\n\noutput:\n15\n```',
       'a = int(input())\nb = int(input())\n\n# print the sum from a to b\n',
       'a = int(input())\nb = int(input())\n'
       'lo, hi = min(a, b), max(a, b)\n'
       'print(sum(range(lo, hi + 1)))\n',
       ['1\n5', '5\n1'],
       ['0\n0', '-3\n3', '10\n10', '-5\n-1'],
       category='basics'),

    _c('leap-year', 'Is It a Leap Year', ['math'],
       'A year is a leap year when it divides by 4, except years dividing by 100, '
       'unless they also divide by 400.\n\nPrint `true` or `false`.\n\n'
       '**Input**\n\nOne year.\n\n**Output**\n\n`true` or `false`\n\n'
       '**Example**\n\n```\ninput:\n2000\n\noutput:\ntrue\n```',
       'year = int(input())\n\n# print true or false\n',
       'year = int(input())\n'
       'leap = year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)\n'
       'print("true" if leap else "false")\n',
       ['2000', '1900'],
       ['2024', '2023', '1600', '2100'],
       category='basics'),

    _c('smallest-and-largest', 'Smallest and Largest', ['array'],
       'Print the smallest and largest values, separated by a space.\n\n'
       + IO_N_LIST + 'Two numbers: smallest then largest.\n\n'
       '**Example**\n\n```\ninput:\n5\n3 1 4 1 5\n\noutput:\n1 5\n```',
       N_LIST + '\n# print the smallest and largest\n',
       N_LIST + 'print(min(values), max(values))\n',
       ['5\n3 1 4 1 5', '1\n7'],
       ['2\n-1 1', '4\n0 0 0 0', '3\n-9 -5 -1', '6\n10 20 30 5 15 25']),

    _c('binary-to-decimal', 'Binary to Decimal', ['math', 'string'],
       'Read a string of 0s and 1s and print the number it represents in base ten.\n\n'
       '**Input**\n\nOne binary string.\n\n**Output**\n\nThe decimal value.\n\n'
       '**Example**\n\n```\ninput:\n1011\n\noutput:\n11\n```',
       's = input().strip()\n\n# print the decimal value\n',
       's = input().strip()\n'
       'total = 0\n'
       'for ch in s:\n    total = total * 2 + int(ch)\n'
       'print(total)\n',
       ['1011', '0'],
       ['1', '11111111', '10000000', '101010'],
       category='basics'),

    _c('decimal-to-binary', 'Decimal to Binary', ['math'],
       'Print the binary representation of a non-negative integer, with no leading '
       'zeros. Zero is printed as `0`.\n\n'
       '**Input**\n\nOne integer.\n\n**Output**\n\nThe binary string.\n\n'
       '**Example**\n\n```\ninput:\n11\n\noutput:\n1011\n```',
       'n = int(input())\n\n# print the binary representation\n',
       'n = int(input())\n'
       'if n == 0:\n    print(0)\n'
       'else:\n'
       '    bits = ""\n'
       '    while n:\n        bits = str(n % 2) + bits\n        n //= 2\n'
       '    print(bits)\n',
       ['11', '0'],
       ['1', '255', '128', '42'],
       category='basics'),

    _c('remove-vowels', 'Remove the Vowels', ['string'],
       'Print the line with every vowel removed. Vowels are a, e, i, o and u in '
       'either case.\n\n**Input**\n\nOne line of text.\n\n'
       '**Output**\n\nThe line without vowels.\n\n'
       '**Example**\n\n```\ninput:\nProgramming\n\noutput:\nPrgrmmng\n```',
       's = input()\n\n# print the line without vowels\n',
       's = input()\n'
       'print("".join(ch for ch in s if ch.lower() not in "aeiou"))\n',
       ['Programming', 'xyz'],
       # Inputs that are entirely vowels are excluded deliberately: the answer
       # would be the empty string, and a blank expected output passes for any
       # program that prints nothing.
       ['AEIOUb', 'aeioux', 'The quick brown fox', 'rhythm'],
       category='basics'),

    _c('sum-of-squares', 'Sum of Squares', ['math'],
       'Print the sum of the squares of every integer from 1 to `n`.\n\n'
       '**Input**\n\nOne integer `n`.\n\n**Output**\n\nThe sum.\n\n'
       '**Example**\n\n```\ninput:\n3\n\noutput:\n14\n```\n\n1 + 4 + 9 = 14.',
       'n = int(input())\n\n# print the sum of squares\n',
       'n = int(input())\nprint(sum(i * i for i in range(1, n + 1)))\n',
       ['3', '1'],
       ['0', '10', '100', '5'],
       category='basics'),

    _c('common-values', 'Values in Both Lists', ['array', 'hash-map'],
       'Print the values that appear in both lists, each once, in increasing order '
       'and space-separated. Print `none` if there are no such values.\n\n'
       '**Input**\n\n- line 1: `n`\n- line 2: `n` integers\n- line 3: `m`\n'
       '- line 4: `m` integers\n\n**Output**\n\nThe shared values, or `none`.\n\n'
       '**Example**\n\n```\ninput:\n4\n1 2 3 4\n3\n2 4 6\n\noutput:\n2 4\n```',
       'n = int(input())\na = list(map(int, input().split()))\n'
       'm = int(input())\nb = list(map(int, input().split()))\n\n'
       '# print the shared values, or none\n',
       'n = int(input())\na = list(map(int, input().split()))\n'
       'm = int(input())\nb = list(map(int, input().split()))\n'
       'shared = sorted(set(a) & set(b))\n'
       'print(" ".join(map(str, shared)) if shared else "none")\n',
       ['4\n1 2 3 4\n3\n2 4 6', '2\n1 2\n2\n3 4'],
       ['1\n5\n1\n5', '3\n1 1 2\n2\n1 1', '3\n-1 0 1\n3\n1 0 -1',
        '2\n7 8\n2\n9 10']),

    _c('trim-and-length', 'Length Without Spaces', ['string'],
       'Print how many characters the line has once every space is removed.\n\n'
       '**Input**\n\nOne line of text.\n\n**Output**\n\nThe count.\n\n'
       '**Example**\n\n```\ninput:\na b c\n\noutput:\n3\n```',
       's = input()\n\n# print the length without spaces\n',
       's = input()\nprint(len(s.replace(" ", "")))\n',
       ['a b c', 'nospaces'],
       ['   ', 'x', 'the quick brown fox', 'a  b  c  d'],
       category='basics'),

    _c('average-to-two-places', 'Average to Two Places', ['array', 'math'],
       'Print the average of the values, rounded to two decimal places.\n\n'
       + IO_N_LIST + 'The average, to two decimal places.\n\n'
       '**Example**\n\n```\ninput:\n4\n1 2 3 5\n\noutput:\n2.75\n```',
       N_LIST + '\n# print the average to two decimal places\n',
       N_LIST + 'print(f"{sum(values) / len(values):.2f}")\n',
       ['4\n1 2 3 5', '1\n7'],
       ['3\n1 1 1', '2\n-1 1', '5\n10 20 30 40 50', '3\n1 2 4']),

    _c('first-non-repeating', 'First Value That Appears Once',
       ['array', 'hash-map'],
       'Print the first value in the list that appears exactly once. Print `none` if '
       'every value repeats.\n\n' + IO_N_LIST + 'The value, or `none`.\n\n'
       '**Example**\n\n```\ninput:\n6\n2 3 2 4 3 5\n\noutput:\n4\n```',
       N_LIST + '\n# print the first value appearing once, or none\n',
       N_LIST + 'counts = {}\n'
       'for v in values:\n    counts[v] = counts.get(v, 0) + 1\n'
       'answer = "none"\n'
       'for v in values:\n'
       '    if counts[v] == 1:\n        answer = v\n        break\n'
       'print(answer)\n',
       ['6\n2 3 2 4 3 5', '4\n1 1 2 2'],
       ['1\n9', '5\n5 5 5 5 1', '3\n1 2 1', '6\n-1 -1 -2 -3 -2 -4']),

    _c('is-sorted', 'Is the List Sorted', ['array'],
       'Print `true` if the values are in non-decreasing order, and `false` '
       'otherwise.\n\n' + IO_N_LIST + '`true` or `false`\n\n'
       '**Example**\n\n```\ninput:\n4\n1 2 2 5\n\noutput:\ntrue\n```',
       N_LIST + '\n# print true or false\n',
       N_LIST + 'ok = all(values[i] <= values[i + 1] for i in range(len(values) - 1))\n'
       'print("true" if ok else "false")\n',
       ['4\n1 2 2 5', '3\n3 1 2'],
       ['1\n5', '2\n2 1', '5\n-5 -4 -3 -2 -1', '4\n1 1 1 1']),

    _c('sum-two-largest', 'Sum of the Two Largest', ['array'],
       'Print the sum of the two largest values. The same position cannot be used '
       'twice, but equal values in different positions may both be used.\n\n'
       + IO_N_LIST + 'The sum.\n\n'
       '**Example**\n\n```\ninput:\n5\n1 9 3 9 2\n\noutput:\n18\n```',
       N_LIST + '\n# print the sum of the two largest\n',
       N_LIST + 'ordered = sorted(values, reverse=True)\n'
       'print(ordered[0] + ordered[1])\n',
       ['5\n1 9 3 9 2', '2\n4 6'],
       ['3\n-5 -1 -3', '4\n0 0 0 1', '5\n10 10 10 10 10', '3\n1 2 3'],
       constraints='2 <= n <= 100000.'),

    _c('repeat-a-string', 'Repeat a String', ['string'],
       'Print the word repeated `k` times with no separator.\n\n'
       '**Input**\n\n- line 1: the word\n- line 2: `k`\n\n'
       '**Output**\n\nThe repeated string.\n\n'
       '**Example**\n\n```\ninput:\nab\n3\n\noutput:\nababab\n```',
       'word = input().strip()\nk = int(input())\n\n# print the repeated string\n',
       'word = input().strip()\nk = int(input())\nprint(word * k)\n',
       ['ab\n3', 'x\n1'],
       ['hello\n2', 'a\n10', 'xyz\n4', 'q\n5'],
       constraints='1 <= k <= 100.', category='basics'),

    _c('count-divisors', 'How Many Divisors', ['math'],
       'Print how many positive integers divide `n` exactly.\n\n'
       '**Input**\n\nOne positive integer `n`.\n\n**Output**\n\nThe count.\n\n'
       '**Example**\n\n```\ninput:\n12\n\noutput:\n6\n```\n\n'
       '1, 2, 3, 4, 6 and 12 all divide 12.',
       'n = int(input())\n\n# print the number of divisors\n',
       'n = int(input())\n'
       'count = 0\ni = 1\n'
       'while i * i <= n:\n'
       '    if n % i == 0:\n'
       '        count += 2 if i * i != n else 1\n'
       '    i += 1\n'
       'print(count)\n',
       ['12', '1'],
       ['16', '97', '100', '36'],
       constraints='1 <= n <= 1000000.',
       hints=['Divisors pair up around the square root.']),

    _c('capitalise-alternate', 'Alternate the Case', ['string'],
       'Print the line with characters at even positions in upper case and odd '
       'positions in lower case. Positions are counted from 0.\n\n'
       '**Input**\n\nOne line of text.\n\n**Output**\n\nThe transformed line.\n\n'
       '**Example**\n\n```\ninput:\nhello\n\noutput:\nHeLlO\n```',
       's = input()\n\n# print the alternating-case line\n',
       's = input()\n'
       'print("".join(ch.upper() if i % 2 == 0 else ch.lower()\n'
       '              for i, ch in enumerate(s)))\n',
       ['hello', 'a'],
       ['ABCDEF', 'xyz', 'programming', 'Ab Cd']),

    _c('sum-of-list-of-lists', 'Total Across Rows', ['array'],
       'Read `r` rows, each with `c` integers, and print the total of every value.\n\n'
       '**Input**\n\n- line 1: `r` and `c`, space-separated\n'
       '- next `r` lines: `c` integers each\n\n**Output**\n\nThe total.\n\n'
       '**Example**\n\n```\ninput:\n2 3\n1 2 3\n4 5 6\n\noutput:\n21\n```',
       'r, c = map(int, input().split())\nrows = [list(map(int, input().split()))'
       ' for _ in range(r)]\n\n# print the total\n',
       'r, c = map(int, input().split())\n'
       'total = 0\n'
       'for _ in range(r):\n    total += sum(map(int, input().split()))\n'
       'print(total)\n',
       ['2 3\n1 2 3\n4 5 6', '1 1\n7'],
       ['3 2\n1 1\n2 2\n3 3', '2 2\n-1 -1\n1 1', '1 4\n10 20 30 40',
        '3 3\n0 0 0\n0 0 0\n0 0 1']),

    _c('nearest-to-zero', 'Nearest to Zero', ['array'],
       'Print the value closest to zero. If a positive and a negative value are '
       'equally close, print the positive one.\n\n'
       + IO_N_LIST + 'The value nearest zero.\n\n'
       '**Example**\n\n```\ninput:\n5\n-4 2 -2 7 9\n\noutput:\n2\n```',
       N_LIST + '\n# print the value nearest zero\n',
       N_LIST + 'print(min(values, key=lambda v: (abs(v), -v)))\n',
       ['5\n-4 2 -2 7 9', '3\n5 6 7'],
       ['1\n0', '2\n-1 1', '4\n-10 -20 -30 -5', '3\n100 -1 50']),

    _c('longest-run-of-same', 'Longest Run of the Same Value', ['array'],
       'Print the length of the longest run of equal values sitting next to each '
       'other.\n\n' + IO_N_LIST + 'The length of the longest run.\n\n'
       '**Example**\n\n```\ninput:\n7\n1 2 2 2 3 3 1\n\noutput:\n3\n```',
       N_LIST + '\n# print the longest run length\n',
       N_LIST + 'best = run = 1\n'
       'for i in range(1, len(values)):\n'
       '    run = run + 1 if values[i] == values[i - 1] else 1\n'
       '    best = max(best, run)\n'
       'print(best)\n',
       ['7\n1 2 2 2 3 3 1', '4\n1 2 3 4'],
       ['1\n9', '5\n7 7 7 7 7', '6\n1 1 2 2 2 2', '3\n-1 -1 0']),
]
