"""
Serializers for Community app
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Post, Comment, PostLike, CommentLike, PostTag,
    Hashtag, Notification, Report, UserFollow, Badge, UserBadge,
    Organization, OrganizationMembership, OrganizationInvitation
)

User = get_user_model()


class AuthorSerializer(serializers.ModelSerializer):
    """Serializer for post/comment authors"""
    profile_picture = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'profile_picture']
        read_only_fields = fields
    
    def get_profile_picture(self, obj):
        if obj.profile_picture:
            return obj.profile_picture.url
        return None


class PostOrganizationSerializer(serializers.ModelSerializer):
    """Simple serializer for organization in post"""
    class Meta:
        model = Organization
        fields = ['id', 'name', 'slug', 'icon']


class PostSerializer(serializers.ModelSerializer):
    """Serializer for Post model"""
    author = AuthorSerializer(read_only=True)
    organization_data = PostOrganizationSerializer(source='organization', read_only=True)
    is_liked = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        write_only=True
    )
    # Make fields optional for flexible post creation
    content = serializers.CharField(required=False, allow_blank=True, default='')
    title = serializers.CharField(required=False, allow_blank=True, default='')
    code_snippet = serializers.JSONField(required=False, default=dict)
    post_type = serializers.CharField(required=False, default='text')
    image = serializers.ImageField(required=False, allow_null=True)
    organization = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    
    class Meta:
        model = Post
        fields = [
            'id', 'author', 'organization', 'organization_data', 'title', 'content', 'code_snippet',
            'image', 'image_url', 'post_type', 'is_pinned', 'is_locked',
            'like_count', 'comment_count', 'view_count',
            'is_liked', 'tags', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'author', 'is_pinned', 'is_locked',
            'like_count', 'comment_count', 'view_count',
            'created_at', 'updated_at'
        ]
    
    def get_image_url(self, obj):
        """Get the full URL for the image"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
    
    def get_is_liked(self, obj):
        """Check if current user has liked this post"""
        # Prefer the queryset annotation (single subquery on the list endpoint);
        # fall back to a direct query for contexts that don't annotate.
        annotated = getattr(obj, '_is_liked', None)
        if annotated is not None:
            return annotated
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return PostLike.objects.filter(post=obj, user=request.user).exists()
        return False
    
    def create(self, validated_data):
        """Create post with tags and organization"""
        tags = validated_data.pop('tags', [])
        org_id = validated_data.pop('organization', None)
        
        # Handle organization
        if org_id:
            try:
                validated_data['organization'] = Organization.objects.get(id=org_id)
            except Organization.DoesNotExist:
                pass
        
        post = Post.objects.create(**validated_data)
        
        # Update org post count
        if post.organization:
            post.organization.post_count = Post.objects.filter(organization=post.organization).count()
            post.organization.save()
        
        # Process hashtags from content
        content = validated_data.get('content', '')
        hashtags = [word[1:] for word in content.split() if word.startswith('#')]
        
        for tag in hashtags:
            hashtag, created = Hashtag.objects.get_or_create(tag=tag.lower())
            hashtag.usage_count += 1
            hashtag.save()
        
        return post


class CommentSerializer(serializers.ModelSerializer):
    """Serializer for Comment model"""
    author = AuthorSerializer(read_only=True)
    is_liked = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = [
            'id', 'post', 'author', 'parent', 'content',
            'like_count', 'is_edited', 'is_liked', 'replies',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'author', 'like_count', 'is_edited',
            'created_at', 'updated_at'
        ]
    
    def get_is_liked(self, obj):
        """Check if current user has liked this comment"""
        request = self.context.get('request')
        if not (request and request.user.is_authenticated):
            return False
        # my_likes comes from shaped_comments and holds only this viewer's rows.
        mine = getattr(obj, 'my_likes', None)
        if mine is not None:
            return bool(mine)
        return CommentLike.objects.filter(comment=obj, user=request.user).exists()

    def get_replies(self, obj):
        """Get replies to this comment"""
        # parent_id, not parent: touching .parent loads the whole parent row,
        # which is one query per reply on top of the replies lookup itself.
        if obj.parent_id is not None:
            return []
        replies = getattr(obj, 'ordered_replies', None)
        if replies is None:
            replies = Comment.objects.filter(parent=obj).order_by('created_at')
        return CommentSerializer(replies, many=True, context=self.context).data


class PostLikeSerializer(serializers.ModelSerializer):
    """Serializer for PostLike model"""
    
    class Meta:
        model = PostLike
        fields = ['id', 'post', 'user', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class CommentLikeSerializer(serializers.ModelSerializer):
    """Serializer for CommentLike model"""
    
    class Meta:
        model = CommentLike
        fields = ['id', 'comment', 'user', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class PostTagSerializer(serializers.ModelSerializer):
    """Serializer for PostTag model"""
    
    class Meta:
        model = PostTag
        fields = ['id', 'name', 'slug', 'created_at']
        read_only_fields = ['id', 'created_at']


class HashtagSerializer(serializers.ModelSerializer):
    """Serializer for Hashtag model"""
    
    class Meta:
        model = Hashtag
        fields = ['id', 'tag', 'usage_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'usage_count', 'created_at', 'updated_at']


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model"""
    sender = AuthorSerializer(read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'sender', 'notification_type',
            'title', 'message', 'is_read', 'related_object_id',
            'metadata', 'created_at'
        ]
        read_only_fields = [
            'id', 'recipient', 'sender', 'created_at'
        ]


class ReportSerializer(serializers.ModelSerializer):
    """Serializer for Report model"""
    reporter = AuthorSerializer(read_only=True)
    
    class Meta:
        model = Report
        fields = [
            'id', 'reporter', 'reported_content_type', 'reported_object_id',
            'report_type', 'reason', 'status', 'moderator',
            'created_at', 'resolved_at'
        ]
        read_only_fields = [
            'id', 'reporter', 'status', 'moderator',
            'created_at', 'resolved_at'
        ]


class UserFollowSerializer(serializers.ModelSerializer):
    """Serializer for UserFollow model"""
    follower = AuthorSerializer(read_only=True)
    following = AuthorSerializer(read_only=True)
    is_mutual = serializers.SerializerMethodField()
    
    class Meta:
        model = UserFollow
        fields = ['id', 'follower', 'following', 'status', 'is_mutual', 'created_at', 'updated_at']
        read_only_fields = ['id', 'follower', 'created_at', 'updated_at']
    
    def get_is_mutual(self, obj):
        """Check if the follow is mutual (both follow each other)"""
        return UserFollow.objects.filter(
            follower=obj.following,
            following=obj.follower,
            status='accepted'
        ).exists()


class BadgeSerializer(serializers.ModelSerializer):
    """Serializer for Badge model"""
    
    class Meta:
        model = Badge
        fields = [
            'id', 'name', 'description', 'icon',
            'badge_type', 'points_required', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class UserBadgeSerializer(serializers.ModelSerializer):
    """Serializer for UserBadge model"""
    badge = BadgeSerializer(read_only=True)
    
    class Meta:
        model = UserBadge
        fields = ['id', 'user', 'badge', 'earned_at']
        read_only_fields = ['id', 'user', 'earned_at']


# Chat Serializers
from .models import ChatRoom, ChatMessage, ChatNickname, MessageReaction, MessageDeletedFor


class ChatRoomSerializer(serializers.ModelSerializer):
    """Serializer for ChatRoom model"""
    member_count = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatRoom
        fields = ['id', 'name', 'room_type', 'description', 'icon', 'member_count', 'unread_count', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_member_count(self, obj):
        # Count users who have sent messages in this room
        return obj.messages.values('sender').distinct().count()
    
    def get_unread_count(self, obj):
        # For now, return 0 - can be enhanced with read receipts later
        return 0


class ChatNicknameSerializer(serializers.ModelSerializer):
    """Serializer for ChatNickname model"""
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = ChatNickname
        fields = ['id', 'user', 'username', 'nickname', 'updated_at']
        read_only_fields = ['id', 'user', 'updated_at']


class MessageReactionSerializer(serializers.ModelSerializer):
    """Serializer for MessageReaction model"""
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = MessageReaction
        fields = ['id', 'message', 'user', 'username', 'reaction', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class ChatMessageSerializer(serializers.ModelSerializer):
    """Serializer for ChatMessage model"""
    sender_info = serializers.SerializerMethodField()
    reactions_summary = serializers.SerializerMethodField()
    reply_to_info = serializers.SerializerMethodField()
    is_own_message = serializers.SerializerMethodField()
    is_deleted_for_me = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'room', 'sender', 'sender_info', 'content', 
            'reply_to', 'reply_to_info', 'is_bumped', 'bump_count',
            'is_deleted', 'deleted_for_everyone', 'is_own_message',
            'is_deleted_for_me', 'reactions_summary', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'sender', 'is_bumped', 'bump_count', 'is_deleted', 'deleted_for_everyone', 'created_at', 'updated_at']
    
    def get_sender_info(self, obj):
        # Get nickname if exists, otherwise username
        try:
            nickname = obj.sender.chat_nickname.nickname
        except:
            nickname = None
        
        # Get profile picture URL
        profile_picture = None
        if obj.sender.profile_picture:
            profile_picture = obj.sender.profile_picture.url
        
        return {
            'id': str(obj.sender.id),
            'username': obj.sender.username,
            'nickname': nickname,
            'display_name': nickname or obj.sender.username,
            'profile_picture': profile_picture
        }
    
    def get_reactions_summary(self, obj):
        """Reactions grouped by emoji.

        {emoji: {count, users: [{id, username, first_name, last_name,
                                 profile_picture}], reacted_by_me}}

        `users` used to be a list of bare usernames, which is not enough to draw
        an avatar or link through to a profile — so the UI could only ever show a
        number. Same shape as AuthorSerializer everywhere else, so one component
        renders reactors for posts, comments and messages alike.

        reactions__user is prefetched by queries.shaped_chat_messages, so
        expanding this costs no extra queries. It is worth keeping that way:
        without the prefetch this is one query per reaction per message.
        """
        request = self.context.get('request')
        viewer = getattr(request, 'user', None)
        viewer_id = viewer.id if viewer is not None and viewer.is_authenticated else None

        summary = {}
        for reaction in obj.reactions.all():
            entry = summary.setdefault(
                reaction.reaction,
                {'count': 0, 'users': [], 'reacted_by_me': False},
            )
            entry['count'] += 1
            entry['users'].append(
                AuthorSerializer(reaction.user, context=self.context).data
            )
            # Compared by id rather than by object so a prefetched row does not
            # have to be re-fetched to answer it.
            if viewer_id is not None and reaction.user_id == viewer_id:
                entry['reacted_by_me'] = True

        return summary
    
    def get_reply_to_info(self, obj):
        if obj.reply_to:
            try:
                nickname = obj.reply_to.sender.chat_nickname.nickname
            except:
                nickname = None
            
            return {
                'id': str(obj.reply_to.id),
                'sender': nickname or obj.reply_to.sender.username,
                'content': obj.reply_to.content[:100] + ('...' if len(obj.reply_to.content) > 100 else '')
            }
        return None
    
    def get_is_own_message(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Use explicit ID comparison to avoid object identity issues
            return obj.sender_id == request.user.id
        return False
    
    def get_is_deleted_for_me(self, obj):
        request = self.context.get('request')
        if not (request and request.user.is_authenticated):
            return False
        # Iterate the prefetched rows instead of .filter().exists(), which would
        # issue one query PER MESSAGE. The chat polls every 3s, so a 100-message
        # room cost 100 extra queries per poll per connected user.
        return any(d.user_id == request.user.id for d in obj.deleted_for.all())


class OrganizationSerializer(serializers.ModelSerializer):
    """Serializer for Organization model"""
    created_by = AuthorSerializer(read_only=True)
    is_member = serializers.SerializerMethodField()
    membership_status = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    cover_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'slug', 'description', 'cover_image', 'cover_image_url',
            'icon', 'org_type', 'program', 'is_official', 'is_private',
            'requires_approval', 'created_by', 'member_count', 'post_count',
            'is_member', 'membership_status', 'user_role',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'member_count', 'post_count', 'created_at', 'updated_at']
    
    def get_cover_image_url(self, obj):
        if obj.cover_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.cover_image.url)
            return obj.cover_image.url
        return None
    
    def _viewer_membership(self, obj):
        """(prefetched, membership) for the requesting user.

        my_membership is attached by shaped_organizations and holds at most one
        row — unique_together on (organization, user). Returning whether it was
        prefetched lets each method fall back to its own query when this
        serializer is nested somewhere unshaped.
        """
        rows = getattr(obj, 'my_membership', None)
        if rows is None:
            return False, None
        return True, (rows[0] if rows else None)

    def get_is_member(self, obj):
        request = self.context.get('request')
        if not (request and request.user.is_authenticated):
            return False
        prefetched, membership = self._viewer_membership(obj)
        if prefetched:
            return membership is not None and membership.status == 'active'
        return OrganizationMembership.objects.filter(
            organization=obj, user=request.user, status='active'
        ).exists()

    def get_membership_status(self, obj):
        request = self.context.get('request')
        if not (request and request.user.is_authenticated):
            return None
        prefetched, membership = self._viewer_membership(obj)
        if prefetched:
            return membership.status if membership else None
        membership = OrganizationMembership.objects.filter(
            organization=obj, user=request.user
        ).first()
        return membership.status if membership else None

    def get_user_role(self, obj):
        request = self.context.get('request')
        if not (request and request.user.is_authenticated):
            return None
        prefetched, membership = self._viewer_membership(obj)
        if prefetched:
            if membership is not None and membership.status == 'active':
                return membership.role
            return None
        membership = OrganizationMembership.objects.filter(
            organization=obj, user=request.user, status='active'
        ).first()
        return membership.role if membership else None


class OrganizationMembershipSerializer(serializers.ModelSerializer):
    """Serializer for OrganizationMembership model"""
    user = AuthorSerializer(read_only=True)
    organization = OrganizationSerializer(read_only=True)
    invited_by = AuthorSerializer(read_only=True)
    
    class Meta:
        model = OrganizationMembership
        fields = [
            'id', 'organization', 'user', 'role', 'status',
            'invited_by', 'joined_at', 'updated_at'
        ]
        read_only_fields = ['id', 'organization', 'user', 'joined_at', 'updated_at']


class OrganizationInvitationSerializer(serializers.ModelSerializer):
    """Serializer for OrganizationInvitation model"""
    organization = OrganizationSerializer(read_only=True)
    inviter = AuthorSerializer(read_only=True)
    invitee = AuthorSerializer(read_only=True)
    
    class Meta:
        model = OrganizationInvitation
        fields = [
            'id', 'organization', 'inviter', 'invitee',
            'message', 'status', 'created_at', 'responded_at'
        ]
        read_only_fields = ['id', 'inviter', 'created_at', 'responded_at']
