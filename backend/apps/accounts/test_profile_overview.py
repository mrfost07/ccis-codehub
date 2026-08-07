"""
The cross-domain summary behind the profile.

It exists because the denormalised counters on Profile were wrong: on
production, `total_courses_completed` read 0 for a student with two finished
paths and two certificates, so the profile told them they had done nothing.
Nothing updates that counter when a path completes.

So these tests do the one thing that catches that class of bug — they create the
underlying records and check the summary reflects them, rather than checking a
counter agrees with itself.
"""
import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.profile_overview import profile_overview
from apps.community.models import Comment, Post, PostLike, UserFollow
from apps.learning.models import (
    CareerPath, Certificate, CodingChallenge, CodingSubmission, Enrollment,
    LearningModule, UserProgress,
)
from apps.projects.models import Project, ProjectMembership, ProjectTask


@pytest.fixture
def student(db):
    return User.objects.create_user(
        username='ov_stu', email='ov@ssct.edu.ph', password='x', role='student')


@pytest.fixture
def path(db):
    return CareerPath.objects.create(
        name='Path', slug='ov-path', description='d', program_type='bscs',
        difficulty_level='beginner', estimated_duration=4)


@pytest.mark.django_db
class TestLearning:
    def test_a_completed_path_is_counted_even_though_the_counter_says_zero(
            self, student, path):
        # The exact production bug: two finished paths, counter reading 0.
        Enrollment.objects.create(user=student, career_path=path, status='completed')
        if hasattr(student, 'profile'):
            student.profile.total_courses_completed = 0
            student.profile.save(update_fields=['total_courses_completed'])

        learning = profile_overview(student)['learning']

        assert learning['enrolled'] == 1
        assert learning['completed_paths'] == 1

    def test_certificates_come_from_the_certificates_table(self, student, path):
        enrolment = Enrollment.objects.create(
            user=student, career_path=path, status='completed')
        Certificate.objects.create(
            user=student, career_path=path, enrollment=enrolment,
            certificate_id='CCIS-OV-1')

        assert profile_overview(student)['learning']['certificates'] == 1

    def test_modules_completed_counts_only_completed_ones(self, student, path):
        first = LearningModule.objects.create(
            career_path=path, title='M1', description='d', order=0)
        second = LearningModule.objects.create(
            career_path=path, title='M2', description='d', order=1)
        UserProgress.objects.create(
            user=student, career_path=path, learning_module=first, is_completed=True)
        UserProgress.objects.create(
            user=student, career_path=path, learning_module=second, is_completed=False)

        assert profile_overview(student)['learning']['modules_completed'] == 1

    def test_a_student_with_nothing_gets_zeroes(self, student):
        learning = profile_overview(student)['learning']

        assert learning['enrolled'] == 0
        assert learning['average_score'] is None


@pytest.mark.django_db
class TestProjects:
    def test_owned_and_joined_projects_are_counted_separately(self, student):
        other = User.objects.create_user(
            username='ov_other', email='ovo@ssct.edu.ph', password='x')
        Project.objects.create(
            name='Mine', description='d', owner=student, status='in_progress')
        theirs = Project.objects.create(
            name='Theirs', description='d', owner=other, status='in_progress')
        ProjectMembership.objects.create(project=theirs, user=student, is_active=True)

        projects = profile_overview(student)['projects']

        assert projects['owned'] == 1
        assert projects['member_of'] == 1
        assert projects['active'] == 1

    def test_tasks_are_counted_by_who_they_are_assigned_to(self, student):
        other = User.objects.create_user(
            username='ov_other2', email='ovo2@ssct.edu.ph', password='x')
        project = Project.objects.create(
            name='P', description='d', owner=student, status='in_progress')
        ProjectTask.objects.create(project=project, title='mine done',
                                   assigned_to=student, status='done')
        ProjectTask.objects.create(project=project, title='mine open',
                                   assigned_to=student, status='todo')
        ProjectTask.objects.create(project=project, title='theirs',
                                   assigned_to=other, status='done')

        projects = profile_overview(student)['projects']

        assert projects['tasks_assigned'] == 2
        assert projects['tasks_done'] == 1


@pytest.mark.django_db
class TestCommunity:
    def test_posts_comments_and_likes_received(self, student):
        other = User.objects.create_user(
            username='ov_other3', email='ovo3@ssct.edu.ph', password='x')
        post = Post.objects.create(author=student, content='hello')
        Comment.objects.create(post=post, author=student, content='mine')
        Comment.objects.create(post=post, author=other, content='theirs')
        PostLike.objects.create(post=post, user=other)

        community = profile_overview(student)['community']

        assert community['posts'] == 1
        assert community['comments'] == 1
        # Likes received, not given — a post count alone does not say whether
        # anyone read it.
        assert community['likes_received'] == 1

    def test_followers_and_following_are_not_swapped(self, student):
        follower = User.objects.create_user(
            username='ov_f', email='ovf@ssct.edu.ph', password='x')
        followed = User.objects.create_user(
            username='ov_g', email='ovg@ssct.edu.ph', password='x')
        UserFollow.objects.create(follower=follower, following=student)
        UserFollow.objects.create(follower=student, following=followed)
        UserFollow.objects.create(
            follower=User.objects.create_user(
                username='ov_h', email='ovh@ssct.edu.ph', password='x'),
            following=student)

        community = profile_overview(student)['community']

        assert community['followers'] == 2
        assert community['following'] == 1


@pytest.mark.django_db
class TestChallenges:
    def test_solved_counts_and_denominators_are_included(self, student):
        challenge = CodingChallenge.objects.create(
            title='C', slug='ov-c', description='d', difficulty='easy',
            supported_languages=['python'], starter_code={}, solution_code={},
            test_cases=[{'input': '1', 'expected_output': '1'}])
        CodingSubmission.objects.create(
            user=student, challenge=challenge, language='python', code='x',
            status='accepted', points_earned=10)

        challenges = profile_overview(student)['challenges']

        assert challenges['solved']['easy'] == 1
        assert challenges['available']['easy'] == 1
        assert challenges['acceptance_rate'] == 100.0


@pytest.mark.django_db
class TestTheEndpoint:
    def test_it_returns_all_four_areas(self, student):
        client = APIClient()
        client.force_authenticate(student)

        response = client.get('/api/auth/profile/overview/')

        assert response.status_code == 200
        assert set(response.data) == {'learning', 'challenges', 'projects', 'community'}

    def test_it_needs_a_signed_in_user(self, db):
        assert APIClient().get(
            '/api/auth/profile/overview/').status_code in (401, 403)

    def test_one_users_work_does_not_appear_on_anothers_profile(self, student, path):
        other = User.objects.create_user(
            username='ov_stranger', email='ovs@ssct.edu.ph', password='x')
        Enrollment.objects.create(user=other, career_path=path, status='completed')
        Post.objects.create(author=other, content='theirs')

        overview = profile_overview(student)

        assert overview['learning']['completed_paths'] == 0
        assert overview['community']['posts'] == 0

    def test_the_cost_does_not_grow_with_how_much_has_been_done(
            self, student, path, django_assert_max_num_queries):
        for i in range(15):
            module = LearningModule.objects.create(
                career_path=path, title=f'M{i}', description='d', order=i)
            UserProgress.objects.create(
                user=student, career_path=path, learning_module=module,
                is_completed=True)
        project = Project.objects.create(
            name='P', description='d', owner=student, status='in_progress')
        for i in range(15):
            ProjectTask.objects.create(project=project, title=f'T{i}',
                                       assigned_to=student, status='done')
        client = APIClient()
        client.force_authenticate(student)

        with django_assert_max_num_queries(25):
            client.get('/api/auth/profile/overview/')


@pytest.mark.django_db
class TestViewingSomebodyElse:
    def test_marks_are_left_out(self, student, path):
        # Paths finished and challenges solved are what a profile is for.
        # Quiz marks are between a student and their instructor.
        public = profile_overview(student, public=True)

        assert 'average_score' not in public['learning']
        assert 'quizzes_taken' not in public['learning']

    def test_the_rest_is_still_reported(self, student, path):
        Enrollment.objects.create(user=student, career_path=path, status='completed')

        public = profile_overview(student, public=True)

        assert public['learning']['completed_paths'] == 1
        assert 'projects' in public and 'community' in public and 'challenges' in public

    def test_the_endpoint_returns_another_users_overview(self, student, path):
        Enrollment.objects.create(user=student, career_path=path, status='completed')
        viewer = User.objects.create_user(
            username='ov_viewer', email='ovv@ssct.edu.ph', password='x')
        client = APIClient()
        client.force_authenticate(viewer)

        response = client.get(f'/api/auth/user/{student.id}/overview/')

        assert response.status_code == 200
        assert response.data['learning']['completed_paths'] == 1
        assert 'average_score' not in response.data['learning']

    def test_it_needs_a_signed_in_viewer(self, student):
        assert APIClient().get(
            f'/api/auth/user/{student.id}/overview/').status_code in (401, 403)

    def test_an_unknown_user_is_a_404(self, student):
        viewer = User.objects.create_user(
            username='ov_viewer2', email='ovv2@ssct.edu.ph', password='x')
        client = APIClient()
        client.force_authenticate(viewer)

        response = client.get(
            '/api/auth/user/00000000-0000-0000-0000-000000000000/overview/')

        assert response.status_code == 404
