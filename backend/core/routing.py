"""
WebSocket routing for CodeHub
"""
from django.urls import path
from apps.community.consumers import NotificationConsumer

websocket_urlpatterns = [
    path('ws/notifications/', NotificationConsumer.as_asgi()),
]

