"""
Shared queryset shaping for the community app.

Every serializer here derives per-viewer state (is_liked, is_member, user_role,
is_deleted_for_me) with its own query, so an unshaped list costs several queries
per row. Each of these serializers has two call sites — a viewset and an action
— and the chat one had already been shaped in the action and not the viewset,
which is precisely why /api/community/chat/messages/ still measured 22 queries
while /chat/rooms/<id>/messages/ was fine. Keeping the shape in one place is the
only thing that reliably prevents that drift.

The `user` argument must be the same user the response is serialised for: these
prefetches are filtered to one viewer, and the serializers trust them.
"""
from django.db.models import Prefetch


def shaped_organizations(base=None, user=None):
    """Organization queryset with the viewer's own membership attached.

    OrganizationSerializer runs three separate membership lookups per row
    (is_member, membership_status, user_role). unique_together on
    (organization, user) means the viewer has at most one membership, so all
    three read from a single prefetched row.
    """
    from .models import Organization, OrganizationMembership

    qs = Organization.objects.all() if base is None else base
    qs = qs.select_related('created_by')
    if user is not None and getattr(user, 'is_authenticated', False):
        qs = qs.prefetch_related(Prefetch(
            'memberships',
            queryset=OrganizationMembership.objects.filter(user=user),
            to_attr='my_membership',
        ))
    return qs


def shaped_memberships(base, user=None):
    """Membership queryset whose nested organization is shaped too.

    OrganizationMembershipSerializer nests the full OrganizationSerializer, so
    every row otherwise repeats that serializer's three membership lookups —
    on /organizations/<slug>/members/ the same organization was queried once
    per member.
    """
    from .models import OrganizationMembership

    qs = base.select_related(
        'user', 'invited_by', 'organization', 'organization__created_by',
    )
    if user is not None and getattr(user, 'is_authenticated', False):
        qs = qs.prefetch_related(Prefetch(
            'organization__memberships',
            queryset=OrganizationMembership.objects.filter(user=user),
            to_attr='my_membership',
        ))
    return qs


def shaped_chat_messages(base=None):
    """ChatMessage queryset with everything ChatMessageSerializer reads.

    sender__chat_nickname and reply_to__sender__chat_nickname are reverse
    one-to-ones read through try/except, so they are free to select_related and
    cost one query per message otherwise. deleted_for is read by
    is_deleted_for_me, which already iterates the prefetch — but the viewset
    never supplied one.
    """
    from .models import ChatMessage

    qs = ChatMessage.objects.all() if base is None else base
    return qs.select_related(
        'sender', 'sender__chat_nickname',
        'reply_to', 'reply_to__sender', 'reply_to__sender__chat_nickname',
    ).prefetch_related(
        'reactions__user',  # reactions_summary reads reaction.user.username
        'deleted_for',
    )


def shaped_comments(base=None, user=None):
    """Comment queryset with the viewer's likes and one level of replies.

    Replies are serialised by the same serializer, so they need the like
    prefetch too or the N+1 just moves one level down.
    """
    from .models import Comment, CommentLike

    def like_prefetch():
        # A fresh Prefetch per queryset — they are not meant to be shared.
        return Prefetch(
            'likes',
            queryset=CommentLike.objects.filter(user=user),
            to_attr='my_likes',
        )

    has_user = user is not None and getattr(user, 'is_authenticated', False)

    replies = Comment.objects.select_related('author').order_by('created_at')
    if has_user:
        replies = replies.prefetch_related(like_prefetch())

    qs = Comment.objects.all() if base is None else base
    qs = qs.select_related('author')
    if has_user:
        qs = qs.prefetch_related(like_prefetch())
    return qs.prefetch_related(Prefetch(
        'replies', queryset=replies, to_attr='ordered_replies',
    ))
