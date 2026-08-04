"""
WebSocket consumers for community app
"""
import json

from asgiref.sync import sync_to_async as database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer


class NotificationConsumer(AsyncWebsocketConsumer):
    """Consumer for real-time notifications"""
    
    async def connect(self):
        """Handle WebSocket connection"""
        self.user = self.scope['user']
        if self.user.is_authenticated:
            self.room_group_name = f'user_{self.user.id}'
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()
        else:
            await self.close()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Handle messages from WebSocket"""
        text_data_json = json.loads(text_data)
        message = text_data_json.get('message', '')
        
        # Echo message back (can be extended for chat functionality)
        await self.send(text_data=json.dumps({
            'message': message
        }))
    
    async def notification_message(self, event):
        """Send notification to WebSocket"""
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'message': message
        }))



class ChannelConsumer(AsyncWebsocketConsumer):
    """Live updates for one channel.

    Community chat has always been HTTP polling — a fixed 3s interval that had to
    be reworked because it ran forever and burned mobile battery and data. Channels
    and Redis were already configured and proven in production by live quizzes;
    this puts channels on the same path.

    Read-only from the client's side. Posting stays on the REST endpoint, which
    already validates, sets the sender, maintains thread counters in a transaction
    and returns the created row. Accepting writes here would mean a second write
    path to keep in step with the first, and the counters are denormalised.

    Authorisation is ChatRoom.objects.readable_by() — the same predicate the API
    uses. A socket that were more permissive would be a way to read a private
    project's discussion.

    Authentication is the JWT, not the session. This project issues no session
    cookie at all — REST auth is simplejwt only and nothing calls
    django.contrib.auth.login() — so AuthMiddlewareStack hands every socket an
    AnonymousUser. Relying on scope['user'] would have refused every connection in
    production and left the channel silently polling forever.

    The token arrives as a WebSocket subprotocol, ['bearer', '<token>'], rather
    than a query parameter. A query string ends up in nginx access logs and in
    Referer headers; a subprotocol does not.
    """

    async def connect(self):
        self.user = await self._resolve_user()
        if self.user is None:
            await self.close(code=4401)
            return

        self.room_id = self.scope['url_route']['kwargs']['room_id']
        if not await self._may_read(self.room_id):
            # 4403 rather than a silent accept: a client that is not allowed in
            # should stop retrying, not sit on an open socket receiving nothing.
            await self.close(code=4403)
            return

        self.group_name = f'channel_{self.room_id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        # Echo the subprotocol back when one was offered: a browser fails the
        # handshake if it proposed subprotocols and the server selects none.
        subprotocols = self.scope.get('subprotocols') or []
        await self.accept('bearer' if 'bearer' in subprotocols else None)

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        """Ignore client payloads.

        Kept explicit rather than absent so it is obvious this is deliberate: the
        REST endpoint is the only write path.
        """
        return

    async def channel_event(self, event):
        """Fan out whatever the REST layer published."""
        await self.send(text_data=json.dumps(event['payload']))

    async def _resolve_user(self):
        """The authenticated user, from the session if there is one or the JWT.

        Session first only so this keeps working if session auth is ever added;
        today it is always the token.
        """
        session_user = self.scope.get('user')
        if session_user is not None and session_user.is_authenticated:
            return session_user

        subprotocols = self.scope.get('subprotocols') or []
        if len(subprotocols) < 2 or subprotocols[0] != 'bearer':
            return None
        return await self._user_from_token(subprotocols[1])

    @database_sync_to_async
    def _user_from_token(self, raw_token):
        from rest_framework_simplejwt.authentication import JWTAuthentication

        try:
            auth = JWTAuthentication()
            return auth.get_user(auth.get_validated_token(raw_token))
        except Exception:
            # Any failure is just "not authenticated"; the reason must not leak
            # back to the client.
            return None

    @database_sync_to_async
    def _may_read(self, room_id):
        from .models import ChatRoom
        return ChatRoom.objects.readable_by(self.user).filter(id=room_id).exists()
