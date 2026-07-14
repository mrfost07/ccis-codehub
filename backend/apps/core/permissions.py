"""
Custom permission classes for CCIS CodeHub
"""
from rest_framework import permissions


class IsInstructorOrAdmin(permissions.BasePermission):
    """
    Permission class to allow only instructors and admins
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['instructor', 'admin']
        )


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to edit it.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner
        return obj.user == request.user or obj.instructor == request.user
