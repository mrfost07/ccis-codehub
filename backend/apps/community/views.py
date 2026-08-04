"""
Views for Community app
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.throttling import UserRateThrottle
from django.db.models import Q, F, Value, Exists, OuterRef
from django.db.models.functions import Greatest
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.core.exceptions import ObjectDoesNotExist
from django.http import Http404

from .models import (
    Post, Comment, PostLike, CommentLike, PostTag,
    Hashtag, Notification, Report, UserFollow, Badge, UserBadge,
    Organization, OrganizationMembership, OrganizationInvitation
)
from .queries import (
    shaped_chat_messages, shaped_comments, shaped_memberships,
    shaped_organizations,
)
from .serializers import (
    AuthorSerializer,
    PostSerializer, CommentSerializer, PostLikeSerializer,
    CommentLikeSerializer, PostTagSerializer, HashtagSerializer,
    NotificationSerializer, ReportSerializer, UserFollowSerializer,
    BadgeSerializer, UserBadgeSerializer,
    OrganizationSerializer, OrganizationMembershipSerializer, OrganizationInvitationSerializer
)


def _paginated_reactors(viewset, request, like_queryset):
    """Serialise the people behind a set of likes, newest first.

    Shared by posts and comments so the two cannot drift into returning
    different shapes for the same UI component.

    Paginated deliberately. like_count is unbounded, and this route is hit from
    a tap on the count, so a popular post would otherwise serialise every liker
    at once. It uses the viewset's own paginator, which keeps PAGE_SIZE in one
    place (DRF settings) rather than hardcoded here.

    select_related('user') is the difference between a fixed number of queries
    and one per liker — see the guard in apps/core/test_query_counts.py.
    """
    likes = like_queryset.select_related('user').order_by('-created_at')
    page = viewset.paginate_queryset(likes)
    rows = likes if page is None else page
    data = AuthorSerializer(
        [like.user for like in rows], many=True, context={'request': request},
    ).data
    return Response(data) if page is None else viewset.get_paginated_response(data)


class PostViewSet(viewsets.ModelViewSet):
    """ViewSet for Post model"""
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'content', 'author__username']
    ordering_fields = ['created_at', 'like_count', 'comment_count', 'view_count']
    ordering = ['-created_at']
    
    def _shaped_posts(self, queryset=None):
        """Posts with everything PostSerializer reads.

        Annotates "did the current user like this" as a single subquery instead
        of one PostLike query per post in the serializer (N+1 on the feed).
        Shared with organization_feed, which built its own queryset and so lost
        the annotation and fell back to the per-post query.
        """
        if queryset is None:
            queryset = Post.objects.all()
        queryset = queryset.select_related('author', 'organization')
        user = self.request.user
        if user.is_authenticated:
            queryset = queryset.annotate(
                _is_liked=Exists(PostLike.objects.filter(post=OuterRef('pk'), user=user))
            )
        return queryset

    def get_queryset(self):
        """Get posts with optional filtering"""
        queryset = self._shaped_posts()

        # Filter by post type
        post_type = self.request.query_params.get('type')
        if post_type:
            queryset = queryset.filter(post_type=post_type)
        
        # Filter by author
        author = self.request.query_params.get('author')
        if author:
            queryset = queryset.filter(author__username=author)
        
        # Filter by hashtag
        hashtag = self.request.query_params.get('hashtag')
        if hashtag:
            queryset = queryset.filter(content__icontains=f'#{hashtag}')
        
        # Filter for trending posts
        trending = self.request.query_params.get('trending')
        if trending:
            # Posts from last 7 days with high engagement
            last_week = timezone.now() - timezone.timedelta(days=7)
            queryset = queryset.filter(created_at__gte=last_week).order_by(
                '-like_count', '-comment_count', '-view_count'
            )
        
        return queryset
    
    def perform_create(self, serializer):
        """Create post with current user as author"""
        serializer.save(author=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """Override create to handle multipart/form-data"""
        try:
            print(f"Creating post with data: {request.data}")
            print(f"Files: {request.FILES}")
            
            # Handle both JSON and multipart data
            serializer = self.get_serializer(data=request.data)
            if not serializer.is_valid():
                print(f"Validation errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            print(f"Error creating post: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def retrieve(self, request, *args, **kwargs):
        """Increment view count on retrieve"""
        try:
            instance = self.get_object()
            Post.objects.filter(pk=instance.pk).update(view_count=F('view_count') + 1)
            return super().retrieve(request, *args, **kwargs)
        except Post.DoesNotExist:
            return Response(
                {'error': 'Post not found or has been deleted'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def update(self, request, *args, **kwargs):
        """Update post - only author or admin can update"""
        instance = self.get_object()
        
        # Check permissions
        if instance.author != request.user and request.user.role != 'admin':
            return Response(
                {'error': 'You do not have permission to edit this post'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Delete post - only author or admin can delete"""
        try:
            instance = self.get_object()
            
            # Check permissions
            if instance.author != request.user and request.user.role != 'admin':
                return Response(
                    {'error': 'You do not have permission to delete this post'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Store post info for notification
            post_title = instance.title or 'Untitled Post'
            
            # Delete the post
            instance.delete()
            
            return Response(
                {'message': f'Post "{post_title}" has been deleted successfully'},
                status=status.HTTP_204_NO_CONTENT
            )
        except Post.DoesNotExist:
            return Response(
                {'error': 'Post not found or already deleted'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        """Like or unlike a post"""
        post = self.get_object()
        like, created = PostLike.objects.get_or_create(
            post=post,
            user=request.user
        )
        
        if not created:
            # Unlike — atomic decrement with a floor of 0 (Req 27).
            like.delete()
            Post.objects.filter(pk=post.pk).update(
                like_count=Greatest(F('like_count') - 1, Value(0))
            )
            post.refresh_from_db(fields=['like_count'])
            return Response({'liked': False, 'like_count': post.like_count})
        else:
            # Like — atomic increment so concurrent likes don't lose counts.
            Post.objects.filter(pk=post.pk).update(like_count=F('like_count') + 1)
            post.refresh_from_db(fields=['like_count'])

            # Create notification for post author
            if post.author != request.user:
                Notification.objects.create(
                    recipient=post.author,
                    sender=request.user,
                    notification_type='like',
                    title='New like on your post',
                    message=f'{request.user.username} liked your post',
                    related_object_id=post.id
                )
            
            return Response({'liked': True, 'like_count': post.like_count})

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def likers(self, request, pk=None):
        """Who liked this post.

        Resolved through get_object() on purpose, so it inherits whatever
        visibility rules the detail route enforces. A like list must not become
        a way to read the audience of a post you are not allowed to see.
        """
        post = self.get_object()
        return _paginated_reactors(self, request, PostLike.objects.filter(post=post))

    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        """Get all comments for a post"""
        post = self.get_object()
        comments = shaped_comments(
            Comment.objects.filter(post=post, parent__isnull=True),
            user=request.user,
        ).order_by('created_at')

        serializer = CommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_posts(self, request):
        """Get current user's posts"""
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        posts = self.get_queryset().filter(author=request.user)
        page = self.paginate_queryset(posts)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def feed(self, request):
        """
        Get personalized feed for current user using smart algorithm:
        - Posts from users you follow (accepted)
        - Posts from organizations you're a member of
        - Your own posts
        - Weighted by recency, engagement, and relevance
        """
        if not request.user.is_authenticated:
            # Return general public feed for unauthenticated users
            posts = self.get_queryset().filter(organization__isnull=True)[:20]
        else:
            # Get users the current user follows (accepted only)
            following_users = UserFollow.objects.filter(
                follower=request.user,
                status='accepted'
            ).values_list('following', flat=True)
            
            # Get organizations user is a member of
            user_orgs = OrganizationMembership.objects.filter(
                user=request.user,
                status='active'
            ).values_list('organization', flat=True)
            
            # Build smart feed query:
            # 1. Own posts
            # 2. Posts from followed users (public or org posts from shared orgs)
            # 3. Posts from user's organizations
            posts = self.get_queryset().filter(
                Q(author=request.user) |  # Own posts
                Q(author__in=following_users, organization__isnull=True) |  # Followed users' public posts
                Q(author__in=following_users, organization__in=user_orgs) |  # Followed users' org posts in shared orgs
                Q(organization__in=user_orgs)  # All posts from user's organizations
            ).distinct()
            
            # Order by smart algorithm: pinned first, then by engagement score + recency
            # Engagement score = likes + comments*2 + views/10
            from django.db.models.functions import Now, Extract
            from datetime import timedelta
            
            posts = posts.annotate(
                engagement_score=F('like_count') + F('comment_count') * 2 + F('view_count') / 10
            ).order_by('-is_pinned', '-created_at')
        
        page = self.paginate_queryset(posts)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def organization_feed(self, request):
        """Get posts from a specific organization ONLY - excludes posts without organization"""
        org_id = request.query_params.get('org_id')
        if not org_id:
            return Response({'error': 'org_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user has access to this organization
        org = get_object_or_404(Organization, id=org_id)
        
        if org.is_private:
            # Check membership for private orgs
            is_member = OrganizationMembership.objects.filter(
                organization=org, user=request.user, status='active'
            ).exists()
            if not is_member:
                return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Explicitly filter by organization_id to ensure only org posts are returned
        posts = self._shaped_posts(
            Post.objects.filter(organization_id=org.id)
        ).order_by('-created_at')
        
        page = self.paginate_queryset(posts)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)


class CommentViewSet(viewsets.ModelViewSet):
    """ViewSet for Comment model"""
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        """Get comments filtered by post"""
        queryset = shaped_comments(
            Comment.objects.select_related('post'), user=self.request.user,
        )

        # Filter by post ID - THIS IS CRITICAL to show only comments for the specific post
        post_id = self.request.query_params.get('post')
        if post_id:
            queryset = queryset.filter(post_id=post_id, parent__isnull=True)
        
        return queryset.order_by('created_at')
    
    def perform_create(self, serializer):
        """Create comment with current user as author"""
        comment = serializer.save(author=self.request.user)
        
        # Update post comment count
        post = comment.post
        post.comment_count = Comment.objects.filter(post=post).count()
        post.save()
        
        # Create notification for post author or parent comment author
        if comment.parent and comment.parent.author != self.request.user:
            # Reply to comment
            Notification.objects.create(
                recipient=comment.parent.author,
                sender=self.request.user,
                notification_type='comment',
                title='New reply to your comment',
                message=f'{self.request.user.username} replied to your comment',
                related_object_id=comment.id
            )
        elif post.author != self.request.user:
            # Comment on post
            Notification.objects.create(
                recipient=post.author,
                sender=self.request.user,
                notification_type='comment',
                title='New comment on your post',
                message=f'{self.request.user.username} commented on your post',
                related_object_id=comment.id
            )
    
    def perform_update(self, serializer):
        """Update comment and mark as edited"""
        serializer.save(is_edited=True)
    
    def update(self, request, *args, **kwargs):
        """Update comment - only author or admin can update"""
        try:
            instance = self.get_object()
            
            # Check permissions
            if instance.author != request.user and request.user.role != 'admin':
                return Response(
                    {'error': 'You do not have permission to edit this comment'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            return super().update(request, *args, **kwargs)
        except Comment.DoesNotExist:
            return Response(
                {'error': 'Comment not found or has been deleted'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def destroy(self, request, *args, **kwargs):
        """Delete comment - only author or admin can delete"""
        try:
            instance = self.get_object()
            
            # Check permissions  
            if instance.author != request.user and request.user.role != 'admin':
                return Response(
                    {'error': 'You do not have permission to delete this comment'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Update post comment count before deletion
            post = instance.post
            
            # Delete the comment
            instance.delete()
            
            # Update comment count
            post.comment_count = Comment.objects.filter(post=post).count()
            post.save()
            
            return Response(
                {'message': 'Comment has been deleted successfully'},
                status=status.HTTP_204_NO_CONTENT
            )
        except Comment.DoesNotExist:
            return Response(
                {'error': 'Comment not found or already deleted'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        """Like or unlike a comment"""
        comment = self.get_object()
        like, created = CommentLike.objects.get_or_create(
            comment=comment,
            user=request.user
        )
        
        if not created:
            # Unlike — atomic decrement with a floor of 0 (Req 27).
            like.delete()
            Comment.objects.filter(pk=comment.pk).update(
                like_count=Greatest(F('like_count') - 1, Value(0))
            )
            comment.refresh_from_db(fields=['like_count'])
            return Response({'liked': False, 'like_count': comment.like_count})
        else:
            # Like — atomic increment so concurrent likes don't lose counts.
            Comment.objects.filter(pk=comment.pk).update(like_count=F('like_count') + 1)
            comment.refresh_from_db(fields=['like_count'])
            return Response({'liked': True, 'like_count': comment.like_count})

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def likers(self, request, pk=None):
        """Who liked this comment.

        Replies are Comments with a parent, so this covers replies too — there
        is no separate reply model and no second endpoint to keep in step.
        """
        comment = self.get_object()
        return _paginated_reactors(self, request, CommentLike.objects.filter(comment=comment))


class HashtagViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Hashtag model"""
    serializer_class = HashtagSerializer
    queryset = Hashtag.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['tag']
    ordering_fields = ['usage_count', 'created_at']
    ordering = ['-usage_count']
    
    @action(detail=False, methods=['get'])
    def trending(self, request):
        """Get trending hashtags"""
        hashtags = Hashtag.objects.order_by('-usage_count')[:20]
        serializer = self.get_serializer(hashtags, many=True)
        return Response(serializer.data)


class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for Notification model"""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get notifications for current user"""
        return Notification.objects.filter(
            recipient=self.request.user
        ).select_related('sender').order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'is_read': True})
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        count = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).update(is_read=True)
        return Response({'marked_count': count})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications"""
        count = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).count()
        return Response({'unread_count': count})


class UserFollowViewSet(viewsets.ModelViewSet):
    """ViewSet for UserFollow model"""
    serializer_class = UserFollowSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Scope follow records to the requesting user — they may only see or delete
        rows where they are the follower or the followed party. Prevents reading
        or deleting other users' follow relationships. (Remediation Req 15.)
        """
        user = self.request.user
        return UserFollow.objects.select_related('follower', 'following').filter(
            Q(follower=user) | Q(following=user)
        )
    
    def perform_create(self, serializer):
        """Create follow relationship"""
        follow = serializer.save(follower=self.request.user)
        
        # Create notification for followed user
        Notification.objects.create(
            recipient=follow.following,
            sender=self.request.user,
            notification_type='follow',
            title='New follower',
            message=f'{self.request.user.username} started following you'
        )
    
    @action(detail=False, methods=['post'])
    def follow(self, request):
        """Send a follow request to a user (creates pending request)"""
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            user_to_follow = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if user_to_follow == request.user:
            return Response(
                {'error': 'Cannot follow yourself'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already following or has pending request
        existing = UserFollow.objects.filter(
            follower=request.user,
            following=user_to_follow
        ).first()
        
        if existing:
            if existing.status == 'accepted':
                return Response({
                    'status': 'accepted',
                    'message': 'Already following this user'
                })
            elif existing.status == 'pending':
                return Response({
                    'status': 'pending',
                    'message': 'Follow request already sent'
                })
            elif existing.status == 'rejected':
                # Allow re-requesting after rejection
                existing.status = 'pending'
                existing.save()
                Notification.objects.create(
                    recipient=user_to_follow,
                    sender=request.user,
                    notification_type='follow',
                    title='New follow request',
                    message=f'{request.user.username} wants to follow you'
                )
                return Response({
                    'status': 'pending',
                    'message': 'Follow request sent'
                })
        
        # Create new pending follow request
        UserFollow.objects.create(
            follower=request.user,
            following=user_to_follow,
            status='pending'
        )
        
        # Create notification for the user receiving the request
        Notification.objects.create(
            recipient=user_to_follow,
            sender=request.user,
            notification_type='follow',
            title='New follow request',
            message=f'{request.user.username} wants to follow you'
        )
        
        return Response({
            'status': 'pending',
            'message': 'Follow request sent'
        })
    
    @action(detail=False, methods=['post'])
    def unfollow(self, request):
        """Unfollow a user"""
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        UserFollow.objects.filter(
            follower=request.user,
            following_id=user_id
        ).delete()
        
        return Response({'following': False})
    
    @action(detail=False, methods=['get'])
    def followers(self, request):
        """Get current user's accepted followers"""
        followers = UserFollow.objects.filter(
            following=request.user,
            status='accepted'
        ).select_related('follower')
        
        serializer = self.get_serializer(followers, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def following(self, request):
        """Get users that current user is following (accepted)"""
        following = UserFollow.objects.filter(
            follower=request.user,
            status='accepted'
        ).select_related('following')
        
        serializer = self.get_serializer(following, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pending_requests(self, request):
        """Get pending follow requests received by current user"""
        pending = UserFollow.objects.filter(
            following=request.user,
            status='pending'
        ).select_related('follower')
        
        serializer = self.get_serializer(pending, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def sent_requests(self, request):
        """Get pending follow requests sent by current user"""
        sent = UserFollow.objects.filter(
            follower=request.user,
            status='pending'
        ).select_related('following')
        
        serializer = self.get_serializer(sent, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def accept_request(self, request):
        """Accept a follow request"""
        request_id = request.data.get('request_id')
        
        if not request_id:
            return Response({'error': 'request_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            follow_request = UserFollow.objects.get(
                id=request_id,
                following=request.user,
                status='pending'
            )
            follow_request.status = 'accepted'
            follow_request.save()
            
            # Notify the follower that request was accepted
            Notification.objects.create(
                recipient=follow_request.follower,
                sender=request.user,
                notification_type='follow',
                title='Follow request accepted',
                message=f'{request.user.username} accepted your follow request'
            )
            
            return Response({'status': 'accepted'})
        except UserFollow.DoesNotExist:
            return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'])
    def reject_request(self, request):
        """Reject a follow request"""
        request_id = request.data.get('request_id')
        
        if not request_id:
            return Response({'error': 'request_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            follow_request = UserFollow.objects.get(
                id=request_id,
                following=request.user,
                status='pending'
            )
            follow_request.delete()
            return Response({'status': 'rejected'})
        except UserFollow.DoesNotExist:
            return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'], url_path='check/(?P<user_id>[^/.]+)')
    def check_following(self, request, user_id=None):
        """Check if current user is following a specific user and status"""
        try:
            follow = UserFollow.objects.get(
                follower=request.user,
                following_id=user_id
            )
            return Response({
                'is_following': follow.status == 'accepted',
                'is_pending': follow.status == 'pending',
                'status': follow.status
            })
        except UserFollow.DoesNotExist:
            return Response({
                'is_following': False,
                'is_pending': False,
                'status': None
            })
    
    @action(detail=False, methods=['get'], url_path='user/(?P<user_id>[^/.]+)/followers')
    def user_followers(self, request, user_id=None):
        """Get accepted followers of a specific user"""
        followers = UserFollow.objects.filter(
            following_id=user_id,
            status='accepted'
        ).select_related('follower')
        serializer = self.get_serializer(followers, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='user/(?P<user_id>[^/.]+)/following')
    def user_following(self, request, user_id=None):
        """Get users that a specific user is following (accepted)"""
        following = UserFollow.objects.filter(
            follower_id=user_id,
            status='accepted'
        ).select_related('following')
        serializer = self.get_serializer(following, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def suggested_users(self, request):
        """
        Get suggested users to follow, prioritized by mutual connections.
        Algorithm:
        1. Get users the current user follows (accepted)
        2. Get users who follow the current user (accepted)
        3. For each potential user, count mutual connections
        4. Sort by mutual count, then by created_at
        5. Exclude: current user, already following, pending requests
        """
        from django.contrib.auth import get_user_model
        from django.db.models import Count, Q
        
        User = get_user_model()
        
        # Get IDs of users current user is following or has pending request
        following_ids = set(UserFollow.objects.filter(
            follower=request.user
        ).values_list('following_id', flat=True))
        
        # Get IDs of users who follow current user (accepted)
        my_followers_ids = set(UserFollow.objects.filter(
            following=request.user,
            status='accepted'
        ).values_list('follower_id', flat=True))
        
        # Get IDs of users current user follows (accepted)
        my_following_ids = set(UserFollow.objects.filter(
            follower=request.user,
            status='accepted'
        ).values_list('following_id', flat=True))
        
        # Get all potential users (exclude self and already following/pending)
        exclude_ids = following_ids | {request.user.id}
        
        potential_users = User.objects.exclude(
            id__in=exclude_ids
        ).filter(
            is_active=True
        ).select_related()[:100]  # Limit to 100 for performance
        
        # Every accepted follow edge touching any candidate, in one query.
        # This loop previously ran two queries PER CANDIDATE, and the candidate
        # list is capped at 100 — so it approached 200 queries as the user base
        # grew, which at ~230 ms per round-trip is most of a minute.
        candidate_ids = {u.id for u in potential_users}
        followers_of = {}   # candidate id -> set of ids following them
        followed_by = {}    # candidate id -> set of ids they follow
        edges = UserFollow.objects.filter(status='accepted').filter(
            Q(following_id__in=candidate_ids) | Q(follower_id__in=candidate_ids)
        ).values_list('follower_id', 'following_id')
        for follower_id, following_id in edges:
            if following_id in candidate_ids:
                followers_of.setdefault(following_id, set()).add(follower_id)
            if follower_id in candidate_ids:
                followed_by.setdefault(follower_id, set()).add(following_id)

        # Calculate mutual scores
        user_scores = []
        for user in potential_users:
            user_followers = followers_of.get(user.id, set())
            user_following = followed_by.get(user.id, set())

            # Calculate mutual score
            mutual_score = 0
            
            # Users that both follow (common following)
            common_following = my_following_ids & user_following
            mutual_score += len(common_following) * 2
            
            # Users that follow both (common followers)  
            common_followers = my_followers_ids & user_followers
            mutual_score += len(common_followers) * 1
            
            # Users I follow who also follow this user (friends who follow them)
            friends_who_follow = my_following_ids & user_followers
            mutual_score += len(friends_who_follow) * 3  # Strongest signal
            
            mutual_count = len(common_following) + len(common_followers) + len(friends_who_follow)
            
            user_scores.append({
                'user': user,
                'score': mutual_score,
                'mutual_count': mutual_count
            })
        
        # Sort by score descending
        user_scores.sort(key=lambda x: x['score'], reverse=True)
        
        # Serialize results
        result = []
        for item in user_scores[:50]:  # Return top 50
            user = item['user']
            result.append({
                'id': str(user.id),
                'username': user.username,
                'first_name': user.first_name or '',
                'last_name': user.last_name or '',
                'profile_picture': user.profile_picture.url if user.profile_picture else None,
                'mutual_count': item['mutual_count'],
                'program': getattr(user, 'program', None),
                'role': getattr(user, 'role', 'student'),
            })
        
        return Response(result)


class BadgeViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Badge model"""
    serializer_class = BadgeSerializer
    # order_by: Badge has no Meta.ordering, so this paginated as an unordered
    # list and the database could return badges in any order per page.
    queryset = Badge.objects.all().order_by('name', 'id')
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_badges(self, request):
        """Get current user's badges"""
        user_badges = UserBadge.objects.filter(
            user=request.user
        ).select_related('badge')
        
        serializer = UserBadgeSerializer(user_badges, many=True)
        return Response(serializer.data)


class ReportViewSet(viewsets.ModelViewSet):
    """ViewSet for Report model"""
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get reports"""
        if self.request.user.is_staff:
            # Staff can see all reports
            return Report.objects.select_related('reporter', 'moderator').all()
        else:
            # Users can see their own reports
            return Report.objects.filter(reporter=self.request.user).select_related('reporter')
    
    def perform_create(self, serializer):
        """Create report with current user as reporter"""
        serializer.save(reporter=self.request.user)


# Chat ViewSets
from .models import (
    ChannelMembership, ChatRoom, ChatMessage, ChatNickname, MessageReaction,
    MessageDeletedFor,
)
from .serializers import ChatRoomSerializer, ChatMessageSerializer, ChatNicknameSerializer, MessageReactionSerializer


class ChatRoomViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for ChatRoom model - Read only, rooms are created via admin/migrations"""
    serializer_class = ChatRoomSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Channels this user may see.

        The predicate lives on the manager because the WebSocket consumer needs
        the same answer. A socket more permissive than the API would be a way to
        read a private project's discussion, so the two must not be able to drift.

        The program-name mapping this method used to inline moved there with it.
        """
        return ChatRoom.objects.readable_by(self.request.user)

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        """Mark this channel read up to now.

        Upsert rather than create: a membership row means "has opened this
        channel", and opening it a second time must not fail.
        """
        room = self.get_object()
        membership, _ = ChannelMembership.objects.update_or_create(
            channel=room, user=request.user,
            defaults={'last_read_at': timezone.now()},
        )
        return Response({'last_read_at': membership.last_read_at, 'unread_count': 0})
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """A page of a room's messages, newest last.

        ?limit=  how many, capped at MAX_PAGE
        ?before= ISO timestamp; returns messages older than it, for scrollback

        Paged rather than a flat newest-100. Every open client used to refetch
        100 fully-serialized messages every three seconds, so the cost of a busy
        room grew with the number of people reading it, not with the number of
        messages. Reads now arrive over the socket and this endpoint is the
        initial load and the scrollback.
        """
        DEFAULT_PAGE = 40
        MAX_PAGE = 100

        room = self.get_object()

        try:
            limit = int(request.query_params.get('limit', DEFAULT_PAGE))
        except (TypeError, ValueError):
            limit = DEFAULT_PAGE
        limit = max(1, min(limit, MAX_PAGE))

        # Get messages not deleted for this user and not deleted for everyone
        messages = ChatMessage.objects.filter(
            room=room
        ).exclude(
            deleted_for_everyone=True
        ).exclude(
            deleted_for__user=request.user
        )

        before = request.query_params.get('before')
        if before:
            parsed = parse_datetime(before)
            if parsed is not None:
                messages = messages.filter(created_at__lt=parsed)

        messages = shaped_chat_messages(messages)

        # Newest first for the slice, reversed for display.
        # This previously did .order_by('created_at')[:100], which slices the
        # OLDEST 100 — so once a room passed 100 messages every new message
        # became invisible and the chat appeared frozen.
        #
        # -id breaks ties. Two messages can share a created_at, and with an
        # undefined order between them a paged read can drop or repeat one.
        page = list(messages.order_by('-created_at', '-id')[:limit + 1])
        has_more = len(page) > limit
        page = page[:limit][::-1]

        serializer = ChatMessageSerializer(page, many=True, context={'request': request})
        return Response({
            'results': serializer.data,
            # Whether a scrollback request would find anything, so the client does
            # not have to fire one to learn there is nothing above.
            'has_more': has_more,
        })


class ChatSendThrottle(UserRateThrottle):
    """60 messages a minute per user.

    Well above anyone typing and far below what a script can do. Each send writes
    a row, refreshes thread counters and fans out to every reader of the channel,
    so the write path is the one that has to be bounded.
    """
    scope = 'chat_send'
    rate = '60/min'


class ChatReactThrottle(UserRateThrottle):
    """Reactions are one tap, so they are the cheapest thing to spam."""
    scope = 'chat_react'
    rate = '120/min'


class ChatMessageViewSet(viewsets.ModelViewSet):
    """ViewSet for ChatMessage model"""
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_throttles(self):
        if self.action == 'create':
            return [ChatSendThrottle()]
        if self.action == 'react':
            return [ChatReactThrottle()]
        return super().get_throttles()
    
    def get_queryset(self):
        """Get messages.

        ?room=<id>    the channel: root messages only, replies stay in threads
        ?thread=<id>  the replies inside one thread, oldest first

        Filtering to roots is safe for the existing program rooms: every message
        predating threads has thread_root NULL, so all of them are roots and the
        response is unchanged.

        Scoped to rooms readable_by the viewer — the same predicate the consumer
        uses. Without it ?room= handed back any room's messages to anyone holding
        its id, and the detail routes resolved against the same unfiltered set, so
        a private project's channel could be read and reacted to from outside.
        """
        queryset = shaped_chat_messages().filter(
            room__in=ChatRoom.objects.readable_by(self.request.user),
        )

        thread_id = self.request.query_params.get('thread')
        room_id = self.request.query_params.get('room')

        if thread_id:
            queryset = queryset.filter(thread_root_id=thread_id)
        elif room_id:
            queryset = queryset.filter(room_id=room_id, thread_root__isnull=True)

        # Exclude deleted messages
        queryset = queryset.exclude(deleted_for_everyone=True)
        queryset = queryset.exclude(deleted_for__user=self.request.user)

        return queryset.order_by('created_at')

    def perform_create(self, serializer):
        """Create message with current user as sender.

        A reply goes through ChatMessage.post_reply so the root's reply_count and
        last_reply_at are written in the same transaction — they are denormalised,
        and a second writer would eventually disagree with the rows it summarises.
        """
        from . import broadcast

        root = serializer.validated_data.get('thread_root')
        if root is None:
            serializer.save(sender=self.request.user)
            broadcast.message_created(serializer.instance, serializer.data)
            return

        reply = ChatMessage.post_reply(
            root, self.request.user, serializer.validated_data.get('content', ''),
            reply_to=serializer.validated_data.get('reply_to'),
        )
        # Hand the created row back to DRF so the response body is the reply.
        serializer.instance = reply
        broadcast.message_created(reply, self.get_serializer(reply).data)

        # Slack's "also send to channel": the reply is additionally posted as a
        # root so the channel sees it, while the thread keeps it in context.
        # A real second row rather than a flag, because a flag would mean every
        # reader of the channel list has to know to un-hide certain replies.
        if str(self.request.data.get('also_send_to_channel', '')).lower() in ('1', 'true'):
            echo = ChatMessage.objects.create(
                room=reply.room, sender=self.request.user,
                content=reply.content, reply_to=root,
            )
            broadcast.message_created(echo, self.get_serializer(echo).data)

        # The root's reply_count moved, so anyone looking at the channel is stale.
        broadcast.reaction_changed(root, self.get_serializer(root).data)
    
    @action(detail=True, methods=['post'])
    def react(self, request, pk=None):
        """Add or remove reaction to a message"""
        message = self.get_object()
        reaction_emoji = request.data.get('reaction')
        
        if not reaction_emoji:
            return Response({'error': 'Reaction emoji is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user already reacted with this emoji
        existing = MessageReaction.objects.filter(
            message=message,
            user=request.user,
            reaction=reaction_emoji
        ).first()
        
        from . import broadcast

        if existing:
            # Remove reaction
            existing.delete()
            action_taken = 'removed'
        else:
            # Add reaction
            MessageReaction.objects.create(
                message=message,
                user=request.user,
                reaction=reaction_emoji
            )
            action_taken = 'added'

        # Refetched so reactions_summary is rebuilt from the rows that now exist
        # rather than from a stale prefetch on the instance we mutated.
        fresh = shaped_chat_messages().get(pk=message.pk)
        payload = self.get_serializer(fresh).data
        broadcast.reaction_changed(fresh, payload)
        # The message rides back in the response so a caller does not need the
        # broadcast to reach it before its own click has any visible effect.
        return Response({
            'action': action_taken,
            'reaction': reaction_emoji,
            'message': payload,
        })
    
    @action(detail=True, methods=['post'])
    def bump(self, request, pk=None):
        """Bump a message to the top"""
        message = self.get_object()
        message.is_bumped = True
        message.bump_count += 1
        message.save()
        return Response({'bumped': True, 'bump_count': message.bump_count})
    
    @action(detail=True, methods=['post'])
    def delete_for_me(self, request, pk=None):
        """Delete message for current user only"""
        message = self.get_object()
        MessageDeletedFor.objects.get_or_create(
            message=message,
            user=request.user
        )
        return Response({'deleted_for_me': True})
    
    @action(detail=True, methods=['post'])
    def delete_for_everyone(self, request, pk=None):
        """Delete message for everyone (only sender can do this)"""
        message = self.get_object()
        
        if message.sender != request.user:
            return Response(
                {'error': 'Only the sender can delete for everyone'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        message.deleted_for_everyone = True
        message.content = "This message was deleted"
        message.save()
        return Response({'deleted_for_everyone': True})


class ChatNicknameViewSet(viewsets.ModelViewSet):
    """ViewSet for managing chat nicknames"""
    serializer_class = ChatNicknameSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # order_by: one row per user (OneToOne), but the model has no
        # Meta.ordering so DRF still paginates it as an unordered list.
        return ChatNickname.objects.filter(user=self.request.user).order_by('id')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get', 'post', 'put'])
    def my_nickname(self, request):
        """Get or set current user's nickname"""
        if request.method == 'GET':
            try:
                nickname = ChatNickname.objects.get(user=request.user)
                return Response(ChatNicknameSerializer(nickname).data)
            except ChatNickname.DoesNotExist:
                return Response({'nickname': None})
        
        else:  # POST or PUT
            nickname_text = request.data.get('nickname')
            if not nickname_text:
                return Response({'error': 'Nickname is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            nickname, created = ChatNickname.objects.update_or_create(
                user=request.user,
                defaults={'nickname': nickname_text}
            )
            return Response(ChatNicknameSerializer(nickname).data)


class OrganizationViewSet(viewsets.ModelViewSet):
    """ViewSet for Organization model with full CRUD and membership management"""
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    lookup_field = 'slug'
    
    def get_queryset(self):
        queryset = shaped_organizations(user=self.request.user)

        # Filter by type
        org_type = self.request.query_params.get('type')
        if org_type:
            queryset = queryset.filter(org_type=org_type)
        
        # Filter by program
        program = self.request.query_params.get('program')
        if program:
            queryset = queryset.filter(Q(program=program) | Q(program='ALL'))
        
        # Filter by user's membership
        if self.request.query_params.get('my_orgs') == 'true' and self.request.user.is_authenticated:
            user_orgs = OrganizationMembership.objects.filter(
                user=self.request.user, status='active'
            ).values_list('organization', flat=True)
            queryset = queryset.filter(id__in=user_orgs)
        
        return queryset
    
    def perform_create(self, serializer):
        org = serializer.save(created_by=self.request.user)
        # Auto-add creator as owner
        OrganizationMembership.objects.create(
            organization=org,
            user=self.request.user,
            role='owner',
            status='active'
        )
        org.member_count = 1
        org.save()
    
    def perform_update(self, serializer):
        """Only admins/owners can update organization"""
        org = self.get_object()
        membership = OrganizationMembership.objects.filter(
            organization=org, user=self.request.user, status='active'
        ).first()
        
        is_site_admin = self.request.user.is_staff or self.request.user.is_superuser
        
        if not membership and not is_site_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You don't have permission to update this organization")
        
        if membership and membership.role not in ['admin', 'owner'] and not is_site_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can update organization settings")
        
        serializer.save()
    
    @action(detail=True, methods=['post'])
    def join(self, request, slug=None):
        """Request to join an organization"""
        org = self.get_object()
        
        # Check if already a member
        existing = OrganizationMembership.objects.filter(
            organization=org, user=request.user
        ).first()
        
        if existing:
            if existing.status == 'active':
                return Response({'error': 'Already a member'}, status=status.HTTP_400_BAD_REQUEST)
            elif existing.status == 'pending':
                return Response({'error': 'Request already pending'}, status=status.HTTP_400_BAD_REQUEST)
            elif existing.status == 'banned':
                return Response({'error': 'You are banned from this organization'}, status=status.HTTP_403_FORBIDDEN)
        
        # Check if private org (requires invitation)
        if org.is_private:
            # Check for pending invitation
            invitation = OrganizationInvitation.objects.filter(
                organization=org, invitee=request.user, status='pending'
            ).first()
            if not invitation:
                return Response({'error': 'This organization requires an invitation'}, status=status.HTTP_403_FORBIDDEN)
        
        # Check if program-based org and user matches program
        if org.org_type == 'program' and org.program:
            user_program = getattr(request.user, 'program', None)
            if org.program != 'ALL' and user_program != org.program:
                return Response({
                    'error': f'This organization is only for {org.program} students'
                }, status=status.HTTP_403_FORBIDDEN)
        
        # Create membership
        if org.requires_approval and not org.is_private:
            membership_status = 'pending'
            message = 'Join request sent, awaiting approval'
        else:
            membership_status = 'active'
            message = 'Successfully joined organization'
            org.member_count = OrganizationMembership.objects.filter(organization=org, status='active').count() + 1
            org.save()
        
        OrganizationMembership.objects.create(
            organization=org,
            user=request.user,
            role='member',
            status=membership_status
        )
        
        # Notify org admins if pending
        if membership_status == 'pending':
            admins = OrganizationMembership.objects.filter(
                organization=org, role__in=['admin', 'owner'], status='active'
            ).select_related('user')
            for admin in admins:
                Notification.objects.create(
                    recipient=admin.user,
                    sender=request.user,
                    notification_type='org_join_request',
                    title='New organization join request',
                    message=f'{request.user.username} wants to join {org.name}'
                )
        
        return Response({'message': message, 'status': membership_status})
    
    @action(detail=True, methods=['post'])
    def leave(self, request, slug=None):
        """Leave an organization"""
        org = self.get_object()
        
        membership = OrganizationMembership.objects.filter(
            organization=org, user=request.user, status='active'
        ).first()
        
        if not membership:
            return Response({'error': 'Not a member'}, status=status.HTTP_400_BAD_REQUEST)
        
        if membership.role == 'owner':
            # Check if there are other admins
            other_admins = OrganizationMembership.objects.filter(
                organization=org, role__in=['admin', 'owner'], status='active'
            ).exclude(user=request.user).exists()
            if not other_admins:
                return Response({
                    'error': 'Cannot leave as the only owner. Transfer ownership first.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        membership.delete()
        org.member_count = OrganizationMembership.objects.filter(organization=org, status='active').count()
        org.save()
        
        return Response({'message': 'Left organization successfully'})
    
    @action(detail=True, methods=['post'])
    def invite(self, request, slug=None):
        """Invite a user to the organization"""
        org = self.get_object()
        
        # Check if requester has permission to invite
        membership = OrganizationMembership.objects.filter(
            organization=org, user=request.user, status='active'
        ).first()
        
        if not membership:
            return Response({'error': 'Not a member'}, status=status.HTTP_403_FORBIDDEN)
        
        # For private orgs, any member can invite; for public, only admins
        if not org.is_private and membership.role not in ['admin', 'owner', 'moderator']:
            return Response({'error': 'Only admins can invite'}, status=status.HTTP_403_FORBIDDEN)
        
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            invitee = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if already a member
        if OrganizationMembership.objects.filter(organization=org, user=invitee, status='active').exists():
            return Response({'error': 'User is already a member'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create or update invitation
        invitation, created = OrganizationInvitation.objects.update_or_create(
            organization=org,
            invitee=invitee,
            defaults={
                'inviter': request.user,
                'message': request.data.get('message', ''),
                'status': 'pending'
            }
        )
        
        # Notify invitee
        Notification.objects.create(
            recipient=invitee,
            sender=request.user,
            notification_type='org_invitation',
            title='Organization invitation',
            message=f'{request.user.username} invited you to join {org.name}'
        )
        
        return Response({
            'message': 'Invitation sent',
            'invitation': OrganizationInvitationSerializer(invitation, context={'request': request}).data
        })
    
    @action(detail=True, methods=['post'])
    def accept_invitation(self, request, slug=None):
        """Accept an invitation to join"""
        org = self.get_object()
        
        invitation = OrganizationInvitation.objects.filter(
            organization=org, invitee=request.user, status='pending'
        ).first()
        
        if not invitation:
            return Response({'error': 'No pending invitation'}, status=status.HTTP_404_NOT_FOUND)
        
        # Create membership
        OrganizationMembership.objects.create(
            organization=org,
            user=request.user,
            role='member',
            status='active',
            invited_by=invitation.inviter
        )
        
        invitation.status = 'accepted'
        invitation.responded_at = timezone.now()
        invitation.save()
        
        org.member_count = OrganizationMembership.objects.filter(organization=org, status='active').count()
        org.save()
        
        return Response({'message': 'Joined organization successfully'})
    
    @action(detail=True, methods=['post'])
    def decline_invitation(self, request, slug=None):
        """Decline an invitation"""
        org = self.get_object()
        
        invitation = OrganizationInvitation.objects.filter(
            organization=org, invitee=request.user, status='pending'
        ).first()
        
        if not invitation:
            return Response({'error': 'No pending invitation'}, status=status.HTTP_404_NOT_FOUND)
        
        invitation.status = 'declined'
        invitation.responded_at = timezone.now()
        invitation.save()
        
        return Response({'message': 'Invitation declined'})
    
    @action(detail=True, methods=['post'])
    def approve_member(self, request, slug=None):
        """Approve a pending member (admin only)"""
        org = self.get_object()
        
        # Check admin permission
        admin_membership = OrganizationMembership.objects.filter(
            organization=org, user=request.user, role__in=['admin', 'owner', 'moderator'], status='active'
        ).first()
        
        if not admin_membership:
            return Response({'error': 'Admin permission required'}, status=status.HTTP_403_FORBIDDEN)
        
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        membership = OrganizationMembership.objects.filter(
            organization=org, user_id=user_id, status='pending'
        ).first()
        
        if not membership:
            return Response({'error': 'No pending membership found'}, status=status.HTTP_404_NOT_FOUND)
        
        membership.status = 'active'
        membership.save()
        
        org.member_count = OrganizationMembership.objects.filter(organization=org, status='active').count()
        org.save()
        
        # Notify user
        Notification.objects.create(
            recipient=membership.user,
            sender=request.user,
            notification_type='org_approved',
            title='Organization membership approved',
            message=f'Your request to join {org.name} was approved'
        )
        
        return Response({'message': 'Member approved'})
    
    @action(detail=True, methods=['post'])
    def reject_member(self, request, slug=None):
        """Reject a pending member (admin only)"""
        org = self.get_object()
        
        admin_membership = OrganizationMembership.objects.filter(
            organization=org, user=request.user, role__in=['admin', 'owner', 'moderator'], status='active'
        ).first()
        
        if not admin_membership:
            return Response({'error': 'Admin permission required'}, status=status.HTTP_403_FORBIDDEN)
        
        user_id = request.data.get('user_id')
        membership = OrganizationMembership.objects.filter(
            organization=org, user_id=user_id, status='pending'
        ).first()
        
        if not membership:
            return Response({'error': 'No pending membership found'}, status=status.HTTP_404_NOT_FOUND)
        
        membership.delete()
        
        return Response({'message': 'Member rejected'})
    
    @action(detail=True, methods=['post'])
    def set_role(self, request, slug=None):
        """Set a member's role (owner/admin only)"""
        org = self.get_object()
        
        # Only owner or site admin can change roles
        requester_membership = OrganizationMembership.objects.filter(
            organization=org, user=request.user, role__in=['admin', 'owner'], status='active'
        ).first()
        
        is_site_admin = request.user.is_staff or request.user.is_superuser
        
        if not requester_membership and not is_site_admin:
            return Response({'error': 'Admin permission required'}, status=status.HTTP_403_FORBIDDEN)
        
        user_id = request.data.get('user_id')
        new_role = request.data.get('role')
        
        if new_role not in ['member', 'moderator', 'admin', 'owner']:
            return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Only owner or site admin can assign admin/owner roles
        if new_role in ['admin', 'owner']:
            if requester_membership and requester_membership.role != 'owner' and not is_site_admin:
                return Response({'error': 'Only owner can assign admin roles'}, status=status.HTTP_403_FORBIDDEN)
        
        membership = OrganizationMembership.objects.filter(
            organization=org, user_id=user_id, status='active'
        ).first()
        
        if not membership:
            return Response({'error': 'Member not found'}, status=status.HTTP_404_NOT_FOUND)
        
        membership.role = new_role
        membership.save()
        
        return Response({'message': f'Role updated to {new_role}'})
    
    @action(detail=True, methods=['get'])
    def members(self, request, slug=None):
        """Get organization members"""
        org = self.get_object()
        
        # Check if user can view members
        if org.is_private:
            is_member = OrganizationMembership.objects.filter(
                organization=org, user=request.user, status='active'
            ).exists()
            if not is_member and not request.user.is_staff:
                return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        status_filter = request.query_params.get('status', 'active')
        members = shaped_memberships(
            OrganizationMembership.objects.filter(
                organization=org, status=status_filter,
            ),
            user=request.user,
        )
        
        return Response(OrganizationMembershipSerializer(members, many=True, context={'request': request}).data)
    
    @action(detail=True, methods=['get'])
    def pending_requests(self, request, slug=None):
        """Get pending join requests (admin only)"""
        org = self.get_object()
        
        admin_membership = OrganizationMembership.objects.filter(
            organization=org, user=request.user, role__in=['admin', 'owner', 'moderator'], status='active'
        ).first()
        
        if not admin_membership and not request.user.is_staff:
            return Response({'error': 'Admin permission required'}, status=status.HTTP_403_FORBIDDEN)
        
        pending = shaped_memberships(
            OrganizationMembership.objects.filter(
                organization=org, status='pending',
            ),
            user=request.user,
        )
        
        return Response(OrganizationMembershipSerializer(pending, many=True, context={'request': request}).data)
    
    @action(detail=False, methods=['get'])
    def my_invitations(self, request):
        """Get current user's pending invitations"""
        invitations = OrganizationInvitation.objects.filter(
            invitee=request.user, status='pending'
        ).select_related('organization', 'inviter')
        
        return Response(OrganizationInvitationSerializer(invitations, many=True, context={'request': request}).data)
