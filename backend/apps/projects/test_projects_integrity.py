"""
Projects integrity tests: PR merge semantics (Req 12), member-add authorization
(Req 13), and crash-free progress reporting (Req 14).
"""
import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.projects.models import (
    Project, ProjectMembership, ProjectBranch, PullRequest, PRReviewer,
)


def _user(name):
    return User.objects.create_user(
        email=f'{name}@ssct.edu.ph', username=name, password='pw12345678', role='student'
    )


@pytest.fixture
def owner(db):
    return _user('owner')


@pytest.fixture
def project(owner):
    return Project.objects.create(
        name='Demo Project', owner=owner, project_type='other',
        programming_language='python', visibility='public',
    )


def _client(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


class TestMemberAddAuthorization:
    """Req 13: only owner/admin may add members."""

    def test_outsider_cannot_add_member(self, project):
        outsider, target = _user('outsider'), _user('target')
        resp = _client(outsider).post(
            f'/api/projects/projects/{project.slug}/add_member/',
            {'user_id': str(target.id)}, format='json',
        )
        assert resp.status_code in (403, 404)
        assert not ProjectMembership.objects.filter(project=project, user=target).exists()

    def test_owner_can_add_member(self, project, owner):
        target = _user('target')
        resp = _client(owner).post(
            f'/api/projects/projects/{project.slug}/add_member/',
            {'user_id': str(target.id)}, format='json',
        )
        assert resp.status_code == 201, resp.data
        assert ProjectMembership.objects.filter(project=project, user=target).exists()


class TestProgressReporting:
    """Req 14: progress does not crash on missing field/undefined role."""

    def test_progress_returns_for_owner(self, project, owner):
        resp = _client(owner).get(f'/api/projects/projects/{project.slug}/progress/')
        assert resp.status_code == 200, resp.data
        assert 'members' in resp.data
        assert 'progress' in resp.data


class TestPullRequestMerge:
    """Req 12: protected branches require approval; merges are transactional."""

    def _make_pr(self, project, owner, protected):
        src = ProjectBranch.objects.create(project=project, name='feature', created_by=owner)
        dst = ProjectBranch.objects.create(
            project=project, name='main', created_by=owner, is_protected=protected,
        )
        return PullRequest.objects.create(
            project=project, title='PR', source_branch=src, target_branch=dst, author=owner,
        )

    def test_protected_merge_blocked_without_approval(self, project, owner):
        pr = self._make_pr(project, owner, protected=True)
        resp = _client(owner).post(f'/api/projects/pull-requests/{pr.id}/merge/')
        assert resp.status_code == 403
        pr.refresh_from_db()
        assert pr.status == 'open'  # left unmerged

    def test_protected_merge_succeeds_with_approval(self, project, owner):
        pr = self._make_pr(project, owner, protected=True)
        reviewer = _user('reviewer')
        PRReviewer.objects.create(pull_request=pr, reviewer=reviewer, status='approved')
        resp = _client(owner).post(f'/api/projects/pull-requests/{pr.id}/merge/')
        assert resp.status_code == 200, resp.data
        pr.refresh_from_db()
        assert pr.status == 'merged'

    def test_unprotected_merge_succeeds(self, project, owner):
        pr = self._make_pr(project, owner, protected=False)
        resp = _client(owner).post(f'/api/projects/pull-requests/{pr.id}/merge/')
        assert resp.status_code == 200, resp.data
        pr.refresh_from_db()
        assert pr.status == 'merged'
