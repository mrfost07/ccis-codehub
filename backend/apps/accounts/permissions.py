from rest_framework import permissions

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
