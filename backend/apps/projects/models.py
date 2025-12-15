"""
Project Collaboration System Models
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils.text import slugify


class Team(models.Model):
    """Teams for organizing projects and members"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    leader = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='led_teams'
    )
    avatar = models.ImageField(upload_to='team_avatars/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Team.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name
    
    @property
    def member_count(self):
        return self.memberships.filter(status='accepted').count() + 1  # +1 for leader
    
    @property
    def project_count(self):
        return self.projects.count()


class TeamMembership(models.Model):
    """Team membership with invitation status"""
    
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('member', 'Member'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='team_memberships')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='member')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='sent_team_invites'
    )
    message = models.TextField(blank=True, help_text='Invitation message')
    invited_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['team', 'user']
        ordering = ['-invited_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.team.name} ({self.status})"


class Project(models.Model):
    """Projects for team collaboration"""
    
    PROJECT_TYPE_CHOICES = [
        ('web_application', 'Web Application'),
        ('mobile_app', 'Mobile App'),
        ('desktop_app', 'Desktop Application'),
        ('api', 'API'),
        ('data_science', 'Data Science'),
        ('machine_learning', 'Machine Learning'),
        ('game', 'Game'),
        ('other', 'Other'),
    ]
    
    PROGRAMMING_LANGUAGE_CHOICES = [
        ('python', 'Python'),
        ('javascript', 'JavaScript'),
        ('typescript', 'TypeScript'),
        ('java', 'Java'),
        ('csharp', 'C#'),
        ('cpp', 'C++'),
        ('php', 'PHP'),
        ('ruby', 'Ruby'),
        ('go', 'Go'),
        ('rust', 'Rust'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('planning', 'Planning'),
        ('in_progress', 'In Progress'),
        ('review', 'Review'),
        ('completed', 'Completed'),
        ('on_hold', 'On Hold'),
        ('cancelled', 'Cancelled'),
    ]
    
    VISIBILITY_CHOICES = [
        ('private', 'Private'),
        ('team', 'Team Only'),
        ('public', 'Public'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='projects', null=True, blank=True)
    is_snsu_ccis_project = models.BooleanField(default=False)
    course_related = models.BooleanField(default=False)
    course_code = models.CharField(max_length=50, blank=True, null=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_projects')
    project_type = models.CharField(max_length=30, choices=PROJECT_TYPE_CHOICES)
    programming_language = models.CharField(max_length=20, choices=PROGRAMMING_LANGUAGE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planning')
    visibility = models.CharField(max_length=10, choices=VISIBILITY_CHOICES, default='private')
    github_repo = models.URLField(blank=True, null=True)
    gitlab_repo = models.URLField(blank=True, null=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    deadline = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def get_team_members(self):
        """Get all accepted team members who can be assigned tasks"""
        if self.team:
            members = list(self.team.memberships.filter(status='accepted').values_list('user', flat=True))
            members.append(self.team.leader_id)
            return members
        return [self.owner_id]
    
    def is_team_leader(self, user):
        """Check if user is the team leader"""
        if self.team:
            return self.team.leader == user
        return self.owner == user
    
    class Meta:
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name


class ProjectMembership(models.Model):
    """Team members for projects"""
    
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('admin', 'Admin'),
        ('developer', 'Developer'),
        ('viewer', 'Viewer'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='project_memberships')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='developer')
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ['project', 'user']
        ordering = ['-joined_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.project.name} ({self.role})"


class ProjectTask(models.Model):
    """Tasks within projects"""
    
    STATUS_CHOICES = [
        ('todo', 'To Do'),
        ('in_progress', 'In Progress'),
        ('review', 'Review'),
        ('done', 'Done'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='todo')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    order = models.IntegerField(default=0, help_text='Order in Kanban board')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_tasks')
    
    class Meta:
        ordering = ['order', 'priority', '-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.project.name}"


class TaskLabel(models.Model):
    """Labels for tasks"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='labels')
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=7, default='#6366f1')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['project', 'name']
    
    def __str__(self):
        return self.name


class ProjectTag(models.Model):
    """Tags for projects"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name


class ProjectFile(models.Model):
    """Files uploaded to projects"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='files')
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    filename = models.CharField(max_length=255)
    file = models.FileField(upload_to='project_files/')
    file_type = models.CharField(max_length=50)
    file_size = models.IntegerField()
    version = models.IntegerField(default=1)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.filename} - {self.project.name}"


class CodeReview(models.Model):
    """Code review requests"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_review', 'In Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('changes_requested', 'Changes Requested'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='code_reviews')
    requester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='review_requests')
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='code_reviews')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    code_snippet = models.TextField()
    review_notes = models.TextField(blank=True)
    ai_analysis = models.TextField(blank=True, help_text='AI analysis of the code')
    requested_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-requested_at']
    
    def __str__(self):
        return f"Review: {self.requester.username} - {self.project.name}"


class ReviewComment(models.Model):
    """Comments on code reviews"""
    
    COMMENT_TYPE_CHOICES = [
        ('suggestion', 'Suggestion'),
        ('issue', 'Issue'),
        ('question', 'Question'),
        ('praise', 'Praise'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code_review = models.ForeignKey(CodeReview, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    line_number = models.IntegerField(null=True, blank=True)
    comment_text = models.TextField()
    comment_type = models.CharField(max_length=20, choices=COMMENT_TYPE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['line_number', 'created_at']
    
    def __str__(self):
        return f"Comment by {self.author.username} on {self.code_review}"


class ProjectActivity(models.Model):
    """Activity log for projects"""
    
    ACTIVITY_TYPE_CHOICES = [
        ('created', 'Project Created'),
        ('updated', 'Project Updated'),
        ('member_added', 'Member Added'),
        ('member_removed', 'Member Removed'),
        ('task_created', 'Task Created'),
        ('task_updated', 'Task Updated'),
        ('task_completed', 'Task Completed'),
        ('file_uploaded', 'File Uploaded'),
        ('review_requested', 'Review Requested'),
        ('review_completed', 'Review Completed'),
        ('branch_created', 'Branch Created'),
        ('commit_made', 'Commit Made'),
        ('pr_created', 'Pull Request Created'),
        ('pr_merged', 'Pull Request Merged'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='activities')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPE_CHOICES)
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Project activities'
    
    def __str__(self):
        return f"{self.activity_type} - {self.project.name} by {self.user.username}"


class TeamInvitation(models.Model):
    """Team invitations - recruit followers to join projects"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('expired', 'Expired'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='invitations')
    inviter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_project_invitations')
    invitee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_project_invitations')
    role = models.CharField(max_length=10, choices=ProjectMembership.ROLE_CHOICES, default='developer')
    message = models.TextField(blank=True, help_text='Personal message with the invitation')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['project', 'invitee']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Invite {self.invitee.username} to {self.project.name}"


class TaskComment(models.Model):
    """Comments on tasks"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(ProjectTask, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.author.username} on {self.task.title}"


# ============== Mini Git Repository Models ==============

class ProjectBranch(models.Model):
    """Git-like branches for projects"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='branches')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_default = models.BooleanField(default=False)
    is_protected = models.BooleanField(default=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['project', 'name']
        ordering = ['-is_default', 'name']
    
    def __str__(self):
        return f"{self.project.name}/{self.name}"


class ProjectCommit(models.Model):
    """Git-like commits for projects"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='commits')
    branch = models.ForeignKey(ProjectBranch, on_delete=models.CASCADE, related_name='commits')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    message = models.TextField()
    short_hash = models.CharField(max_length=7, blank=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')
    files_changed = models.IntegerField(default=0)
    additions = models.IntegerField(default=0)
    deletions = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if not self.short_hash:
            self.short_hash = str(self.id)[:7] if self.id else ''
        super().save(*args, **kwargs)
        if not self.short_hash:
            self.short_hash = str(self.id)[:7]
            super().save(update_fields=['short_hash'])
    
    def __str__(self):
        return f"{self.short_hash}: {self.message[:50]}"


class CommitFile(models.Model):
    """Files changed in a commit"""
    
    CHANGE_TYPE_CHOICES = [
        ('added', 'Added'),
        ('modified', 'Modified'),
        ('deleted', 'Deleted'),
        ('renamed', 'Renamed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    commit = models.ForeignKey(ProjectCommit, on_delete=models.CASCADE, related_name='changed_files')
    filename = models.CharField(max_length=500)
    change_type = models.CharField(max_length=10, choices=CHANGE_TYPE_CHOICES)
    content = models.TextField(blank=True, help_text='File content after change')
    previous_content = models.TextField(blank=True, help_text='File content before change')
    additions = models.IntegerField(default=0)
    deletions = models.IntegerField(default=0)
    
    def __str__(self):
        return f"{self.change_type}: {self.filename}"


class PullRequest(models.Model):
    """Pull requests for merging branches"""
    
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('merged', 'Merged'),
        ('closed', 'Closed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='pull_requests')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    source_branch = models.ForeignKey(ProjectBranch, on_delete=models.CASCADE, related_name='outgoing_prs')
    target_branch = models.ForeignKey(ProjectBranch, on_delete=models.CASCADE, related_name='incoming_prs')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_prs')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='open')
    merged_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='merged_prs')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    merged_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"PR #{str(self.id)[:4]}: {self.title}"


class PRComment(models.Model):
    """Comments on pull requests"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pull_request = models.ForeignKey(PullRequest, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.author.username}"


class PRReviewer(models.Model):
    """Reviewers assigned to pull requests"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('changes_requested', 'Changes Requested'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pull_request = models.ForeignKey(PullRequest, on_delete=models.CASCADE, related_name='reviewers')
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['pull_request', 'reviewer']
    
    def __str__(self):
        return f"{self.reviewer.username} - {self.status}"


class ProjectNotification(models.Model):
    """Notifications for project and task updates"""
    
    NOTIFICATION_TYPES = [
        ('team_invite', 'Team Invitation'),
        ('team_invite_accepted', 'Team Invite Accepted'),
        ('project_created', 'Project Created'),
        ('task_assigned', 'Task Assigned'),
        ('task_updated', 'Task Updated'),
        ('task_status_changed', 'Task Status Changed'),
        ('task_completed', 'Task Completed'),
        ('task_comment', 'Task Comment'),
        ('pr_created', 'Pull Request Created'),
        ('pr_merged', 'Pull Request Merged'),
        ('pr_comment', 'PR Comment'),
        ('mention', 'Mentioned'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='project_notifications'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='sent_project_notifications',
        null=True, blank=True
    )
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    
    # Related objects (nullable for flexibility)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, null=True, blank=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True, blank=True)
    task = models.ForeignKey(ProjectTask, on_delete=models.CASCADE, null=True, blank=True)
    
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.notification_type} for {self.recipient.username}"
    
    @classmethod
    def notify_task_update(cls, task, sender, notification_type, message):
        """Send notification to task assignee and project team"""
        recipients = set()
        
        # Notify task assignee
        if task.assigned_to and task.assigned_to != sender:
            recipients.add(task.assigned_to)
        
        # Notify project owner/team leader
        project = task.project
        if project.team and project.team.leader != sender:
            recipients.add(project.team.leader)
        elif project.owner != sender:
            recipients.add(project.owner)
        
        for recipient in recipients:
            cls.objects.create(
                recipient=recipient,
                sender=sender,
                notification_type=notification_type,
                title=f"Task Update: {task.title}",
                message=message,
                project=project,
                task=task
            )
    
    @classmethod
    def notify_team_members(cls, team, sender, notification_type, title, message, project=None):
        """Send notification to all team members"""
        members = team.memberships.filter(status='accepted').exclude(user=sender)
        
        for membership in members:
            cls.objects.create(
                recipient=membership.user,
                sender=sender,
                notification_type=notification_type,
                title=title,
                message=message,
                team=team,
                project=project
            )
        
        # Also notify leader if not sender
        if team.leader != sender:
            cls.objects.create(
                recipient=team.leader,
                sender=sender,
                notification_type=notification_type,
                title=title,
                message=message,
                team=team,
                project=project
            )
