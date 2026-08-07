"""Medium coding challenges, continued. Same conventions as `medium.py`."""

from .medium import _c, IO_N_LIST, N_LIST

CHALLENGES = [
    _c('first-missing-positive-small', 'Smallest Missing Positive',
       ['array', 'hash-map'],
       'Print the smallest positive integer that does not appear in the list.\n\n'
       + IO_N_LIST + 'The smallest missing positive integer.\n\n'
       '**Example**\n\n```\ninput:\n3\n3 4 -1\n\noutput:\n1\n```',
       N_LIST + '\n# print the smallest missing positive integer\n',
       N_LIST + 'present = set(values)\n'
       'candidate = 1\n'
       'while candidate in present:\n    candidate += 1\n'
       'print(candidate)\n',
       ['3\n3 4 -1', '3\n1 2 0'],
       ['1\n1', '1\n2', '5\n1 2 3 4 5', '4\n-1 -2 -3 -4'],
       constraints='1 <= n <= 100000.'),

    _c('summary-ranges', 'Summarise the Runs', ['array', 'string'],
       'The values are sorted and distinct. Describe them as ranges: a single value '
       'as itself, and a run of consecutive values as `start-end`. Print the '
       'descriptions space-separated.\n\n' + IO_N_LIST + 'The ranges.\n\n'
       '**Example**\n\n```\ninput:\n6\n0 1 2 4 5 7\n\noutput:\n0-2 4-5 7\n```',
       N_LIST + '\n# print the ranges\n',
       N_LIST + 'out = []\ni = 0\n'
       'while i < len(values):\n'
       '    start = i\n'
       '    while i + 1 < len(values) and values[i + 1] == values[i] + 1:\n        i += 1\n'
       '    out.append(str(values[start]) if start == i\n'
       '               else f"{values[start]}-{values[i]}")\n'
       '    i += 1\n'
       'print(" ".join(out))\n',
       ['6\n0 1 2 4 5 7', '1\n5'],
       ['3\n1 3 5', '4\n1 2 3 4', '5\n-3 -2 -1 5 6', '2\n0 2']),

    _c('majority-value-over-half', 'The Value in More Than Half',
       ['array', 'greedy'],
       'One value appears in more than half the positions. Print it.\n\n'
       + IO_N_LIST + 'The majority value.\n\n'
       '**Example**\n\n```\ninput:\n7\n2 2 1 1 1 2 2\n\noutput:\n2\n```',
       N_LIST + '\n# print the majority value\n',
       N_LIST + 'candidate, count = None, 0\n'
       'for v in values:\n'
       '    if count == 0:\n        candidate = v\n'
       '    count += 1 if v == candidate else -1\n'
       'print(candidate)\n',
       ['7\n2 2 1 1 1 2 2', '3\n3 2 3'],
       ['1\n9', '5\n1 1 1 2 2', '5\n-1 -1 -1 0 0', '7\n4 4 4 4 1 2 3'],
       hints=['Keep a candidate and a running count that cancels out.']),

    _c('zigzag-string-rows', 'Read a Zigzag by Rows', ['string'],
       'Write the text in a zigzag across `k` rows — down the rows then diagonally '
       'back up — then read it row by row. Print the result.\n\n'
       '**Input**\n\n- line 1: the text\n- line 2: `k`\n\n'
       '**Output**\n\nThe text read by rows.\n\n'
       '**Example**\n\n```\ninput:\nPAYPALISHIRING\n3\n\noutput:\nPAHNAPLSIIGYIR\n```',
       's = input().strip()\nk = int(input())\n\n# print the text read by rows\n',
       's = input().strip()\nk = int(input())\n'
       'if k == 1:\n    print(s)\n'
       'else:\n'
       '    rows = [""] * k\n'
       '    row, step = 0, 1\n'
       '    for ch in s:\n'
       '        rows[row] += ch\n'
       '        if row == 0:\n            step = 1\n'
       '        elif row == k - 1:\n            step = -1\n'
       '        row += step\n'
       '    print("".join(rows))\n',
       ['PAYPALISHIRING\n3', 'AB\n1'],
       ['ABC\n2', 'ABCDE\n4', 'A\n3', 'ABCDEFG\n3']),

    _c('longest-word-in-dictionary', 'Longest Word You Can Build', ['string', 'sorting'],
       'Print the longest word in the list that can be built one letter at a time, '
       'where every shorter prefix is also in the list. If several are equally long, '
       'print whichever comes first alphabetically. Print `none` if there is no such '
       'word.\n\n**Input**\n\n- line 1: `n`\n- line 2: `n` space-separated words\n\n'
       '**Output**\n\nThe word, or `none`.\n\n'
       '**Example**\n\n```\ninput:\n5\nw wo wor worl world\n\noutput:\nworld\n```',
       'n = int(input())\nwords = input().split()\n\n# print the word, or none\n',
       'n = int(input())\nwords = input().split()\n'
       'present = set(words)\nbest = ""\n'
       'for w in sorted(words):\n'
       '    if all(w[:i] in present for i in range(1, len(w))):\n'
       '        if len(w) > len(best):\n            best = w\n'
       'print(best if best else "none")\n',
       ['5\nw wo wor worl world', '4\na banana app appl'],
       ['1\na', '1\nab', '3\na ab abc', '4\nb br bre brea']),
]
