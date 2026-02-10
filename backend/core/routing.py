"""
WebSocket routing for CodeHub
"""
from django.urls import path
from apps.community.consumers import NotificationConsumer
from apps.learning.consumers import LiveQuizConsumer

websocket_urlpatterns = [
    path('ws/notifications/', NotificationConsumer.as_asgi()),
    path('ws/quiz/<str:join_code>/', LiveQuizConsumer.as_asgi()),
]

