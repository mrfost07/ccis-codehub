"""
Whether a coding challenge can actually be graded honestly.

A challenge is graded by comparing the student's stdout to the expected output
the instructor wrote. On its own that is trivially cheatable: read the sample,
print the answer. The executor already defends against this at submission time
(`CodeExecutor._detect_hardcoding`, three tiers) and hidden tests make branching
on visible inputs pointless.

But those defences only work if the challenge is *built* to support them, and
until now nothing checked that at authoring time. A challenge could be created
with one visible test, no hidden tests and no reference solution, and it would
look fine right up to the point a student printed the answer and passed.

So this is the gate. `check_challenge` reports problems without running
anything; `verify_reference_solution` actually executes the author's own
solution against every test, which is the only way to know the expected outputs
are right.

Severity matters: a challenge with no hidden tests is *gradeable but cheatable*,
which is a warning to the author; one whose reference solution fails its own
tests is broken, and refusing it is the only sane response.
"""
import re

MIN_TESTS = 3
MIN_HIDDEN = 2


def _tests(challenge):
    return list(challenge.get('test_cases') or [])


def _with_input(tests):
    return [t for t in tests if (t.get('input') or '').strip()]


def check_challenge(challenge):
    """(errors, warnings) for a challenge dict. Errors must block saving."""
    errors, warnings = [], []

    if not (challenge.get('title') or '').strip():
        errors.append('no title')
    if not (challenge.get('description') or '').strip():
        errors.append('no problem statement')

    tests = _tests(challenge)
    if not tests:
        errors.append('no test cases — nothing to grade against')
        return errors, warnings

    for index, test in enumerate(tests, start=1):
        if 'expected_output' not in test:
            errors.append(f'test {index}: no expected_output')
        elif not str(test.get('expected_output', '')).strip():
            # A blank expectation passes for any program that prints nothing.
            errors.append(f'test {index}: expected_output is blank')

    if len(tests) < MIN_TESTS:
        warnings.append(f'only {len(tests)} test case(s); at least {MIN_TESTS} is safer')

    hidden = [t for t in tests if t.get('is_hidden')]
    visible = [t for t in tests if not t.get('is_hidden')]
    if not visible:
        warnings.append('every test is hidden; students need a worked example')

    with_input = _with_input(tests)
    if not with_input:
        # Tier 0 in the executor: with no input there is nothing to compute
        # from, so printing the expected output IS the solution. That is fine
        # for "print a triangle" and useless as an algorithm exercise.
        warnings.append(
            'no test supplies input, so printing the expected output is a valid '
            'solution — this cannot be an algorithm exercise')
    elif len(hidden) < MIN_HIDDEN:
        # The one that matters. Without hidden tests a student can branch on the
        # inputs they can see and compute nothing.
        warnings.append(
            f'only {len(hidden)} hidden test(s); with fewer than {MIN_HIDDEN} a '
            'student can branch on the visible inputs and still pass')

    # Hidden tests that repeat a visible input protect nothing.
    seen = {(t.get('input') or '').strip() for t in visible}
    repeated = [t for t in hidden if (t.get('input') or '').strip() in seen]
    if repeated:
        warnings.append(
            f'{len(repeated)} hidden test(s) reuse a visible input, so they add '
            'no protection')

    if not challenge.get('solution_code'):
        warnings.append(
            'no reference solution, so the expected outputs cannot be verified')

    return errors, warnings


def verify_reference_solution(challenge, executor=None, language=None):
    """Run the author's own solution against every test.

    Returns (ok, detail). The only way to know the expected outputs are right —
    an instructor computing them by hand gets one wrong eventually, and the
    result is a challenge nobody can pass and everybody reports as broken.
    """
    solutions = challenge.get('solution_code') or {}
    if not solutions:
        return False, 'no reference solution to run'

    language = language or ('python' if 'python' in solutions else next(iter(solutions)))
    code = solutions.get(language)
    if not code:
        return False, f'no reference solution for {language}'

    tests = _tests(challenge)
    if not tests:
        return False, 'no test cases'

    if executor is None:
        from apps.learning.code_executor import CodeExecutor
        executor = CodeExecutor()

    result = executor.run(language, code, tests)
    if result.get('all_passed'):
        return True, f'{len(tests)} test(s) pass'

    failed = [
        f'test {i + 1}: expected {(tests[i].get("expected_output") or "")!r}, '
        f'got {(r.get("stdout") or "")!r}'
        for i, r in enumerate(result.get('results') or [])
        if not r.get('passed')
    ]
    return False, (result.get('status') or 'failed') + '; ' + '; '.join(failed[:3])


# Below this many distinct expected outputs, finding them all in the source
# proves nothing: a problem answering `true` or `false` forces any correct
# solution to contain both words.
MIN_DISTINCT_FOR_LOOKUP_CHECK = 3


def looks_like_a_lookup_table(challenge):
    """True if the reference solution just prints the expected answers.

    An author can defeat their own challenge as easily as a student can. If the
    reference is a lookup table, every test passes and the challenge teaches
    nothing.

    Only meaningful when the answers are varied. The first version of this
    rejected three perfectly good challenges — anagrams, balanced brackets,
    palindromes — because each prints `true` or `false` and so must contain
    those two words. The executor's own detector avoids the same trap by
    requiring a second signal, that the output does not react to changed input;
    here the equivalent is to only draw the inference when there are enough
    distinct answers for the coincidence to be implausible.
    """
    solutions = challenge.get('solution_code') or {}
    code = ' '.join(str(v) for v in solutions.values())
    if not code.strip():
        return False

    expected = [str(t.get('expected_output', '')).strip()
                for t in _tests(challenge)]
    expected = [e for e in expected if e]
    if len(set(expected)) < MIN_DISTINCT_FOR_LOOKUP_CHECK:
        return False
    return all(
        re.search(r'(?<![\w.])' + re.escape(answer) + r'(?![\w.])', code)
        for answer in expected
    )
