"""Serializers for Learning app models"""
from rest_framework import serializers
from .models import (
    CareerPath, LearningModule, Quiz, Question,
    QuestionChoice, UserProgress, QuizAttempt, Answer, Certificate,
    Enrollment, ModuleProgress
)


class CareerPathSerializer(serializers.ModelSerializer):
    """Serializer for CareerPath model"""
    total_modules = serializers.SerializerMethodField()
    enrolled_count = serializers.SerializerMethodField()
    certificate_template_url = serializers.SerializerMethodField()
    
    class Meta:
        model = CareerPath
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    # Both counts prefer an annotation supplied by the viewset. Doing them
    # per-object issued one query each, per row — on a remote database where a
    # round-trip costs ~250 ms, nine career paths meant ~20 extra queries and
    # several seconds for a 7 KB response. The fallbacks keep the serializer
    # correct when it is used outside the annotated queryset (detail routes,
    # nested use), just slower.
    def get_total_modules(self, obj):
        annotated = getattr(obj, 'modules_total', None)
        return annotated if annotated is not None else obj.modules.count()

    def get_enrolled_count(self, obj):
        annotated = getattr(obj, 'enrolled_total', None)
        if annotated is not None:
            return annotated
        return UserProgress.objects.filter(career_path=obj).values('user').distinct().count()
    
    def get_certificate_template_url(self, obj):
        """Get the full URL for the certificate template"""
        if obj.certificate_template:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.certificate_template.url)
            return obj.certificate_template.url if hasattr(obj.certificate_template, 'url') else None
        return None


class LearningModuleSerializer(serializers.ModelSerializer):
    """Serializer for LearningModule model"""
    career_path_name = serializers.CharField(source='career_path.name', read_only=True)
    quiz_count = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()
    
    class Meta:
        model = LearningModule
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_quiz_count(self, obj):
        # Prefer the viewset's annotation; see CareerPathSerializer above.
        annotated = getattr(obj, 'quiz_total', None)
        return annotated if annotated is not None else obj.quizzes.count()
    
    def get_file_url(self, obj):
        """Get the full URL for the file"""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url if hasattr(obj.file, 'url') else None
        return None
    
    def get_file_name(self, obj):
        """Get the file name"""
        if obj.file:
            return obj.file.name.split('/')[-1] if hasattr(obj.file, 'name') else None
        return None


class LearningModuleListSerializer(LearningModuleSerializer):
    """
    LearningModule without the `content` body, for list responses.

    `content` holds the full module body (slides/HTML) and was 88% of a 129 KB
    list response — over 100 KB that nothing on a list screen renders. Every
    consumer that actually needs it fetches the detail route first
    (/learning/modules/{id}/ and /learning/admin/modules/{id}/), so it is only
    ever transferred when it is about to be used.
    """
    class Meta(LearningModuleSerializer.Meta):
        exclude = ('content',)
        fields = None  # DRF rejects `fields` and `exclude` together


def may_see_answers(request):
    """Whether this request is allowed the answer key.

    Anything else - students, and anonymous callers, since quiz retrieve is
    IsAuthenticatedOrReadOnly - gets the student shape. Defaults to no when
    there is no request in the serializer context, so a new call site is safe
    by omission rather than by remembering.
    """
    user = getattr(request, 'user', None)
    if user is None or not user.is_authenticated:
        return False
    return user.is_staff or getattr(user, 'role', '') in ('instructor', 'admin')


class QuestionChoiceSerializer(serializers.ModelSerializer):
    """Full choice, including `is_correct`. Authoring only."""

    class Meta:
        model = QuestionChoice
        fields = '__all__'
        read_only_fields = ['id']


class StudentQuestionChoiceSerializer(serializers.ModelSerializer):
    """A choice as a student may see it: which one is right is not in here."""

    class Meta:
        model = QuestionChoice
        fields = ['id', 'question', 'choice_text', 'order']
        read_only_fields = fields


class QuestionSerializer(serializers.ModelSerializer):
    """Full question, including `correct_answer`. Authoring only."""
    choices = QuestionChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class StudentQuestionSerializer(serializers.ModelSerializer):
    """A question as a student may see it, before answering it.

    `correct_answer` and `explanation` are left out. Grading happens in
    QuizViewSet._check_answer against the database, so the client never needs
    them; serving them let anyone read the answer key out of the network tab.
    """
    choices = StudentQuestionChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = [
            'id', 'quiz', 'question_text', 'question_type', 'points', 'order',
            'choices', 'created_at', 'updated_at',
        ]
        read_only_fields = fields


class QuizSerializer(serializers.ModelSerializer):
    """Serializer for Quiz model"""
    questions = serializers.SerializerMethodField()
    module_title = serializers.CharField(source='learning_module.title', read_only=True)

    class Meta:
        model = Quiz
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_questions(self, quiz):
        # Chosen per request rather than per viewset: the same quiz is nested
        # into attempts and admin responses, and each of those would otherwise
        # need its own reminder not to leak.
        serializer = (
            QuestionSerializer if may_see_answers(self.context.get('request'))
            else StudentQuestionSerializer
        )
        return serializer(
            quiz.questions.all(), many=True, context=self.context,
        ).data


class QuizListSerializer(QuizSerializer):
    """
    Quiz without the `content` body, for list responses.

    Same reasoning as LearningModuleListSerializer: `content` was 93% of a
    126 KB list response. QuizTaking fetches /learning/quizzes/{id}/ before a
    student answers anything, so the body still arrives when it is needed.

    `questions` is kept — the list view shows question counts and the nested
    rows are already prefetched.
    """
    class Meta(QuizSerializer.Meta):
        exclude = ('content',)
        fields = None


class UserProgressSerializer(serializers.ModelSerializer):
    """Serializer for UserProgress model"""
    career_path = CareerPathSerializer(read_only=True)
    learning_module = LearningModuleSerializer(read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = UserProgress
        fields = '__all__'
        read_only_fields = ['id', 'started_at', 'completed_at', 'last_accessed_at']


class QuizAttemptSerializer(serializers.ModelSerializer):
    """Serializer for QuizAttempt model"""
    quiz = QuizSerializer(read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = QuizAttempt
        fields = '__all__'
        read_only_fields = ['id', 'started_at', 'submitted_at']


class AnswerSerializer(serializers.ModelSerializer):
    """Serializer for Answer model"""
    question = QuestionSerializer(read_only=True)
    
    class Meta:
        model = Answer
        fields = '__all__'
        read_only_fields = ['id']


class CertificateSerializer(serializers.ModelSerializer):
    """Serializer for Certificate model"""
    career_path = CareerPathSerializer(read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Certificate
        fields = '__all__'
        read_only_fields = ['id', 'certificate_id', 'issued_at']


class EnrollmentSerializer(serializers.ModelSerializer):
    """Serializer for Enrollment model"""
    career_path_name = serializers.CharField(source='career_path.name', read_only=True)
    career_path_details = CareerPathSerializer(source='career_path', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Enrollment
        fields = '__all__'
        read_only_fields = ['id', 'user', 'enrolled_at', 'completed_at', 'progress_percentage', 'status']


class ModuleProgressSerializer(serializers.ModelSerializer):
    """Serializer for ModuleProgress model"""
    module_title = serializers.CharField(source='module.title', read_only=True)
    module_details = LearningModuleSerializer(source='module', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = ModuleProgress
        fields = '__all__'
        read_only_fields = ['id', 'started_at', 'completed_at']


class AchievedSkillSerializer(serializers.ModelSerializer):
    """Serializer for AchievedSkill model — system-granted verified skills"""

    class Meta:
        from .models import AchievedSkill
        model = AchievedSkill
        fields = [
            'id', 'source_type', 'source_id', 'source_name',
            'skill_name', 'skill_category', 'proficiency_level',
            'earned_at', 'is_verified',
        ]
        read_only_fields = fields


class BadgeDefinitionSerializer(serializers.ModelSerializer):
    """Full badge definition — used in catalog views."""

    class Meta:
        from .models import BadgeDefinition
        model = BadgeDefinition
        fields = [
            'id', 'name', 'description', 'icon', 'category',
            'trigger_type', 'trigger_threshold', 'rarity', 'is_active',
        ]


class UserBadgeSerializer(serializers.ModelSerializer):
    """A badge earned by a specific user, with badge details nested."""
    badge = BadgeDefinitionSerializer(read_only=True)

    class Meta:
        from .models import UserBadge
        model = UserBadge
        fields = ['id', 'badge', 'earned_at', 'context_note']
        read_only_fields = fields


class LeaderboardUserSerializer(serializers.Serializer):
    """Minimal user info for leaderboard rows."""
    id = serializers.UUIDField()
    username = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    profile_picture = serializers.SerializerMethodField()
    program = serializers.SerializerMethodField()
    year_level = serializers.SerializerMethodField()

    def get_profile_picture(self, obj):
        return getattr(obj, 'profile_picture', None)

    def get_program(self, obj):
        return getattr(obj, 'program', '')

    def get_year_level(self, obj):
        return getattr(obj, 'year_level', '')


class LeaderboardEntrySerializer(serializers.ModelSerializer):
    """Full leaderboard row with user details and score breakdown."""
    user = serializers.SerializerMethodField()
    rank = serializers.IntegerField(read_only=True, default=0)
    is_me = serializers.SerializerMethodField()

    class Meta:
        from .models import LeaderboardSnapshot
        model = LeaderboardSnapshot
        fields = [
            'rank', 'user', 'total_points', 'weekly_points', 'monthly_points',
            'modules_completed', 'challenges_solved', 'paths_completed',
            'certificates_earned', 'badges_earned', 'last_updated', 'is_me',
        ]

    def get_user(self, obj):
        user = obj.user
        # Safely get profile_picture URL — FieldFile raises FileNotFoundError if file missing
        try:
            pic = getattr(user, 'profile_picture', None)
            pic_url = pic.url if pic and pic.name else None
        except Exception:
            pic_url = None
        return {
            'id': str(user.id),
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'profile_picture': pic_url,
            'program': getattr(user, 'program', ''),
            'year_level': getattr(user, 'year_level', ''),
        }

    def get_is_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.user_id == request.user.id
        return False



