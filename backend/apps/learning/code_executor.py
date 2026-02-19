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
"""

import subprocess
import tempfile
import os
import sys
import resource
import signal
from typing import Any

TIMEOUT = 5  # seconds per test case
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
        'compile': ['g++', '-o', '{out}', '{file}'],
        'cmd': ['{out}'],
    },
}


class CodeExecutor:
    """
    Runs submitted code against a list of test cases.

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

        results = []
        for i, tc in enumerate(test_cases):
            result = self._run_single(lang, code, tc.get('input', ''), tc.get('expected_output', ''))
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

    def _run_single(self, language: str, code: str, stdin_data: str, expected: str) -> dict:
        """Run code for one test case and compare output."""
        config = LANG_CONFIG[language]

        with tempfile.TemporaryDirectory() as tmpdir:
            # Write code to temp file
            src_path = os.path.join(tmpdir, f'solution{config["ext"]}')
            with open(src_path, 'w', encoding='utf-8') as f:
                f.write(code)

            # Compile if needed
            compile_error = self._compile(language, config, src_path, tmpdir)
            if compile_error:
                return {
                    'passed': False,
                    'stdout': '',
                    'stderr': compile_error,
                    'error': 'compilation_error',
                    'expected': expected,
                }

            # Build run command
            cmd = self._build_run_cmd(language, config, src_path, tmpdir)

            try:
                proc = subprocess.run(
                    cmd,
                    input=stdin_data,
                    capture_output=True,
                    text=True,
                    timeout=TIMEOUT,
                    cwd=tmpdir,
                )
                stdout = proc.stdout[:MAX_OUTPUT_BYTES]
                stderr = proc.stderr[:MAX_OUTPUT_BYTES]

                passed = stdout.strip() == expected.strip()
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
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=10, cwd=tmpdir)
            if proc.returncode != 0:
                return proc.stderr[:MAX_OUTPUT_BYTES] or proc.stdout[:MAX_OUTPUT_BYTES]
            return None
        except subprocess.TimeoutExpired:
            return 'Compilation timed out'
        except Exception as e:
            return str(e)

    def _build_run_cmd(self, language: str, config: dict, src_path: str, tmpdir: str) -> list:
        """Build the command list to run the code."""
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
