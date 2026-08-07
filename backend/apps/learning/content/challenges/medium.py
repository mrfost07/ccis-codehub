"""
Medium coding challenges.

Same conventions as the easy set: inputs and a reference solution only, expected
outputs computed by execution at seed time, hidden inputs doing the anti-cheat
work. Statements are written for this platform.

Medium here means the student has to choose a technique — a hash map, two
pointers, a sort, a stack, a scan with state — rather than translate the
statement directly into code.
"""


def _c(slug, title, tags, description, starter, solution, visible, hidden,
       constraints='', hints=(), category='algorithms'):
    return {
        'slug': slug, 'title': title, 'difficulty': 'medium', 'category': category,
        'tags': list(tags), 'description': description, 'constraints': constraints,
        'hints': list(hints), 'starter': starter, 'solution': solution,
        'visible': visible, 'hidden': hidden,
    }


N_LIST = 'n = int(input())\nvalues = list(map(int, input().split()))\n'
IO_N_LIST = ('**Input**\n\n- line 1: `n`\n- line 2: `n` space-separated integers\n\n'
             '**Output**\n\n')

CHALLENGES = [
    _c('longest-unique-window', 'Longest Stretch Without a Repeat',
       ['string', 'sliding-window', 'hash-map'],
       'Print the length of the longest stretch of consecutive characters in which '
       'no character repeats.\n\n**Input**\n\nOne line of text.\n\n'
       '**Output**\n\nThe length.\n\n'
       '**Example**\n\n```\ninput:\nabcabcbb\n\noutput:\n3\n```\n\n'
       'The stretch `abc` has no repeat, and nothing longer does.',
       's = input().strip()\n\n# print the length\n',
       's = input().strip()\n'
       'last = {}\nstart = best = 0\n'
       'for i, ch in enumerate(s):\n'
       '    if ch in last and last[ch] >= start:\n        start = last[ch] + 1\n'
       '    last[ch] = i\n'
       '    best = max(best, i - start + 1)\n'
       'print(best)\n',
       ['abcabcbb', 'bbbbb'],
       ['pwwkew', 'a', 'abcdef', 'aab', 'dvdf'],
       constraints='1 <= length <= 100000.',
       hints=['Keep a window and move its left edge past the previous copy.']),

    _c('group-the-anagrams', 'Group the Anagrams', ['string', 'hash-map', 'sorting'],
       'Group the words that are anagrams of each other. Print one group per line: '
       'the words of a group in the order they appeared, space-separated. Order the '
       'groups by the word that opened each one.\n\n'
       '**Input**\n\n- line 1: `n`\n- line 2: `n` space-separated lowercase words\n\n'
       '**Output**\n\nOne line per group.\n\n'
       '**Example**\n\n```\ninput:\n6\neat tea tan ate nat bat\n\n'
       'output:\neat tea ate\ntan nat\nbat\n```',
       'n = int(input())\nwords = input().split()\n\n# print one group per line\n',
       'n = int(input())\nwords = input().split()\n'
       'groups = {}\norder = []\n'
       'for w in words:\n'
       '    key = "".join(sorted(w))\n'
       '    if key not in groups:\n        groups[key] = []\n        order.append(key)\n'
       '    groups[key].append(w)\n'
       'for key in order:\n    print(" ".join(groups[key]))\n',
       ['6\neat tea tan ate nat bat', '3\nabc bca cab'],
       ['1\nsolo', '4\na b a b', '5\nlisten silent enlist inlets google',
        '3\nxy yx zz']),

    _c('k-most-frequent', 'The K Most Frequent Values', ['array', 'hash-map', 'sorting'],
       'Print the `k` values that appear most often, space-separated, most frequent '
       'first. Break ties by the smaller value first.\n\n'
       '**Input**\n\n- line 1: `n`\n- line 2: `n` integers\n- line 3: `k`\n\n'
       '**Output**\n\nThe `k` values.\n\n'
       '**Example**\n\n```\ninput:\n6\n1 1 1 2 2 3\n2\n\noutput:\n1 2\n```',
       N_LIST + 'k = int(input())\n\n# print the k most frequent values\n',
       N_LIST + 'k = int(input())\n'
       'counts = {}\n'
       'for v in values:\n    counts[v] = counts.get(v, 0) + 1\n'
       'ordered = sorted(counts, key=lambda v: (-counts[v], v))\n'
       'print(" ".join(map(str, ordered[:k])))\n',
       ['6\n1 1 1 2 2 3\n2', '1\n5\n1'],
       ['5\n1 2 3 4 5\n3', '6\n-1 -1 2 2 3 3\n2', '4\n7 7 7 7\n1',
        '7\n1 1 2 2 3 3 4\n4']),

    _c('product-except-self', 'Product of Everything Else', ['array', 'prefix-sum'],
       'For each position, print the product of every value except the one at that '
       'position, space-separated. Solve it without division.\n\n'
       + IO_N_LIST + 'The products.\n\n'
       '**Example**\n\n```\ninput:\n4\n1 2 3 4\n\noutput:\n24 12 8 6\n```',
       N_LIST + '\n# print the products\n',
       N_LIST + 'n = len(values)\n'
       'out = [1] * n\n'
       'running = 1\n'
       'for i in range(n):\n    out[i] = running\n    running *= values[i]\n'
       'running = 1\n'
       'for i in range(n - 1, -1, -1):\n    out[i] *= running\n    running *= values[i]\n'
       'print(" ".join(map(str, out)))\n',
       ['4\n1 2 3 4', '3\n2 3 4'],
       ['2\n5 6', '4\n1 0 3 4', '5\n-1 1 -1 1 -1', '3\n0 0 5'],
       constraints='2 <= n <= 100000.',
       hints=['Sweep once from the left carrying the running product, then once '
              'from the right.']),

    _c('best-buy-and-sell', 'Best Single Buy and Sell', ['array', 'greedy'],
       'The values are prices on consecutive days. Buy on one day and sell on a '
       'later one. Print the largest profit possible, or `0` if no trade makes a '
       'profit.\n\n' + IO_N_LIST + 'The largest profit.\n\n'
       '**Example**\n\n```\ninput:\n6\n7 1 5 3 6 4\n\noutput:\n5\n```\n\n'
       'Buy at 1 and sell at 6.',
       N_LIST + '\n# print the largest profit\n',
       N_LIST + 'cheapest = values[0]\nbest = 0\n'
       'for price in values[1:]:\n'
       '    best = max(best, price - cheapest)\n'
       '    cheapest = min(cheapest, price)\n'
       'print(best)\n',
       ['6\n7 1 5 3 6 4', '5\n7 6 4 3 1'],
       ['1\n5', '2\n1 2', '4\n2 4 1 7', '5\n3 3 3 3 3'],
       hints=['Track the cheapest price seen so far as you go.']),

    _c('move-zeros-to-end', 'Move the Zeros to the End', ['array', 'two-pointers'],
       'Print the values with every zero moved to the end, the non-zero values '
       'keeping their relative order, space-separated.\n\n'
       + IO_N_LIST + 'The rearranged values.\n\n'
       '**Example**\n\n```\ninput:\n5\n0 1 0 3 12\n\noutput:\n1 3 12 0 0\n```',
       N_LIST + '\n# print the rearranged values\n',
       N_LIST + 'nonzero = [v for v in values if v != 0]\n'
       'zeros = [0] * (len(values) - len(nonzero))\n'
       'print(" ".join(map(str, nonzero + zeros)))\n',
       ['5\n0 1 0 3 12', '1\n0'],
       ['3\n1 2 3', '4\n0 0 0 0', '5\n0 0 1 0 2', '3\n-1 0 -2']),

    _c('valid-sudoku-row', 'Are the Rows Valid', ['array', 'hash-map'],
       'Read a 9 by 9 grid of digits where `0` means an empty cell. Print `true` if '
       'no row contains the same non-zero digit twice, and `false` otherwise.\n\n'
       '**Input**\n\nNine lines of nine space-separated digits.\n\n'
       '**Output**\n\n`true` or `false`\n\n'
       'Only rows need checking, not columns or boxes.',
       'rows = [list(map(int, input().split())) for _ in range(9)]\n\n'
       '# print true or false\n',
       'ok = True\n'
       'for _ in range(9):\n'
       '    row = [v for v in map(int, input().split()) if v != 0]\n'
       '    if len(set(row)) != len(row):\n        ok = False\n'
       'print("true" if ok else "false")\n',
       ['1 2 3 4 5 6 7 8 9\n0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n'
        '0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n'
        '0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0',
        '1 1 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n'
        '0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n'
        '0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0'],
       ['0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n'
        '0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n'
        '0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 9',
        '9 8 7 6 5 4 3 2 1\n1 2 3 4 5 6 7 8 9\n0 0 0 0 0 0 0 0 0\n'
        '0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n'
        '0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0',
        '0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n'
        '0 0 0 0 0 0 0 0 0\n5 0 0 0 0 0 0 0 5\n0 0 0 0 0 0 0 0 0\n'
        '0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0']),

    _c('rotate-matrix', 'Rotate a Square Grid', ['matrix', 'array'],
       'Rotate an `n` by `n` grid a quarter turn clockwise and print it, one row per '
       'line, values space-separated.\n\n'
       '**Input**\n\n- line 1: `n`\n- next `n` lines: `n` integers each\n\n'
       '**Output**\n\nThe rotated grid.\n\n'
       '**Example**\n\n```\ninput:\n2\n1 2\n3 4\n\noutput:\n3 1\n4 2\n```',
       'n = int(input())\ngrid = [list(map(int, input().split())) for _ in range(n)]\n\n'
       '# print the rotated grid\n',
       'n = int(input())\n'
       'grid = [list(map(int, input().split())) for _ in range(n)]\n'
       'for row in zip(*grid[::-1]):\n    print(" ".join(map(str, row)))\n',
       ['2\n1 2\n3 4', '1\n7'],
       ['3\n1 2 3\n4 5 6\n7 8 9', '2\n0 0\n0 1', '3\n1 1 1\n2 2 2\n3 3 3',
        '4\n1 2 3 4\n5 6 7 8\n9 10 11 12\n13 14 15 16']),

    _c('spiral-order', 'Read a Grid in a Spiral', ['matrix', 'array'],
       'Print every value of an `r` by `c` grid in spiral order — left to right along '
       'the top, down the right side, right to left along the bottom, up the left '
       'side, and inwards — space-separated on one line.\n\n'
       '**Input**\n\n- line 1: `r` and `c`\n- next `r` lines: `c` integers each\n\n'
       '**Output**\n\nThe values in spiral order.\n\n'
       '**Example**\n\n```\ninput:\n3 3\n1 2 3\n4 5 6\n7 8 9\n\n'
       'output:\n1 2 3 6 9 8 7 4 5\n```',
       'r, c = map(int, input().split())\n'
       'grid = [list(map(int, input().split())) for _ in range(r)]\n\n'
       '# print the values in spiral order\n',
       'r, c = map(int, input().split())\n'
       'grid = [list(map(int, input().split())) for _ in range(r)]\n'
       'out = []\n'
       'top, bottom, left, right = 0, r - 1, 0, c - 1\n'
       'while top <= bottom and left <= right:\n'
       '    for j in range(left, right + 1):\n        out.append(grid[top][j])\n'
       '    top += 1\n'
       '    for i in range(top, bottom + 1):\n        out.append(grid[i][right])\n'
       '    right -= 1\n'
       '    if top <= bottom:\n'
       '        for j in range(right, left - 1, -1):\n            out.append(grid[bottom][j])\n'
       '        bottom -= 1\n'
       '    if left <= right:\n'
       '        for i in range(bottom, top - 1, -1):\n            out.append(grid[i][left])\n'
       '        left += 1\n'
       'print(" ".join(map(str, out)))\n',
       ['3 3\n1 2 3\n4 5 6\n7 8 9', '1 4\n1 2 3 4'],
       ['4 1\n1\n2\n3\n4', '2 3\n1 2 3\n4 5 6', '1 1\n9',
        '3 2\n1 2\n3 4\n5 6']),

    _c('longest-common-prefix', 'Longest Common Prefix', ['string'],
       'Print the longest starting sequence of characters shared by every word. '
       'Print `none` if they share nothing.\n\n'
       '**Input**\n\n- line 1: `n`\n- line 2: `n` space-separated words\n\n'
       '**Output**\n\nThe shared prefix, or `none`.\n\n'
       '**Example**\n\n```\ninput:\n3\nflower flow flight\n\noutput:\nfl\n```',
       'n = int(input())\nwords = input().split()\n\n'
       '# print the shared prefix, or none\n',
       'n = int(input())\nwords = input().split()\n'
       'prefix = words[0]\n'
       'for w in words[1:]:\n'
       '    while not w.startswith(prefix):\n        prefix = prefix[:-1]\n'
       'print(prefix if prefix else "none")\n',
       ['3\nflower flow flight', '3\ndog racecar car'],
       ['1\nalone', '2\nsame same', '4\nab abc abcd abcde', '2\nprefix pre']),

    _c('sum-of-three-zero', 'Do Three Values Sum to Zero', ['array', 'two-pointers'],
       'Print `true` if any three values at different positions add up to zero, and '
       '`false` otherwise.\n\n' + IO_N_LIST + '`true` or `false`\n\n'
       '**Example**\n\n```\ninput:\n6\n-1 0 1 2 -1 -4\n\noutput:\ntrue\n```',
       N_LIST + '\n# print true or false\n',
       N_LIST + 'values.sort()\nfound = False\n'
       'for i in range(len(values) - 2):\n'
       '    lo, hi = i + 1, len(values) - 1\n'
       '    while lo < hi:\n'
       '        total = values[i] + values[lo] + values[hi]\n'
       '        if total == 0:\n            found = True\n            break\n'
       '        if total < 0:\n            lo += 1\n'
       '        else:\n            hi -= 1\n'
       '    if found:\n        break\n'
       'print("true" if found else "false")\n',
       ['6\n-1 0 1 2 -1 -4', '3\n1 2 3'],
       ['3\n0 0 0', '4\n-5 1 4 2', '5\n1 1 1 1 1', '4\n-2 -1 3 5'],
       constraints='3 <= n <= 2000.',
       hints=['Sort first, then for each value walk two pointers inwards.']),

    _c('container-with-most-water', 'Widest Water Between Two Walls',
       ['array', 'two-pointers', 'greedy'],
       'The values are wall heights standing one unit apart. Choose two walls so the '
       'water held between them is greatest — the width times the shorter wall — and '
       'print that amount.\n\n' + IO_N_LIST + 'The greatest amount.\n\n'
       '**Example**\n\n```\ninput:\n9\n1 8 6 2 5 4 8 3 7\n\noutput:\n49\n```',
       N_LIST + '\n# print the greatest amount\n',
       N_LIST + 'lo, hi, best = 0, len(values) - 1, 0\n'
       'while lo < hi:\n'
       '    best = max(best, (hi - lo) * min(values[lo], values[hi]))\n'
       '    if values[lo] < values[hi]:\n        lo += 1\n'
       '    else:\n        hi -= 1\n'
       'print(best)\n',
       ['9\n1 8 6 2 5 4 8 3 7', '2\n1 1'],
       ['3\n1 2 1', '4\n4 3 2 1', '5\n1 2 4 3 2', '2\n0 5'],
       constraints='2 <= n <= 100000.',
       hints=['Start at both ends and always move the shorter wall inwards.']),

    _c('subarray-with-sum-k', 'How Many Runs Sum to K',
       ['array', 'hash-map', 'prefix-sum'],
       'Print how many contiguous runs of values add up to `k`.\n\n'
       '**Input**\n\n- line 1: `n`\n- line 2: `n` integers\n- line 3: `k`\n\n'
       '**Output**\n\nThe number of runs.\n\n'
       '**Example**\n\n```\ninput:\n3\n1 1 1\n2\n\noutput:\n2\n```',
       N_LIST + 'k = int(input())\n\n# print how many runs sum to k\n',
       N_LIST + 'k = int(input())\n'
       'seen = {0: 1}\ntotal = count = 0\n'
       'for v in values:\n'
       '    total += v\n'
       '    count += seen.get(total - k, 0)\n'
       '    seen[total] = seen.get(total, 0) + 1\n'
       'print(count)\n',
       ['3\n1 1 1\n2', '4\n1 2 3 4\n10'],
       ['1\n5\n5', '5\n1 -1 1 -1 1\n0', '4\n0 0 0 0\n0', '3\n-1 -1 -1\n-2'],
       hints=['Running totals: a run summing to k exists wherever total minus k '
              'has been seen before.']),

    _c('sort-colours', 'Sort Three Colours', ['array', 'two-pointers', 'sorting'],
       'The values are only 0, 1 and 2. Print them sorted in one pass, space-'
       'separated.\n\n' + IO_N_LIST + 'The sorted values.\n\n'
       '**Example**\n\n```\ninput:\n6\n2 0 2 1 1 0\n\noutput:\n0 0 1 1 2 2\n```',
       N_LIST + '\n# print the sorted values\n',
       N_LIST + 'counts = [0, 0, 0]\n'
       'for v in values:\n    counts[v] += 1\n'
       'out = [0] * counts[0] + [1] * counts[1] + [2] * counts[2]\n'
       'print(" ".join(map(str, out)))\n',
       ['6\n2 0 2 1 1 0', '2\n2 1'],
       ['1\n0', '3\n0 0 0', '5\n2 2 2 2 2', '4\n1 0 2 1']),

    _c('word-frequency-top', 'Most Frequent Word', ['string', 'hash-map'],
       'Print the word that appears most often in the line. Compare case-'
       'insensitively and print the word in lower case. If several tie, print '
       'whichever comes first alphabetically.\n\n'
       '**Input**\n\nOne line of words separated by spaces.\n\n'
       '**Output**\n\nThe most frequent word.\n\n'
       '**Example**\n\n```\ninput:\nthe cat the dog THE bird\n\noutput:\nthe\n```',
       's = input()\n\n# print the most frequent word\n',
       's = input()\n'
       'counts = {}\n'
       'for w in s.lower().split():\n    counts[w] = counts.get(w, 0) + 1\n'
       'print(min(sorted(counts), key=lambda w: -counts[w]))\n',
       ['the cat the dog THE bird', 'one two two'],
       ['solo', 'a b a b', 'x Y x y X', 'apple banana apple banana cherry']),

    _c('merge-overlapping-ranges', 'Merge Overlapping Ranges',
       ['array', 'sorting', 'greedy'],
       'Each range is a start and an end. Merge every pair that overlaps or touches, '
       'and print the results in increasing order — one range per line, start and '
       'end space-separated.\n\n'
       '**Input**\n\n- line 1: `n`\n- next `n` lines: two integers, start and end\n\n'
       '**Output**\n\nThe merged ranges.\n\n'
       '**Example**\n\n```\ninput:\n4\n1 3\n2 6\n8 10\n15 18\n\n'
       'output:\n1 6\n8 10\n15 18\n```',
       'n = int(input())\n'
       'ranges = [tuple(map(int, input().split())) for _ in range(n)]\n\n'
       '# print the merged ranges\n',
       'n = int(input())\n'
       'ranges = sorted(tuple(map(int, input().split())) for _ in range(n))\n'
       'merged = [list(ranges[0])]\n'
       'for start, end in ranges[1:]:\n'
       '    if start <= merged[-1][1]:\n'
       '        merged[-1][1] = max(merged[-1][1], end)\n'
       '    else:\n        merged.append([start, end])\n'
       'for start, end in merged:\n    print(start, end)\n',
       ['4\n1 3\n2 6\n8 10\n15 18', '2\n1 4\n4 5'],
       ['1\n5 7', '3\n1 10\n2 3\n4 5', '3\n5 6\n1 2\n3 4', '2\n1 2\n3 4'],
       hints=['Sort by start, then extend the last merged range or begin a new one.']),

    _c('level-of-nesting', 'Deepest Bracket Nesting', ['string', 'stack'],
       'Print how deeply the brackets nest at their deepest point. A string with no '
       'brackets has depth 0.\n\n'
       '**Input**\n\nOne line containing `(` and `)` and other characters.\n\n'
       '**Output**\n\nThe greatest depth.\n\n'
       '**Example**\n\n```\ninput:\n(1+(2*3)+((8)/4))+1\n\noutput:\n3\n```',
       's = input()\n\n# print the greatest depth\n',
       's = input()\n'
       'depth = best = 0\n'
       'for ch in s:\n'
       '    if ch == "(":\n        depth += 1\n        best = max(best, depth)\n'
       '    elif ch == ")":\n        depth -= 1\n'
       'print(best)\n',
       ['(1+(2*3)+((8)/4))+1', 'abc'],
       ['()', '((((()))))', '(a)(b)(c)', '(()())']),

    _c('decode-run-length', 'Expand a Run-Length Code', ['string'],
       'A run-length code alternates a character and a count, such as `a3b2`. Print '
       'the expanded string.\n\n'
       '**Input**\n\nOne encoded line.\n\n**Output**\n\nThe expanded string.\n\n'
       '**Example**\n\n```\ninput:\na3b2c1\n\noutput:\naaabbc\n```',
       's = input().strip()\n\n# print the expanded string\n',
       's = input().strip()\n'
       'out = []\ni = 0\n'
       'while i < len(s):\n'
       '    ch = s[i]\n    i += 1\n    num = ""\n'
       '    while i < len(s) and s[i].isdigit():\n        num += s[i]\n        i += 1\n'
       '    out.append(ch * int(num))\n'
       'print("".join(out))\n',
       ['a3b2c1', 'x1'],
       ['a10', 'z2y2', 'q1w1e1', 'm5']),

    _c('two-lists-median', 'Median of Two Lists', ['array', 'sorting', 'math'],
       'Print the median of all the values from both lists combined, to one decimal '
       'place. With an even count the median is the mean of the middle two.\n\n'
       '**Input**\n\n- line 1: `n`\n- line 2: `n` integers\n- line 3: `m`\n'
       '- line 4: `m` integers\n\n**Output**\n\nThe median, to one decimal place.\n\n'
       '**Example**\n\n```\ninput:\n2\n1 3\n1\n2\n\noutput:\n2.0\n```',
       'n = int(input())\na = list(map(int, input().split()))\n'
       'm = int(input())\nb = list(map(int, input().split()))\n\n'
       '# print the median to one decimal place\n',
       'n = int(input())\na = list(map(int, input().split()))\n'
       'm = int(input())\nb = list(map(int, input().split()))\n'
       'all_values = sorted(a + b)\n'
       'k = len(all_values)\n'
       'mid = all_values[k // 2] if k % 2 else (all_values[k // 2 - 1] + all_values[k // 2]) / 2\n'
       'print(f"{mid:.1f}")\n',
       ['2\n1 3\n1\n2', '2\n1 2\n2\n3 4'],
       ['1\n1\n1\n1', '3\n1 2 3\n2\n4 5', '1\n5\n3\n1 2 3', '2\n-1 1\n2\n-2 2']),

    _c('climb-stairs-ways', 'Ways Up the Stairs', ['dynamic-programming', 'math'],
       'You climb either one or two steps at a time. Print how many different ways '
       'there are to reach step `n`.\n\n'
       '**Input**\n\nOne integer `n`.\n\n**Output**\n\nThe number of ways.\n\n'
       '**Example**\n\n```\ninput:\n4\n\noutput:\n5\n```',
       'n = int(input())\n\n# print the number of ways\n',
       'n = int(input())\n'
       'a, b = 1, 1\n'
       'for _ in range(n):\n    a, b = b, a + b\n'
       'print(a)\n',
       ['4', '1'],
       ['0', '2', '10', '30'],
       constraints='0 <= n <= 80.',
       hints=['The count for step n is the count for n-1 plus the count for n-2.']),

    _c('house-robber-line', 'Take Without Taking Neighbours',
       ['dynamic-programming', 'array'],
       'Choose values to take so that no two chosen values sit next to each other, '
       'and print the largest total you can take.\n\n'
       + IO_N_LIST + 'The largest total.\n\n'
       '**Example**\n\n```\ninput:\n4\n1 2 3 1\n\noutput:\n4\n```\n\n'
       'Take 1 and 3.',
       N_LIST + '\n# print the largest total\n',
       N_LIST + 'take, skip = 0, 0\n'
       'for v in values:\n    take, skip = skip + v, max(skip, take)\n'
       'print(max(take, skip))\n',
       ['4\n1 2 3 1', '5\n2 7 9 3 1'],
       ['1\n5', '2\n1 2', '4\n0 0 0 0', '5\n5 1 1 5 1']),

    _c('coin-change-count', 'Fewest Coins', ['dynamic-programming'],
       'Print the fewest coins needed to make exactly the target amount, or `-1` if '
       'it cannot be made. You have an unlimited supply of each coin.\n\n'
       '**Input**\n\n- line 1: `n`, the number of coin values\n'
       '- line 2: `n` coin values\n- line 3: the target amount\n\n'
       '**Output**\n\nThe fewest coins, or `-1`.\n\n'
       '**Example**\n\n```\ninput:\n3\n1 2 5\n11\n\noutput:\n3\n```\n\n5 + 5 + 1.',
       'n = int(input())\ncoins = list(map(int, input().split()))\n'
       'amount = int(input())\n\n# print the fewest coins, or -1\n',
       'n = int(input())\ncoins = list(map(int, input().split()))\n'
       'amount = int(input())\n'
       'best = [0] + [float("inf")] * amount\n'
       'for a in range(1, amount + 1):\n'
       '    for c in coins:\n'
       '        if c <= a and best[a - c] + 1 < best[a]:\n'
       '            best[a] = best[a - c] + 1\n'
       'print(best[amount] if best[amount] != float("inf") else -1)\n',
       ['3\n1 2 5\n11', '1\n2\n3'],
       ['1\n1\n0', '2\n2 5\n9', '3\n1 5 10\n30', '2\n3 7\n5'],
       constraints='1 <= amount <= 5000.'),

    _c('longest-increasing-run', 'Longest Increasing Run', ['array'],
       'Print the length of the longest run of consecutive values that strictly '
       'increases.\n\n' + IO_N_LIST + 'The length.\n\n'
       '**Example**\n\n```\ninput:\n7\n1 3 5 4 7 8 9\n\noutput:\n4\n```',
       N_LIST + '\n# print the length of the longest increasing run\n',
       N_LIST + 'best = run = 1\n'
       'for i in range(1, len(values)):\n'
       '    run = run + 1 if values[i] > values[i - 1] else 1\n'
       '    best = max(best, run)\n'
       'print(best)\n',
       ['7\n1 3 5 4 7 8 9', '4\n5 4 3 2'],
       ['1\n1', '5\n1 2 3 4 5', '6\n1 1 1 1 1 1', '5\n2 2 3 1 4']),

    _c('balanced-mixed-brackets', 'Balanced With Wildcards', ['string', 'greedy'],
       'The line contains `(`, `)` and `*`, where `*` may stand for `(`, `)` or '
       'nothing. Print `true` if the brackets can be balanced, `false` '
       'otherwise.\n\n**Input**\n\nOne line.\n\n**Output**\n\n`true` or `false`\n\n'
       '**Example**\n\n```\ninput:\n(*))\n\noutput:\ntrue\n```',
       's = input().strip()\n\n# print true or false\n',
       's = input().strip()\n'
       'lo = hi = 0\nok = True\n'
       'for ch in s:\n'
       '    if ch == "(":\n        lo += 1\n        hi += 1\n'
       '    elif ch == ")":\n        lo -= 1\n        hi -= 1\n'
       '    else:\n        lo -= 1\n        hi += 1\n'
       '    if hi < 0:\n        ok = False\n        break\n'
       '    lo = max(lo, 0)\n'
       'print("true" if ok and lo == 0 else "false")\n',
       ['(*))', '(((('],
       ['()', '(*)', '*', ')(', '(*()'],
       hints=['Track the smallest and largest possible number of open brackets.']),

    _c('matrix-transpose', 'Transpose a Grid', ['matrix', 'array'],
       'Print the grid with rows and columns exchanged — one row per line, values '
       'space-separated.\n\n'
       '**Input**\n\n- line 1: `r` and `c`\n- next `r` lines: `c` integers each\n\n'
       '**Output**\n\nThe transposed grid.\n\n'
       '**Example**\n\n```\ninput:\n2 3\n1 2 3\n4 5 6\n\noutput:\n1 4\n2 5\n3 6\n```',
       'r, c = map(int, input().split())\n'
       'grid = [list(map(int, input().split())) for _ in range(r)]\n\n'
       '# print the transposed grid\n',
       'r, c = map(int, input().split())\n'
       'grid = [list(map(int, input().split())) for _ in range(r)]\n'
       'for row in zip(*grid):\n    print(" ".join(map(str, row)))\n',
       ['2 3\n1 2 3\n4 5 6', '1 1\n5'],
       ['3 1\n1\n2\n3', '2 2\n1 2\n3 4', '1 3\n7 8 9', '3 3\n1 2 3\n4 5 6\n7 8 9']),

    _c('search-rotated-sorted', 'Search a Rotated Sorted List',
       ['binary-search', 'array'],
       'The list was sorted in increasing order and then rotated at some point. Print '
       'the position of the target, or `-1` if it is absent. Positions count from '
       '0.\n\n**Input**\n\n- line 1: `n`\n- line 2: `n` integers\n- line 3: the '
       'target\n\n**Output**\n\nThe position, or `-1`.\n\n'
       '**Example**\n\n```\ninput:\n7\n4 5 6 7 0 1 2\n0\n\noutput:\n4\n```',
       N_LIST + 'target = int(input())\n\n# print the position or -1\n',
       N_LIST + 'target = int(input())\n'
       'lo, hi, found = 0, len(values) - 1, -1\n'
       'while lo <= hi:\n'
       '    mid = (lo + hi) // 2\n'
       '    if values[mid] == target:\n        found = mid\n        break\n'
       '    if values[lo] <= values[mid]:\n'
       '        if values[lo] <= target < values[mid]:\n            hi = mid - 1\n'
       '        else:\n            lo = mid + 1\n'
       '    else:\n'
       '        if values[mid] < target <= values[hi]:\n            lo = mid + 1\n'
       '        else:\n            hi = mid - 1\n'
       'print(found)\n',
       ['7\n4 5 6 7 0 1 2\n0', '7\n4 5 6 7 0 1 2\n3'],
       ['1\n1\n1', '2\n3 1\n1', '5\n5 1 2 3 4\n5', '4\n1 2 3 4\n4'],
       hints=['One half of the range is always still sorted; work out which.']),

    _c('set-matrix-zeroes', 'Blank Out Rows and Columns', ['matrix', 'array'],
       'Wherever the grid holds a zero, set that entire row and column to zero. Print '
       'the result, one row per line.\n\n'
       '**Input**\n\n- line 1: `r` and `c`\n- next `r` lines: `c` integers each\n\n'
       '**Output**\n\nThe modified grid.\n\n'
       '**Example**\n\n```\ninput:\n3 3\n1 1 1\n1 0 1\n1 1 1\n\n'
       'output:\n1 0 1\n0 0 0\n1 0 1\n```',
       'r, c = map(int, input().split())\n'
       'grid = [list(map(int, input().split())) for _ in range(r)]\n\n'
       '# print the modified grid\n',
       'r, c = map(int, input().split())\n'
       'grid = [list(map(int, input().split())) for _ in range(r)]\n'
       'rows = {i for i in range(r) if 0 in grid[i]}\n'
       'cols = {j for j in range(c) if any(grid[i][j] == 0 for i in range(r))}\n'
       'for i in range(r):\n'
       '    print(" ".join("0" if i in rows or j in cols else str(grid[i][j])\n'
       '                   for j in range(c)))\n',
       ['3 3\n1 1 1\n1 0 1\n1 1 1', '1 1\n5'],
       ['2 2\n0 1\n1 1', '1 3\n1 0 1', '2 3\n1 2 3\n4 5 6',
        '3 2\n0 0\n0 0\n0 0']),

    _c('kth-largest', 'The Kth Largest Value', ['array', 'sorting'],
       'Print the `k`th largest value, counting duplicates separately. With `k` of 1 '
       'that is the largest.\n\n'
       '**Input**\n\n- line 1: `n`\n- line 2: `n` integers\n- line 3: `k`\n\n'
       '**Output**\n\nThe kth largest value.\n\n'
       '**Example**\n\n```\ninput:\n6\n3 2 1 5 6 4\n2\n\noutput:\n5\n```',
       N_LIST + 'k = int(input())\n\n# print the kth largest value\n',
       N_LIST + 'k = int(input())\n'
       'print(sorted(values, reverse=True)[k - 1])\n',
       ['6\n3 2 1 5 6 4\n2', '1\n7\n1'],
       ['5\n1 1 1 1 1\n3', '4\n-1 -2 -3 -4\n4', '5\n5 4 3 2 1\n5',
        '3\n10 20 30\n2']),

    _c('valid-parentheses-longest', 'Longest Balanced Stretch', ['string', 'stack'],
       'Print the length of the longest stretch of brackets that is properly '
       'balanced.\n\n**Input**\n\nOne line of `(` and `)`.\n\n'
       '**Output**\n\nThe length.\n\n'
       '**Example**\n\n```\ninput:\n)()())\n\noutput:\n4\n```',
       's = input().strip()\n\n# print the length of the longest balanced stretch\n',
       's = input().strip()\n'
       'stack = [-1]\nbest = 0\n'
       'for i, ch in enumerate(s):\n'
       '    if ch == "(":\n        stack.append(i)\n'
       '    else:\n'
       '        stack.pop()\n'
       '        if not stack:\n            stack.append(i)\n'
       '        else:\n            best = max(best, i - stack[-1])\n'
       'print(best)\n',
       [')()())', '(()'],
       ['()', ')(', '((((', '()(()'],
       hints=['Keep positions on a stack and measure back to the last unmatched one.']),

    _c('unique-paths-grid', 'Paths Across a Grid', ['dynamic-programming', 'math'],
       'You start at the top-left of an `r` by `c` grid and may move only right or '
       'down. Print how many different paths reach the bottom-right.\n\n'
       '**Input**\n\nOne line: `r` and `c`, space-separated.\n\n'
       '**Output**\n\nThe number of paths.\n\n'
       '**Example**\n\n```\ninput:\n3 7\n\noutput:\n28\n```',
       'r, c = map(int, input().split())\n\n# print the number of paths\n',
       'r, c = map(int, input().split())\n'
       'row = [1] * c\n'
       'for _ in range(r - 1):\n'
       '    for j in range(1, c):\n        row[j] += row[j - 1]\n'
       'print(row[-1])\n',
       ['3 7', '1 1'],
       ['2 2', '3 3', '1 10', '10 10'],
       constraints='1 <= r, c <= 20.'),

    _c('word-break-possible', 'Can the Words Be Split', ['dynamic-programming', 'string'],
       'Print `true` if the text can be split entirely into words from the '
       'dictionary, using each as often as you like, and `false` otherwise.\n\n'
       '**Input**\n\n- line 1: the text\n- line 2: `n`\n'
       '- line 3: `n` space-separated dictionary words\n\n'
       '**Output**\n\n`true` or `false`\n\n'
       '**Example**\n\n```\ninput:\nleetcode\n2\nleet code\n\noutput:\ntrue\n```',
       'text = input().strip()\nn = int(input())\nwords = set(input().split())\n\n'
       '# print true or false\n',
       'text = input().strip()\nn = int(input())\nwords = set(input().split())\n'
       'ok = [True] + [False] * len(text)\n'
       'for i in range(1, len(text) + 1):\n'
       '    for j in range(i):\n'
       '        if ok[j] and text[j:i] in words:\n            ok[i] = True\n            break\n'
       'print("true" if ok[-1] else "false")\n',
       ['leetcode\n2\nleet code', 'catsandog\n5\ncats dog sand and cat'],
       ['a\n1\na', 'aaaa\n1\naa', 'abc\n2\na bc', 'xyz\n1\nab']),

    _c('min-window-substring-len', 'Shortest Window With All Letters',
       ['string', 'sliding-window', 'hash-map'],
       'Print the length of the shortest stretch of the first line that contains '
       'every character of the second line, counting repeats. Print `0` if there is '
       'none.\n\n**Input**\n\n- line 1: the text\n- line 2: the required characters\n\n'
       '**Output**\n\nThe shortest length, or `0`.\n\n'
       '**Example**\n\n```\ninput:\nADOBECODEBANC\nABC\n\noutput:\n4\n```',
       'text = input().strip()\nneed = input().strip()\n\n'
       '# print the shortest window length, or 0\n',
       'text = input().strip()\nneed = input().strip()\n'
       'want = {}\n'
       'for ch in need:\n    want[ch] = want.get(ch, 0) + 1\n'
       'missing = len(need)\nbest = 0\nstart = 0\n'
       'for i, ch in enumerate(text):\n'
       '    if want.get(ch, 0) > 0:\n        missing -= 1\n'
       '    want[ch] = want.get(ch, 0) - 1\n'
       '    while missing == 0:\n'
       '        if best == 0 or i - start + 1 < best:\n            best = i - start + 1\n'
       '        want[text[start]] = want.get(text[start], 0) + 1\n'
       '        if want[text[start]] > 0:\n            missing += 1\n'
       '        start += 1\n'
       'print(best)\n',
       ['ADOBECODEBANC\nABC', 'a\nb'],
       ['a\na', 'aa\naa', 'abc\ncba', 'bba\nab'],
       constraints='1 <= lengths <= 100000.'),

    _c('top-k-scores-average', 'Average of the Top K', ['array', 'sorting'],
       'Print the average of the `k` largest values, to two decimal places.\n\n'
       '**Input**\n\n- line 1: `n`\n- line 2: `n` integers\n- line 3: `k`\n\n'
       '**Output**\n\nThe average, to two decimal places.\n\n'
       '**Example**\n\n```\ninput:\n5\n10 20 30 40 50\n2\n\noutput:\n45.00\n```',
       N_LIST + 'k = int(input())\n\n# print the average of the top k\n',
       N_LIST + 'k = int(input())\n'
       'top = sorted(values, reverse=True)[:k]\n'
       'print(f"{sum(top) / len(top):.2f}")\n',
       ['5\n10 20 30 40 50\n2', '1\n7\n1'],
       ['4\n1 1 1 1\n4', '3\n-1 -2 -3\n2', '5\n5 4 3 2 1\n3', '2\n0 100\n1']),

    _c('roman-to-number', 'Roman Numeral to Number', ['string', 'math'],
       'Convert a Roman numeral to a number and print it. The letters are I=1, V=5, '
       'X=10, L=50, C=100, D=500, M=1000, and a smaller letter before a larger one '
       'is subtracted.\n\n**Input**\n\nOne Roman numeral in upper case.\n\n'
       '**Output**\n\nThe number.\n\n'
       '**Example**\n\n```\ninput:\nMCMXCIV\n\noutput:\n1994\n```',
       's = input().strip()\n\n# print the number\n',
       's = input().strip()\n'
       'worth = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}\n'
       'total = 0\n'
       'for i, ch in enumerate(s):\n'
       '    if i + 1 < len(s) and worth[ch] < worth[s[i + 1]]:\n'
       '        total -= worth[ch]\n'
       '    else:\n        total += worth[ch]\n'
       'print(total)\n',
       ['MCMXCIV', 'III'],
       ['I', 'IV', 'MMMCMXCIX', 'LVIII']),

    _c('number-to-roman', 'Number to Roman Numeral', ['string', 'math', 'greedy'],
       'Convert a number between 1 and 3999 to a Roman numeral and print it.\n\n'
       '**Input**\n\nOne integer.\n\n**Output**\n\nThe Roman numeral.\n\n'
       '**Example**\n\n```\ninput:\n1994\n\noutput:\nMCMXCIV\n```',
       'n = int(input())\n\n# print the Roman numeral\n',
       'n = int(input())\n'
       'table = [(1000, "M"), (900, "CM"), (500, "D"), (400, "CD"),\n'
       '         (100, "C"), (90, "XC"), (50, "L"), (40, "XL"),\n'
       '         (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")]\n'
       'out = ""\n'
       'for value, letters in table:\n'
       '    while n >= value:\n        out += letters\n        n -= value\n'
       'print(out)\n',
       ['1994', '3'],
       ['1', '4', '3999', '58'],
       constraints='1 <= n <= 3999.'),

    _c('count-islands-row', 'Count the Groups', ['matrix', 'graph'],
       'The grid holds 0s and 1s. A group is a set of 1s joined up, down, left or '
       'right. Print how many groups there are.\n\n'
       '**Input**\n\n- line 1: `r` and `c`\n- next `r` lines: `c` values of 0 or 1\n\n'
       '**Output**\n\nThe number of groups.\n\n'
       '**Example**\n\n```\ninput:\n3 3\n1 1 0\n0 1 0\n0 0 1\n\noutput:\n2\n```',
       'r, c = map(int, input().split())\n'
       'grid = [list(map(int, input().split())) for _ in range(r)]\n\n'
       '# print the number of groups\n',
       'r, c = map(int, input().split())\n'
       'grid = [list(map(int, input().split())) for _ in range(r)]\n'
       'seen = set()\ncount = 0\n'
       'for i in range(r):\n'
       '    for j in range(c):\n'
       '        if grid[i][j] == 1 and (i, j) not in seen:\n'
       '            count += 1\n'
       '            stack = [(i, j)]\n'
       '            seen.add((i, j))\n'
       '            while stack:\n'
       '                y, x = stack.pop()\n'
       '                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):\n'
       '                    ny, nx = y + dy, x + dx\n'
       '                    if 0 <= ny < r and 0 <= nx < c and grid[ny][nx] == 1 \\\n'
       '                            and (ny, nx) not in seen:\n'
       '                        seen.add((ny, nx))\n'
       '                        stack.append((ny, nx))\n'
       'print(count)\n',
       ['3 3\n1 1 0\n0 1 0\n0 0 1', '1 1\n0'],
       ['2 2\n1 1\n1 1', '1 5\n1 0 1 0 1', '3 3\n0 0 0\n0 0 0\n0 0 0',
        '2 3\n1 0 1\n1 0 1']),

    _c('sum-of-two-lists-as-numbers', 'Add Two Big Numbers', ['string', 'math'],
       'Two very large non-negative integers are given as strings. Print their sum '
       'as a string, without converting them to a built-in big integer.\n\n'
       '**Input**\n\n- line 1: the first number\n- line 2: the second\n\n'
       '**Output**\n\nThe sum.\n\n'
       '**Example**\n\n```\ninput:\n99\n1\n\noutput:\n100\n```',
       'a = input().strip()\nb = input().strip()\n\n# print the sum as a string\n',
       'a = input().strip()\nb = input().strip()\n'
       'i, j, carry, out = len(a) - 1, len(b) - 1, 0, []\n'
       'while i >= 0 or j >= 0 or carry:\n'
       '    total = carry\n'
       '    if i >= 0:\n        total += int(a[i])\n        i -= 1\n'
       '    if j >= 0:\n        total += int(b[j])\n        j -= 1\n'
       '    out.append(str(total % 10))\n'
       '    carry = total // 10\n'
       'print("".join(reversed(out)))\n',
       ['99\n1', '123\n456'],
       ['0\n0', '999999999999999999999\n1', '1\n999', '50\n50']),

    _c('longest-palindromic-run', 'Longest Palindrome Inside', ['string'],
       'Print the length of the longest stretch of consecutive characters that reads '
       'the same forwards and backwards.\n\n'
       '**Input**\n\nOne line of text.\n\n**Output**\n\nThe length.\n\n'
       '**Example**\n\n```\ninput:\nbabad\n\noutput:\n3\n```',
       's = input().strip()\n\n# print the length\n',
       's = input().strip()\n'
       'best = 0\n'
       'for centre in range(len(s)):\n'
       '    for lo, hi in ((centre, centre), (centre, centre + 1)):\n'
       '        while lo >= 0 and hi < len(s) and s[lo] == s[hi]:\n'
       '            best = max(best, hi - lo + 1)\n'
       '            lo -= 1\n            hi += 1\n'
       'print(best)\n',
       ['babad', 'cbbd'],
       ['a', 'ac', 'aaaa', 'racecarx'],
       constraints='1 <= length <= 2000.',
       hints=['Expand outwards from every centre, both odd and even.']),

    _c('jump-to-end', 'Can You Reach the End', ['array', 'greedy'],
       'Each value says how far you may jump forward from that position. Starting at '
       'position 0, print `true` if you can reach the last position and `false` '
       'otherwise.\n\n' + IO_N_LIST + '`true` or `false`\n\n'
       '**Example**\n\n```\ninput:\n5\n2 3 1 1 4\n\noutput:\ntrue\n```',
       N_LIST + '\n# print true or false\n',
       N_LIST + 'reach = 0\n'
       'for i, v in enumerate(values):\n'
       '    if i > reach:\n        break\n'
       '    reach = max(reach, i + v)\n'
       'print("true" if reach >= len(values) - 1 else "false")\n',
       ['5\n2 3 1 1 4', '5\n3 2 1 0 4'],
       ['1\n0', '2\n1 0', '3\n0 1 1', '4\n2 0 0 1']),

    _c('remove-kth-from-end-list', 'Drop the Kth From the End', ['array'],
       'Print the values with the `k`th from the end removed, space-separated. `k` of '
       '1 removes the last value.\n\n'
       '**Input**\n\n- line 1: `n`\n- line 2: `n` integers\n- line 3: `k`\n\n'
       '**Output**\n\nThe remaining values, or `none` if nothing is left.\n\n'
       '**Example**\n\n```\ninput:\n5\n1 2 3 4 5\n2\n\noutput:\n1 2 3 5\n```',
       N_LIST + 'k = int(input())\n\n# print the remaining values\n',
       N_LIST + 'k = int(input())\n'
       'del values[len(values) - k]\n'
       'print(" ".join(map(str, values)) if values else "none")\n',
       ['5\n1 2 3 4 5\n2', '1\n7\n1'],
       ['3\n1 2 3\n3', '4\n9 8 7 6\n1', '2\n1 2\n2', '5\n5 4 3 2 1\n4']),

    _c('sort-by-frequency-then-value', 'Sort by How Often', ['array', 'sorting', 'hash-map'],
       'Print the values sorted so that more frequent values come first. Values '
       'appearing equally often are ordered smallest first. Every occurrence is '
       'printed.\n\n' + IO_N_LIST + 'The rearranged values.\n\n'
       '**Example**\n\n```\ninput:\n6\n1 1 2 2 2 3\n\noutput:\n2 2 2 1 1 3\n```',
       N_LIST + '\n# print the values sorted by frequency\n',
       N_LIST + 'counts = {}\n'
       'for v in values:\n    counts[v] = counts.get(v, 0) + 1\n'
       'ordered = sorted(values, key=lambda v: (-counts[v], v))\n'
       'print(" ".join(map(str, ordered)))\n',
       ['6\n1 1 2 2 2 3', '3\n1 2 3'],
       ['1\n5', '4\n4 4 4 4', '5\n-1 -1 2 2 3', '6\n9 9 1 1 5 5']),

    _c('matrix-diagonal-sum', 'Sum Both Diagonals', ['matrix', 'array'],
       'Print the sum of both diagonals of an `n` by `n` grid. The centre value of an '
       'odd-sized grid is counted once.\n\n'
       '**Input**\n\n- line 1: `n`\n- next `n` lines: `n` integers each\n\n'
       '**Output**\n\nThe sum.\n\n'
       '**Example**\n\n```\ninput:\n3\n1 2 3\n4 5 6\n7 8 9\n\noutput:\n25\n```',
       'n = int(input())\ngrid = [list(map(int, input().split())) for _ in range(n)]\n\n'
       '# print the sum of both diagonals\n',
       'n = int(input())\n'
       'grid = [list(map(int, input().split())) for _ in range(n)]\n'
       'total = 0\n'
       'for i in range(n):\n'
       '    total += grid[i][i]\n'
       '    if i != n - 1 - i:\n        total += grid[i][n - 1 - i]\n'
       'print(total)\n',
       ['3\n1 2 3\n4 5 6\n7 8 9', '1\n5'],
       ['2\n1 2\n3 4', '4\n1 1 1 1\n1 1 1 1\n1 1 1 1\n1 1 1 1',
        '3\n0 0 0\n0 0 0\n0 0 0', '2\n-1 -2\n-3 -4']),

    _c('count-primes-below', 'Count the Primes Below N', ['math'],
       'Print how many prime numbers are strictly less than `n`.\n\n'
       '**Input**\n\nOne integer `n`.\n\n**Output**\n\nThe count.\n\n'
       '**Example**\n\n```\ninput:\n10\n\noutput:\n4\n```\n\n2, 3, 5 and 7.',
       'n = int(input())\n\n# print the count of primes below n\n',
       'n = int(input())\n'
       'if n < 3:\n    print(0)\n'
       'else:\n'
       '    sieve = [True] * n\n'
       '    sieve[0] = sieve[1] = False\n'
       '    i = 2\n'
       '    while i * i < n:\n'
       '        if sieve[i]:\n'
       '            for j in range(i * i, n, i):\n                sieve[j] = False\n'
       '        i += 1\n'
       '    print(sum(sieve))\n',
       ['10', '0'],
       ['2', '3', '100', '1000'],
       constraints='0 <= n <= 500000.',
       hints=['A sieve is far quicker than testing each number.']),

    _c('reverse-words-in-line', 'Reverse the Word Order', ['string'],
       'Print the words of the line in reverse order, separated by single spaces, '
       'with any extra spaces removed.\n\n'
       '**Input**\n\nOne line of text.\n\n**Output**\n\nThe reversed word order.\n\n'
       '**Example**\n\n```\ninput:\n  the sky   is blue  \n\noutput:\nblue is sky the\n```',
       's = input()\n\n# print the words in reverse order\n',
       's = input()\nprint(" ".join(reversed(s.split())))\n',
       ['  the sky   is blue  ', 'hello'],
       ['a b c', '   spaced   out   ', 'one two', 'x  y']),

    _c('valid-ip-address', 'Is It a Valid IPv4 Address', ['string'],
       'Print `true` if the line is a valid IPv4 address — four parts separated by '
       'dots, each a number from 0 to 255 with no leading zeros — and `false` '
       'otherwise.\n\n**Input**\n\nOne line.\n\n**Output**\n\n`true` or `false`\n\n'
       '**Example**\n\n```\ninput:\n192.168.1.1\n\noutput:\ntrue\n```',
       's = input().strip()\n\n# print true or false\n',
       's = input().strip()\n'
       'parts = s.split(".")\n'
       'ok = len(parts) == 4\n'
       'if ok:\n'
       '    for p in parts:\n'
       '        if not p.isdigit() or not 0 <= int(p) <= 255:\n'
       '            ok = False\n            break\n'
       '        if len(p) > 1 and p[0] == "0":\n            ok = False\n            break\n'
       'print("true" if ok else "false")\n',
       ['192.168.1.1', '256.1.1.1'],
       ['0.0.0.0', '1.1.1.01', '1.2.3', '255.255.255.255', 'a.b.c.d']),

    _c('excel-column-number', 'Spreadsheet Column to Number', ['string', 'math'],
       'Spreadsheet columns are lettered A, B, ... Z, AA, AB and so on. Print the '
       'number of the given column, with A being 1.\n\n'
       '**Input**\n\nOne column label in upper case.\n\n**Output**\n\nThe number.\n\n'
       '**Example**\n\n```\ninput:\nAB\n\noutput:\n28\n```',
       's = input().strip()\n\n# print the column number\n',
       's = input().strip()\n'
       'total = 0\n'
       'for ch in s:\n    total = total * 26 + (ord(ch) - ord("A") + 1)\n'
       'print(total)\n',
       ['AB', 'A'],
       ['Z', 'AA', 'ZY', 'AAA']),
]
