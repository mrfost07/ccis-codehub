"""
Community and Social Features Models
"""
import uuid
from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class Post(models.Model):
    """Community posts"""
    
    POST_TYPE_CHOICES = [
        ('text', 'Text'),
        ('image', 'Image'),
        ('question', 'Question'),
        ('showcase', 'Showcase'),
        ('tutorial', 'Tutorial'),
        ('discussion', 'Discussion'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='posts')
    organization = models.ForeignKey('Organization', on_delete=models.CASCADE, null=True, blank=True, related_name='posts')
    title = models.CharField(max_length=255, blank=True)
    content = models.TextField(blank=True, default='')  # Allow blank for image-only posts
    code_snippet = models.JSONField(default=dict, blank=True, help_text='Code with syntax highlighting info')
    image = models.ImageField(upload_to='post_images/', blank=True, null=True)
    post_type = models.CharField(max_length=20, choices=POST_TYPE_CHOICES, default='text')
    is_pinned = models.BooleanField(default=False)
    is_locked = models.BooleanField(default=False)
    like_count = models.IntegerField(default=0)
    comment_count = models.IntegerField(default=0)
    view_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-is_pinned', '-created_at']
        indexes = [
            # Serves the default feed ordering and the type-filtered feed.
            models.Index(fields=['-is_pinned', '-created_at'], name='post_feed_idx'),
            models.Index(fields=['post_type', '-created_at'], name='post_type_feed_idx'),
        ]

    def __str__(self):
        return self.title or f"Post by {self.author.username}"


class Comment(models.Model):
    """Comments on posts"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    content = models.TextField()
    like_count = models.IntegerField(default=0)
    is_edited = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.author.username} on {self.post}"


class PostLike(models.Model):
    """Likes for posts"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='post_likes')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['post', 'user']
    
    def __str__(self):
        return f"{self.user.username} likes {self.post}"


class CommentLike(models.Model):
    """Likes for comments"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comment_likes')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['comment', 'user']
    
    def __str__(self):
        return f"{self.user.username} likes comment"


class PostTag(models.Model):
    """Tags for categorizing posts"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50)
    slug = models.SlugField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name


class Hashtag(models.Model):
    """Hashtags used in posts"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tag = models.CharField(max_length=100, unique=True)
    usage_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-usage_count']
    
    def __str__(self):
        return f"#{self.tag}"


class Notification(models.Model):
    """Notifications for users"""
    
    NOTIFICATION_TYPE_CHOICES = [
        ('like', 'Like'),
        ('comment', 'Comment'),
        ('follow', 'Follow'),
        ('mention', 'Mention'),
        ('project_invite', 'Project Invite'),
        ('badge_earned', 'Badge Earned'),
        ('course_completed', 'Course Completed'),
        ('review_request', 'Review Request'),
        ('announcement', 'Announcement'),
        ('org_join_request', 'Organization Join Request'),
        ('org_invitation', 'Organization Invitation'),
        ('org_approved', 'Organization Approved'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='sent_notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPE_CHOICES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    related_object_id = models.UUIDField(null=True, blank=True)
    related_content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    related_object = GenericForeignKey('related_content_type', 'related_object_id')
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.notification_type} for {self.recipient.username}"


class Report(models.Model):
    """Reports for inappropriate content"""
    
    REPORT_TYPE_CHOICES = [
        ('spam', 'Spam'),
        ('harassment', 'Harassment'),
        ('inappropriate', 'Inappropriate Content'),
        ('copyright', 'Copyright Violation'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('reviewing', 'Reviewing'),
        ('resolved', 'Resolved'),
        ('dismissed', 'Dismissed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reports_made')
    reported_content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    reported_object_id = models.UUIDField()
    reported_object = GenericForeignKey('reported_content_type', 'reported_object_id')
    report_type = models.CharField(max_length=20, choices=REPORT_TYPE_CHOICES)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    moderator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reports_handled')
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Report by {self.reporter.username} - {self.report_type}"


class UserFollow(models.Model):
    """Follow relationships between users with request system"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    follower = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='following')
    following = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='followers')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='accepted')  # Default accepted for now
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['follower', 'following']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.follower.username} -> {self.following.username} ({self.status})"


class Badge(models.Model):
    """Achievement badges"""
    
    BADGE_TYPE_CHOICES = [
        ('achievement', 'Achievement'),
        ('skill', 'Skill'),
        ('milestone', 'Milestone'),
        ('special', 'Special'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    icon = models.URLField(blank=True)
    badge_type = models.CharField(max_length=20, choices=BADGE_TYPE_CHOICES)
    points_required = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name


class UserBadge(models.Model):
    """Badges earned by users"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'badge']
        ordering = ['-earned_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.badge.name}"


class ChatRoomQuerySet(models.QuerySet):
    """Reachability, in one place.

    The REST viewset and the WebSocket consumer both have to answer "may this
    person see this channel", and they must answer it identically — a socket that
    is more permissive than the API is a way to read a private project's
    discussion. Two copies of this predicate would drift, which is the failure
    this codebase keeps repeating.
    """

    def readable_by(self, user):
        program_map = {
            'Computer Science': 'CS', 'BS Computer Science': 'CS', 'BSCS': 'CS', 'CS': 'CS',
            'Information Technology': 'IT', 'BS Information Technology': 'IT',
            'BSIT': 'IT', 'IT': 'IT',
            'Information Systems': 'IS', 'BS Information Systems': 'IS',
            'BSIS': 'IS', 'IS': 'IS',
        }
        program_room = program_map.get(getattr(user, 'program', None))
        global_rooms = ['GLOBAL'] + ([program_room] if program_room else [])

        # Mirrors ProjectViewSet.get_queryset: public, owned, or actively a member.
        visible_project = (
            models.Q(project__visibility='public')
            | models.Q(project__owner=user)
            | models.Q(project__memberships__user=user, project__memberships__is_active=True)
        )
        visible_task = (
            models.Q(task__project__visibility='public')
            | models.Q(task__project__owner=user)
            | models.Q(task__project__memberships__user=user,
                       task__project__memberships__is_active=True)
        )

        return self.filter(
            models.Q(scope=ChatRoom.SCOPE_GLOBAL, room_type__in=global_rooms)
            | (models.Q(scope=ChatRoom.SCOPE_PROJECT) & visible_project)
            | (models.Q(scope=ChatRoom.SCOPE_TASK) & visible_task)
            | models.Q(scope=ChatRoom.SCOPE_ORGANIZATION,
                       organization__memberships__user=user,
                       organization__memberships__status='active')
        ).distinct()


class ChatRoom(models.Model):
    """A channel: a stream of messages with a scope.

    Was four fixed program rooms. `room_type` carried `unique=True`, which meant
    exactly four rooms could ever exist on the whole platform — so a channel per
    project or per task was not "unbuilt", it was impossible.

    Now every room has a `scope` saying what it belongs to:

        global        the original CS / IT / IS / GLOBAL program rooms
        organization  one per Organization
        project       one per Project
        task          one per ProjectTask, created on first message

    Deliberately still called ChatRoom rather than renamed to Channel. A rename
    would mean a table rename, every FK's related_name, the serializers, the
    viewsets, the /community/chat/rooms/ URLs and the frontend that calls them —
    a lot of churn and regression surface for a synonym. "Channel" is the product
    word for a row of this table.
    """

    ROOM_TYPE_CHOICES = [
        ('CS', 'Computer Science'),
        ('IT', 'Information Technology'),
        ('IS', 'Information Systems'),
        ('GLOBAL', 'Global Chat'),
    ]

    SCOPE_GLOBAL = 'global'
    SCOPE_ORGANIZATION = 'organization'
    SCOPE_PROJECT = 'project'
    SCOPE_TASK = 'task'
    SCOPE_CHOICES = [
        (SCOPE_GLOBAL, 'Global'),
        (SCOPE_ORGANIZATION, 'Organization'),
        (SCOPE_PROJECT, 'Project'),
        (SCOPE_TASK, 'Task'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    scope = models.CharField(
        max_length=16, choices=SCOPE_CHOICES, default=SCOPE_GLOBAL, db_index=True,
    )
    # Only meaningful for scope='global'. Nullable and no longer unique on its
    # own — the conditional constraint below keeps it unique among global rooms,
    # which is what the original unique=True was actually protecting.
    room_type = models.CharField(
        max_length=10, choices=ROOM_TYPE_CHOICES, null=True, blank=True,
    )
    # Exactly one of these is set, matched to `scope` by a check constraint.
    # String references so community does not import projects at module level;
    # projects/models.py has no FK back here, so there is no migration cycle.
    organization = models.ForeignKey(
        'Organization', on_delete=models.CASCADE,
        null=True, blank=True, related_name='channels',
    )
    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE,
        null=True, blank=True, related_name='channels',
    )
    task = models.ForeignKey(
        'projects.ProjectTask', on_delete=models.CASCADE,
        null=True, blank=True, related_name='channels',
    )
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=10, default='💬')
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = ChatRoomQuerySet.as_manager()

    class Meta:
        ordering = ['scope', 'room_type', 'name']
        constraints = [
            # What unique=True on room_type used to guarantee, now limited to the
            # scope where room_type means anything.
            models.UniqueConstraint(
                fields=['room_type'],
                condition=models.Q(scope='global'),
                name='chatroom_one_room_per_program',
            ),
            models.UniqueConstraint(
                fields=['organization'],
                condition=models.Q(scope='organization'),
                name='chatroom_one_per_organization',
            ),
            models.UniqueConstraint(
                fields=['project'],
                condition=models.Q(scope='project'),
                name='chatroom_one_per_project',
            ),
            models.UniqueConstraint(
                fields=['task'],
                condition=models.Q(scope='task'),
                name='chatroom_one_per_task',
            ),
            # A project-scoped room with no project (or with a task as well) is
            # not a state any code should have to defend against.
            models.CheckConstraint(
                check=(
                    models.Q(scope='global', organization__isnull=True,
                             project__isnull=True, task__isnull=True)
                    | models.Q(scope='organization', organization__isnull=False,
                               project__isnull=True, task__isnull=True)
                    | models.Q(scope='project', organization__isnull=True,
                               project__isnull=False, task__isnull=True)
                    | models.Q(scope='task', organization__isnull=True,
                               project__isnull=True, task__isnull=False)
                ),
                name='chatroom_scope_matches_target',
            ),
        ]

    def __str__(self):
        if self.scope == self.SCOPE_GLOBAL:
            return f"{self.name} ({self.room_type})"
        return f"{self.name} ({self.scope})"

    @classmethod
    def for_project(cls, project):
        """The project's channel, created on demand.

        Projects get a channel the first time one is asked for rather than at
        creation time, so this works for the projects that already exist without
        a backfill.
        """
        room, _ = cls.objects.get_or_create(
            scope=cls.SCOPE_PROJECT, project=project,
            defaults={'name': project.name, 'icon': '📁'},
        )
        return room

    @classmethod
    def for_task(cls, task):
        """The task's channel, created on demand.

        Creating a task now opens its channel with a first event, so these are no
        longer empty. Still get_or_create rather than a backfill, because tasks
        that predate this have no channel and get one the first time they are
        opened or touched.
        """
        room, _ = cls.objects.get_or_create(
            scope=cls.SCOPE_TASK, task=task,
            defaults={'name': task.title[:100], 'icon': '✅'},
        )
        return room


class ChatNickname(models.Model):
    """User nicknames for chat"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_nickname')
    nickname = models.CharField(max_length=50)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} -> {self.nickname}"


class ChatMessage(models.Model):
    """Messages in chat rooms"""

    # A message nobody typed: the task moved, was assigned, was created. Blank
    # means somebody wrote it. The client styles the two differently, so this has
    # to be a field rather than a convention about the text.
    EVENT_TASK_CREATED = 'task_created'
    EVENT_TASK_ASSIGNED = 'task_assigned'
    EVENT_TASK_STATUS = 'task_status'
    EVENT_CHOICES = [
        (EVENT_TASK_CREATED, 'Task created'),
        (EVENT_TASK_ASSIGNED, 'Task assigned'),
        (EVENT_TASK_STATUS, 'Task status changed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_messages')
    content = models.TextField()
    event_type = models.CharField(
        max_length=24, blank=True, default='', choices=EVENT_CHOICES, db_index=True,
    )
    # A quoted reply: "re: that message", still shown inline in the channel.
    # Distinct from thread_root below — do not conflate them.
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    # The thread this message belongs to. Null means the message IS a root and
    # belongs to the channel itself. Slack semantics: a channel lists roots only,
    # and opening one shows its thread_replies.
    #
    # reply_to could not serve this. It is a pointer at one earlier message with
    # no notion of a root, so answering "give me this thread" meant walking a
    # chain per message, and "how many replies" was not answerable at all.
    thread_root = models.ForeignKey(
        'self', on_delete=models.CASCADE,
        null=True, blank=True, related_name='thread_replies',
    )
    # Denormalised onto the root. A channel list showing "12 replies" per root
    # is otherwise a COUNT per message on every fetch.
    reply_count = models.PositiveIntegerField(default=0)
    last_reply_at = models.DateTimeField(null=True, blank=True)
    is_bumped = models.BooleanField(default=False)
    bump_count = models.IntegerField(default=0)
    is_deleted = models.BooleanField(default=False)
    deleted_for_everyone = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Chronological. This was ['-is_bumped', '-created_at'], which floats any
        # bumped message above everything else permanently — reasonable for a
        # noticeboard, wrong for a conversation. ChatMessageViewSet already
        # appended .order_by('created_at'), so the chat UI was unaffected; the old
        # default only leaked into queries that did not order for themselves
        # (related lookups, .first(), the admin), where it silently returned a
        # bumped message as "the latest".
        ordering = ['created_at']
        indexes = [
            # The channel fetch: roots of one room, oldest first.
            models.Index(fields=['room', 'thread_root', 'created_at'],
                         name='chatmsg_room_thread_idx'),
        ]

    def __str__(self):
        return f"{self.sender.username}: {self.content[:50]}"

    @property
    def is_thread_root(self):
        return self.thread_root_id is None

    @classmethod
    def post_reply(cls, root, sender, content, **extra):
        """Add a reply to a thread and keep the root's counters honest.

        The one place reply_count and last_reply_at are written. They are
        denormalised, so two call sites would eventually disagree with the rows
        they summarise, and a wrong reply count is the kind of thing nobody
        notices until someone counts.

        Replying to a reply joins the same thread rather than nesting deeper.
        Slack works this way, and arbitrary nesting has no sane rendering on a
        phone.
        """
        from django.db.models import F
        from django.db import transaction
        from django.utils import timezone

        root = root.thread_root or root

        with transaction.atomic():
            reply = cls.objects.create(
                room=root.room, sender=sender, content=content,
                thread_root=root, **extra,
            )
            # F() so concurrent replies cannot both read 3 and both write 4.
            cls.objects.filter(pk=root.pk).update(
                reply_count=F('reply_count') + 1,
                last_reply_at=timezone.now(),
            )
        return reply


class ChannelMembership(models.Model):
    """Per-user state for a channel: what they have read, and whether they care.

    There was no read state of any kind, so an unread badge was not merely
    missing — it was unimplementable. Without one, a channel list cannot tell
    anyone where to look, which is most of what makes channels usable once there
    is more than one.

    Rows are created when a user first opens a channel; absence means "never
    opened", which reads as fully unread.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    channel = models.ForeignKey(
        ChatRoom, on_delete=models.CASCADE, related_name='memberships',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='channel_memberships',
    )
    last_read_at = models.DateTimeField(null=True, blank=True)
    muted = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['channel', 'user'], name='channelmembership_unique',
            ),
        ]
        indexes = [
            models.Index(fields=['user', 'channel'], name='chanmember_user_idx'),
        ]

    def __str__(self):
        return f"{self.user.username} @ {self.channel.name}"

    def unread_count(self):
        """Messages in this channel the user has not seen.

        Counts roots and thread replies alike: an unanswered thread is still
        something waiting for you. Excludes the user's own messages, since your
        own message arriving is not news.
        """
        messages = self.channel.messages.exclude(sender=self.user).exclude(
            deleted_for_everyone=True,
        )
        if self.last_read_at is not None:
            messages = messages.filter(created_at__gt=self.last_read_at)
        return messages.count()


class MessageReaction(models.Model):
    """Reactions to chat messages"""
    
    REACTION_CHOICES = [
        ('👍', 'Thumbs Up'),
        ('❤️', 'Heart'),
        ('😂', 'Laugh'),
        ('😮', 'Wow'),
        ('😢', 'Sad'),
        ('🔥', 'Fire'),
        ('👏', 'Clap'),
        ('🎉', 'Party'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(ChatMessage, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='message_reactions')
    reaction = models.CharField(max_length=10, choices=REACTION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['message', 'user', 'reaction']
    
    def __str__(self):
        return f"{self.user.username} reacted {self.reaction}"


class MessageDeletedFor(models.Model):
    """Track which users have deleted a message for themselves"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(ChatMessage, on_delete=models.CASCADE, related_name='deleted_for')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    deleted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['message', 'user']


class Organization(models.Model):
    """Organization/Group for community members"""
    
    TYPE_CHOICES = [
        ('program', 'Program-based'),  # BSCS, BSIT, BSIS
        ('club', 'Club'),
        ('interest', 'Interest Group'),
        ('official', 'Official'),
    ]
    
    PROGRAM_CHOICES = [
        ('BSCS', 'BS Computer Science'),
        ('BSIT', 'BS Information Technology'),
        ('BSIS', 'BS Information Systems'),
        ('ALL', 'All Programs'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    cover_image = models.ImageField(upload_to='org_covers/', blank=True, null=True)
    icon = models.CharField(max_length=10, default='👥')
    
    org_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='club')
    program = models.CharField(max_length=10, choices=PROGRAM_CHOICES, blank=True, null=True)
    
    is_official = models.BooleanField(default=False)  # Official program organizations
    is_private = models.BooleanField(default=False)  # Requires invitation to join
    requires_approval = models.BooleanField(default=True)  # Join requests need approval
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_organizations')
    member_count = models.IntegerField(default=0)
    post_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-is_official', '-member_count', 'name']
    
    def __str__(self):
        return self.name


class OrganizationMembership(models.Model):
    """Membership in an organization"""
    
    ROLE_CHOICES = [
        ('member', 'Member'),
        ('moderator', 'Moderator'),
        ('admin', 'Admin'),
        ('owner', 'Owner'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('invited', 'Invited'),
        ('active', 'Active'),
        ('banned', 'Banned'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='org_memberships')
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='org_invitations_sent')
    joined_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['organization', 'user']
        ordering = ['-joined_at']
    
    def __str__(self):
        return f"{self.user.username} in {self.organization.name} ({self.role})"


class OrganizationInvitation(models.Model):
    """Invitation to join an organization"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('expired', 'Expired'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='invitations')
    inviter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_org_invitations')
    invitee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_org_invitations')
    
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['organization', 'invitee']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Invitation to {self.invitee.username} for {self.organization.name}"
