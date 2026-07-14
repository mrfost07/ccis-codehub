"""
Code executor tests — auto-wrap harness + cross-platform stdin handling.
"""
import shutil

import pytest

from apps.learning.code_executor import CodeExecutor


class TestPythonExecution:
    def test_autowrapped_function_scores_against_cases(self):
        code = "def add(a, b):\n    return a + b\n"
        cases = [
            {'input': '5\n3\n', 'expected_output': '8'},
            {'input': '10\n2\n', 'expected_output': '12'},
        ]
        result = CodeExecutor().run('python', code, cases)
        assert result['status'] == 'completed'
        assert result['all_passed'] is True
        assert result['passed'] == 2

    def test_wrong_solution_fails_cases(self):
        code = "def add(a, b):\n    return a - b\n"
        cases = [{'input': '5\n3\n', 'expected_output': '8'}]
        result = CodeExecutor().run('python', code, cases)
        assert result['all_passed'] is False

    def test_public_only_skips_hidden(self):
        code = "def add(a, b):\n    return a + b\n"
        cases = [
            {'input': '1\n1\n', 'expected_output': '2'},
            {'input': '9\n9\n', 'expected_output': '18', 'is_hidden': True},
        ]
        result = CodeExecutor().run_public_only('python', code, cases)
        assert result['total'] == 1
        assert result['all_passed'] is True


@pytest.mark.skipif(shutil.which('node') is None, reason='Node.js not installed')
class TestJavaScriptExecution:
    def test_autowrapped_js_reads_stdin_cross_platform(self):
        code = "function add(a, b) { return a + b; }"
        cases = [{'input': '4\n6\n', 'expected_output': '10'}]
        result = CodeExecutor().run('javascript', code, cases)
        assert result['all_passed'] is True
