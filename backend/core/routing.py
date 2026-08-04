"""
WebSocket routing for CodeHub
"""
from django.urls import path
from apps.community.consumers import ChannelConsumer, NotificationConsumer
from apps.learning.consumers import LiveQuizConsumer

# The server-side camera proctor (apps.ai_proctor) was removed — it opened the
# server's webcam, which is fundamentally broken for multi-user cloud. Anti-cheat
# is now enforced in-browser (frontend useExamLockdown hook). (Req 17.)
websocket_urlpatterns = [
    path('ws/notifications/', NotificationConsumer.as_asgi()),
    # One socket per channel. Authorised on connect with the same predicate
    # the REST API uses (ChatRoom.objects.readable_by).
    path('ws/channels/<str:room_id>/', ChannelConsumer.as_asgi()),
    path('ws/quiz/<str:join_code>/', LiveQuizConsumer.as_asgi()),
]

