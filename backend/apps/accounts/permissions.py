from rest_framework import permissions


class IsPlatformAdmin(permissions.BasePermission):
    """
    Authorize on Django's is_staff / is_superuser flags rather than the
    application-level `role` string.

    A user's `role` is client-influenced in several code paths; authorizing
    admin functionality on it means a manipulated role string could grant
    access. is_staff / is_superuser are only ever set server-side by trusted
    flows, so they are the correct authorization signal. (Remediation Req 4.)
    """
    message = 'Admin access required.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_staff or user.is_superuser))


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit/view it.
    Admins (is_staff) have full access.
    """
    def has_object_permission(self, request, view, obj):
        # Admin users can do anything
        if request.user.is_staff:
            return True

        # Write permissions are only allowed to the owner of the snippet.
        return obj == request.user
