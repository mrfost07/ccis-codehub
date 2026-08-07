"""
Coding Challenges API — Views
LeetCode-style coding challenges with CodeExecutor integration
"""
import logging
import time
import uuid

from django.http import Http404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import IsInstructorOrAdmin
from rest_framework.throttling import UserRateThrottle
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q

from apps.learning.models import CodingChallenge, CodingSubmission, LiveQuiz, LiveQuizQuestion
from apps.learning.code_executor import CodeExecutor

logger = logging.getLogger(__name__)

MAX_CODE_LENGTH = 50_000  # 50 KB — generous limit to prevent DoS


class CodeRunThrottle(UserRateThrottle):
    """30 runs per minute per user — prevents DoS via expensive compilation."""
    scope = 'code_run'
    rate = '30/min'


class CodeSubmitThrottle(UserRateThrottle):
    """10 submissions per minute per user — prevents submission flooding."""
    scope = 'code_submit'
    rate = '10/min'


class CodingChallengeViewSet(viewsets.ModelViewSet):
    """CRUD + submit endpoint for coding challenges"""
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'

    # Authoring is not a student capability. This was a plain ModelViewSet with
    # IsAuthenticated, so any signed-in student could create challenges — and
    # destroy() looked one up by slug and deleted it with no further check,
    # which meant a student could remove every challenge on the platform.
    WRITE_ACTIONS = {'create', 'update', 'partial_update', 'destroy', 'go_live'}

    def get_permissions(self):
        if self.action in self.WRITE_ACTIONS:
            return [IsAuthenticated(), IsInstructorOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = CodingChallenge.objects.filter(is_active=True)

        # Filters
        difficulty = self.request.query_params.get('difficulty')
        category = self.request.query_params.get('category')
        search = self.request.query_params.get('search')

        if difficulty:
            qs = qs.filter(difficulty=difficulty)
        if category:
            qs = qs.filter(category=category)
        if search:
            qs = qs.filter(
                Q(title__icontains=search) | Q(description__icontains=search) | Q(tags__contains=[search])
            )

        return qs

    def create(self, request):
        """Create a new coding challenge.

        Validated before it is saved. A challenge whose expected outputs are
        blank, or which has no tests, cannot be graded honestly - grading
        compares stdout to the expected output, so a blank expectation passes
        for any program that prints nothing.

        Warnings are returned alongside the created challenge rather than
        blocking it: 'no hidden tests' means cheatable, not broken, and the
        author is the right person to decide.
        """
        from apps.learning.challenge_validation import check_challenge

        data = request.data
        errors, warnings = check_challenge({
            'title': data.get('title', ''),
            'description': data.get('description', ''),
            'test_cases': data.get('test_cases', []),
            'solution_code': data.get('solution_code', {}),
        })
        if errors:
            return Response(
                {'detail': 'This challenge cannot be graded.', 'errors': errors},
                status=status.HTTP_400_BAD_REQUEST)

        try:
            challenge = CodingChallenge.objects.create(
                title=data.get('title', ''),
                description=data.get('description', ''),
                difficulty=data.get('difficulty', 'easy'),
                category=data.get('category', 'basics'),
                supported_languages=data.get('supported_languages', ['python']),
                starter_code=data.get('starter_code', {}),
                test_cases=data.get('test_cases', []),
                constraints=data.get('constraints', ''),
                points=int(data.get('points', 10)),
                time_limit_seconds=int(data.get('time_limit_seconds', 300)),
                solution_code=data.get('solution_code', {}),
                created_by=request.user,
            )
            return Response({
                'id': str(challenge.id), 'slug': challenge.slug,
                'title': challenge.title, 'warnings': warnings,
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f'Failed to create challenge: {e}')
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, slug=None):
        """Delete a coding challenge"""
        challenge = get_object_or_404(CodingChallenge, slug=slug)
        challenge.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def list(self, request):
        """List challenges with user solve status"""
        queryset = self.get_queryset()
        user = request.user

        # Get IDs the user has solved
        solved_ids = set(
            CodingSubmission.objects.filter(
                user=user, status='accepted'
            ).values_list('challenge_id', flat=True)
        )
        attempted_ids = set(
            CodingSubmission.objects.filter(
                user=user
            ).values_list('challenge_id', flat=True)
        )

        challenges = []
        for c in queryset:
            user_status = 'solved' if c.id in solved_ids else ('attempted' if c.id in attempted_ids else 'not_started')
            challenges.append({
                'id': str(c.id),
                'title': c.title,
                'slug': c.slug,
                'difficulty': c.difficulty,
                'category': c.category,
                'tags': c.tags,
                'points': c.points,
                'acceptance_rate': c.acceptance_rate,
                'total_attempts': c.total_attempts,
                'total_solved': c.total_solved,
                'user_status': user_status,
            })

        return Response(challenges)

    def retrieve(self, request, slug=None):
        """Get challenge detail (description, starter code, public test cases)"""
        challenge = get_object_or_404(CodingChallenge, slug=slug, is_active=True)

        # Only show non-hidden test cases
        public_tests = [
            {'input': tc.get('input', ''), 'expected_output': tc.get('expected_output', '')}
            for tc in (challenge.test_cases or [])
            if not tc.get('is_hidden', False)
        ]

        return Response({
            'id': str(challenge.id),
            'title': challenge.title,
            'slug': challenge.slug,
            'description': challenge.description,
            'difficulty': challenge.difficulty,
            'category': challenge.category,
            'tags': challenge.tags,
            'supported_languages': challenge.supported_languages,
            'starter_code': challenge.starter_code,
            'test_cases': public_tests,
            'constraints': challenge.constraints,
            'hints': challenge.hints,
            'points': challenge.points,
            'time_limit_seconds': challenge.time_limit_seconds,
            'acceptance_rate': challenge.acceptance_rate,
            'total_attempts': challenge.total_attempts,
            'total_solved': challenge.total_solved,
        })

    @action(detail=True, methods=['post'], url_path='run', throttle_classes=[CodeRunThrottle])
    def run(self, request, slug=None):
        """Run code against public test cases only — does NOT create a submission record."""
        challenge = get_object_or_404(CodingChallenge, slug=slug, is_active=True)
        code = request.data.get('code', '')
        language = request.data.get('language', 'python')

        if not code.strip():
            return Response({'error': 'Code cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)

        if len(code) > MAX_CODE_LENGTH:
            return Response({'error': f'Code exceeds maximum length of {MAX_CODE_LENGTH} characters'},
                            status=status.HTTP_400_BAD_REQUEST)

        if language not in (challenge.supported_languages or ['python']):
            return Response(
                {'error': f'Language "{language}" not supported for this challenge'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            executor = CodeExecutor()
            result = executor.run_public_only(language, code, challenge.test_cases or [])
            return Response({
                'status': 'run_complete',
                'passed': result.get('passed', 0),
                'total': result.get('total', 0),
                'results': result.get('results', []),
            })
        except Exception as e:
            logger.error(f'Code run failed for challenge {challenge.slug}: {e}')
            return Response({'error': 'Code execution failed.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='submit', throttle_classes=[CodeSubmitThrottle])
    def submit(self, request, slug=None):
        """Submit code for a challenge — run against all test cases"""
        challenge = get_object_or_404(CodingChallenge, slug=slug, is_active=True)
        code = request.data.get('code', '')
        language = request.data.get('language', 'python')

        if not code.strip():
            return Response({'error': 'Code cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)

        if len(code) > MAX_CODE_LENGTH:
            return Response({'error': f'Code exceeds maximum length of {MAX_CODE_LENGTH} characters'},
                            status=status.HTTP_400_BAD_REQUEST)

        if language not in (challenge.supported_languages or ['python']):
            return Response(
                {'error': f'Language "{language}" not supported for this challenge'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create submission record
        submission = CodingSubmission.objects.create(
            user=request.user,
            challenge=challenge,
            language=language,
            code=code,
            status='running',
            total_tests=len(challenge.test_cases or []),
        )

        # Run code against test cases
        try:
            executor = CodeExecutor()
            start_time = time.time()
            result = executor.run(language, code, challenge.test_cases or [])
            elapsed_ms = int((time.time() - start_time) * 1000)

            passed = result.get('passed', 0)
            total = result.get('total', 0)
            all_passed = result.get('all_passed', False)

            # Determine status
            if all_passed:
                sub_status = 'accepted'
            elif result.get('status') == 'hardcoded_output':
                # Output matched but wasn't computed from the input — don't let
                # passing no-input tests dress this up as a partial solution.
                sub_status = 'wrong_answer'
            elif passed > 0:
                sub_status = 'partial'
            elif any(r.get('error') == 'timeout' for r in result.get('results', [])):
                sub_status = 'timeout'
            elif any(r.get('error') in ('compilation_error', 'runtime_error') for r in result.get('results', [])):
                sub_status = 'error'
            else:
                sub_status = 'wrong_answer'

            # Calculate points
            points = 0
            if all_passed:
                points = challenge.points
            elif total > 0:
                points = int(challenge.points * passed / total * 0.5)  # Partial credit = 50% weight

            # Filter results for response (hide hidden test case details)
            safe_results = []
            for r in result.get('results', []):
                entry = {
                    'test_case_index': r.get('test_case_index', 0),
                    'passed': r.get('passed', False),
                    'error': r.get('error'),
                }
                if not r.get('is_hidden', False):
                    entry['stdout'] = r.get('stdout', '')
                    entry['stderr'] = r.get('stderr', '')
                    entry['expected'] = r.get('expected', '')
                else:
                    entry['is_hidden'] = True
                safe_results.append(entry)

            # Update submission
            submission.status = sub_status
            submission.passed_tests = passed
            submission.results_json = safe_results
            submission.execution_time_ms = elapsed_ms
            submission.points_earned = points
            submission.save()

            # Update challenge stats (acceptance_rate is a @property, computed automatically)
            challenge.total_attempts += 1
            if all_passed:
                prev_accepted = CodingSubmission.objects.filter(
                    user=request.user, challenge=challenge, status='accepted'
                ).exclude(id=submission.id).exists()
                if not prev_accepted:
                    challenge.total_solved += 1
            challenge.save(update_fields=['total_attempts', 'total_solved'])

            # Update leaderboard score (non-fatal)
            newly_earned_badges = []
            if sub_status == 'accepted':
                try:
                    from .leaderboard_service import update_leaderboard_score
                    update_leaderboard_score(request.user)
                except Exception as lb_err:
                    logger.warning(f'Leaderboard update failed (non-fatal): {lb_err}')

                # Grant badges for challenge completion
                try:
                    from .badge_service import grant_badges_after_challenge
                    newly_earned_badges = grant_badges_after_challenge(
                        request.user, time_seconds=elapsed_ms // 1000
                    )
                except Exception as badge_err:
                    logger.warning(f'Badge grant failed (non-fatal): {badge_err}')

            return Response({
                'submission_id': str(submission.id),
                'status': sub_status,
                'passed_tests': passed,
                'total_tests': total,
                'points_earned': points,
                'execution_time_ms': elapsed_ms,
                'results': safe_results,
                'badges_earned': newly_earned_badges,
            })

        except Exception as e:
            logger.error(f'Code execution failed for challenge {challenge.slug}: {e}')
            submission.status = 'error'
            submission.results_json = [{'error': str(e)}]
            submission.save()
            return Response({
                'submission_id': str(submission.id),
                'status': 'error',
                'error': 'Code execution failed. Please try again.',
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], url_path='submissions')
    def submissions(self, request, slug=None):
        """Get user's submission history for a challenge"""
        challenge = get_object_or_404(CodingChallenge, slug=slug)
        subs = CodingSubmission.objects.filter(
            user=request.user, challenge=challenge
        ).order_by('-submitted_at')[:20]

        return Response([{
            'id': str(s.id),
            'language': s.language,
            'status': s.status,
            'passed_tests': s.passed_tests,
            'total_tests': s.total_tests,
            'execution_time_ms': s.execution_time_ms,
            'points_earned': s.points_earned,
            'submitted_at': s.submitted_at.isoformat(),
        } for s in subs])

    @action(detail=True, methods=['post'], url_path='run-custom',
            throttle_classes=[CodeRunThrottle])
    def run_custom(self, request, slug=None):
        """
        Run code against user-supplied stdin — no test cases, no pass/fail.
        Returns raw stdout/stderr so students can test edge cases manually.
        """
        challenge = get_object_or_404(CodingChallenge, slug=slug, is_active=True)
        code     = request.data.get('code', '').strip()
        language = request.data.get('language', 'python').lower()
        stdin    = request.data.get('custom_input', '')

        if not code:
            return Response({'error': 'No code provided'}, status=status.HTTP_400_BAD_REQUEST)
        if len(code) > MAX_CODE_LENGTH:
            return Response({'error': f'Code exceeds maximum length of {MAX_CODE_LENGTH} characters'},
                            status=status.HTTP_400_BAD_REQUEST)
        if language not in challenge.supported_languages:
            return Response({'error': f'Language {language!r} not supported for this challenge'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            start = time.time()
            executor = CodeExecutor()
            # Run against a single synthetic test case with the custom input
            result = executor.run(language, code, [{'input': stdin, 'expected_output': '__custom__', 'is_hidden': False}])
            elapsed_ms = int((time.time() - start) * 1000)

            raw = result.get('results', [{}])[0]
            return Response({
                'stdout': raw.get('stdout', ''),
                'stderr': raw.get('stderr', ''),
                'error':  raw.get('error'),
                'execution_time_ms': elapsed_ms,
                'timed_out': raw.get('error') == 'timeout',
            })
        except Exception as e:
            logger.error(f'Custom run failed: {e}')
            return Response({'error': 'Execution failed. Please try again.'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='go-live')
    def go_live(self, request, slug=None):
        """
        Create a LiveQuiz session from an existing CodingChallenge.
        Returns a join_code that students can use to enter the live session.
        The instructor can then start the session from the monitor panel.
        """
        challenge = get_object_or_404(CodingChallenge, slug=slug, is_active=True)

        # Pick primary language
        langs = challenge.supported_languages or ['python']
        primary_lang = langs[0]

        # Resolve starter code
        starter = ''
        if isinstance(challenge.starter_code, dict):
            starter = challenge.starter_code.get(primary_lang, '')
        elif isinstance(challenge.starter_code, str):
            starter = challenge.starter_code

        # Optional overrides from request body
        time_limit = int(request.data.get('time_limit_seconds', challenge.time_limit_seconds))
        max_participants = int(request.data.get('max_participants', 100))
        require_fullscreen = request.data.get('require_fullscreen', False)
        fullscreen_exit_action = request.data.get('fullscreen_exit_action', 'pause')
        alt_tab_action = request.data.get('alt_tab_action', 'warn')
        max_violations = int(request.data.get('max_violations', 3))

        try:
            quiz = LiveQuiz.objects.create(
                instructor=request.user,
                title=f"Live Challenge: {challenge.title}",
                description=challenge.description,
                quiz_mode='live',
                creation_method='manual',
                default_question_time=time_limit,
                max_participants=max_participants,
                enable_code_execution=True,
                require_fullscreen=require_fullscreen,
                fullscreen_exit_action=fullscreen_exit_action,
                alt_tab_action=alt_tab_action,
                max_violations=max_violations,
                show_leaderboard=True,
                show_correct_answers=True,
                allow_late_join=True,
            )

            LiveQuizQuestion.objects.create(
                quiz=quiz,
                question_text=challenge.description,
                question_type='coding',
                order=1,
                programming_language=primary_lang,
                starter_code=starter,
                test_cases=challenge.test_cases or [],
                points=challenge.points * 10,
                time_limit=time_limit,
                time_bonus_enabled=True,
            )

            logger.info(f'Live challenge created: {quiz.join_code} from {challenge.slug} by {request.user}')

            return Response({
                'quiz_id': str(quiz.id),
                'join_code': quiz.join_code,
                'title': quiz.title,
                'challenge_slug': challenge.slug,
                'challenge_title': challenge.title,
                'difficulty': challenge.difficulty,
                'time_limit': time_limit,
                'supported_languages': langs,
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f'Failed to create live challenge from {challenge.slug}: {e}')
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='progress')
    def progress(self, request):
        """Solved counts, a year of daily activity, and streaks.

        Everything the profile needs in one request. The activity list is sparse
        - only days with something on them - because a year is 365 entries and
        most are empty for most students.

        `?user=<id>` answers for somebody else, for their public profile. What
        it returns is the same thing a public profile is for - what they have
        solved and when they worked. It carries no code, no marks and no
        failures attributed to a problem, so there is nothing here that is
        theirs alone. Signed-in only, like the rest of a profile.
        """
        from apps.learning.challenge_progress import challenge_progress

        target = request.user
        user_id = request.query_params.get('user')
        if user_id:
            from apps.accounts.models import User
            try:
                uuid.UUID(str(user_id))
            except ValueError:
                # A malformed id is a missing user, not a server error — the
                # UUID field would otherwise raise straight past DRF into a 500.
                raise Http404
            target = get_object_or_404(User, id=user_id, is_active=True)

        return Response(challenge_progress(target))

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """Get user's overall coding stats"""
        user = request.user

        solved_count = CodingSubmission.objects.filter(
            user=user, status='accepted'
        ).values('challenge').distinct().count()

        total_submissions = CodingSubmission.objects.filter(user=user).count()
        total_points = sum(
            CodingSubmission.objects.filter(
                user=user, status='accepted'
            ).values_list('points_earned', flat=True)
        )

        # Per-difficulty breakdown
        easy = CodingSubmission.objects.filter(
            user=user, status='accepted', challenge__difficulty='easy'
        ).values('challenge').distinct().count()
        medium = CodingSubmission.objects.filter(
            user=user, status='accepted', challenge__difficulty='medium'
        ).values('challenge').distinct().count()
        hard = CodingSubmission.objects.filter(
            user=user, status='accepted', challenge__difficulty='hard'
        ).values('challenge').distinct().count()

        total_challenges = CodingChallenge.objects.filter(is_active=True).count()

        return Response({
            'solved': solved_count,
            'total_challenges': total_challenges,
            'total_submissions': total_submissions,
            'total_points': total_points,
            'easy_solved': easy,
            'medium_solved': medium,
            'hard_solved': hard,
        })
