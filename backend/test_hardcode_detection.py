"""
Verification suite for CodeExecutor hardcoded-output detection.
Run: venv/Scripts/python.exe test_hardcode_detection.py
"""
import sys
sys.path.insert(0, '.')
from apps.learning.code_executor import CodeExecutor

ex = CodeExecutor()
add_tests = [
    {"input": "5\n3", "expected_output": "8"},
    {"input": "10\n2", "expected_output": "12", "is_hidden": True},
]

fizz_algo = (
    'n=int(input())\n'
    'out=[]\n'
    'for i in range(1,n+1):\n'
    '    if i%3==0:\n'
    '        out.append("Fizz")\n'
    '    else:\n'
    '        out.append(str(i))\n'
    'print("\\n".join(out))\n'
)
parity = 'n=int(input())\nprint("YES" if n%2==0 else "NO")'
multiline_hardcode = 'input()\nprint("1\\n2\\nFizz")'

cases = [
    ("pure-output print (no input) -> ACCEPT", 'print("Hello World")',
     [{"input": "", "expected_output": "Hello World"}], True),
    ("legit input algorithm -> ACCEPT", 'a=int(input())\nb=int(input())\nprint(a+b)',
     add_tests, True),
    ("legit function solution -> ACCEPT", 'def add(a,b):\n    return a+b',
     add_tests, True),
    ("hardcoded print, ignores input -> REJECT", 'print("8")',
     [{"input": "5\n3", "expected_output": "8"}], False),
    ("cheese function returning literal -> REJECT", 'def add(a,b):\n    return 8',
     [{"input": "5\n3", "expected_output": "8"}], False),
    ("multi-line hardcode with input read -> REJECT", multiline_hardcode,
     [{"input": "3", "expected_output": "1\n2\nFizz"}], False),
    ("fizzbuzz literals in real algorithm -> ACCEPT", fizz_algo,
     [{"input": "3", "expected_output": "1\n2\nFizz"}], True),
    ("YES/NO predicate with literals -> ACCEPT", parity,
     [{"input": "4", "expected_output": "YES"}, {"input": "7", "expected_output": "NO"}], True),
]

failures = 0
for name, code, tests, want in cases:
    r = ex.run('python', code, tests)
    ok = r['all_passed'] == want
    print(('PASS' if ok else 'FAIL'), '|', name, '| all_passed =', r['all_passed'], '| status =', r['status'])
    if not ok:
        failures += 1
        for res in r['results']:
            print('   ', res.get('error'), '|', repr(res.get('stdout'))[:50], '|', (res.get('stderr') or '')[:100])

# A branch-lookup over visible tests reacts to input like a real predicate does,
# so reference-free probing can't convict it alone — hidden test cases break it.
lookup = 'x=input()\ny=input()\nif x=="5":\n    print("8")\nelse:\n    print("12")'
r = ex.run('python', lookup, add_tests + [{"input": "100\n1", "expected_output": "101", "is_hidden": True}])
ok = not r['all_passed']
print(('PASS' if ok else 'FAIL'), '| lookup cheese vs hidden test -> REJECT | all_passed =', r['all_passed'])
if not ok:
    failures += 1

print('---')
print('FAILURES:', failures)
sys.exit(1 if failures else 0)
