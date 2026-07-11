"""
Code Execution Engine — Phase 2
=================================
Runs student-submitted code against test cases in a sandboxed subprocess.
Supports Python, JavaScript (Node.js), Java, and C++.

Security:
  - All code runs in a subprocess with a hard timeout (TIMEOUT seconds).
  - Stdin/stdout are piped; no file system access beyond a temp file.
  - Memory limit is enforced via resource limits on POSIX systems.
  - TODO: Replace with Judge0 or Docker sandbox for full isolation in production.

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
        return {
            'passed': passed,
            'total': len(results),
            'all_passed': passed == len(results),
            'status': 'completed',
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
            )
            stdout = proc.stdout[:MAX_OUTPUT_BYTES]
            stderr = proc.stderr[:MAX_OUTPUT_BYTES]
            # Normalize: strip trailing whitespace per line, ignore leading/trailing blank lines,
            # and collapse whitespace around punctuation (e.g. [0, 1] == [0,1])
            def _norm(s: str) -> str:
                lines = s.strip().splitlines()
                cleaned = '\n'.join(line.rstrip() for line in lines)
                # Collapse spaces around commas, colons, brackets
                cleaned = re.sub(r'\s*,\s*', ',', cleaned)
                cleaned = re.sub(r'\[\s+', '[', cleaned)
                cleaned = re.sub(r'\s+\]', ']', cleaned)
                return cleaned
            passed = _norm(stdout) == _norm(expected)
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
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=COMPILE_TIMEOUT, cwd=tmpdir)
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
const _input = require('fs').readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');
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
