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


class TestBinaryAnswersAreNotMistakenForHardcoding:
    """
    A problem answering only `true` or `false` forces every correct solution to
    contain both words, so "the expected answers appear as literals" carries no
    information — and for a problem whose answer survives the mutation probe
    (reverse both words of an anagram pair and they are still anagrams), the
    second signal agrees too. A correct solution was being told it was hardcoded.

    Found while seeding challenges: the executor rejected the reference solution
    for an anagram exercise. Hidden tests and the ignores-input tier still guard
    these problems.
    """

    def test_a_correct_true_false_solution_is_accepted(self):
        from apps.learning.code_executor import CodeExecutor

        tests = [
            {'input': 'listen\nsilent', 'expected_output': 'true'},
            {'input': 'hello\nbillion', 'expected_output': 'false'},
            {'input': 'ab\nba', 'expected_output': 'true'},
            {'input': 'abc\nabcd', 'expected_output': 'false'},
        ]
        solution = (
            'a = input().strip()\n'
            'b = input().strip()\n'
            'print("true" if sorted(a) == sorted(b) else "false")\n'
        )

        result = CodeExecutor().run('python', solution, tests)

        assert result['status'] != 'hardcoded_output', result['status']
        assert result['all_passed'], f"{result['passed']}/{result['total']}"

    def test_a_branching_lookup_table_is_caught_by_hidden_tests_not_the_probe(self):
        # Worth stating plainly, because it is the reason hidden tests exist.
        # A cheat that branches on the visible inputs DOES react to mutation, so
        # the probe clears it — and then it fails on an input it never saw.
        from apps.learning.code_executor import CodeExecutor

        visible = [
            {'input': '2\n3', 'expected_output': '5'},
            {'input': '10\n7', 'expected_output': '17'},
            {'input': '1\n1', 'expected_output': '2'},
        ]
        hidden = [{'input': '8\n8', 'expected_output': '16', 'is_hidden': True}]
        cheat = (
            'a = int(input())\n'
            'b = int(input())\n'
            'print(5 if a == 2 else 17 if a == 10 else 2)\n'
        )
        executor = CodeExecutor()

        assert executor.run('python', cheat, visible)['all_passed'] is True

        assert executor.run('python', cheat, visible + hidden)['all_passed'] is False

    def test_ignoring_the_input_is_still_caught(self):
        from apps.learning.code_executor import CodeExecutor

        tests = [
            {'input': 'listen\nsilent', 'expected_output': 'true'},
            {'input': 'hello\nbillion', 'expected_output': 'false'},
        ]

        result = CodeExecutor().run('python', 'print("true")', tests)

        assert not result['all_passed']

    def test_one_line_is_mutated_on_its_own(self):
        # Mutating every line alike preserves relationships between them, which
        # is what made the anagram case look invariant.
        from apps.learning.code_executor import CodeExecutor

        mutations = CodeExecutor._mutated_inputs('listen\nsilent')

        assert any(m.splitlines()[0] == 'listen' and m.splitlines()[1] != 'silent'
                   for m in mutations), mutations
