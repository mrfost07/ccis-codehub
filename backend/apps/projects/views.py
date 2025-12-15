"""
Views for Projects app
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.shortcuts import get_object_or_404
from django.db import models

from .models import (
    Project, ProjectMembership, ProjectTask, TaskLabel,
    CodeReview, ReviewComment, ProjectFile, ProjectActivity,
    TeamInvitation, TaskComment, ProjectBranch, ProjectCommit,
    CommitFile, PullRequest, PRComment, PRReviewer,
    Team, TeamMembership, ProjectNotification
)
from .serializers import (
    ProjectSerializer, ProjectMembershipSerializer, ProjectTaskSerializer,
    TaskLabelSerializer, CodeReviewSerializer, ReviewCommentSerializer,
    ProjectFileSerializer, ProjectActivitySerializer,
    TeamInvitationSerializer, TaskCommentSerializer, ProjectBranchSerializer,
    ProjectCommitSerializer, CommitFileSerializer, PullRequestSerializer,
    PRCommentSerializer, PRReviewerSerializer, ProjectDetailSerializer,
    TeamSerializer, TeamDetailSerializer, TeamMembershipSerializer,
    ProjectNotificationSerializer
)
from django.utils import timezone
from apps.community.models import UserFollow


class ProjectViewSet(viewsets.ModelViewSet):
    """ViewSet for Project"""
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'
    
    def get_queryset(self):
        user = self.request.user
        queryset = Project.objects.all()
        
        # Filter by visibility
        queryset = queryset.filter(
            models.Q(visibility='public') |
            models.Q(owner=user) |
            models.Q(memberships__user=user, memberships__is_active=True)
        ).distinct()
        
        # Additional filters
        status_filter = self.request.query_params.get('status')
        project_type = self.request.query_params.get('type')
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if project_type:
            queryset = queryset.filter(project_type=project_type)
        
        return queryset
    
    def perform_create(self, serializer):
        project = serializer.save(owner=self.request.user)
        # Automatically add owner as member
        ProjectMembership.objects.create(
            project=project,
            user=self.request.user,
            role='owner'
        )
        # Log activity
        ProjectActivity.objects.create(
            project=project,
            user=self.request.user,
            activity_type='project_created',
            description=f'Project "{project.name}" was created'
        )
    
    def update(self, request, *args, **kwargs):
        """Update project - only owner or admin can update"""
        project = self.get_object()
        
        # Check permissions
        if project.owner != request.user and request.user.role != 'admin':
            # Check if user is a lead member
            membership = ProjectMembership.objects.filter(
                project=project,
                user=request.user,
                role__in=['owner', 'lead']
            ).first()
            
            if not membership:
                return Response(
                    {'error': 'You do not have permission to edit this project'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        response = super().update(request, *args, **kwargs)
        
        # Log activity
        ProjectActivity.objects.create(
            project=project,
            user=request.user,
            activity_type='project_updated',
            description=f'Project details were updated'
        )
        
        return response
    
    def destroy(self, request, *args, **kwargs):
        """Delete project - only owner or admin can delete"""
        project = self.get_object()
        
        # Check permissions
        if project.owner != request.user and request.user.role != 'admin':
            return Response(
                {'error': 'You do not have permission to delete this project'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        project_name = project.name
        response = super().destroy(request, *args, **kwargs)
        
        return Response(
            {'message': f'Project "{project_name}" has been deleted successfully'},
            status=status.HTTP_204_NO_CONTENT
        )
    
    @action(detail=True, methods=['post'])
    def add_member(self, request, slug=None):
        """Add a member to the project"""
        project = self.get_object()
        user_id = request.data.get('user_id')
        role = request.data.get('role', 'developer')
        
        from apps.accounts.models import User
        user = get_object_or_404(User, id=user_id)
        
        membership, created = ProjectMembership.objects.get_or_create(
            project=project,
            user=user,
            defaults={'role': role}
        )
        
        if created:
            ProjectActivity.objects.create(
                project=project,
                user=request.user,
                activity_type='member_added',
                description=f'{user.username} was added to the project'
            )
        
        serializer = ProjectMembershipSerializer(membership)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def activities(self, request, slug=None):
        """Get project activities"""
        project = self.get_object()
        activities = project.activities.all()[:50]  # Latest 50 activities
        serializer = ProjectActivitySerializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def progress(self, request, slug=None):
        """Get project progress dashboard for team leaders"""
        project = self.get_object()
        
        # Check if user is owner or lead
        is_authorized = (
            project.owner == request.user or
            request.user.role == 'admin' or
            ProjectMembership.objects.filter(
                project=project,
                user=request.user,
                role__in=['owner', 'lead'],
                is_active=True
            ).exists()
        )
        
        if not is_authorized:
            return Response(
                {'error': 'Only project owner or lead can view progress dashboard'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Calculate project progress
        total_tasks = project.tasks.count()
        completed_tasks = project.tasks.filter(status='completed').count()
        in_progress_tasks = project.tasks.filter(status='in_progress').count()
        todo_tasks = project.tasks.filter(status='todo').count()
        
        # Task breakdown by priority
        high_priority = project.tasks.filter(priority='high').count()
        medium_priority = project.tasks.filter(priority='medium').count()
        low_priority = project.tasks.filter(priority='low').count()
        
        # Member statistics
        members = ProjectMembership.objects.filter(project=project, is_active=True)
        member_stats = []
        
        for member in members:
            assigned_tasks = project.tasks.filter(assigned_to=member.user)
            member_stats.append({
                'user': member.user.username,
                'role': member.role,
                'total_tasks': assigned_tasks.count(),
                'completed_tasks': assigned_tasks.filter(status='completed').count(),
                'in_progress_tasks': assigned_tasks.filter(status='in_progress').count(),
                'contribution_score': member.contribution_points
            })
        
        # Recent activities
        recent_activities = project.activities.all()[:10]
        
        # Progress percentage
        progress_percentage = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        return Response({
            'project': {
                'name': project.name,
                'status': project.status,
                'created_at': project.created_at,
                'deadline': project.deadline
            },
            'progress': {
                'percentage': round(progress_percentage, 2),
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'in_progress_tasks': in_progress_tasks,
                'todo_tasks': todo_tasks
            },
            'priority_breakdown': {
                'high': high_priority,
                'medium': medium_priority,
                'low': low_priority
            },
            'members': member_stats,
            'recent_activities': ProjectActivitySerializer(recent_activities, many=True).data,
            'milestones': {
                'total': project.tasks.filter(is_milestone=True).count() if hasattr(ProjectTask, 'is_milestone') else 0,
                'completed': project.tasks.filter(is_milestone=True, status='completed').count() if hasattr(ProjectTask, 'is_milestone') else 0
            }
        })
    
    @action(detail=True, methods=['post', 'get'])
    def sync_github(self, request, slug=None):
        """Sync repository data from GitHub"""
        project = self.get_object()
        
        # Check permissions
        if project.owner != request.user and not project.is_team_leader(request.user):
            return Response(
                {'error': 'Only project owner or team leader can sync GitHub'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not project.github_repo:
            return Response(
                {'error': 'No GitHub repository URL set for this project'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from .github_service import github_service
        
        # Fetch data from GitHub
        github_data = github_service.sync_repository_data(project.github_repo)
        
        if not github_data:
            return Response(
                {'error': 'Failed to fetch data from GitHub. Check the repository URL.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Import branches
        imported_branches = 0
        default_branch_name = github_data['repository'].get('default_branch', 'main')
        
        for branch_data in github_data['branches']:
            branch, created = ProjectBranch.objects.update_or_create(
                project=project,
                name=branch_data['name'],
                defaults={
                    'is_protected': branch_data.get('protected', False),
                    'is_default': branch_data['name'] == default_branch_name,
                    'created_by': request.user
                }
            )
            if created:
                imported_branches += 1
        
        # Import commits
        imported_commits = 0
        default_branch = ProjectBranch.objects.filter(
            project=project, 
            name=default_branch_name
        ).first()
        
        if default_branch:
            for commit_data in github_data['commits']:
                # Check if commit already exists
                existing = ProjectCommit.objects.filter(
                    project=project,
                    short_hash=commit_data['short_sha']
                ).exists()
                
                if not existing:
                    ProjectCommit.objects.create(
                        project=project,
                        branch=default_branch,
                        author=request.user,  # We can't match GitHub users to local users
                        message=commit_data['message'][:500],  # Truncate long messages
                        short_hash=commit_data['short_sha']
                    )
                    imported_commits += 1
        
        # Log activity
        ProjectActivity.objects.create(
            project=project,
            user=request.user,
            activity_type='project_updated',
            description=f'Synced from GitHub: {imported_branches} branches, {imported_commits} commits'
        )
        
        return Response({
            'status': 'success',
            'repository': github_data['repository'],
            'imported': {
                'branches': imported_branches,
                'commits': imported_commits
            },
            'total': {
                'branches': len(github_data['branches']),
                'commits': len(github_data['commits']),
                'pull_requests': len(github_data['pull_requests'])
            }
        })


class ProjectTaskViewSet(viewsets.ModelViewSet):
    """ViewSet for ProjectTask - Leader creates, members update their tasks"""
    serializer_class = ProjectTaskSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        project_id = self.request.query_params.get('project')
        queryset = ProjectTask.objects.select_related('project', 'assigned_to')
        if project_id:
            queryset = queryset.filter(project__id=project_id)
        return queryset.order_by('order', 'priority')
    
    def perform_create(self, serializer):
        """Only team leader can create tasks"""
        project = serializer.validated_data.get('project')
        if not project.is_team_leader(self.request.user):
            raise PermissionDenied("Only the team leader can create tasks")
        
        # Validate assignee is required and must be an accepted team member
        assigned_to = serializer.validated_data.get('assigned_to')
        if not assigned_to:
            raise ValidationError("Task must be assigned to a team member")
        
        if project.team:
            valid_members = project.get_team_members()
            if assigned_to.id not in valid_members:
                raise ValidationError("Can only assign tasks to accepted team members")
        
        # Force status to 'todo' for new tasks
        task = serializer.save(created_by=self.request.user, status='todo')
        ProjectActivity.objects.create(
            project=task.project,
            user=self.request.user,
            activity_type='task_created',
            description=f'Task "{task.title}" was created and assigned to {task.assigned_to.username}'
        )
        
        # Notify assignee
        ProjectNotification.objects.create(
            recipient=task.assigned_to,
            sender=self.request.user,
            notification_type='task_assigned',
            title=f'New Task Assigned: {task.title}',
            message=f'You have been assigned a new task in {project.name}',
            project=project,
            task=task
        )
    
    def perform_update(self, serializer):
        """Members can only update status of their assigned tasks (drag and drop)"""
        task = self.get_object()
        project = task.project
        user = self.request.user
        
        # Leaders can update anything
        if project.is_team_leader(user):
            old_status = task.status
            old_assignee = task.assigned_to
            updated_task = serializer.save()
            
            # Notify if assignee changed
            if old_assignee != updated_task.assigned_to and updated_task.assigned_to:
                ProjectNotification.objects.create(
                    recipient=updated_task.assigned_to,
                    sender=user,
                    notification_type='task_assigned',
                    title=f'Task Assigned: {task.title}',
                    message=f'You have been assigned to task "{task.title}" in {project.name}',
                    project=project,
                    task=updated_task
                )
            
            if old_status != updated_task.status:
                ProjectNotification.notify_task_update(
                    updated_task, user, 'task_status_changed',
                    f'Task "{task.title}" moved to {updated_task.status}'
                )
            return
        
        # Members can only update status of their assigned tasks
        if task.assigned_to != user:
            raise PermissionDenied("You can only update tasks assigned to you")
        
        # Members can only change status (for drag and drop)
        allowed_fields = {'status', 'order'}
        changed_fields = set(serializer.validated_data.keys())
        disallowed = changed_fields - allowed_fields
        if disallowed:
            raise PermissionDenied(f"You can only change task status. Cannot modify: {', '.join(disallowed)}")
        
        old_status = task.status
        updated_task = serializer.save()
        
        ProjectActivity.objects.create(
            project=project,
            user=user,
            activity_type='task_updated',
            description=f'Task "{task.title}" status changed to {updated_task.status}'
        )
        
        if old_status != updated_task.status:
            ProjectNotification.notify_task_update(
                updated_task, user, 'task_status_changed',
                f'{user.username} moved "{task.title}" to {updated_task.status}'
            )
    
    def perform_destroy(self, instance):
        """Only team leader can delete tasks"""
        if not instance.project.is_team_leader(self.request.user):
            raise PermissionDenied("Only the team leader can delete tasks")
        
        ProjectActivity.objects.create(
            project=instance.project,
            user=self.request.user,
            activity_type='task_deleted',
            description=f'Task "{instance.title}" was deleted'
        )
        instance.delete()


class CodeReviewViewSet(viewsets.ModelViewSet):
    """ViewSet for CodeReview"""
    serializer_class = CodeReviewSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        project_id = self.request.query_params.get('project')
        queryset = CodeReview.objects.all()
        
        if project_id:
            queryset = queryset.filter(project__id=project_id)
        
        return queryset
    
    def perform_create(self, serializer):
        review = serializer.save(requester=self.request.user)
        ProjectActivity.objects.create(
            project=review.project,
            user=self.request.user,
            activity_type='review_requested',
            description=f'Code review was requested'
        )


class ReviewCommentViewSet(viewsets.ModelViewSet):
    """ViewSet for ReviewComment"""
    serializer_class = ReviewCommentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        review_id = self.request.query_params.get('review')
        queryset = ReviewComment.objects.all()
        
        if review_id:
            queryset = queryset.filter(code_review__id=review_id)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class ProjectFileViewSet(viewsets.ModelViewSet):
    """ViewSet for ProjectFile"""
    serializer_class = ProjectFileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        project_id = self.request.query_params.get('project')
        queryset = ProjectFile.objects.all()
        
        if project_id:
            queryset = queryset.filter(project__id=project_id)
        
        return queryset
    
    def perform_create(self, serializer):
        file = serializer.save(uploaded_by=self.request.user)
        ProjectActivity.objects.create(
            project=file.project,
            user=self.request.user,
            activity_type='file_uploaded',
            description=f'File "{file.filename}" was uploaded'
        )


# ============== Team Invitation ViewSet ==============

class TeamInvitationViewSet(viewsets.ModelViewSet):
    """ViewSet for team invitations - recruit followers to projects"""
    serializer_class = TeamInvitationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        # Get invitations sent by user or received by user
        return TeamInvitation.objects.filter(
            models.Q(inviter=user) | models.Q(invitee=user)
        ).select_related('project', 'inviter', 'invitee')
    
    def perform_create(self, serializer):
        project = serializer.validated_data['project']
        invitee = serializer.validated_data['invitee']
        
        # Check if inviter is owner or admin
        if project.owner != self.request.user:
            membership = ProjectMembership.objects.filter(
                project=project, user=self.request.user, role__in=['owner', 'admin']
            ).first()
            if not membership:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Only project owner or admin can invite members")
        
        # Check if invitee follows the inviter (recruiter can only invite followers)
        from apps.community.models import UserFollow
        is_follower = UserFollow.objects.filter(
            follower=invitee, following=self.request.user, status='accepted'
        ).exists()
        
        if not is_follower:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("You can only invite your followers to join projects")
        
        serializer.save(inviter=self.request.user)
    
    @action(detail=False, methods=['get'])
    def my_invitations(self, request):
        """Get invitations received by the current user"""
        invitations = TeamInvitation.objects.filter(
            invitee=request.user, status='pending'
        ).select_related('project', 'inviter')
        serializer = self.get_serializer(invitations, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def sent(self, request):
        """Get invitations sent by the current user"""
        invitations = TeamInvitation.objects.filter(
            inviter=request.user
        ).select_related('project', 'invitee')
        serializer = self.get_serializer(invitations, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept a team invitation"""
        invitation = self.get_object()
        if invitation.invitee != request.user:
            return Response({'error': 'Not your invitation'}, status=status.HTTP_403_FORBIDDEN)
        
        if invitation.status != 'pending':
            return Response({'error': 'Invitation already responded'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create membership
        ProjectMembership.objects.create(
            project=invitation.project,
            user=request.user,
            role=invitation.role
        )
        
        # Update invitation
        invitation.status = 'accepted'
        invitation.responded_at = timezone.now()
        invitation.save()
        
        # Log activity
        ProjectActivity.objects.create(
            project=invitation.project,
            user=request.user,
            activity_type='member_added',
            description=f'{request.user.username} joined the project as {invitation.role}'
        )
        
        return Response({'status': 'accepted'})
    
    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        """Decline a team invitation"""
        invitation = self.get_object()
        if invitation.invitee != request.user:
            return Response({'error': 'Not your invitation'}, status=status.HTTP_403_FORBIDDEN)
        
        invitation.status = 'declined'
        invitation.responded_at = timezone.now()
        invitation.save()
        
        return Response({'status': 'declined'})


# ============== Task Comment ViewSet ==============

class TaskCommentViewSet(viewsets.ModelViewSet):
    """ViewSet for task comments"""
    serializer_class = TaskCommentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        task_id = self.request.query_params.get('task')
        queryset = TaskComment.objects.select_related('author', 'task')
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


# ============== Git Repository ViewSets ==============

class ProjectBranchViewSet(viewsets.ModelViewSet):
    """ViewSet for project branches"""
    serializer_class = ProjectBranchSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        project_id = self.request.query_params.get('project')
        queryset = ProjectBranch.objects.select_related('project', 'created_by')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset
    
    def perform_create(self, serializer):
        branch = serializer.save(created_by=self.request.user)
        
        # If this is the first branch, make it default
        if not ProjectBranch.objects.filter(project=branch.project).exclude(id=branch.id).exists():
            branch.is_default = True
            branch.name = 'main'
            branch.save()
        
        ProjectActivity.objects.create(
            project=branch.project,
            user=self.request.user,
            activity_type='branch_created',
            description=f'Branch "{branch.name}" was created'
        )


class ProjectCommitViewSet(viewsets.ModelViewSet):
    """ViewSet for project commits"""
    serializer_class = ProjectCommitSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        project_id = self.request.query_params.get('project')
        branch_id = self.request.query_params.get('branch')
        queryset = ProjectCommit.objects.select_related('project', 'branch', 'author')
        
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        
        return queryset
    
    def perform_create(self, serializer):
        commit = serializer.save(author=self.request.user)
        
        ProjectActivity.objects.create(
            project=commit.project,
            user=self.request.user,
            activity_type='commit_made',
            description=f'Commit: {commit.message[:50]}'
        )


class PullRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for pull requests"""
    serializer_class = PullRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        project_id = self.request.query_params.get('project')
        status_filter = self.request.query_params.get('status')
        queryset = PullRequest.objects.select_related(
            'project', 'source_branch', 'target_branch', 'author', 'merged_by'
        ).prefetch_related('comments', 'reviewers')
        
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset
    
    def perform_create(self, serializer):
        pr = serializer.save(author=self.request.user)
        
        ProjectActivity.objects.create(
            project=pr.project,
            user=self.request.user,
            activity_type='pr_created',
            description=f'Pull request "{pr.title}" was created'
        )
    
    @action(detail=True, methods=['post'])
    def merge(self, request, pk=None):
        """Merge a pull request"""
        pr = self.get_object()
        
        if pr.status != 'open':
            return Response({'error': 'PR is not open'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user can merge (owner, admin, or PR author)
        project = pr.project
        can_merge = (
            project.owner == request.user or
            ProjectMembership.objects.filter(
                project=project, user=request.user, role__in=['owner', 'admin']
            ).exists()
        )
        
        if not can_merge:
            return Response({'error': 'No permission to merge'}, status=status.HTTP_403_FORBIDDEN)
        
        pr.status = 'merged'
        pr.merged_by = request.user
        pr.merged_at = timezone.now()
        pr.save()
        
        ProjectActivity.objects.create(
            project=project,
            user=request.user,
            activity_type='pr_merged',
            description=f'Pull request "{pr.title}" was merged'
        )
        
        return Response({'status': 'merged'})
    
    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Close a pull request without merging"""
        pr = self.get_object()
        
        if pr.status != 'open':
            return Response({'error': 'PR is not open'}, status=status.HTTP_400_BAD_REQUEST)
        
        pr.status = 'closed'
        pr.save()
        
        return Response({'status': 'closed'})
    
    @action(detail=True, methods=['post'])
    def add_reviewer(self, request, pk=None):
        """Add a reviewer to the pull request"""
        pr = self.get_object()
        reviewer_id = request.data.get('reviewer_id')
        
        if not reviewer_id:
            return Response({'error': 'reviewer_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        reviewer = get_object_or_404(User, id=reviewer_id)
        
        PRReviewer.objects.get_or_create(
            pull_request=pr,
            reviewer=reviewer
        )
        
        return Response({'status': 'reviewer added'})


class PRCommentViewSet(viewsets.ModelViewSet):
    """ViewSet for PR comments"""
    serializer_class = PRCommentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        pr_id = self.request.query_params.get('pull_request')
        queryset = PRComment.objects.select_related('author', 'pull_request')
        if pr_id:
            queryset = queryset.filter(pull_request_id=pr_id)
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


# ============== Team ViewSets ==============

class TeamViewSet(viewsets.ModelViewSet):
    """ViewSet for Teams - Create team first, then projects"""
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'
    
    def get_queryset(self):
        user = self.request.user
        # Get teams where user is leader or accepted member
        return Team.objects.filter(
            models.Q(leader=user) |
            models.Q(memberships__user=user, memberships__status='accepted')
        ).distinct().select_related('leader')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TeamDetailSerializer
        return TeamSerializer
    
    def perform_create(self, serializer):
        serializer.save(leader=self.request.user)
    
    @action(detail=True, methods=['post'])
    def invite_member(self, request, slug=None):
        """Invite any user to join the team"""
        team = self.get_object()
        
        # Only leader can invite
        if team.leader != request.user:
            return Response({'error': 'Only team leader can invite members'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        user_id = request.data.get('user_id')
        role = request.data.get('role', 'member')
        message = request.data.get('message', '')
        
        if not user_id:
            return Response({'error': 'user_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        invitee = get_object_or_404(User, id=user_id)
        
        # Can't invite yourself
        if invitee == request.user:
            return Response({'error': 'Cannot invite yourself'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Check if already a member or invited
        if TeamMembership.objects.filter(team=team, user=invitee).exists():
            return Response({'error': 'User already invited or is a member'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        membership = TeamMembership.objects.create(
            team=team,
            user=invitee,
            role=role,
            status='pending',
            invited_by=request.user,
            message=message
        )
        
        # Create notification
        ProjectNotification.objects.create(
            recipient=invitee,
            sender=request.user,
            notification_type='team_invite',
            title=f'Team Invitation: {team.name}',
            message=f'{request.user.username} invited you to join {team.name}',
            team=team
        )
        
        return Response(TeamMembershipSerializer(membership).data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def members(self, request, slug=None):
        """Get team members with their status"""
        team = self.get_object()
        memberships = team.memberships.select_related('user', 'invited_by')
        
        # Helper function to get avatar URL
        def get_avatar_url(user):
            if user.profile_picture:
                return request.build_absolute_uri(user.profile_picture.url)
            return None
        
        # Include leader as first member
        result = [{
            'id': str(team.leader.id),
            'user': str(team.leader.id),
            'user_name': team.leader.username,
            'user_email': team.leader.email,
            'avatar': get_avatar_url(team.leader),
            'role': 'leader',
            'status': 'accepted',
            'is_leader': True
        }]
        
        for m in memberships:
            result.append({
                'id': str(m.id),
                'user': str(m.user.id),
                'user_name': m.user.username,
                'user_email': m.user.email,
                'avatar': get_avatar_url(m.user),
                'role': m.role,
                'status': m.status,
                'invited_at': m.invited_at,
                'is_leader': False
            })
        
        return Response(result)
    
    @action(detail=True, methods=['get'])
    def projects(self, request, slug=None):
        """Get all projects under this team"""
        team = self.get_object()
        projects = team.projects.all()
        return Response(ProjectSerializer(projects, many=True, context={'request': request}).data)


class TeamMembershipViewSet(viewsets.ModelViewSet):
    """ViewSet for team memberships/invitations"""
    serializer_class = TeamMembershipSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return TeamMembership.objects.filter(
            models.Q(user=self.request.user) |
            models.Q(team__leader=self.request.user)
        ).select_related('team', 'user', 'invited_by')
    
    @action(detail=False, methods=['get'])
    def my_invitations(self, request):
        """Get pending team invitations for current user"""
        invitations = TeamMembership.objects.filter(
            user=request.user, status='pending'
        ).select_related('team', 'invited_by')
        return Response(TeamMembershipSerializer(invitations, many=True).data)
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept team invitation"""
        membership = self.get_object()
        
        if membership.user != request.user:
            return Response({'error': 'Not your invitation'}, status=status.HTTP_403_FORBIDDEN)
        
        if membership.status != 'pending':
            return Response({'error': 'Already responded'}, status=status.HTTP_400_BAD_REQUEST)
        
        membership.status = 'accepted'
        membership.responded_at = timezone.now()
        membership.save()
        
        # Notify team leader
        ProjectNotification.objects.create(
            recipient=membership.team.leader,
            sender=request.user,
            notification_type='team_invite_accepted',
            title=f'{request.user.username} joined your team',
            message=f'{request.user.username} accepted the invitation to join {membership.team.name}',
            team=membership.team
        )
        
        return Response({'status': 'accepted', 'team': TeamSerializer(membership.team).data})
    
    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        """Decline team invitation"""
        membership = self.get_object()
        
        if membership.user != request.user:
            return Response({'error': 'Not your invitation'}, status=status.HTTP_403_FORBIDDEN)
        
        membership.status = 'declined'
        membership.responded_at = timezone.now()
        membership.save()
        
        return Response({'status': 'declined'})


class ProjectNotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for project notifications"""
    serializer_class = ProjectNotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ProjectNotification.objects.filter(
            recipient=self.request.user
        ).select_related('sender', 'team', 'project', 'task').order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Get unread notifications"""
        notifications = self.get_queryset().filter(is_read=False)
        return Response(ProjectNotificationSerializer(notifications, many=True).data)
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications"""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'count': count})
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'marked as read'})
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'status': 'all marked as read'})
