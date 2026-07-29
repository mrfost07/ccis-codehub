"""
Code Execution Engine — Phase 2
=================================
Runs student-submitted code against test cases in a sandboxed subprocess.
Supports Python, JavaScript (Node.js), Java, and C++.

Security (best-effort, NOT a true sandbox):
  - All code runs in a subprocess with a hard wall-clock timeout (TIMEOUT seconds).
  - Stdin/stdout are piped and output is capped at MAX_OUTPUT_BYTES.
  - On POSIX, a CPU-time rlimit is applied as a second line of defence against
    busy loops that fork or otherwise evade the wall-clock timeout.
  - This does NOT provide filesystem, network, or memory isolation. For untrusted
    code in production, run behind Judge0 or a Docker/gVisor sandbox.

Performance improvement (v2):
  - Java and C++ are compiled ONCE per submission, not once per test case.
"""

import subprocess
import tempfile
import os
import re
import sys
import logging
from typing import Any

logger = logging.getLogger(__name__)

TIMEOUT = 5        # seconds per test case execution
COMPILE_TIMEOUT = 15  # seconds for compilation step
MAX_OUTPUT_BYTES = 16_384  # 16 KB


def _sandbox_env() -> dict:
    """
    Minimal environment for student code.

    Submitted code inherits the server's environment by default, so a
    "solution" of `print(os.environ["DATABASE_URL"])` would hand the student
    full Postgres credentials, DJANGO_SECRET_KEY and every API key. Pass only
    what an interpreter genuinely needs to start.
    """
    keep = ('PATH', 'SYSTEMROOT', 'COMSPEC', 'LANG', 'LC_ALL', 'TMPDIR', 'TEMP', 'TMP')
    env = {k: os.environ[k] for k in keep if k in os.environ}
    env.setdefault('PATH', '/usr/local/bin:/usr/bin:/bin')
    # Keep interpreters from importing anything outside the temp dir.
    env['PYTHONPATH'] = ''            # no imports from the server's site-packages
    env['PYTHONDONTWRITEBYTECODE'] = '1'
    env['NODE_OPTIONS'] = ''          # ignore any inherited node flags
    # PYTHONHOME is deliberately left unset — an empty value breaks CPython.
    return env


def _posix_cpu_limit():
    """
    Return a preexec_fn that caps child CPU time on POSIX, or None elsewhere.

    A wall-clock timeout can be dodged by code that spawns work or blocks; a
    CPU-time rlimit sends SIGXCPU when the cap is exceeded. Not available on
    Windows (no os.fork / resource module), where we rely on the wall-clock
    timeout alone.
    """
    if os.name != 'posix':
        return None
    import resource  # POSIX-only

    def _set_limits():
        cpu = TIMEOUT + 2
        resource.setrlimit(resource.RLIMIT_CPU, (cpu, cpu))

    return _set_limits

# Language → (file extension, run command template)
LANG_CONFIG = {
    'python': {
        'ext': '.py',
        'cmd': [sys.executable, '{file}'],
    },
    'javascript': {
        'ext': '.js',
        'cmd': ['node', '{file}'],
    },
    'java': {
        'ext': '.java',
        'compile': ['javac', '{file}'],
        'cmd': ['-cp', '{dir}', '{classname}'],
        'runner': 'java',
    },
    'cpp': {
        'ext': '.cpp',
        'compile': ['g++', '-O2', '-o', '{out}', '{file}'],
        'cmd': ['{out}'],
    },
}


class CodeExecutor:
    """
    Runs submitted code against a list of test cases.

    Compile-once strategy: for Java and C++, the code is compiled a single
    time before running any test cases, so compilation time is paid once
    rather than once per test case.

    test_cases format:
        [
            {"input": "5\\n3\\n", "expected_output": "8"},
            {"input": "0\\n0\\n", "expected_output": "0", "is_hidden": true},
        ]
    """

    def run(self, language: str, code: str, test_cases: list) -> dict:
        """Execute code against all test cases and return aggregated results."""
        if not test_cases:
            return {
                'passed': 0,
                'total': 0,
                'all_passed': False,
                'status': 'no_test_cases',
                'results': [],
            }

        lang = language.lower().strip()
        if lang not in LANG_CONFIG:
            return {
                'passed': 0,
                'total': len(test_cases),
                'all_passed': False,
                'status': 'unsupported_language',
                'results': [],
            }

        config = LANG_CONFIG[lang]

        # Auto-wrap student code with I/O harness (LeetCode-style)
        wrapped_code = self._auto_wrap(lang, code)

        # Use a single temp directory for the entire submission
        with tempfile.TemporaryDirectory() as tmpdir:
            # Write source file
            src_path = os.path.join(tmpdir, f'solution{config["ext"]}')
            with open(src_path, 'w', encoding='utf-8') as f:
                f.write(wrapped_code)

            # Compile once (if language requires it)
            compile_error = self._compile(lang, config, src_path, tmpdir)
            if compile_error:
                # Propagate compile error to all test cases
                results = []
                for i, tc in enumerate(test_cases):
                    results.append({
                        'test_case_index': i,
                        'is_hidden': tc.get('is_hidden', False),
                        'passed': False,
                        'stdout': '',
                        'stderr': compile_error,
                        'error': 'compilation_error',
                        'expected': tc.get('expected_output', ''),
                    })
                return {
                    'passed': 0,
                    'total': len(test_cases),
                    'all_passed': False,
                    'status': 'compilation_error',
                    'results': results,
                }

            # Build the run command once
            run_cmd = self._build_run_cmd(lang, config, src_path, tmpdir)

            # Run each test case
            results = []
            for i, tc in enumerate(test_cases):
                result = self._run_single_with_cmd(
                    run_cmd, tc.get('input', ''), tc.get('expected_output', ''), tmpdir
                )
                result['test_case_index'] = i
                result['is_hidden'] = tc.get('is_hidden', False)
                results.append(result)

            passed = sum(1 for r in results if r['passed'])
            status = 'completed'

            # Anti-hardcode gate: printed output is a valid answer format, but
            # it must be COMPUTED from the input. A submission that passes by
            # printing predetermined answers (never reading the input, or
            # carrying every expected answer as a literal while its output
            # doesn't react to input changes) is demoted to failed.
            if passed == len(results):
                verdict = self._detect_hardcoding(lang, code, test_cases, run_cmd, tmpdir, results)
                if verdict:
                    message = (
                        'Output matches, but the solution appears hardcoded: '
                        'it does not compute the answer from the input. '
                        'Read the input and derive the result with your algorithm '
                        'instead of printing predetermined answers.'
                    )
                    for r, tc in zip(results, test_cases):
                        if (tc.get('input') or '').strip():
                            r['passed'] = False
                            r['error'] = 'hardcoded_output'
                            r['stderr'] = message
                    passed = sum(1 for r in results if r['passed'])
                    status = 'hardcoded_output'

        return {
            'passed': passed,
            'total': len(results),
            'all_passed': passed == len(results) and status == 'completed',
            'status': status,
            'results': results,
        }

    def run_public_only(self, language: str, code: str, test_cases: list) -> dict:
        """Run against public (non-hidden) test cases only — used by the 'Run' endpoint."""
        public_tests = [tc for tc in test_cases if not tc.get('is_hidden', False)]
        return self.run(language, code, public_tests)

    def _run_single_with_cmd(self, cmd: list, stdin_data: str, expected: str, cwd: str) -> dict:
        """Run one test case using an already-compiled command."""
        try:
            proc = subprocess.run(
                cmd,
                input=stdin_data,
                capture_output=True,
                text=True,
                timeout=TIMEOUT,
                cwd=cwd,
                env=_sandbox_env(),   # never inherit the server's secrets
                preexec_fn=_posix_cpu_limit(),
            )
            stdout = proc.stdout[:MAX_OUTPUT_BYTES]
            stderr = proc.stderr[:MAX_OUTPUT_BYTES]
            passed = self._normalize_output(stdout) == self._normalize_output(expected)
            return {
                'passed': passed,
                'stdout': stdout,
                'stderr': stderr,
                'error': None,
                'expected': expected,
            }
        except subprocess.TimeoutExpired:
            return {
                'passed': False,
                'stdout': '',
                'stderr': f'Execution timed out after {TIMEOUT}s',
                'error': 'timeout',
                'expected': expected,
            }
        except Exception as e:
            return {
                'passed': False,
                'stdout': '',
                'stderr': str(e),
                'error': 'runtime_error',
                'expected': expected,
            }

    @staticmethod
    def _normalize_output(s: str) -> str:
        """
        Normalize program output for comparison: strip trailing whitespace per
        line, ignore leading/trailing blank lines, and collapse whitespace
        around punctuation (e.g. [0, 1] == [0,1]) — so answers delivered via
        print()/console.log are graded on content, not formatting.
        """
        lines = s.strip().splitlines()
        cleaned = '\n'.join(line.rstrip() for line in lines)
        cleaned = re.sub(r'\s*,\s*', ',', cleaned)
        cleaned = re.sub(r'\[\s+', '[', cleaned)
        cleaned = re.sub(r'\s+\]', ']', cleaned)
        return cleaned

    # ── Hardcoded-output ("print cheese") detection ─────────────────────

    # Language constructs that consume stdin. If none appear and the code was
    # not auto-wrapped (the harness feeds stdin in as arguments), the program
    # cannot possibly be using the test input.
    _INPUT_READ_MARKERS = {
        'python': ('input(', 'sys.stdin', 'open(0'),
        'javascript': ('process.stdin', 'readline', 'readFileSync(0', 'prompt('),
        'java': ('System.in', 'Scanner', 'BufferedReader', 'System.console'),
        'cpp': ('cin', 'scanf', 'getline', 'getchar', 'fgets', 'gets(', 'stdin'),
    }

    def _reads_input(self, language: str, code: str) -> bool:
        return any(marker in code for marker in self._INPUT_READ_MARKERS.get(language, ()))

    @staticmethod
    def _string_literals(code: str) -> set:
        """Extract quoted string literals with common escape sequences resolved."""
        literals = set()
        for m in re.finditer(r'"((?:[^"\\\n]|\\.)*)"|\'((?:[^\'\\\n]|\\.)*)\'', code):
            raw = m.group(1) if m.group(1) is not None else m.group(2)
            resolved = (raw.replace('\\n', '\n').replace('\\t', '\t').replace('\\r', '')
                           .replace('\\"', '"').replace("\\'", "'").replace('\\\\', '\\'))
            literals.add(resolved.strip())
        return literals

    def _expected_as_literals(self, code: str, expected_outputs: list) -> bool:
        """True if EVERY expected answer appears verbatim in the source."""
        literals = self._string_literals(code)
        for expected in expected_outputs:
            answer = (expected or '').strip()
            if not answer:
                return False
            if answer in literals:
                continue
            # Numeric answers are often printed unquoted, e.g. print(8)
            if re.fullmatch(r'-?\d+(\.\d+)?', answer) and re.search(
                r'(?<![\w.])' + re.escape(answer) + r'(?![\w.])', code
            ):
                continue
            return False
        return True

    @staticmethod
    def _mutated_inputs(stdin_data: str) -> list:
        """
        Build up to 3 mutated variants of a test input. A genuine algorithm's
        output reacts to at least one of them; hardcoded output reacts to none.
        The mutations preserve line/argument counts so auto-wrapped functions
        receive the same arity.
        """
        mutations = []
        shifted = ''.join(str((int(c) + 1) % 10) if c.isdigit() else c for c in stdin_data)
        if shifted != stdin_data:
            mutations.append(shifted)
        zeroed = re.sub(r'-?\d+', '0', stdin_data)
        if zeroed != stdin_data and zeroed not in mutations:
            mutations.append(zeroed)
        reversed_lines = '\n'.join(line[::-1] for line in stdin_data.splitlines())
        if reversed_lines != stdin_data and reversed_lines not in mutations:
            mutations.append(reversed_lines)
        appended = '\n'.join(line + 'x' for line in stdin_data.splitlines())
        if appended != stdin_data and appended not in mutations:
            mutations.append(appended)
        return mutations[:3]

    def _detect_hardcoding(self, language: str, code: str, test_cases: list,
                           run_cmd: list, tmpdir: str, results: list) -> str | None:
        """
        Decide whether an all-passing submission actually computed its answers.

        Returns a verdict label, or None when the solution is legitimate.
        Tiers:
          0. No test case has input → pure-output problem; printing the output
             IS the intended algorithm (e.g. "print Hello World"). Accept.
          1. Inputs exist but the code neither reads stdin nor was auto-wrapped
             → it provably ignores the input. Reject.
          2. Every expected answer appears as a literal in the source AND the
             output stays identical for every mutated input on the probed
             tests → lookup-table/hardcoded answers. Reject.
        """
        input_tests = [
            (i, tc) for i, tc in enumerate(test_cases)
            if (tc.get('input') or '').strip()
        ]
        if not input_tests:
            return None  # Tier 0: printing the expected output is the solution

        # Tier 1 — deterministic
        if not self._reads_input(language, code) and self._auto_wrap(language, code) == code:
            return 'ignores_input'

        # Tier 2 — literal corroboration first (cheap), probes second (subprocess)
        expected_outputs = [tc.get('expected_output', '') for _, tc in input_tests]
        if not self._expected_as_literals(code, expected_outputs):
            return None

        for index, tc in input_tests[:2]:  # cap probe cost
            base_output = self._normalize_output(results[index]['stdout'])
            for mutated in self._mutated_inputs(tc.get('input', '')):
                probe = self._run_single_with_cmd(run_cmd, mutated, '', tmpdir)
                if self._normalize_output(probe['stdout']) != base_output:
                    return None  # output reacts to input — genuinely computed
        return 'hardcoded_literals'

    def _compile(self, language: str, config: dict, src_path: str, tmpdir: str) -> str | None:
        """Compile code if language requires it. Returns error string or None."""
        compile_template = config.get('compile')
        if not compile_template:
            return None

        out_path = os.path.join(tmpdir, 'solution_out')
        classname = os.path.splitext(os.path.basename(src_path))[0]

        cmd = [
            part.replace('{file}', src_path)
                .replace('{out}', out_path)
                .replace('{dir}', tmpdir)
                .replace('{classname}', classname)
            for part in compile_template
        ]

        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=COMPILE_TIMEOUT,
                                  cwd=tmpdir, env=_sandbox_env())
            if proc.returncode != 0:
                return proc.stderr[:MAX_OUTPUT_BYTES] or proc.stdout[:MAX_OUTPUT_BYTES]
            return None
        except subprocess.TimeoutExpired:
            return 'Compilation timed out'
        except Exception as e:
            return str(e)

    # ── Auto-wrapping logic ──────────────────────────────────────────────

    def _auto_wrap(self, language: str, code: str) -> str:
        """
        LeetCode-style auto-wrapper: if the student only defines a function
        (no raw I/O), append a harness that reads stdin, parses arguments,
        calls the function, and prints the result with correct formatting.

        If the student already uses input()/print() at the top level,
        the code is returned unchanged so advanced users aren't affected.
        """
        if language == 'python':
            return self._wrap_python(code)
        if language == 'javascript':
            return self._wrap_javascript(code)
        # Java / C++ — no auto-wrap for now, return as-is
        return code

    def _wrap_python(self, code: str) -> str:
        """
        Auto-wrap Python code.
        Skip if the code already has its own I/O (input() or top-level print).
        """
        # If student already handles I/O, don't wrap
        if 'input(' in code or 'sys.stdin' in code:
            return code

        # Check for top-level print (not inside a function)
        for line in code.splitlines():
            stripped = line.lstrip()
            if stripped.startswith('print(') and not line[0:1] in (' ', '\t'):
                return code  # Has top-level print — student handles output

        # Find function names (def foo(...))
        func_matches = re.findall(r'^def\s+(\w+)\s*\(', code, re.MULTILINE)
        if not func_matches:
            return code  # No function found — run as-is

        # Pick the first non-private function (skip helpers like _helper)
        main_func = None
        for name in func_matches:
            if not name.startswith('_'):
                main_func = name
                break
        if not main_func:
            main_func = func_matches[0]  # Fall back to first function

        logger.debug(f'Auto-wrapping Python code, detected function: {main_func}')

        # Append the I/O harness
        harness = f'''

# ─── Auto-generated test harness (do not edit) ───
import sys as _sys, json as _json, ast as _ast

def _format_output(_result):
    if isinstance(_result, bool):
        return str(_result).lower()
    if isinstance(_result, list):
        return _json.dumps(_result)
    if _result is None:
        return "null"
    return str(_result)

_input_lines = _sys.stdin.read().strip().split('\\n')
_args = []
for _line in _input_lines:
    _line = _line.strip()
    if not _line:
        continue
    try:
        _args.append(_ast.literal_eval(_line))
    except (ValueError, SyntaxError):
        _args.append(_line)

# Arguments may be written one-per-line OR comma-separated on a single line
# ("[2,7,11,15], 9"). literal_eval turns the second form into a single tuple,
# which would then be passed as ONE argument and raise TypeError. Unpack it,
# but only when the function actually takes more parameters than we have args
# — otherwise a function that legitimately expects a tuple would break.
if len(_args) == 1 and isinstance(_args[0], tuple):
    try:
        import inspect as _inspect
        _wanted = len([
            _p for _p in _inspect.signature({main_func}).parameters.values()
            if _p.kind in (_p.POSITIONAL_ONLY, _p.POSITIONAL_OR_KEYWORD)
        ])
        if _wanted == len(_args[0]) and _wanted > 1:
            _args = list(_args[0])
    except (ValueError, TypeError):
        pass

_result = {main_func}(*_args)
print(_format_output(_result))
'''
        return code + harness

    def _wrap_javascript(self, code: str) -> str:
        """
        Auto-wrap JavaScript code.
        Skip if the code already uses process.stdin or console.log at top level.
        """
        if 'process.stdin' in code or 'readline' in code:
            return code

        # Check for top-level console.log
        for line in code.splitlines():
            stripped = line.strip()
            if stripped.startswith('console.log(') and not line[0:1] in (' ', '\t'):
                return code

        # Find function names
        func_matches = re.findall(r'(?:function\s+(\w+)\s*\(|(?:const|let|var)\s+(\w+)\s*=\s*(?:function|\())', code)
        if not func_matches:
            return code

        # Flatten and pick first non-empty match
        main_func = None
        for groups in func_matches:
            name = groups[0] or groups[1]
            if name and not name.startswith('_'):
                main_func = name
                break
        if not main_func:
            main_func = (func_matches[0][0] or func_matches[0][1])

        if not main_func:
            return code

        logger.debug(f'Auto-wrapping JavaScript code, detected function: {main_func}')

        harness = f'''

// ─── Auto-generated test harness (do not edit) ───
// Read stdin via fd 0 (works on Windows too; '/dev/stdin' does not exist there).
const _input = require('fs').readFileSync(0, 'utf-8').trim().split('\\n');
const _args = _input.filter(l => l.trim()).map(line => {{
    try {{ return JSON.parse(line.trim()); }} catch {{ return line.trim(); }}
}});
const _result = {main_func}(..._args);
if (typeof _result === 'boolean') console.log(_result ? 'true' : 'false');
else if (Array.isArray(_result)) console.log(JSON.stringify(_result));
else if (_result === null || _result === undefined) console.log('null');
else console.log(_result);
'''
        return code + harness

    # ── Command building ────────────────────────────────────────────────

    def _build_run_cmd(self, language: str, config: dict, src_path: str, tmpdir: str) -> list:
        """Build the command list to run the compiled/interpreted code."""
        out_path = os.path.join(tmpdir, 'solution_out')
        classname = os.path.splitext(os.path.basename(src_path))[0]

        runner = config.get('runner')
        cmd_parts = config['cmd']
        resolved = [
            part.replace('{file}', src_path)
                .replace('{out}', out_path)
                .replace('{dir}', tmpdir)
                .replace('{classname}', classname)
            for part in cmd_parts
        ]

        if runner:
            return [runner] + resolved
        return resolved
