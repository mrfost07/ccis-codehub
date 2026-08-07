"""
Hard coding challenges.

Same conventions as the easy and medium sets. Hard here means the student has to
find a non-obvious idea — a dynamic programme with a state worth thinking about,
a graph traversal with ordering, a data structure that makes the operation
cheap — and the straightforward approach is too slow or simply wrong.

Statements are written for this platform.
"""


def _c(slug, title, tags, description, starter, solution, visible, hidden,
       constraints='', hints=(), category='algorithms'):
    return {
        'slug': slug, 'title': title, 'difficulty': 'hard', 'category': category,
        'tags': list(tags), 'description': description, 'constraints': constraints,
        'hints': list(hints), 'starter': starter, 'solution': solution,
        'visible': visible, 'hidden': hidden,
    }


N_LIST = 'n = int(input())\nvalues = list(map(int, input().split()))\n'
IO_N_LIST = ('**Input**\n\n- line 1: `n`\n- line 2: `n` space-separated integers\n\n'
             '**Output**\n\n')
GRID_IN = ('r, c = map(int, input().split())\n'
           'grid = [list(map(int, input().split())) for _ in range(r)]\n')

CHALLENGES = [
    _c('edit-distance', 'Fewest Edits Between Words',
       ['dynamic-programming', 'string'],
       'Print the fewest single-character edits — insert, delete or replace — needed '
       'to turn the first word into the second.\n\n'
       '**Input**\n\n- line 1: the first word\n- line 2: the second word\n\n'
       '**Output**\n\nThe number of edits.\n\n'
       '**Example**\n\n```\ninput:\nhorse\nros\n\noutput:\n3\n```',
       'a = input().strip()\nb = input().strip()\n\n# print the number of edits\n',
       'a = input().strip()\nb = input().strip()\n'
       'prev = list(range(len(b) + 1))\n'
       'for i in range(1, len(a) + 1):\n'
       '    cur = [i] + [0] * len(b)\n'
       '    for j in range(1, len(b) + 1):\n'
       '        cost = 0 if a[i - 1] == b[j - 1] else 1\n'
       '        cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)\n'
       '    prev = cur\n'
       'print(prev[-1])\n',
       ['horse\nros', 'intention\nexecution'],
       ['a\na', 'ab\nba', 'abcdef\nazced', 'kitten\nsitting'],
       constraints='1 <= lengths <= 500.',
       hints=['Fill a table where cell (i, j) is the cost for the first i and j '
              'characters.']),

    _c('longest-common-subsequence-len', 'Longest Shared Subsequence',
       ['dynamic-programming', 'string'],
       'A subsequence keeps the order of characters but may skip some. Print the '
       'length of the longest subsequence both words share.\n\n'
       '**Input**\n\n- line 1: the first word\n- line 2: the second\n\n'
       '**Output**\n\nThe length.\n\n'
       '**Example**\n\n```\ninput:\nabcde\nace\n\noutput:\n3\n```',
       'a = input().strip()\nb = input().strip()\n\n# print the length\n',
       'a = input().strip()\nb = input().strip()\n'
       'prev = [0] * (len(b) + 1)\n'
       'for i in range(1, len(a) + 1):\n'
       '    cur = [0] * (len(b) + 1)\n'
       '    for j in range(1, len(b) + 1):\n'
       '        cur[j] = prev[j - 1] + 1 if a[i - 1] == b[j - 1] else max(prev[j], cur[j - 1])\n'
       '    prev = cur\n'
       'print(prev[-1])\n',
       ['abcde\nace', 'abc\ndef'],
       ['abc\nabc', 'a\nb', 'aaaa\naa', 'bsbininm\njmjkbkjkv'],
       constraints='1 <= lengths <= 1000.'),

    _c('longest-increasing-subsequence-len', 'Longest Increasing Subsequence',
       ['dynamic-programming', 'binary-search', 'array'],
       'A subsequence keeps order but may skip values. Print the length of the '
       'longest strictly increasing subsequence.\n\n'
       + IO_N_LIST + 'The length.\n\n'
       '**Example**\n\n```\ninput:\n8\n10 9 2 5 3 7 101 18\n\noutput:\n4\n```',
       N_LIST + '\n# print the length\n',
       N_LIST + 'import bisect\ntails = []\n'
       'for v in values:\n'
       '    i = bisect.bisect_left(tails, v)\n'
       '    if i == len(tails):\n        tails.append(v)\n'
       '    else:\n        tails[i] = v\n'
       'print(len(tails))\n',
       ['8\n10 9 2 5 3 7 101 18', '4\n7 7 7 7'],
       ['1\n5', '5\n5 4 3 2 1', '6\n1 2 3 4 5 6', '7\n0 8 4 12 2 10 6'],
       constraints='1 <= n <= 100000.',
       hints=['Keep the smallest possible tail for each length, and place each '
              'value with a binary search.']),

    _c('trapped-rainwater', 'Water Trapped Between Bars',
       ['array', 'two-pointers'],
       'The values are bar heights standing one unit apart. Print how much water is '
       'trapped between them after rain.\n\n' + IO_N_LIST + 'The total water.\n\n'
       '**Example**\n\n```\ninput:\n12\n0 1 0 2 1 0 1 3 2 1 2 1\n\noutput:\n6\n```',
       N_LIST + '\n# print the total water\n',
       N_LIST + 'lo, hi = 0, len(values) - 1\n'
       'left_max = right_max = total = 0\n'
       'while lo < hi:\n'
       '    if values[lo] < values[hi]:\n'
       '        left_max = max(left_max, values[lo])\n'
       '        total += left_max - values[lo]\n        lo += 1\n'
       '    else:\n'
       '        right_max = max(right_max, values[hi])\n'
       '        total += right_max - values[hi]\n        hi -= 1\n'
       'print(total)\n',
       ['12\n0 1 0 2 1 0 1 3 2 1 2 1', '6\n4 2 0 3 2 5'],
       ['1\n5', '3\n3 0 3', '4\n1 2 3 4', '5\n5 4 3 2 1'],
       hints=['At each step the water above a bar is set by the smaller of the '
              'tallest bars to its left and right.']),

    _c('median-of-a-stream', 'Median After Each Value',
       ['heap', 'sorting', 'array'],
       'After reading each value, print the median of everything read so far, to one '
       'decimal place, space-separated on one line.\n\n'
       + IO_N_LIST + 'The running medians.\n\n'
       '**Example**\n\n```\ninput:\n3\n1 2 3\n\noutput:\n1.0 1.5 2.0\n```',
       N_LIST + '\n# print the running medians\n',
       N_LIST + 'import heapq\n'
       'low, high, out = [], [], []\n'
       'for v in values:\n'
       '    heapq.heappush(low, -v)\n'
       '    heapq.heappush(high, -heapq.heappop(low))\n'
       '    if len(high) > len(low):\n'
       '        heapq.heappush(low, -heapq.heappop(high))\n'
       '    median = -low[0] if len(low) > len(high) else (-low[0] + high[0]) / 2\n'
       '    out.append(f"{median:.1f}")\n'
       'print(" ".join(out))\n',
       ['3\n1 2 3', '4\n5 15 1 3'],
       ['1\n7', '2\n2 2', '5\n1 1 1 1 1', '6\n6 5 4 3 2 1'],
       constraints='1 <= n <= 20000.',
       hints=['Two heaps: the smaller half and the larger half, kept balanced.']),

    _c('shortest-path-in-grid', 'Shortest Way Through a Grid',
       ['graph', 'matrix'],
       'The grid holds 0 for open and 1 for blocked. Starting at the top-left and '
       'moving up, down, left or right through open cells, print the fewest steps to '
       'reach the bottom-right, or `-1` if it cannot be reached. The start counts as '
       'step 1.\n\n'
       '**Input**\n\n- line 1: `r` and `c`\n- next `r` lines: `c` values\n\n'
       '**Output**\n\nThe fewest steps, or `-1`.\n\n'
       '**Example**\n\n```\ninput:\n3 3\n0 0 0\n1 1 0\n0 0 0\n\noutput:\n5\n```',
       GRID_IN + '\n# print the fewest steps, or -1\n',
       GRID_IN + 'from collections import deque\n'
       'if grid[0][0] == 1 or grid[r - 1][c - 1] == 1:\n    print(-1)\n'
       'else:\n'
       '    q = deque([(0, 0, 1)])\n'
       '    seen = {(0, 0)}\n'
       '    answer = -1\n'
       '    while q:\n'
       '        y, x, d = q.popleft()\n'
       '        if (y, x) == (r - 1, c - 1):\n            answer = d\n            break\n'
       '        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):\n'
       '            ny, nx = y + dy, x + dx\n'
       '            if 0 <= ny < r and 0 <= nx < c and grid[ny][nx] == 0 \\\n'
       '                    and (ny, nx) not in seen:\n'
       '                seen.add((ny, nx))\n'
       '                q.append((ny, nx, d + 1))\n'
       '    print(answer)\n',
       ['3 3\n0 0 0\n1 1 0\n0 0 0', '2 2\n0 1\n1 0'],
       ['1 1\n0', '1 1\n1', '2 3\n0 0 0\n0 0 0', '3 3\n0 1 0\n0 1 0\n0 0 0'],
       hints=['Breadth-first search finds the fewest steps.']),

    _c('word-ladder-length', 'Steps Between Two Words', ['graph', 'string'],
       'Change one letter at a time, and every intermediate word must be in the '
       'dictionary. Print the number of words in the shortest chain from the first '
       'word to the second, including both, or `0` if impossible.\n\n'
       '**Input**\n\n- line 1: the start word\n- line 2: the end word\n'
       '- line 3: `n`\n- line 4: `n` space-separated dictionary words\n\n'
       '**Output**\n\nThe chain length, or `0`.\n\n'
       '**Example**\n\n```\ninput:\nhit\ncog\n6\nhot dot dog lot log cog\n\n'
       'output:\n5\n```',
       'start = input().strip()\nend = input().strip()\n'
       'n = int(input())\nwords = set(input().split())\n\n'
       '# print the chain length, or 0\n',
       'start = input().strip()\nend = input().strip()\n'
       'n = int(input())\nwords = set(input().split())\n'
       'from collections import deque\n'
       'if end not in words:\n    print(0)\n'
       'else:\n'
       '    q = deque([(start, 1)])\n'
       '    seen = {start}\n'
       '    answer = 0\n'
       '    while q:\n'
       '        word, depth = q.popleft()\n'
       '        if word == end:\n            answer = depth\n            break\n'
       '        for i in range(len(word)):\n'
       '            for ch in "abcdefghijklmnopqrstuvwxyz":\n'
       '                nxt = word[:i] + ch + word[i + 1:]\n'
       '                if nxt in words and nxt not in seen:\n'
       '                    seen.add(nxt)\n'
       '                    q.append((nxt, depth + 1))\n'
       '    print(answer)\n',
       ['hit\ncog\n6\nhot dot dog lot log cog', 'hit\ncog\n5\nhot dot dog lot log'],
       ['a\nc\n2\nb c', 'ab\nab\n1\nab', 'abc\nabc\n1\nxyz',
        'red\ntax\n6\nted tex red tax tad den'],
       constraints='All words have the same length, at most 10.'),

    _c('course-order-possible', 'Can Every Course Be Taken', ['graph', 'topological-sort'],
       'Each pair `a b` means course `a` requires course `b` first. Print `true` if '
       'every course can be taken, and `false` if the requirements form a cycle.\n\n'
       '**Input**\n\n- line 1: `n` courses and `m` requirement pairs\n'
       '- next `m` lines: two course numbers `a b`\n\n'
       '**Output**\n\n`true` or `false`\n\n'
       '**Example**\n\n```\ninput:\n2 1\n1 0\n\noutput:\ntrue\n```',
       'n, m = map(int, input().split())\n'
       'pairs = [tuple(map(int, input().split())) for _ in range(m)]\n\n'
       '# print true or false\n',
       'n, m = map(int, input().split())\n'
       'after = [[] for _ in range(n)]\n'
       'needs = [0] * n\n'
       'for _ in range(m):\n'
       '    a, b = map(int, input().split())\n'
       '    after[b].append(a)\n    needs[a] += 1\n'
       'from collections import deque\n'
       'q = deque(i for i in range(n) if needs[i] == 0)\n'
       'done = 0\n'
       'while q:\n'
       '    course = q.popleft()\n    done += 1\n'
       '    for nxt in after[course]:\n'
       '        needs[nxt] -= 1\n'
       '        if needs[nxt] == 0:\n            q.append(nxt)\n'
       'print("true" if done == n else "false")\n',
       ['2 1\n1 0', '2 2\n1 0\n0 1'],
       ['1 0', '3 2\n1 0\n2 1', '3 3\n0 1\n1 2\n2 0', '4 2\n1 0\n3 2'],
       hints=['Repeatedly take a course with nothing outstanding; a cycle leaves '
              'some never taken.']),

    _c('max-path-sum-grid', 'Richest Path Down a Grid',
       ['dynamic-programming', 'matrix'],
       'Start at the top-left and move only right or down to the bottom-right. Print '
       'the largest total of the values you pass through.\n\n'
       '**Input**\n\n- line 1: `r` and `c`\n- next `r` lines: `c` integers\n\n'
       '**Output**\n\nThe largest total.\n\n'
       '**Example**\n\n```\ninput:\n3 3\n1 3 1\n1 5 1\n4 2 1\n\noutput:\n12\n```',
       GRID_IN + '\n# print the largest total\n',
       GRID_IN + 'best = [[0] * c for _ in range(r)]\n'
       'for i in range(r):\n'
       '    for j in range(c):\n'
       '        if i == 0 and j == 0:\n            best[i][j] = grid[i][j]\n'
       '        elif i == 0:\n            best[i][j] = best[i][j - 1] + grid[i][j]\n'
       '        elif j == 0:\n            best[i][j] = best[i - 1][j] + grid[i][j]\n'
       '        else:\n'
       '            best[i][j] = max(best[i - 1][j], best[i][j - 1]) + grid[i][j]\n'
       'print(best[-1][-1])\n',
       ['3 3\n1 3 1\n1 5 1\n4 2 1', '1 1\n7'],
       ['2 2\n1 2\n3 4', '1 4\n1 2 3 4', '3 1\n1\n2\n3',
        '2 3\n-1 -2 -3\n-4 -5 -6']),

    _c('knapsack-max-value', 'Best Value Within the Weight Limit',
       ['dynamic-programming'],
       'Each item has a weight and a value, and may be taken at most once. Print the '
       'greatest total value that fits within the weight limit.\n\n'
       '**Input**\n\n- line 1: `n` items and the weight limit\n'
       '- next `n` lines: weight and value\n\n**Output**\n\nThe greatest value.\n\n'
       '**Example**\n\n```\ninput:\n3 5\n2 3\n3 4\n4 5\n\noutput:\n7\n```',
       'n, limit = map(int, input().split())\n'
       'items = [tuple(map(int, input().split())) for _ in range(n)]\n\n'
       '# print the greatest value\n',
       'n, limit = map(int, input().split())\n'
       'best = [0] * (limit + 1)\n'
       'for _ in range(n):\n'
       '    weight, value = map(int, input().split())\n'
       '    for w in range(limit, weight - 1, -1):\n'
       '        best[w] = max(best[w], best[w - weight] + value)\n'
       'print(best[limit])\n',
       ['3 5\n2 3\n3 4\n4 5', '1 1\n2 5'],
       ['1 5\n5 10', '3 10\n5 10\n4 40\n6 30', '2 0\n1 1\n1 1',
        '4 7\n1 1\n3 4\n4 5\n5 7'],
       constraints='1 <= n <= 200, 0 <= limit <= 10000.'),

    _c('n-queens-count', 'How Many Queen Arrangements', ['backtracking'],
       'Place `n` queens on an `n` by `n` board so none attacks another along a row, '
       'column or diagonal. Print how many arrangements exist.\n\n'
       '**Input**\n\nOne integer `n`.\n\n**Output**\n\nThe number of arrangements.\n\n'
       '**Example**\n\n```\ninput:\n4\n\noutput:\n2\n```',
       'n = int(input())\n\n# print the number of arrangements\n',
       'n = int(input())\n'
       'count = 0\n'
       'def place(row, cols, up, down):\n'
       '    global count\n'
       '    if row == n:\n        count += 1\n        return\n'
       '    for col in range(n):\n'
       '        if col in cols or (row - col) in up or (row + col) in down:\n'
       '            continue\n'
       '        place(row + 1, cols | {col}, up | {row - col}, down | {row + col})\n'
       'place(0, set(), set(), set())\n'
       'print(count)\n',
       ['4', '1'],
       ['2', '3', '6', '8'],
       constraints='1 <= n <= 9.'),

    _c('permutations-count-distinct', 'Distinct Arrangements',
       ['backtracking', 'math'],
       'Print how many distinct arrangements the values have. Repeated values make '
       'some arrangements identical, and those count once.\n\n'
       + IO_N_LIST + 'The number of distinct arrangements.\n\n'
       '**Example**\n\n```\ninput:\n3\n1 1 2\n\noutput:\n3\n```',
       N_LIST + '\n# print the number of distinct arrangements\n',
       N_LIST + 'from math import factorial\n'
       'counts = {}\n'
       'for v in values:\n    counts[v] = counts.get(v, 0) + 1\n'
       'total = factorial(len(values))\n'
       'for k in counts.values():\n    total //= factorial(k)\n'
       'print(total)\n',
       ['3\n1 1 2', '3\n1 2 3'],
       ['1\n5', '4\n1 1 1 1', '5\n1 1 2 2 3', '6\n1 2 3 4 5 6'],
       constraints='1 <= n <= 12.'),

    _c('largest-rectangle-histogram', 'Largest Rectangle Under the Bars',
       ['stack', 'array'],
       'The values are bar heights of width one, side by side. Print the area of the '
       'largest rectangle that fits entirely under them.\n\n'
       + IO_N_LIST + 'The largest area.\n\n'
       '**Example**\n\n```\ninput:\n6\n2 1 5 6 2 3\n\noutput:\n10\n```',
       N_LIST + '\n# print the largest area\n',
       N_LIST + 'stack = []\nbest = 0\n'
       'for i, h in enumerate(values + [0]):\n'
       '    while stack and values[stack[-1]] >= h:\n'
       '        height = values[stack.pop()]\n'
       '        width = i if not stack else i - stack[-1] - 1\n'
       '        best = max(best, height * width)\n'
       '    stack.append(i)\n'
       'print(best)\n',
       ['6\n2 1 5 6 2 3', '2\n2 4'],
       ['1\n5', '4\n1 1 1 1', '5\n5 4 3 2 1', '5\n1 2 3 4 5'],
       constraints='1 <= n <= 100000.',
       hints=['A stack of increasing heights lets you settle each bar exactly once.']),

    _c('sliding-window-maximum', 'Largest in Each Window',
       ['array', 'sliding-window', 'heap'],
       'Print the largest value in every window of `k` consecutive values, '
       'space-separated, left to right.\n\n'
       '**Input**\n\n- line 1: `n`\n- line 2: `n` integers\n- line 3: `k`\n\n'
       '**Output**\n\nThe window maxima.\n\n'
       '**Example**\n\n```\ninput:\n8\n1 3 -1 -3 5 3 6 7\n3\n\n'
       'output:\n3 3 5 5 6 7\n```',
       N_LIST + 'k = int(input())\n\n# print the window maxima\n',
       N_LIST + 'k = int(input())\n'
       'from collections import deque\n'
       'window, out = deque(), []\n'
       'for i, v in enumerate(values):\n'
       '    while window and values[window[-1]] <= v:\n        window.pop()\n'
       '    window.append(i)\n'
       '    if window[0] <= i - k:\n        window.popleft()\n'
       '    if i >= k - 1:\n        out.append(values[window[0]])\n'
       'print(" ".join(map(str, out)))\n',
       ['8\n1 3 -1 -3 5 3 6 7\n3', '1\n5\n1'],
       ['4\n1 2 3 4\n4', '5\n5 4 3 2 1\n2', '3\n1 1 1\n2',
        '6\n-1 -2 -3 -4 -5 -6\n3'],
       constraints='1 <= k <= n <= 100000.',
       hints=['A deque holding indexes of decreasing values gives each window in '
              'constant time.']),

    _c('minimum-spanning-cost', 'Cheapest Way to Connect Everything',
       ['graph', 'greedy', 'sorting'],
       'Given `n` places and a list of possible links with costs, print the least '
       'total cost to connect every place, or `-1` if it cannot be done.\n\n'
       '**Input**\n\n- line 1: `n` places and `m` links\n'
       '- next `m` lines: `a b cost`\n\n**Output**\n\nThe least total cost, or `-1`.\n\n'
       '**Example**\n\n```\ninput:\n3 3\n0 1 1\n1 2 2\n0 2 3\n\noutput:\n3\n```',
       'n, m = map(int, input().split())\n'
       'links = [tuple(map(int, input().split())) for _ in range(m)]\n\n'
       '# print the least total cost, or -1\n',
       'n, m = map(int, input().split())\n'
       'links = sorted((tuple(map(int, input().split())) for _ in range(m)),\n'
       '               key=lambda e: e[2])\n'
       'parent = list(range(n))\n'
       'def find(x):\n'
       '    while parent[x] != x:\n        parent[x] = parent[parent[x]]\n        x = parent[x]\n'
       '    return x\n'
       'total = joined = 0\n'
       'for a, b, cost in links:\n'
       '    ra, rb = find(a), find(b)\n'
       '    if ra != rb:\n        parent[ra] = rb\n        total += cost\n        joined += 1\n'
       'print(total if joined == n - 1 else -1)\n',
       ['3 3\n0 1 1\n1 2 2\n0 2 3', '3 1\n0 1 5'],
       ['1 0', '2 1\n0 1 7', '4 4\n0 1 1\n1 2 1\n2 3 1\n0 3 10',
        '4 2\n0 1 1\n2 3 1'],
       hints=['Sort the links by cost and take each one that joins two parts not '
              'already connected.']),

    _c('dijkstra-shortest-cost', 'Cheapest Route Between Two Places',
       ['graph', 'heap'],
       'Given `n` places and `m` one-way links with costs, print the least total cost '
       'from place 0 to place `n-1`, or `-1` if it cannot be reached.\n\n'
       '**Input**\n\n- line 1: `n` and `m`\n- next `m` lines: `from to cost`\n\n'
       '**Output**\n\nThe least cost, or `-1`.\n\n'
       '**Example**\n\n```\ninput:\n3 3\n0 1 1\n1 2 2\n0 2 5\n\noutput:\n3\n```',
       'n, m = map(int, input().split())\n'
       'links = [tuple(map(int, input().split())) for _ in range(m)]\n\n'
       '# print the least cost, or -1\n',
       'n, m = map(int, input().split())\n'
       'graph = [[] for _ in range(n)]\n'
       'for _ in range(m):\n'
       '    a, b, cost = map(int, input().split())\n'
       '    graph[a].append((b, cost))\n'
       'import heapq\n'
       'best = [float("inf")] * n\n'
       'best[0] = 0\n'
       'q = [(0, 0)]\n'
       'while q:\n'
       '    cost, node = heapq.heappop(q)\n'
       '    if cost > best[node]:\n        continue\n'
       '    for nxt, weight in graph[node]:\n'
       '        if cost + weight < best[nxt]:\n'
       '            best[nxt] = cost + weight\n'
       '            heapq.heappush(q, (best[nxt], nxt))\n'
       'print(best[n - 1] if best[n - 1] != float("inf") else -1)\n',
       ['3 3\n0 1 1\n1 2 2\n0 2 5', '3 1\n0 1 4'],
       ['1 0', '2 1\n0 1 9', '4 4\n0 1 1\n1 2 1\n2 3 1\n0 3 5',
        '3 2\n1 2 1\n2 0 1']),

    _c('count-inversions', 'How Far From Sorted', ['sorting', 'divide-and-conquer'],
       'An inversion is a pair of positions where the earlier value is larger. Print '
       'how many inversions the list has.\n\n' + IO_N_LIST + 'The number of inversions.\n\n'
       '**Example**\n\n```\ninput:\n5\n5 4 3 2 1\n\noutput:\n10\n```',
       N_LIST + '\n# print the number of inversions\n',
       N_LIST + 'def sort_count(a):\n'
       '    if len(a) < 2:\n        return a, 0\n'
       '    mid = len(a) // 2\n'
       '    left, x = sort_count(a[:mid])\n'
       '    right, y = sort_count(a[mid:])\n'
       '    merged, count = [], x + y\n'
       '    i = j = 0\n'
       '    while i < len(left) and j < len(right):\n'
       '        if left[i] <= right[j]:\n            merged.append(left[i]); i += 1\n'
       '        else:\n'
       '            merged.append(right[j]); j += 1\n            count += len(left) - i\n'
       '    merged.extend(left[i:]); merged.extend(right[j:])\n'
       '    return merged, count\n'
       'print(sort_count(values)[1])\n',
       ['5\n5 4 3 2 1', '4\n1 2 3 4'],
       ['1\n1', '2\n2 1', '6\n2 4 1 3 5 0', '4\n1 1 1 1'],
       constraints='1 <= n <= 100000.',
       hints=['Count them while merging in a merge sort.']),

    _c('kth-smallest-in-sorted-matrix', 'Kth Smallest in a Sorted Grid',
       ['matrix', 'binary-search', 'heap'],
       'Every row and every column of the grid increases. Print the `k`th smallest '
       'value overall, counting duplicates separately.\n\n'
       '**Input**\n\n- line 1: `n`\n- next `n` lines: `n` integers\n- last line: `k`\n\n'
       '**Output**\n\nThe kth smallest value.\n\n'
       '**Example**\n\n```\ninput:\n3\n1 5 9\n10 11 13\n12 13 15\n8\n\noutput:\n13\n```',
       'n = int(input())\ngrid = [list(map(int, input().split())) for _ in range(n)]\n'
       'k = int(input())\n\n# print the kth smallest value\n',
       'n = int(input())\n'
       'grid = [list(map(int, input().split())) for _ in range(n)]\n'
       'k = int(input())\n'
       'flat = sorted(v for row in grid for v in row)\n'
       'print(flat[k - 1])\n',
       ['3\n1 5 9\n10 11 13\n12 13 15\n8', '1\n5\n1'],
       ['2\n1 2\n3 4\n1', '2\n1 2\n3 4\n4', '3\n1 1 1\n1 1 1\n1 1 1\n5',
        '2\n-5 -4\n-3 -2\n3']),

    _c('longest-consecutive-run-values', 'Longest Run of Consecutive Numbers',
       ['array', 'hash-map'],
       'Ignoring their order, print the length of the longest set of consecutive '
       'integers present in the list.\n\n' + IO_N_LIST + 'The length.\n\n'
       '**Example**\n\n```\ninput:\n6\n100 4 200 1 3 2\n\noutput:\n4\n```\n\n'
       '1, 2, 3 and 4 are all present.',
       N_LIST + '\n# print the length\n',
       N_LIST + 'present = set(values)\nbest = 0\n'
       'for v in present:\n'
       '    if v - 1 not in present:\n'
       '        length = 1\n'
       '        while v + length in present:\n            length += 1\n'
       '        best = max(best, length)\n'
       'print(best)\n',
       ['6\n100 4 200 1 3 2', '3\n5 5 5'],
       ['1\n0', '5\n1 2 3 4 5', '4\n10 20 30 40', '6\n-2 -1 0 5 6 7'],
       constraints='1 <= n <= 100000.',
       hints=['Only start counting from a value whose predecessor is absent.']),

    _c('minimum-window-cover', 'Fewest Ranges to Cover the Line',
       ['greedy', 'sorting'],
       'Given ranges on a line, print the fewest of them needed to cover every point '
       'from 0 to `target`, or `-1` if they cannot.\n\n'
       '**Input**\n\n- line 1: `n` ranges and the `target`\n'
       '- next `n` lines: start and end\n\n'
       '**Output**\n\nThe fewest ranges, or `-1`.\n\n'
       '**Example**\n\n```\ninput:\n3 5\n0 3\n2 5\n4 6\n\noutput:\n2\n```',
       'n, target = map(int, input().split())\n'
       'ranges = [tuple(map(int, input().split())) for _ in range(n)]\n\n'
       '# print the fewest ranges, or -1\n',
       'n, target = map(int, input().split())\n'
       'ranges = sorted(tuple(map(int, input().split())) for _ in range(n))\n'
       'covered, i, count, ok = 0, 0, 0, True\n'
       'while covered < target:\n'
       '    furthest = covered\n'
       '    while i < len(ranges) and ranges[i][0] <= covered:\n'
       '        furthest = max(furthest, ranges[i][1])\n        i += 1\n'
       '    if furthest == covered:\n        ok = False\n        break\n'
       '    covered = furthest\n    count += 1\n'
       'print(count if ok else -1)\n',
       ['3 5\n0 3\n2 5\n4 6', '2 5\n0 1\n3 5'],
       ['1 1\n0 1', '1 5\n0 5', '2 4\n0 2\n2 4', '3 10\n0 4\n3 7\n6 10']),

    _c('regex-dot-star-match', 'Match With Dot and Star',
       ['dynamic-programming', 'string'],
       'The pattern may contain `.` matching any single character, and `*` meaning '
       'the previous character may repeat any number of times including none. Print '
       '`true` if the pattern matches the whole text.\n\n'
       '**Input**\n\n- line 1: the text\n- line 2: the pattern\n\n'
       '**Output**\n\n`true` or `false`\n\n'
       '**Example**\n\n```\ninput:\naab\nc*a*b\n\noutput:\ntrue\n```',
       'text = input().strip()\npattern = input().strip()\n\n'
       '# print true or false\n',
       'text = input().strip()\npattern = input().strip()\n'
       'n, m = len(text), len(pattern)\n'
       'ok = [[False] * (m + 1) for _ in range(n + 1)]\n'
       'ok[0][0] = True\n'
       'for j in range(1, m + 1):\n'
       '    if pattern[j - 1] == "*" and j >= 2:\n        ok[0][j] = ok[0][j - 2]\n'
       'for i in range(1, n + 1):\n'
       '    for j in range(1, m + 1):\n'
       '        if pattern[j - 1] == "*" and j >= 2:\n'
       '            ok[i][j] = ok[i][j - 2] or (\n'
       '                ok[i - 1][j] and pattern[j - 2] in (text[i - 1], "."))\n'
       '        else:\n'
       '            ok[i][j] = ok[i - 1][j - 1] and pattern[j - 1] in (text[i - 1], ".")\n'
       'print("true" if ok[n][m] else "false")\n',
       ['aab\nc*a*b', 'mississippi\nmis*is*p*.'],
       ['ab\n.*', 'aa\na', 'aa\na*', 'abc\nabc'],
       constraints='1 <= lengths <= 200.'),

    _c('serialize-tree-depth', 'Depth of a Described Tree', ['tree', 'graph'],
       'A tree is given as parent links: line `i` holds the parent of node `i`, with '
       '`-1` for the root. Print the depth of the tree, counting the root as depth '
       '1.\n\n**Input**\n\n- line 1: `n`\n- line 2: `n` parent values\n\n'
       '**Output**\n\nThe depth.\n\n'
       '**Example**\n\n```\ninput:\n5\n-1 0 0 1 1\n\noutput:\n3\n```',
       'n = int(input())\nparents = list(map(int, input().split()))\n\n'
       '# print the depth\n',
       'n = int(input())\nparents = list(map(int, input().split()))\n'
       'depth = [0] * n\n'
       'def compute(i):\n'
       '    if depth[i]:\n        return depth[i]\n'
       '    depth[i] = 1 if parents[i] == -1 else compute(parents[i]) + 1\n'
       '    return depth[i]\n'
       'print(max(compute(i) for i in range(n)))\n',
       ['5\n-1 0 0 1 1', '1\n-1'],
       ['3\n-1 0 1', '4\n-1 0 0 0', '6\n-1 0 1 2 3 4', '2\n-1 0'],
       constraints='1 <= n <= 10000.'),

    _c('max-subarray-product', 'Largest Product of a Run', ['array', 'dynamic-programming'],
       'Print the largest product obtainable from any contiguous run of one or more '
       'values.\n\n' + IO_N_LIST + 'The largest product.\n\n'
       '**Example**\n\n```\ninput:\n4\n2 3 -2 4\n\noutput:\n6\n```',
       N_LIST + '\n# print the largest product\n',
       N_LIST + 'best = high = low = values[0]\n'
       'for v in values[1:]:\n'
       '    candidates = (v, high * v, low * v)\n'
       '    high, low = max(candidates), min(candidates)\n'
       '    best = max(best, high)\n'
       'print(best)\n',
       ['4\n2 3 -2 4', '3\n-2 0 -1'],
       ['1\n-3', '4\n-2 -3 -4 -5', '3\n0 0 0', '5\n1 -2 -3 4 -1'],
       hints=['A large negative times a negative becomes large, so track the '
              'smallest product too.']),

    _c('palindrome-partitions-min', 'Fewest Palindrome Pieces',
       ['dynamic-programming', 'string'],
       'Split the text into pieces that each read the same forwards and backwards. '
       'Print the fewest cuts needed. A text already a palindrome needs 0.\n\n'
       '**Input**\n\nOne line of text.\n\n**Output**\n\nThe fewest cuts.\n\n'
       '**Example**\n\n```\ninput:\naab\n\noutput:\n1\n```',
       's = input().strip()\n\n# print the fewest cuts\n',
       's = input().strip()\n'
       'n = len(s)\n'
       'pal = [[False] * n for _ in range(n)]\n'
       'cuts = [0] * n\n'
       'for i in range(n):\n'
       '    best = i\n'
       '    for j in range(i + 1):\n'
       '        if s[j] == s[i] and (i - j < 2 or pal[j + 1][i - 1]):\n'
       '            pal[j][i] = True\n'
       '            best = 0 if j == 0 else min(best, cuts[j - 1] + 1)\n'
       '    cuts[i] = best\n'
       'print(cuts[-1])\n',
       ['aab', 'a'],
       ['ab', 'aaa', 'abccba', 'abcde'],
       constraints='1 <= length <= 1000.'),

    _c('two-sum-closest', 'Closest Pair Sum to a Target', ['array', 'two-pointers', 'sorting'],
       'Print the sum of the two values whose total is closest to the target. If two '
       'sums are equally close, print the smaller one.\n\n'
       '**Input**\n\n- line 1: `n`\n- line 2: `n` integers\n- line 3: the target\n\n'
       '**Output**\n\nThe closest sum.\n\n'
       '**Example**\n\n```\ninput:\n4\n-1 2 1 -4\n1\n\noutput:\n1\n```',
       N_LIST + 'target = int(input())\n\n# print the closest sum\n',
       N_LIST + 'target = int(input())\n'
       'values.sort()\n'
       'lo, hi = 0, len(values) - 1\n'
       'best = values[0] + values[1]\n'
       'while lo < hi:\n'
       '    total = values[lo] + values[hi]\n'
       '    if abs(total - target) < abs(best - target) or (\n'
       '            abs(total - target) == abs(best - target) and total < best):\n'
       '        best = total\n'
       '    if total < target:\n        lo += 1\n'
       '    else:\n        hi -= 1\n'
       'print(best)\n',
       ['4\n-1 2 1 -4\n1', '2\n1 2\n10'],
       ['3\n0 0 0\n1', '4\n1 1 1 1\n3', '5\n-5 -3 0 3 5\n1', '3\n10 20 30\n25'],
       constraints='2 <= n <= 100000.'),

    _c('bracket-removals-min', 'Fewest Brackets to Remove', ['string', 'stack'],
       'Print the fewest brackets that must be removed to leave the line balanced. '
       'Characters other than `(` and `)` are ignored.\n\n'
       '**Input**\n\nOne line.\n\n**Output**\n\nThe fewest removals.\n\n'
       '**Example**\n\n```\ninput:\n()())()\n\noutput:\n1\n```',
       's = input()\n\n# print the fewest removals\n',
       's = input()\n'
       'open_count = removals = 0\n'
       'for ch in s:\n'
       '    if ch == "(":\n        open_count += 1\n'
       '    elif ch == ")":\n'
       '        if open_count:\n            open_count -= 1\n'
       '        else:\n            removals += 1\n'
       'print(removals + open_count)\n',
       ['()())()', ')(' ],
       ['()', '((((', '))))', 'a(b)c)d(e']),

    _c('distinct-subsequences-count', 'How Many Ways to Form It',
       ['dynamic-programming', 'string'],
       'Print how many distinct ways the second word appears as a subsequence of the '
       'first — keeping order, skipping any characters.\n\n'
       '**Input**\n\n- line 1: the text\n- line 2: the target\n\n'
       '**Output**\n\nThe number of ways.\n\n'
       '**Example**\n\n```\ninput:\nrabbbit\nrabbit\n\noutput:\n3\n```',
       'text = input().strip()\ntarget = input().strip()\n\n'
       '# print the number of ways\n',
       'text = input().strip()\ntarget = input().strip()\n'
       'ways = [1] + [0] * len(target)\n'
       'for ch in text:\n'
       '    for j in range(len(target), 0, -1):\n'
       '        if target[j - 1] == ch:\n            ways[j] += ways[j - 1]\n'
       'print(ways[-1])\n',
       ['rabbbit\nrabbit', 'babgbag\nbag'],
       ['abc\nabc', 'aaa\na', 'abc\nd', 'aaaa\naa'],
       constraints='1 <= lengths <= 500.'),

    _c('burst-balloons-max', 'Best Order to Remove', ['dynamic-programming'],
       'Remove the values one at a time. Removing the value at position `i` scores '
       'the product of its two current neighbours and itself, where a missing '
       'neighbour counts as 1. Print the greatest total score.\n\n'
       + IO_N_LIST + 'The greatest score.\n\n'
       '**Example**\n\n```\ninput:\n4\n3 1 5 8\n\noutput:\n167\n```',
       N_LIST + '\n# print the greatest score\n',
       N_LIST + 'a = [1] + values + [1]\n'
       'n = len(a)\n'
       'best = [[0] * n for _ in range(n)]\n'
       'for length in range(2, n):\n'
       '    for left in range(0, n - length):\n'
       '        right = left + length\n'
       '        for k in range(left + 1, right):\n'
       '            score = a[left] * a[k] * a[right] + best[left][k] + best[k][right]\n'
       '            best[left][right] = max(best[left][right], score)\n'
       'print(best[0][n - 1])\n',
       ['4\n3 1 5 8', '1\n5'],
       ['2\n1 5', '3\n1 1 1', '3\n9 2 7', '5\n1 2 3 4 5'],
       constraints='1 <= n <= 100.',
       hints=['Think about which value is removed LAST in a range, not first.']),

    _c('longest-valid-substring-k-distinct', 'Longest Stretch With K Distinct',
       ['string', 'sliding-window', 'hash-map'],
       'Print the length of the longest stretch of consecutive characters containing '
       'at most `k` distinct characters.\n\n'
       '**Input**\n\n- line 1: the text\n- line 2: `k`\n\n**Output**\n\nThe length.\n\n'
       '**Example**\n\n```\ninput:\neceba\n2\n\noutput:\n3\n```',
       's = input().strip()\nk = int(input())\n\n# print the length\n',
       's = input().strip()\nk = int(input())\n'
       'counts = {}\nstart = best = 0\n'
       'for i, ch in enumerate(s):\n'
       '    counts[ch] = counts.get(ch, 0) + 1\n'
       '    while len(counts) > k:\n'
       '        counts[s[start]] -= 1\n'
       '        if counts[s[start]] == 0:\n            del counts[s[start]]\n'
       '        start += 1\n'
       '    best = max(best, i - start + 1)\n'
       'print(best)\n',
       ['eceba\n2', 'aa\n1'],
       ['abc\n3', 'abaccc\n2', 'a\n1', 'abcdef\n1'],
       constraints='1 <= k <= 26.'),

    _c('minimum-difference-partition', 'Split Into Two Closest Halves',
       ['dynamic-programming'],
       'Split the values into two groups and print the smallest possible difference '
       'between the two group totals. Every value must go into one group.\n\n'
       + IO_N_LIST + 'The smallest difference.\n\n'
       '**Example**\n\n```\ninput:\n4\n1 6 11 5\n\noutput:\n1\n```',
       N_LIST + '\n# print the smallest difference\n',
       N_LIST + 'total = sum(values)\n'
       'reachable = {0}\n'
       'for v in values:\n'
       '    reachable |= {r + v for r in reachable}\n'
       'best = min(abs(total - 2 * r) for r in reachable)\n'
       'print(best)\n',
       ['4\n1 6 11 5', '2\n1 1'],
       ['1\n7', '3\n1 2 3', '4\n10 10 10 10', '5\n1 1 1 1 5'],
       constraints='1 <= n <= 20, values are non-negative.'),

    _c('shortest-common-supersequence-len', 'Shortest String Containing Both',
       ['dynamic-programming', 'string'],
       'Print the length of the shortest string that contains both words as '
       'subsequences.\n\n'
       '**Input**\n\n- line 1: the first word\n- line 2: the second\n\n'
       '**Output**\n\nThe length.\n\n'
       '**Example**\n\n```\ninput:\nabac\ncab\n\noutput:\n5\n```',
       'a = input().strip()\nb = input().strip()\n\n# print the length\n',
       'a = input().strip()\nb = input().strip()\n'
       'prev = [0] * (len(b) + 1)\n'
       'for i in range(1, len(a) + 1):\n'
       '    cur = [0] * (len(b) + 1)\n'
       '    for j in range(1, len(b) + 1):\n'
       '        cur[j] = prev[j - 1] + 1 if a[i - 1] == b[j - 1] else max(prev[j], cur[j - 1])\n'
       '    prev = cur\n'
       'print(len(a) + len(b) - prev[-1])\n',
       ['abac\ncab', 'abc\nabc'],
       ['a\nb', 'aaa\naa', 'abcd\nefgh', 'xyz\nzyx'],
       hints=['The answer is the two lengths minus their longest shared '
              'subsequence.']),

    _c('number-of-ways-to-decode', 'Ways to Read the Code',
       ['dynamic-programming', 'string'],
       'Digits map to letters as 1 to A, 2 to B, up to 26 to Z. Print how many ways '
       'the digit string can be read as letters. A part starting with `0` is not '
       'valid.\n\n**Input**\n\nOne string of digits.\n\n**Output**\n\nThe number of '
       'ways.\n\n**Example**\n\n```\ninput:\n226\n\noutput:\n3\n```',
       's = input().strip()\n\n# print the number of ways\n',
       's = input().strip()\n'
       'prev2, prev1 = 1, (1 if s[0] != "0" else 0)\n'
       'for i in range(1, len(s)):\n'
       '    cur = 0\n'
       '    if s[i] != "0":\n        cur += prev1\n'
       '    if 10 <= int(s[i - 1:i + 1]) <= 26:\n        cur += prev2\n'
       '    prev2, prev1 = prev1, cur\n'
       'print(prev1)\n',
       ['226', '06'],
       ['1', '10', '2101', '11106'],
       constraints='1 <= length <= 100.'),

    _c('minimum-jumps-to-end', 'Fewest Jumps to the End', ['array', 'greedy'],
       'Each value says how far you may jump forward from that position. Print the '
       'fewest jumps to reach the last position, or `-1` if it cannot be reached.\n\n'
       + IO_N_LIST + 'The fewest jumps, or `-1`.\n\n'
       '**Example**\n\n```\ninput:\n5\n2 3 1 1 4\n\noutput:\n2\n```',
       N_LIST + '\n# print the fewest jumps, or -1\n',
       N_LIST + 'n = len(values)\n'
       'if n == 1:\n    print(0)\n'
       'else:\n'
       '    jumps = 0\n    current_end = furthest = 0\n    ok = True\n'
       '    for i in range(n - 1):\n'
       '        if i > furthest:\n            ok = False\n            break\n'
       '        furthest = max(furthest, i + values[i])\n'
       '        if i == current_end:\n            jumps += 1\n            current_end = furthest\n'
       '    print(jumps if ok and furthest >= n - 1 else -1)\n',
       ['5\n2 3 1 1 4', '3\n0 1 1'],
       ['1\n0', '2\n1 0', '4\n2 3 0 1', '5\n1 1 1 1 1']),

    _c('unique-binary-search-trees', 'How Many Shapes of Tree',
       ['dynamic-programming', 'math', 'tree'],
       'Print how many structurally different binary search trees can hold the values '
       '1 to `n`.\n\n**Input**\n\nOne integer `n`.\n\n**Output**\n\nThe count.\n\n'
       '**Example**\n\n```\ninput:\n3\n\noutput:\n5\n```',
       'n = int(input())\n\n# print the count\n',
       'n = int(input())\n'
       'counts = [1] + [0] * n\n'
       'for size in range(1, n + 1):\n'
       '    for root in range(size):\n'
       '        counts[size] += counts[root] * counts[size - 1 - root]\n'
       'print(counts[n])\n',
       ['3', '1'],
       ['0', '2', '10', '15'],
       constraints='0 <= n <= 19.'),

    _c('gas-station-start', 'Where to Start the Circuit', ['array', 'greedy'],
       'Stations are arranged in a circle. At station `i` you gain `gas[i]` and '
       'spend `cost[i]` to reach the next. Print the index of the only station you '
       'can start from and complete the circuit, or `-1` if there is none.\n\n'
       '**Input**\n\n- line 1: `n`\n- line 2: `n` gas values\n- line 3: `n` cost '
       'values\n\n**Output**\n\nThe starting index, or `-1`.\n\n'
       '**Example**\n\n```\ninput:\n5\n1 2 3 4 5\n3 4 5 1 2\n\noutput:\n3\n```',
       'n = int(input())\ngas = list(map(int, input().split()))\n'
       'cost = list(map(int, input().split()))\n\n'
       '# print the starting index, or -1\n',
       'n = int(input())\ngas = list(map(int, input().split()))\n'
       'cost = list(map(int, input().split()))\n'
       'if sum(gas) < sum(cost):\n    print(-1)\n'
       'else:\n'
       '    start = tank = 0\n'
       '    for i in range(n):\n'
       '        tank += gas[i] - cost[i]\n'
       '        if tank < 0:\n            start = i + 1\n            tank = 0\n'
       '    print(start)\n',
       ['5\n1 2 3 4 5\n3 4 5 1 2', '3\n2 3 4\n3 4 3'],
       ['1\n5\n4', '1\n1\n2', '2\n1 2\n2 1', '4\n5 1 2 3\n4 4 1 5']),

    _c('candy-distribution', 'Fewest Sweets to Hand Out', ['array', 'greedy'],
       'Each child has a rating. Every child gets at least one sweet, and a child '
       'rated higher than a neighbour must get more than that neighbour. Print the '
       'fewest sweets needed.\n\n' + IO_N_LIST + 'The fewest sweets.\n\n'
       '**Example**\n\n```\ninput:\n3\n1 0 2\n\noutput:\n5\n```',
       N_LIST + '\n# print the fewest sweets\n',
       N_LIST + 'n = len(values)\n'
       'sweets = [1] * n\n'
       'for i in range(1, n):\n'
       '    if values[i] > values[i - 1]:\n        sweets[i] = sweets[i - 1] + 1\n'
       'for i in range(n - 2, -1, -1):\n'
       '    if values[i] > values[i + 1]:\n'
       '        sweets[i] = max(sweets[i], sweets[i + 1] + 1)\n'
       'print(sum(sweets))\n',
       ['3\n1 0 2', '3\n1 2 2'],
       ['1\n5', '4\n1 2 3 4', '4\n4 3 2 1', '5\n1 3 2 2 1'],
       hints=['Sweep left to right, then right to left, and take the larger of the '
              'two demands.']),

    _c('word-search-in-grid', 'Find the Word in the Grid',
       ['backtracking', 'matrix', 'string'],
       'The grid holds single letters, given as numbers 0 to 25 for a to z. Print '
       '`true` if the word can be spelled by moving up, down, left or right without '
       'reusing a cell, and `false` otherwise.\n\n'
       '**Input**\n\n- line 1: `r` and `c`\n- next `r` lines: `c` numbers\n'
       '- last line: the word in lower case\n\n**Output**\n\n`true` or `false`\n\n'
       '**Example**\n\n```\ninput:\n2 2\n0 1\n2 3\nabd\n\noutput:\ntrue\n```',
       GRID_IN + 'word = input().strip()\n\n# print true or false\n',
       GRID_IN + 'word = input().strip()\n'
       'letters = [[chr(ord("a") + v) for v in row] for row in grid]\n'
       'def search(y, x, k, used):\n'
       '    if k == len(word):\n        return True\n'
       '    if not (0 <= y < r and 0 <= x < c) or (y, x) in used:\n        return False\n'
       '    if letters[y][x] != word[k]:\n        return False\n'
       '    used.add((y, x))\n'
       '    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):\n'
       '        if search(y + dy, x + dx, k + 1, used):\n            return True\n'
       '    used.remove((y, x))\n'
       '    return False\n'
       'found = any(search(i, j, 0, set()) for i in range(r) for j in range(c))\n'
       'print("true" if found else "false")\n',
       ['2 2\n0 1\n2 3\nabd', '2 2\n0 1\n2 3\nabc'],
       ['1 1\n0\na', '1 1\n0\nb', '2 2\n0 0\n0 0\naaaa', '1 3\n0 1 2\nabc']),

    _c('lru-cache-final-state', 'What Survives in the Cache', ['hash-map', 'design'],
       'A cache holds at most `k` keys. Reading or writing a key makes it the most '
       'recently used; when the cache is full, the least recently used key is '
       'dropped. Print the keys remaining after all the operations, most recently '
       'used first, space-separated.\n\n'
       '**Input**\n\n- line 1: `k` and `n`\n- line 2: `n` keys, in the order they '
       'are used\n\n**Output**\n\nThe surviving keys.\n\n'
       '**Example**\n\n```\ninput:\n2 4\n1 2 1 3\n\noutput:\n3 1\n```',
       'k, n = map(int, input().split())\nkeys = list(map(int, input().split()))\n\n'
       '# print the surviving keys, most recent first\n',
       'k, n = map(int, input().split())\nkeys = list(map(int, input().split()))\n'
       'order = []\n'
       'for key in keys:\n'
       '    if key in order:\n        order.remove(key)\n'
       '    order.append(key)\n'
       '    if len(order) > k:\n        order.pop(0)\n'
       'print(" ".join(map(str, reversed(order))))\n',
       ['2 4\n1 2 1 3', '1 3\n1 2 3'],
       ['3 3\n1 2 3', '2 5\n1 1 1 1 1', '2 6\n1 2 3 1 2 3', '3 5\n1 2 3 4 2']),

    _c('longest-arithmetic-run', 'Longest Evenly Spaced Run', ['array', 'dynamic-programming'],
       'Print the length of the longest run of consecutive values with a constant '
       'difference between neighbours. Any two values count as such a run.\n\n'
       + IO_N_LIST + 'The length.\n\n'
       '**Example**\n\n```\ninput:\n5\n3 6 9 12 20\n\noutput:\n4\n```',
       N_LIST + '\n# print the length\n',
       N_LIST + 'if len(values) < 3:\n    print(len(values))\n'
       'else:\n'
       '    best = run = 2\n'
       '    gap = values[1] - values[0]\n'
       '    for i in range(2, len(values)):\n'
       '        if values[i] - values[i - 1] == gap:\n            run += 1\n'
       '        else:\n'
       '            gap = values[i] - values[i - 1]\n            run = 2\n'
       '        best = max(best, run)\n'
       '    print(best)\n',
       ['5\n3 6 9 12 20', '2\n1 5'],
       ['1\n7', '4\n1 2 4 8', '5\n5 5 5 5 5', '6\n1 3 5 7 9 11']),

    _c('count-smaller-after-self-total', 'How Many Smaller Follow',
       ['sorting', 'divide-and-conquer', 'array'],
       'For each position, count how many later values are smaller than it, and print '
       'the total of those counts.\n\n' + IO_N_LIST + 'The total.\n\n'
       '**Example**\n\n```\ninput:\n4\n5 2 6 1\n\noutput:\n4\n```\n\n'
       '5 has two smaller after it, 2 has one, 6 has one, 1 has none.',
       N_LIST + '\n# print the total\n',
       N_LIST + 'import bisect\n'
       'seen = []\ntotal = 0\n'
       'for v in reversed(values):\n'
       '    i = bisect.bisect_left(seen, v)\n'
       '    total += i\n'
       '    seen.insert(i, v)\n'
       'print(total)\n',
       ['4\n5 2 6 1', '3\n1 2 3'],
       ['1\n5', '3\n3 2 1', '4\n2 2 2 2', '5\n5 4 3 2 1'],
       constraints='1 <= n <= 20000.'),

    _c('interleaving-strings', 'Can They Be Interleaved',
       ['dynamic-programming', 'string'],
       'Print `true` if the third line can be formed by interleaving the first two, '
       'keeping the order within each, and `false` otherwise.\n\n'
       '**Input**\n\n- line 1: the first word\n- line 2: the second\n'
       '- line 3: the candidate\n\n**Output**\n\n`true` or `false`\n\n'
       '**Example**\n\n```\ninput:\naabcc\ndbbca\naadbbcbcac\n\noutput:\ntrue\n```',
       'a = input().strip()\nb = input().strip()\nc = input().strip()\n\n'
       '# print true or false\n',
       'a = input().strip()\nb = input().strip()\nc = input().strip()\n'
       'if len(a) + len(b) != len(c):\n    print("false")\n'
       'else:\n'
       '    ok = [[False] * (len(b) + 1) for _ in range(len(a) + 1)]\n'
       '    ok[0][0] = True\n'
       '    for i in range(len(a) + 1):\n'
       '        for j in range(len(b) + 1):\n'
       '            if i and ok[i - 1][j] and a[i - 1] == c[i + j - 1]:\n'
       '                ok[i][j] = True\n'
       '            if j and ok[i][j - 1] and b[j - 1] == c[i + j - 1]:\n'
       '                ok[i][j] = True\n'
       '    print("true" if ok[len(a)][len(b)] else "false")\n',
       ['aabcc\ndbbca\naadbbcbcac', 'aabcc\ndbbca\naadbbbaccc'],
       ['a\nb\nab', 'a\nb\nba', 'ab\ncd\nacbd', 'abc\nde\nabcde']),

    _c('minimum-cost-climbing', 'Cheapest Way Up the Steps',
       ['dynamic-programming', 'array'],
       'Each value is the cost of stepping on that step. You may start at step 0 or 1 '
       'and climb one or two steps at a time. Print the least total cost to get past '
       'the last step.\n\n' + IO_N_LIST + 'The least cost.\n\n'
       '**Example**\n\n```\ninput:\n3\n10 15 20\n\noutput:\n15\n```',
       N_LIST + '\n# print the least cost\n',
       N_LIST + 'a, b = 0, 0\n'
       'for i in range(2, len(values) + 1):\n'
       '    a, b = b, min(b + values[i - 1], a + values[i - 2])\n'
       'print(b)\n',
       ['3\n10 15 20', '10\n1 100 1 1 1 100 1 1 100 1'],
       ['2\n1 2', '2\n5 5', '4\n0 0 0 0', '5\n1 2 3 4 5']),

    _c('maximal-square-in-grid', 'Largest Solid Square', ['dynamic-programming', 'matrix'],
       'The grid holds 0s and 1s. Print the area of the largest square made entirely '
       'of 1s.\n\n**Input**\n\n- line 1: `r` and `c`\n- next `r` lines: `c` values\n\n'
       '**Output**\n\nThe area.\n\n'
       '**Example**\n\n```\ninput:\n3 4\n1 0 1 0\n1 0 1 1\n1 1 1 1\n\noutput:\n4\n```',
       GRID_IN + '\n# print the area of the largest solid square\n',
       GRID_IN + 'best = 0\n'
       'sizes = [[0] * c for _ in range(r)]\n'
       'for i in range(r):\n'
       '    for j in range(c):\n'
       '        if grid[i][j] == 1:\n'
       '            if i == 0 or j == 0:\n                sizes[i][j] = 1\n'
       '            else:\n'
       '                sizes[i][j] = 1 + min(sizes[i - 1][j], sizes[i][j - 1],\n'
       '                                      sizes[i - 1][j - 1])\n'
       '            best = max(best, sizes[i][j])\n'
       'print(best * best)\n',
       ['3 4\n1 0 1 0\n1 0 1 1\n1 1 1 1', '1 1\n0'],
       ['1 1\n1', '2 2\n1 1\n1 1', '2 3\n0 0 0\n0 0 0', '3 3\n1 1 1\n1 1 1\n1 1 1']),

    _c('rearrange-no-adjacent-same', 'Can It Be Rearranged Apart',
       ['string', 'greedy', 'hash-map'],
       'Print `true` if the characters can be rearranged so no two identical '
       'characters sit next to each other, and `false` otherwise.\n\n'
       '**Input**\n\nOne line of lowercase letters.\n\n'
       '**Output**\n\n`true` or `false`\n\n'
       '**Example**\n\n```\ninput:\naab\n\noutput:\ntrue\n```',
       's = input().strip()\n\n# print true or false\n',
       's = input().strip()\n'
       'counts = {}\n'
       'for ch in s:\n    counts[ch] = counts.get(ch, 0) + 1\n'
       'print("true" if max(counts.values()) <= (len(s) + 1) // 2 else "false")\n',
       ['aab', 'aaab'],
       ['a', 'aa', 'abab', 'aaabbb'],
       hints=['Compare the most common character against half the length, rounded '
              'up.']),

    _c('longest-zigzag-run', 'Longest Alternating Run', ['array', 'dynamic-programming'],
       'A run alternates between rising and falling at every step. Print the length '
       'of the longest such run of consecutive values.\n\n'
       + IO_N_LIST + 'The length.\n\n'
       '**Example**\n\n```\ninput:\n6\n1 7 4 9 2 5\n\noutput:\n6\n```',
       N_LIST + '\n# print the length\n',
       N_LIST + 'if len(values) < 2:\n    print(len(values))\n'
       'else:\n'
       '    best = up = down = 1\n'
       '    for i in range(1, len(values)):\n'
       '        if values[i] > values[i - 1]:\n            up = down + 1\n'
       '        elif values[i] < values[i - 1]:\n            down = up + 1\n'
       '        best = max(best, up, down)\n'
       '    print(best)\n',
       ['6\n1 7 4 9 2 5', '4\n1 2 3 4'],
       ['1\n5', '2\n1 1', '5\n5 5 5 5 5', '5\n1 3 2 4 3']),

    _c('sum-of-subset-count', 'How Many Subsets Reach the Total',
       ['dynamic-programming'],
       'Print how many subsets of the values add up exactly to the target. The empty '
       'subset counts when the target is 0.\n\n'
       '**Input**\n\n- line 1: `n`\n- line 2: `n` non-negative integers\n'
       '- line 3: the target\n\n**Output**\n\nThe number of subsets.\n\n'
       '**Example**\n\n```\ninput:\n4\n1 1 2 3\n4\n\noutput:\n3\n```',
       N_LIST + 'target = int(input())\n\n# print the number of subsets\n',
       N_LIST + 'target = int(input())\n'
       'ways = [1] + [0] * target\n'
       'for v in values:\n'
       '    for t in range(target, v - 1, -1):\n        ways[t] += ways[t - v]\n'
       'print(ways[target])\n',
       ['4\n1 1 2 3\n4', '3\n1 2 3\n7'],
       ['1\n0\n0', '3\n1 1 1\n2', '4\n2 2 2 2\n4', '5\n1 2 3 4 5\n5'],
       constraints='1 <= n <= 100, 0 <= target <= 10000.'),

    _c('minimum-platforms', 'How Many Platforms Are Needed', ['sorting', 'greedy'],
       'Given arrival and departure times of trains, print the fewest platforms '
       'needed so no train waits. A train arriving exactly when another departs still '
       'needs its own platform.\n\n'
       '**Input**\n\n- line 1: `n`\n- line 2: `n` arrival times\n'
       '- line 3: `n` departure times\n\n**Output**\n\nThe fewest platforms.\n\n'
       '**Example**\n\n```\ninput:\n3\n900 940 950\n910 1200 1120\n\noutput:\n2\n```',
       'n = int(input())\narrive = list(map(int, input().split()))\n'
       'leave = list(map(int, input().split()))\n\n# print the fewest platforms\n',
       'n = int(input())\narrive = sorted(map(int, input().split()))\n'
       'leave = sorted(map(int, input().split()))\n'
       'i = j = current = best = 0\n'
       'while i < n:\n'
       '    if arrive[i] <= leave[j]:\n'
       '        current += 1\n        i += 1\n        best = max(best, current)\n'
       '    else:\n        current -= 1\n        j += 1\n'
       'print(best)\n',
       ['3\n900 940 950\n910 1200 1120', '1\n100\n200'],
       ['2\n100 200\n150 250', '2\n100 300\n200 400', '3\n1 2 3\n10 11 12',
        '4\n100 100 100 100\n200 200 200 200']),

    _c('reconstruct-from-preorder-depth', 'Depth From a Traversal',
       ['tree', 'stack'],
       'A tree is described by a preorder walk: each line gives a depth and a value, '
       'with the root at depth 0 and every child one deeper than its parent. Print '
       'the largest value found at the deepest level.\n\n'
       '**Input**\n\n- line 1: `n`\n- next `n` lines: depth and value\n\n'
       '**Output**\n\nThe largest value at the deepest level.\n\n'
       '**Example**\n\n```\ninput:\n3\n0 1\n1 5\n1 9\n\noutput:\n9\n```',
       'n = int(input())\nnodes = [tuple(map(int, input().split())) for _ in range(n)]\n\n'
       '# print the largest value at the deepest level\n',
       'n = int(input())\n'
       'deepest = -1\nbest = None\n'
       'for _ in range(n):\n'
       '    depth, value = map(int, input().split())\n'
       '    if depth > deepest:\n        deepest = depth\n        best = value\n'
       '    elif depth == deepest and value > best:\n        best = value\n'
       'print(best)\n',
       ['3\n0 1\n1 5\n1 9', '1\n0 7'],
       ['4\n0 1\n1 2\n2 3\n1 4', '2\n0 5\n1 5', '5\n0 0\n1 1\n1 2\n1 3\n1 4',
        '3\n0 9\n1 1\n2 -5']),

    _c('max-events-attended', 'Most Events You Can Attend', ['sorting', 'greedy', 'heap'],
       'Each event runs from a start day to an end day, and you may attend one event '
       'per day. Print the most events you can attend.\n\n'
       '**Input**\n\n- line 1: `n`\n- next `n` lines: start and end day\n\n'
       '**Output**\n\nThe most events.\n\n'
       '**Example**\n\n```\ninput:\n3\n1 2\n2 3\n3 4\n\noutput:\n3\n```',
       'n = int(input())\nevents = [tuple(map(int, input().split())) for _ in range(n)]\n\n'
       '# print the most events\n',
       'n = int(input())\n'
       'events = sorted(tuple(map(int, input().split())) for _ in range(n))\n'
       'import heapq\n'
       'q, i, attended = [], 0, 0\n'
       'day = events[0][0]\n'
       'while i < n or q:\n'
       '    while i < n and events[i][0] <= day:\n'
       '        heapq.heappush(q, events[i][1])\n        i += 1\n'
       '    while q and q[0] < day:\n        heapq.heappop(q)\n'
       '    if q:\n        heapq.heappop(q)\n        attended += 1\n'
       '    elif i < n:\n        day = events[i][0] - 1\n'
       '    day += 1\n'
       'print(attended)\n',
       ['3\n1 2\n2 3\n3 4', '1\n1 1'],
       ['2\n1 1\n1 1', '3\n1 5\n1 5\n1 5', '2\n1 2\n5 6', '4\n1 4\n4 4\n2 2\n3 4']),

    _c('smallest-range-covering-lists', 'Smallest Range Touching Every List',
       ['heap', 'sorting', 'sliding-window'],
       'Given `k` sorted lists, find the smallest range that contains at least one '
       'value from each, and print its start and end separated by a space. If several '
       'ranges are equally small, print the one starting earliest.\n\n'
       '**Input**\n\n- line 1: `k`\n- next `k` lines: `n` then `n` sorted integers\n\n'
       '**Output**\n\nThe range start and end.\n\n'
       '**Example**\n\n```\ninput:\n3\n3 4 10 15\n3 1 9 12\n3 5 18 22\n\n'
       'output:\n4 9\n```',
       'k = int(input())\nlists = []\n'
       'for _ in range(k):\n    parts = list(map(int, input().split()))\n'
       '    lists.append(parts[1:])\n\n# print the range start and end\n',
       'k = int(input())\n'
       'points = []\n'
       'for idx in range(k):\n'
       '    parts = list(map(int, input().split()))\n'
       '    for v in parts[1:]:\n        points.append((v, idx))\n'
       'points.sort()\n'
       'counts = {}\ncovered = 0\nstart = 0\nbest = None\n'
       'for i, (value, idx) in enumerate(points):\n'
       '    counts[idx] = counts.get(idx, 0) + 1\n'
       '    if counts[idx] == 1:\n        covered += 1\n'
       '    while covered == k:\n'
       '        span = (points[i][0] - points[start][0], points[start][0], points[i][0])\n'
       '        if best is None or span[0] < best[0]:\n            best = span\n'
       '        first = points[start][1]\n'
       '        counts[first] -= 1\n'
       '        if counts[first] == 0:\n            covered -= 1\n'
       '        start += 1\n'
       'print(best[1], best[2])\n',
       ['3\n3 4 10 15\n3 1 9 12\n3 5 18 22', '2\n1 1\n1 1'],
       ['2\n2 1 5\n2 2 6', '1\n3 1 2 3', '3\n1 1\n1 2\n1 3',
        '2\n3 1 10 20\n3 5 15 25']),
]
