"""
The post and comment action menu, server side.

Every item in that menu is only as good as the rule behind it. Disabling comments
has to be refused by the API, not merely hidden in the UI. Reporting has to be
filable from a menu without the client knowing ContentType primary keys, which
differ per environment. Sharing to a channel must not become a way to write into
a channel you cannot read.
"""
import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.community.models import ChatRoom, Comment, Post, Report
from apps.projects.models import Project


def _user(name, role='student', **extra):
    return User.objects.create_user(
        email=f'{name}@ssct.edu.ph', username=name, password='pw12345678',
        role=role, **extra,
    )


def _client(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def author(db):
    return _user('pa_author')


@pytest.fixture
def post(author):
    return Post.objects.create(author=author, content='the original post')


@pytest.mark.django_db
class TestDisableComments:
    def test_off_by_default(self, post):
        assert post.comments_disabled is False

    def test_the_author_can_turn_commenting_off(self, author, post):
        response = _client(author).patch(
            f'/api/community/posts/{post.id}/', {'comments_disabled': True}, format='json',
        )

        assert response.status_code == 200, response.data
        post.refresh_from_db()
        assert post.comments_disabled is True

    def test_a_comment_is_refused_once_it_is_off(self, author, post):
        post.comments_disabled = True
        post.save(update_fields=['comments_disabled'])
        other = _user('pa_commenter')

        response = _client(other).post('/api/community/comments/', {
            'post': str(post.id), 'content': 'let me in',
        }, format='json')

        assert response.status_code == 400, response.data
        assert Comment.objects.filter(post=post).count() == 0

    def test_existing_comments_are_kept(self, author, post):
        # Turning comments off is not deletion; what was said stays said.
        Comment.objects.create(post=post, author=author, content='said earlier')
        post.comments_disabled = True
        post.save(update_fields=['comments_disabled'])

        listed = _client(author).get(f'/api/community/posts/{post.id}/comments/')

        # This action returns a bare list, not a paginated envelope.
        assert [r['content'] for r in listed.data] == ['said earlier']

    def test_commenting_works_again_when_re_enabled(self, author, post):
        post.comments_disabled = True
        post.save(update_fields=['comments_disabled'])
        _client(author).patch(f'/api/community/posts/{post.id}/',
                              {'comments_disabled': False}, format='json')

        response = _client(_user('pa_later')).post('/api/community/comments/', {
            'post': str(post.id), 'content': 'back on',
        }, format='json')

        assert response.status_code == 201, response.data


@pytest.mark.django_db
class TestReportingFromTheMenu:
    def test_a_post_can_be_reported_by_type_and_id(self, post):
        # No ContentType primary key: those differ between databases, so a UI that
        # hardcoded one would report the wrong model after a rebuild.
        reporter = _user('pa_reporter')

        response = _client(reporter).post('/api/community/reports/', {
            'target_type': 'post', 'target_id': str(post.id),
            'report_type': 'spam', 'reason': 'unsolicited advertising',
        }, format='json')

        assert response.status_code == 201, response.data
        report = Report.objects.get()
        assert report.reported_object == post
        assert report.reporter == reporter
        assert report.status == 'pending'

    def test_a_comment_can_be_reported_too(self, author, post):
        comment = Comment.objects.create(post=post, author=author, content='rude')
        reporter = _user('pa_reporter2')

        response = _client(reporter).post('/api/community/reports/', {
            'target_type': 'comment', 'target_id': str(comment.id),
            'report_type': 'harassment', 'reason': 'abusive',
        }, format='json')

        assert response.status_code == 201, response.data
        assert Report.objects.get().reported_object == comment

    def test_reporting_something_that_does_not_exist_is_rejected(self):
        reporter = _user('pa_reporter3')

        response = _client(reporter).post('/api/community/reports/', {
            'target_type': 'post', 'target_id': '00000000-0000-0000-0000-000000000000',
            'report_type': 'spam', 'reason': 'x',
        }, format='json')

        # Otherwise the queue shows a row the moderator cannot render or act on.
        assert response.status_code == 400
        assert Report.objects.count() == 0

    def test_a_reporter_cannot_see_other_peoples_reports(self, post):
        mine = _user('pa_mine')
        theirs = _user('pa_theirs')
        for reporter in (mine, theirs):
            _client(reporter).post('/api/community/reports/', {
                'target_type': 'post', 'target_id': str(post.id),
                'report_type': 'spam', 'reason': 'x',
            }, format='json')

        listed = _client(mine).get('/api/community/reports/')

        rows = listed.data.get('results', listed.data)
        assert len(rows) == 1


@pytest.mark.django_db
class TestModeratorQueue:
    def _report(self, target_type, target_id, reporter=None):
        reporter = reporter or _user(f'q_rep_{target_id.hex[:6]}')
        _client(reporter).post('/api/community/reports/', {
            'target_type': target_type, 'target_id': str(target_id),
            'report_type': 'spam', 'reason': 'because',
        }, format='json')

    def test_a_student_cannot_open_the_queue(self, post):
        response = _client(_user('q_student')).get('/api/community/reports/queue/')
        assert response.status_code == 403

    def test_a_moderator_sees_the_reported_content_itself(self, author, post):
        # The point of the queue: a generic relation alone says "post f3a2… was
        # reported", leaving the moderator to go and find it.
        self._report('post', post.id)
        moderator = _user('q_mod', is_staff=True)

        response = _client(moderator).get('/api/community/reports/queue/')

        assert response.status_code == 200, response.data
        row = response.data['results'][0]
        assert row['target']['type'] == 'post'
        assert row['target']['excerpt'] == 'the original post'
        assert row['target']['author']['username'] == author.username
        assert row['reporter']['username'].startswith('q_rep')

    def test_a_report_whose_target_was_deleted_still_lists(self, post):
        # "It was already removed" is a legitimate outcome, and the report still
        # has to be closable. Dropping the row would leave it stuck as pending
        # forever with no way to reach it.
        self._report('post', post.id)
        post.delete()
        moderator = _user('q_mod_del', is_staff=True)

        response = _client(moderator).get('/api/community/reports/queue/')

        assert response.status_code == 200, response.data
        assert response.data['count'] == 1
        assert response.data['results'][0]['target'] is None

    def test_resolving_records_who_did_it(self, post):
        self._report('post', post.id)
        moderator = _user('q_mod2', is_staff=True)
        report = Report.objects.get()

        response = _client(moderator).post(
            f'/api/community/reports/{report.id}/resolve/',
            {'action': 'resolved'}, format='json',
        )

        assert response.status_code == 200, response.data
        report.refresh_from_db()
        assert report.status == 'resolved'
        assert report.moderator == moderator
        assert report.resolved_at is not None

    def test_reviewing_leaves_it_open(self, post):
        self._report('post', post.id)
        moderator = _user('q_mod3', is_staff=True)
        report = Report.objects.get()

        _client(moderator).post(f'/api/community/reports/{report.id}/resolve/',
                                {'action': 'reviewing'}, format='json')

        report.refresh_from_db()
        assert report.status == 'reviewing'
        # Not terminal, so no resolution timestamp.
        assert report.resolved_at is None

    def test_a_student_cannot_resolve(self, post):
        self._report('post', post.id)
        report = Report.objects.get()

        response = _client(_user('q_nosy')).post(
            f'/api/community/reports/{report.id}/resolve/',
            {'action': 'dismissed'}, format='json',
        )

        assert response.status_code == 403
        report.refresh_from_db()
        assert report.status == 'pending'

    def test_the_queue_defaults_to_pending(self, post):
        self._report('post', post.id)
        moderator = _user('q_mod4', is_staff=True)
        report = Report.objects.get()
        _client(moderator).post(f'/api/community/reports/{report.id}/resolve/',
                                {'action': 'resolved'}, format='json')

        pending = _client(moderator).get('/api/community/reports/queue/')
        everything = _client(moderator).get('/api/community/reports/queue/?status=all')

        assert pending.data['count'] == 0
        assert everything.data['count'] == 1


@pytest.mark.django_db
class TestShareToChannel:
    def _room(self, owner):
        project = Project.objects.create(
            name='Shared', slug='shared-proj', description='d', owner=owner,
            project_type='web_app', programming_language='python',
        )
        return ChatRoom.for_project(project)

    def test_sharing_posts_a_message_and_leaves_the_post_alone(self, author, post):
        room = self._room(author)

        response = _client(author).post(
            f'/api/community/posts/{post.id}/share-to-channel/',
            {'room': str(room.id)}, format='json',
        )

        assert response.status_code == 201, response.data
        message = room.messages.get()
        assert author.username in message.content
        assert str(post.id) in message.content
        # A share, not a move: re-parenting would orphan comments and likes.
        assert Post.objects.filter(id=post.id).exists()

    def test_a_channel_you_cannot_read_is_refused(self, author, post):
        outsider = _user('sh_outsider')
        private = Project.objects.create(
            name='Secret', slug='secret-share', description='d', owner=author,
            project_type='web_app', programming_language='python',
            visibility='private',
        )
        room = ChatRoom.for_project(private)

        response = _client(outsider).post(
            f'/api/community/posts/{post.id}/share-to-channel/',
            {'room': str(room.id)}, format='json',
        )

        # Otherwise this is a way to write into a channel you have no access to.
        assert response.status_code == 403
        assert room.messages.count() == 0

    def test_a_missing_room_is_a_validation_error(self, author, post):
        response = _client(author).post(
            f'/api/community/posts/{post.id}/share-to-channel/', {}, format='json',
        )
        assert response.status_code == 400


def _png_upload(name='pic.png'):
    """A genuine PNG.

    Built with Pillow rather than pasted as base64: ImageField validates through
    Pillow, and a base64 blob that is one byte wrong fails as
    "not an image or a corrupted image" — which reads like a product bug.
    """
    import io as _io

    from django.core.files.uploadedfile import SimpleUploadedFile
    from PIL import Image

    buffer = _io.BytesIO()
    Image.new('RGB', (2, 2), (120, 80, 200)).save(buffer, format='PNG')
    return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/png')


@pytest.mark.django_db
class TestCommentImages:
    """A comment can be a picture, words, or both — but not neither."""

    def test_a_comment_can_carry_an_image(self, author, post):
        response = _client(author).post('/api/community/comments/', {
            'post': str(post.id), 'content': 'look at this', 'image': _png_upload(),
        }, format='multipart')

        assert response.status_code == 201, response.data
        comment = Comment.objects.get()
        assert comment.image
        assert response.data['image_url']

    def test_an_image_only_comment_is_allowed(self, author, post):
        # content is blank=True for exactly this, matching image-only posts.
        response = _client(author).post('/api/community/comments/', {
            'post': str(post.id), 'content': '', 'image': _png_upload(),
        }, format='multipart')

        assert response.status_code == 201, response.data
        assert Comment.objects.get().content == ''

    def test_an_empty_comment_with_no_image_is_refused(self, author, post):
        response = _client(author).post('/api/community/comments/', {
            'post': str(post.id), 'content': '   ',
        }, format='multipart')

        assert response.status_code == 400
        assert Comment.objects.count() == 0

    def test_the_image_can_be_replaced_on_edit(self, author, post):
        created = _client(author).post('/api/community/comments/', {
            'post': str(post.id), 'content': 'first', 'image': _png_upload('one.png'),
        }, format='multipart')
        comment_id = created.data['id']
        first = Comment.objects.get(pk=comment_id).image.name

        updated = _client(author).patch(f'/api/community/comments/{comment_id}/', {
            'image': _png_upload('two.png'),
        }, format='multipart')

        assert updated.status_code == 200, updated.data
        assert Comment.objects.get(pk=comment_id).image.name != first

    def test_the_image_can_be_removed_on_edit(self, author, post):
        created = _client(author).post('/api/community/comments/', {
            'post': str(post.id), 'content': 'keeps words', 'image': _png_upload(),
        }, format='multipart')
        comment_id = created.data['id']

        updated = _client(author).patch(f'/api/community/comments/{comment_id}/',
                                        {'image': None}, format='json')

        assert updated.status_code == 200, updated.data
        assert not Comment.objects.get(pk=comment_id).image

    def test_removing_the_image_from_an_image_only_comment_is_refused(self, author, post):
        # It would leave a comment with neither words nor a picture.
        created = _client(author).post('/api/community/comments/', {
            'post': str(post.id), 'content': '', 'image': _png_upload(),
        }, format='multipart')
        comment_id = created.data['id']

        updated = _client(author).patch(f'/api/community/comments/{comment_id}/',
                                        {'image': None}, format='json')

        assert updated.status_code == 400, updated.data
        assert Comment.objects.get(pk=comment_id).image


@pytest.mark.django_db
class TestPostImageEditing:
    """Editing a post must be able to change or drop its picture."""

    def test_the_image_can_be_replaced(self, author):
        post = Post.objects.create(author=author, content='with a picture',
                                   image=_png_upload('before.png'))
        before = post.image.name

        response = _client(author).patch(f'/api/community/posts/{post.id}/', {
            'image': _png_upload('after.png'),
        }, format='multipart')

        assert response.status_code == 200, response.data
        post.refresh_from_db()
        assert post.image.name != before

    def test_the_image_can_be_removed(self, author):
        post = Post.objects.create(author=author, content='words remain',
                                   image=_png_upload())

        response = _client(author).patch(f'/api/community/posts/{post.id}/',
                                         {'image': None}, format='json')

        assert response.status_code == 200, response.data
        post.refresh_from_db()
        assert not post.image

    def test_an_image_can_be_added_to_a_text_post(self, author):
        post = Post.objects.create(author=author, content='no picture yet')

        response = _client(author).patch(f'/api/community/posts/{post.id}/', {
            'image': _png_upload(),
        }, format='multipart')

        assert response.status_code == 200, response.data
        post.refresh_from_db()
        assert post.image

    def test_someone_else_cannot_change_the_image(self, author):
        post = Post.objects.create(author=author, content='mine')
        intruder = _user('pi_intruder')

        response = _client(intruder).patch(f'/api/community/posts/{post.id}/', {
            'image': _png_upload(),
        }, format='multipart')

        assert response.status_code in (403, 404), response.status_code
        post.refresh_from_db()
        assert not post.image
