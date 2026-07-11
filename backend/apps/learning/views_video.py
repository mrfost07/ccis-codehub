"""
Video Courses API — Views
YouTube-embedded video courses with progress tracking
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q

from apps.learning.models import VideoCourse, VideoLesson, VideoProgress


class VideoCourseViewSet(viewsets.ModelViewSet):
    """CRUD for video courses + lessons + progress"""
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'

    def get_queryset(self):
        qs = VideoCourse.objects.all()

        category = self.request.query_params.get('category')
        difficulty = self.request.query_params.get('difficulty')
        search = self.request.query_params.get('search')

        if category:
            qs = qs.filter(category=category)
        if difficulty:
            qs = qs.filter(difficulty=difficulty)
        if search:
            qs = qs.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        return qs.annotate(lessons_count=Count('lessons'))

    def create(self, request):
        """Create a new video course with lessons"""
        data = request.data
        try:
            course = VideoCourse.objects.create(
                title=data.get('title', ''),
                description=data.get('description', ''),
                instructor_name=data.get('instructor_name', ''),
                category=data.get('category', 'general'),
                difficulty=data.get('difficulty', 'beginner'),
                thumbnail_url=data.get('thumbnail_url', ''),
                is_published=True,
            )
            # Create lessons
            lessons = data.get('lessons', [])
            for i, lesson_data in enumerate(lessons):
                if lesson_data.get('title') and lesson_data.get('video_url'):
                    VideoLesson.objects.create(
                        course=course,
                        title=lesson_data['title'],
                        video_url=lesson_data['video_url'],
                        duration_minutes=int(lesson_data.get('duration_minutes', 0)),
                        order=i + 1,
                    )
            return Response({
                'id': str(course.id), 'slug': course.slug, 'title': course.title
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, slug=None):
        """Delete a video course"""
        course = get_object_or_404(VideoCourse, slug=slug)
        course.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def list(self, request):
        """List all published video courses with user progress"""
        queryset = self.get_queryset()
        user = request.user

        # Get user's completed lesson counts per course
        completed_map = {}
        progress_entries = VideoProgress.objects.filter(
            user=user, is_completed=True
        ).values('lesson__course_id').annotate(count=Count('id'))
        for entry in progress_entries:
            completed_map[str(entry['lesson__course_id'])] = entry['count']

        courses = []
        for c in queryset:
            lessons_count = c.lessons_count
            completed = completed_map.get(str(c.id), 0)
            progress = round(completed / lessons_count * 100) if lessons_count > 0 else 0

            courses.append({
                'id': str(c.id),
                'title': c.title,
                'slug': c.slug,
                'description': c.description,
                'thumbnail_url': c.thumbnail_url,
                'instructor_name': c.instructor_name,
                'category': c.category,
                'difficulty': c.difficulty,
                'total_duration_minutes': c.total_duration_minutes,
                'lessons_count': lessons_count,
                'is_featured': c.is_featured,
                'user_progress': progress,
                'completed_lessons': completed,
            })

        return Response(courses)

    def retrieve(self, request, slug=None):
        """Get course detail with lesson list and user progress"""
        course = get_object_or_404(VideoCourse, slug=slug, is_published=True)
        user = request.user

        lessons = course.lessons.all()
        completed_lesson_ids = set(
            VideoProgress.objects.filter(
                user=user, is_completed=True,
                lesson__course=course
            ).values_list('lesson_id', flat=True)
        )

        lesson_data = []
        for lesson in lessons:
            progress = VideoProgress.objects.filter(user=user, lesson=lesson).first()
            lesson_data.append({
                'id': str(lesson.id),
                'title': lesson.title,
                'description': lesson.description,
                'video_url': lesson.video_url,
                'duration_minutes': lesson.duration_minutes,
                'order': lesson.order,
                'is_free': lesson.is_free,
                'is_completed': lesson.id in completed_lesson_ids,
                'watched_seconds': progress.watched_seconds if progress else 0,
            })

        total = len(lessons)
        completed = len(completed_lesson_ids)

        return Response({
            'id': str(course.id),
            'title': course.title,
            'slug': course.slug,
            'description': course.description,
            'thumbnail_url': course.thumbnail_url,
            'instructor_name': course.instructor_name,
            'category': course.category,
            'difficulty': course.difficulty,
            'total_duration_minutes': course.total_duration_minutes,
            'is_featured': course.is_featured,
            'lessons': lesson_data,
            'lessons_count': total,
            'completed_lessons': completed,
            'progress': round(completed / total * 100) if total > 0 else 0,
        })

    @action(detail=True, methods=['post'], url_path='progress')
    def update_progress(self, request, slug=None):
        """Update watch progress for a lesson"""
        course = get_object_or_404(VideoCourse, slug=slug, is_published=True)
        lesson_id = request.data.get('lesson_id')
        watched_seconds = request.data.get('watched_seconds', 0)
        is_completed = request.data.get('is_completed', False)

        lesson = get_object_or_404(VideoLesson, id=lesson_id, course=course)

        progress, created = VideoProgress.objects.update_or_create(
            user=request.user,
            lesson=lesson,
            defaults={
                'watched_seconds': watched_seconds,
                'is_completed': is_completed,
            }
        )

        return Response({
            'lesson_id': str(lesson.id),
            'watched_seconds': progress.watched_seconds,
            'is_completed': progress.is_completed,
        })
