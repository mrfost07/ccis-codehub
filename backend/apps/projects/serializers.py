"""
Serializers for Projects app
"""
from rest_framework import serializers
from .models import (
    Project, ProjectMembership, ProjectTask, TaskLabel, ProjectTag,
    ProjectFile, CodeReview, ReviewComment, ProjectActivity,
    TeamInvitation, TaskComment, ProjectBranch, ProjectCommit,
    CommitFile, PullRequest, PRComment, PRReviewer,
    Team, TeamMembership, ProjectNotification
)


# ============== Team Serializers ==============

class TeamMembershipSerializer(serializers.ModelSerializer):
    """Serializer for TeamMembership"""
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_picture = serializers.SerializerMethodField()
    invited_by_name = serializers.CharField(source='invited_by.username', read_only=True, allow_null=True)
    
    class Meta:
        model = TeamMembership
        fields = [
            'id', 'team', 'user', 'user_name', 'user_email', 'user_picture',
            'role', 'status', 'invited_by', 'invited_by_name', 'message',
            'invited_at', 'responded_at'
        ]
        read_only_fields = ['invited_by', 'invited_at', 'responded_at']
    
    def get_user_picture(self, obj):
        if obj.user.profile_picture:
            return obj.user.profile_picture.url
        return None


class TeamSerializer(serializers.ModelSerializer):
    """Serializer for Team"""
    leader_name = serializers.CharField(source='leader.username', read_only=True)
    leader_picture = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    project_count = serializers.SerializerMethodField()
    pending_count = serializers.SerializerMethodField()
    accepted_members = TeamMembershipSerializer(many=True, read_only=True, source='memberships')
    
    class Meta:
        model = Team
        fields = [
            'id', 'name', 'slug', 'description', 'leader', 'leader_name', 
            'leader_picture', 'avatar', 'is_active', 'member_count', 
            'project_count', 'pending_count', 'accepted_members',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['leader', 'slug']
    
    def get_leader_picture(self, obj):
        if obj.leader.profile_picture:
            return obj.leader.profile_picture.url
        return None
    
    def get_member_count(self, obj):
        return obj.memberships.filter(status='accepted').count() + 1
    
    def get_project_count(self, obj):
        return obj.projects.count()
    
    def get_pending_count(self, obj):
        return obj.memberships.filter(status='pending').count()


class TeamDetailSerializer(TeamSerializer):
    """Detailed Team serializer with projects"""
    projects = serializers.SerializerMethodField()
    
    class Meta(TeamSerializer.Meta):
        fields = TeamSerializer.Meta.fields + ['projects']
    
    def get_projects(self, obj):
        from .serializers import ProjectSerializer
        return ProjectSerializer(obj.projects.all()[:5], many=True).data


# ============== Project Notification Serializer ==============

class ProjectNotificationSerializer(serializers.ModelSerializer):
    """Serializer for ProjectNotification"""
    sender_name = serializers.CharField(source='sender.username', read_only=True, allow_null=True)
    sender_picture = serializers.SerializerMethodField()
    project_name = serializers.CharField(source='project.name', read_only=True, allow_null=True)
    team_name = serializers.CharField(source='team.name', read_only=True, allow_null=True)
    task_title = serializers.CharField(source='task.title', read_only=True, allow_null=True)
    
    class Meta:
        model = ProjectNotification
        fields = [
            'id', 'recipient', 'sender', 'sender_name', 'sender_picture',
            'notification_type', 'title', 'message', 'team', 'team_name',
            'project', 'project_name', 'task', 'task_title',
            'is_read', 'created_at'
        ]
        read_only_fields = ['recipient', 'sender', 'created_at']
    
    def get_sender_picture(self, obj):
        if obj.sender and obj.sender.profile_picture:
            return obj.sender.profile_picture.url
        return None


# ============== Original Serializers ==============

class ProjectMembershipSerializer(serializers.ModelSerializer):
    """Serializer for ProjectMembership"""
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_picture = serializers.SerializerMethodField()
    
    class Meta:
        model = ProjectMembership
        fields = ['id', 'project', 'user', 'user_name', 'user_email', 'user_picture', 'role', 'joined_at', 'is_active']
    
    def get_user_picture(self, obj):
        if obj.user.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.user.profile_picture.url)
            return obj.user.profile_picture.url
        return None


class TaskLabelSerializer(serializers.ModelSerializer):
    """Serializer for TaskLabel"""
    class Meta:
        model = TaskLabel
        fields = ['id', 'project', 'name', 'color', 'created_at']


class ProjectTaskSerializer(serializers.ModelSerializer):
    """Serializer for ProjectTask"""
    assigned_to_name = serializers.CharField(source='assigned_to.username', read_only=True, allow_null=True)
    assigned_to_picture = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    can_edit = serializers.SerializerMethodField()
    can_drag = serializers.SerializerMethodField()
    
    class Meta:
        model = ProjectTask
        fields = [
            'id', 'project', 'project_name', 'title', 'description', 'assigned_to', 'assigned_to_name',
            'assigned_to_picture', 'status', 'priority', 'start_date', 'due_date', 'order', 'created_at', 'updated_at', 
            'completed_at', 'created_by', 'created_by_name', 'can_edit', 'can_drag'
        ]
        read_only_fields = ['created_by', 'created_by_name']
    
    def get_assigned_to_picture(self, obj):
        if obj.assigned_to and obj.assigned_to.profile_picture:
            return obj.assigned_to.profile_picture.url
        return None
    
    def get_can_edit(self, obj):
        """Check if current user can fully edit this task (leader only)"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.project.is_team_leader(request.user)
    
    def get_can_drag(self, obj):
        """Check if current user can drag this task (assigned user or leader)"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        # Leader can drag any task
        if obj.project.is_team_leader(request.user):
            return True
        # Assigned user can drag their own task
        return obj.assigned_to == request.user


class ProjectSerializer(serializers.ModelSerializer):
    """Serializer for Project"""
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True, allow_null=True)
    team_slug = serializers.CharField(source='team.slug', read_only=True, allow_null=True)
    memberships = ProjectMembershipSerializer(many=True, read_only=True)
    tasks = ProjectTaskSerializer(many=True, read_only=True)
    member_count = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()
    is_team_leader = serializers.SerializerMethodField()
    assignable_members = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'slug', 'description', 'team', 'team_name', 'team_slug',
            'is_snsu_ccis_project', 'course_related', 'course_code', 'owner', 'owner_name', 
            'project_type', 'programming_language', 'status', 'visibility', 
            'github_repo', 'gitlab_repo', 'start_date', 'end_date', 'deadline', 
            'created_at', 'updated_at', 'memberships', 'tasks', 'member_count', 
            'task_count', 'is_team_leader', 'assignable_members', 'progress'
        ]
        read_only_fields = ['owner', 'slug']
    
    def get_member_count(self, obj):
        if obj.team:
            return obj.team.memberships.filter(status='accepted').count() + 1
        return obj.memberships.filter(is_active=True).count() + 1
    
    def get_task_count(self, obj):
        return obj.tasks.count()
    
    def get_is_team_leader(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.is_team_leader(request.user)
        return False
    
    def get_assignable_members(self, obj):
        """Get members who can be assigned tasks (accepted team members)"""
        members = []
        if obj.team:
            # Add team leader
            members.append({
                'id': str(obj.team.leader.id),
                'name': obj.team.leader.username,
                'role': 'leader'
            })
            # Add accepted team members
            for m in obj.team.memberships.filter(status='accepted'):
                members.append({
                    'id': str(m.user.id),
                    'name': m.user.username,
                    'role': m.role
                })
        else:
            members.append({
                'id': str(obj.owner.id),
                'name': obj.owner.username,
                'role': 'owner'
            })
        return members
    
    def get_progress(self, obj):
        """Calculate task completion progress"""
        total = obj.tasks.count()
        if total == 0:
            return {'total': 0, 'completed': 0, 'percentage': 0}
        completed = obj.tasks.filter(status='done').count()
        return {
            'total': total,
            'completed': completed,
            'in_progress': obj.tasks.filter(status='in_progress').count(),
            'review': obj.tasks.filter(status='review').count(),
            'todo': obj.tasks.filter(status='todo').count(),
            'percentage': round((completed / total) * 100)
        }


class ReviewCommentSerializer(serializers.ModelSerializer):
    """Serializer for ReviewComment"""
    author_name = serializers.CharField(source='author.username', read_only=True)
    
    class Meta:
        model = ReviewComment
        fields = [
            'id', 'code_review', 'author', 'author_name', 'line_number',
            'comment_text', 'comment_type', 'created_at', 'updated_at'
        ]
        read_only_fields = ['author']


class CodeReviewSerializer(serializers.ModelSerializer):
    """Serializer for CodeReview"""
    requester_name = serializers.CharField(source='requester.username', read_only=True)
    reviewer_name = serializers.CharField(source='reviewer.username', read_only=True, allow_null=True)
    comments = ReviewCommentSerializer(many=True, read_only=True)
    
    class Meta:
        model = CodeReview
        fields = [
            'id', 'project', 'requester', 'requester_name', 'reviewer', 'reviewer_name',
            'status', 'code_snippet', 'review_notes', 'ai_analysis',
            'requested_at', 'completed_at', 'comments'
        ]
        read_only_fields = ['requester', 'ai_analysis']


class ProjectFileSerializer(serializers.ModelSerializer):
    """Serializer for ProjectFile"""
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)
    
    class Meta:
        model = ProjectFile
        fields = [
            'id', 'project', 'uploaded_by', 'uploaded_by_name', 'filename',
            'file', 'file_type', 'file_size', 'version', 'uploaded_at'
        ]
        read_only_fields = ['uploaded_by', 'file_size', 'file_type']


class ProjectActivitySerializer(serializers.ModelSerializer):
    """Serializer for ProjectActivity"""
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = ProjectActivity
        fields = [
            'id', 'project', 'user', 'user_name', 'activity_type',
            'description', 'metadata', 'created_at'
        ]
        read_only_fields = ['user']


# ============== Team Invitation Serializers ==============

class TeamInvitationSerializer(serializers.ModelSerializer):
    """Serializer for TeamInvitation"""
    inviter_name = serializers.CharField(source='inviter.username', read_only=True)
    inviter_picture = serializers.SerializerMethodField()
    invitee_name = serializers.CharField(source='invitee.username', read_only=True)
    invitee_picture = serializers.SerializerMethodField()
    project_name = serializers.CharField(source='project.name', read_only=True)
    
    class Meta:
        model = TeamInvitation
        fields = [
            'id', 'project', 'project_name', 'inviter', 'inviter_name', 'inviter_picture',
            'invitee', 'invitee_name', 'invitee_picture', 'role', 'message',
            'status', 'created_at', 'responded_at'
        ]
        read_only_fields = ['inviter', 'status', 'responded_at']
    
    def get_inviter_picture(self, obj):
        if obj.inviter.profile_picture:
            return obj.inviter.profile_picture.url
        return None
    
    def get_invitee_picture(self, obj):
        if obj.invitee.profile_picture:
            return obj.invitee.profile_picture.url
        return None


class TaskCommentSerializer(serializers.ModelSerializer):
    """Serializer for TaskComment"""
    author_name = serializers.CharField(source='author.username', read_only=True)
    author_picture = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskComment
        fields = ['id', 'task', 'author', 'author_name', 'author_picture', 'content', 'created_at', 'updated_at']
        read_only_fields = ['author']
    
    def get_author_picture(self, obj):
        if obj.author.profile_picture:
            return obj.author.profile_picture.url
        return None


# ============== Git Repository Serializers ==============

class ProjectBranchSerializer(serializers.ModelSerializer):
    """Serializer for ProjectBranch"""
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    commit_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ProjectBranch
        fields = [
            'id', 'project', 'name', 'description', 'is_default', 'is_protected',
            'created_by', 'created_by_name', 'commit_count', 'created_at'
        ]
        read_only_fields = ['created_by']
    
    def get_commit_count(self, obj):
        return obj.commits.count()


class CommitFileSerializer(serializers.ModelSerializer):
    """Serializer for CommitFile"""
    class Meta:
        model = CommitFile
        fields = ['id', 'commit', 'filename', 'change_type', 'content', 'previous_content', 'additions', 'deletions']


class ProjectCommitSerializer(serializers.ModelSerializer):
    """Serializer for ProjectCommit"""
    author_name = serializers.CharField(source='author.username', read_only=True)
    author_picture = serializers.SerializerMethodField()
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    changed_files = CommitFileSerializer(many=True, read_only=True)
    
    class Meta:
        model = ProjectCommit
        fields = [
            'id', 'project', 'branch', 'branch_name', 'author', 'author_name', 'author_picture',
            'message', 'short_hash', 'parent', 'files_changed', 'additions', 'deletions',
            'changed_files', 'created_at'
        ]
        read_only_fields = ['author', 'short_hash']
    
    def get_author_picture(self, obj):
        if obj.author.profile_picture:
            return obj.author.profile_picture.url
        return None


class PRCommentSerializer(serializers.ModelSerializer):
    """Serializer for PRComment"""
    author_name = serializers.CharField(source='author.username', read_only=True)
    author_picture = serializers.SerializerMethodField()
    
    class Meta:
        model = PRComment
        fields = ['id', 'pull_request', 'author', 'author_name', 'author_picture', 'content', 'created_at']
        read_only_fields = ['author']
    
    def get_author_picture(self, obj):
        if obj.author.profile_picture:
            return obj.author.profile_picture.url
        return None


class PRReviewerSerializer(serializers.ModelSerializer):
    """Serializer for PRReviewer"""
    reviewer_name = serializers.CharField(source='reviewer.username', read_only=True)
    reviewer_picture = serializers.SerializerMethodField()
    
    class Meta:
        model = PRReviewer
        fields = ['id', 'pull_request', 'reviewer', 'reviewer_name', 'reviewer_picture', 'status', 'reviewed_at']
    
    def get_reviewer_picture(self, obj):
        if obj.reviewer.profile_picture:
            return obj.reviewer.profile_picture.url
        return None


class PullRequestSerializer(serializers.ModelSerializer):
    """Serializer for PullRequest"""
    author_name = serializers.CharField(source='author.username', read_only=True)
    author_picture = serializers.SerializerMethodField()
    source_branch_name = serializers.CharField(source='source_branch.name', read_only=True)
    target_branch_name = serializers.CharField(source='target_branch.name', read_only=True)
    merged_by_name = serializers.CharField(source='merged_by.username', read_only=True, allow_null=True)
    comments = PRCommentSerializer(many=True, read_only=True)
    reviewers = PRReviewerSerializer(many=True, read_only=True)
    
    class Meta:
        model = PullRequest
        fields = [
            'id', 'project', 'title', 'description', 'source_branch', 'source_branch_name',
            'target_branch', 'target_branch_name', 'author', 'author_name', 'author_picture',
            'status', 'merged_by', 'merged_by_name', 'comments', 'reviewers',
            'created_at', 'updated_at', 'merged_at'
        ]
        read_only_fields = ['author', 'merged_by', 'merged_at']
    
    def get_author_picture(self, obj):
        if obj.author.profile_picture:
            return obj.author.profile_picture.url
        return None


# Enhanced Project Serializer with all relations
class ProjectDetailSerializer(serializers.ModelSerializer):
    """Detailed Project serializer with all nested data"""
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    owner_picture = serializers.SerializerMethodField()
    memberships = ProjectMembershipSerializer(many=True, read_only=True)
    tasks = ProjectTaskSerializer(many=True, read_only=True)
    branches = ProjectBranchSerializer(many=True, read_only=True)
    member_count = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()
    open_pr_count = serializers.SerializerMethodField()
    is_member = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'slug', 'description', 'is_snsu_ccis_project',
            'course_related', 'course_code', 'owner', 'owner_name', 'owner_picture',
            'project_type', 'programming_language', 'status', 'visibility',
            'github_repo', 'gitlab_repo', 'start_date', 'end_date', 'deadline',
            'created_at', 'updated_at', 'memberships', 'tasks', 'branches',
            'member_count', 'task_count', 'open_pr_count', 'is_member', 'user_role'
        ]
    
    def get_owner_picture(self, obj):
        if obj.owner.profile_picture:
            return obj.owner.profile_picture.url
        return None
    
    def get_member_count(self, obj):
        return obj.memberships.filter(is_active=True).count() + 1  # +1 for owner
    
    def get_task_count(self, obj):
        return obj.tasks.count()
    
    def get_open_pr_count(self, obj):
        return obj.pull_requests.filter(status='open').count()
    
    def get_is_member(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if obj.owner == request.user:
                return True
            return obj.memberships.filter(user=request.user, is_active=True).exists()
        return False
    
    def get_user_role(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if obj.owner == request.user:
                return 'owner'
            membership = obj.memberships.filter(user=request.user, is_active=True).first()
            if membership:
                return membership.role
        return None
