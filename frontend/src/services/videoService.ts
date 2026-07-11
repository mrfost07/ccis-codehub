/**
 * Video Courses API Service
 * YouTube-embedded video courses with progress tracking
 */
import api from './api'

export interface VideoCourse {
    id: string
    title: string
    slug: string
    description: string
    thumbnail_url: string
    instructor_name: string
    category: string
    difficulty: string
    total_duration_minutes: number
    lessons_count: number
    is_featured: boolean
    user_progress: number
    completed_lessons: number
}

export interface VideoLesson {
    id: string
    title: string
    description: string
    video_url: string
    duration_minutes: number
    order: number
    is_free: boolean
    is_completed: boolean
    watched_seconds: number
}

export interface VideoCourseDetail extends VideoCourse {
    lessons: VideoLesson[]
    progress: number
}

class VideoService {
    private baseUrl = '/learning/video-courses'

    async getCourses(params?: {
        category?: string
        difficulty?: string
        search?: string
    }): Promise<VideoCourse[]> {
        const response = await api.get(`${this.baseUrl}/`, { params })
        return response.data
    }

    async getCourse(slug: string): Promise<VideoCourseDetail> {
        const response = await api.get(`${this.baseUrl}/${slug}/`)
        return response.data
    }

    async updateProgress(courseSlug: string, lessonId: string, watchedSeconds: number, isCompleted: boolean): Promise<any> {
        const response = await api.post(`${this.baseUrl}/${courseSlug}/progress/`, {
            lesson_id: lessonId,
            watched_seconds: watchedSeconds,
            is_completed: isCompleted,
        })
        return response.data
    }
}

export default new VideoService()
