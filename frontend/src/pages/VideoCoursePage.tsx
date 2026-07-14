import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    ArrowLeft, Play, CheckCircle, Clock, ChevronRight, Loader2, BookOpen, ExternalLink
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import Navbar from '../components/Navbar'
import videoService, { VideoCourseDetail, VideoLesson } from '../services/videoService'

function getYouTubeEmbedUrl(url: string): string {
    // Convert YouTube URLs to embed format
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ]
    for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) return `https://www.youtube.com/embed/${match[1]}`
    }
    // If already an embed or unknown format, return as-is
    return url
}

export default function VideoCoursePage() {
    const { slug } = useParams<{ slug: string }>()
    const navigate = useNavigate()

    const [course, setCourse] = useState<VideoCourseDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeLesson, setActiveLesson] = useState<VideoLesson | null>(null)
    const [sidebarOpen, setSidebarOpen] = useState(true)

    useEffect(() => {
        if (slug) loadCourse(slug)
    }, [slug])

    const loadCourse = async (s: string) => {
        try {
            setLoading(true)
            const data = await videoService.getCourse(s)
            setCourse(data)
            // Auto-select first incomplete or first lesson
            const firstIncomplete = data.lessons.find(l => !l.is_completed)
            setActiveLesson(firstIncomplete || data.lessons[0] || null)
        } catch (error) {
            toast.error('Course not found')
            navigate('/learning')
        } finally {
            setLoading(false)
        }
    }

    const handleMarkComplete = useCallback(async () => {
        if (!slug || !activeLesson || !course) return
        try {
            await videoService.updateProgress(slug, activeLesson.id, activeLesson.duration_minutes * 60, true)
            // Update local state
            const updatedLessons = course.lessons.map(l =>
                l.id === activeLesson.id ? { ...l, is_completed: true } : l
            )
            const completed = updatedLessons.filter(l => l.is_completed).length
            setCourse({
                ...course,
                lessons: updatedLessons,
                completed_lessons: completed,
                progress: Math.round(completed / updatedLessons.length * 100),
            })
            setActiveLesson({ ...activeLesson, is_completed: true })
            toast.success('Lesson marked as complete!')

            // Auto-advance to next lesson
            const currentIdx = updatedLessons.findIndex(l => l.id === activeLesson.id)
            if (currentIdx < updatedLessons.length - 1) {
                setTimeout(() => setActiveLesson(updatedLessons[currentIdx + 1]), 1000)
            }
        } catch (error) {
            toast.error('Failed to update progress')
        }
    }, [slug, activeLesson, course])

    const getDifficultyColor = (d: string) => {
        if (d === 'beginner') return 'text-green-400 bg-green-500/15'
        if (d === 'intermediate') return 'text-amber-400 bg-amber-500/15'
        return 'text-red-400 bg-red-500/15'
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
            </div>
        )
    }

    if (!course) return null

    return (
        <div className="min-h-screen bg-neutral-950 flex flex-col pb-24 sm:pb-0">
            <Navbar />

            {/* Top Bar */}
            <div className="bg-neutral-900/80 border-b border-neutral-800/50 px-4 py-2 flex items-center gap-3">
                <button
                    onClick={() => navigate('/learning')}
                    className="text-neutral-400 hover:text-white transition p-1"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-white font-semibold text-sm sm:text-base truncate">{course.title}</h1>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                        <span>{course.instructor_name}</span>
                        <span>•</span>
                        <span>{course.lessons_count} lessons</span>
                        <span>•</span>
                        <span>{course.progress}% complete</span>
                    </div>
                </div>

                {/* Progress Ring */}
                <div className="relative w-10 h-10 flex-shrink-0">
                    <svg className="w-10 h-10 transform -rotate-90">
                        <circle cx="20" cy="20" r="16" fill="none" stroke="#1e293b" strokeWidth="3" />
                        <circle
                            cx="20" cy="20" r="16" fill="none" stroke="#8b5cf6" strokeWidth="3"
                            strokeDasharray={`${course.progress * 1.005} 100.5`}
                            strokeLinecap="round"
                        />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold">
                        {course.progress}%
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Lesson Sidebar */}
                <div className={`${sidebarOpen ? 'w-full lg:w-80' : 'w-0'} border-b lg:border-b-0 lg:border-r border-neutral-800/50 overflow-y-auto bg-neutral-950 transition-all flex-shrink-0`}>
                    <div className="p-3 border-b border-neutral-800/50 bg-neutral-900/50">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-purple-400" />
                            Course Content
                        </h3>
                        <p className="text-[10px] text-neutral-500 mt-0.5">
                            {course.completed_lessons}/{course.lessons_count} lessons completed
                        </p>
                    </div>
                    <div className="divide-y divide-neutral-800/30">
                        {course.lessons.map((lesson, idx) => (
                            <button
                                key={lesson.id}
                                onClick={() => setActiveLesson(lesson)}
                                className={`w-full text-left p-3 flex items-start gap-3 transition hover:bg-neutral-900/60 ${
                                    activeLesson?.id === lesson.id ? 'bg-purple-500/10 border-l-2 border-purple-500' : ''
                                }`}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5 ${
                                    lesson.is_completed
                                        ? 'bg-green-500/20 text-green-400'
                                        : activeLesson?.id === lesson.id
                                            ? 'bg-purple-500/20 text-purple-400'
                                            : 'bg-neutral-800/50 text-neutral-500'
                                }`}>
                                    {lesson.is_completed ? <CheckCircle className="w-3.5 h-3.5" /> : idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm truncate ${
                                        activeLesson?.id === lesson.id ? 'text-white font-medium' : 'text-neutral-400'
                                    }`}>
                                        {lesson.title}
                                    </p>
                                    <p className="text-[10px] text-neutral-600 flex items-center gap-1 mt-0.5">
                                        <Clock className="w-3 h-3" /> {lesson.duration_minutes} min
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Video Player */}
                <div className="flex-1 flex flex-col overflow-y-auto">
                    {activeLesson ? (
                        <>
                            {/* Video Embed */}
                            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                                <iframe
                                    src={getYouTubeEmbedUrl(activeLesson.video_url)}
                                    className="absolute inset-0 w-full h-full"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>

                            {/* Lesson Info */}
                            <div className="p-4 sm:p-6 space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold text-white">{activeLesson.title}</h2>
                                        {activeLesson.description && (
                                            <p className="text-sm text-neutral-400 mt-1">{activeLesson.description}</p>
                                        )}
                                    </div>
                                    {!activeLesson.is_completed && (
                                        <button
                                            onClick={handleMarkComplete}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-600 hover:from-purple-500 hover:to-purple-500 text-white text-sm font-medium rounded-lg transition flex-shrink-0"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Mark Complete
                                        </button>
                                    )}
                                    {activeLesson.is_completed && (
                                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-400 text-sm rounded-lg border border-green-500/30 flex-shrink-0">
                                            <CheckCircle className="w-4 h-4" /> Completed
                                        </span>
                                    )}
                                </div>

                                {/* Next Lesson Button */}
                                {(() => {
                                    const currentIdx = course.lessons.findIndex(l => l.id === activeLesson.id)
                                    const nextLesson = currentIdx < course.lessons.length - 1 ? course.lessons[currentIdx + 1] : null
                                    if (!nextLesson) return null
                                    return (
                                        <button
                                            onClick={() => setActiveLesson(nextLesson)}
                                            className="w-full flex items-center justify-between p-3 bg-neutral-900/60 border border-neutral-800/50 rounded-xl hover:bg-neutral-900/80 transition group"
                                        >
                                            <div className="text-left">
                                                <div className="text-[10px] text-neutral-600 uppercase">Next Lesson</div>
                                                <div className="text-sm text-neutral-300 group-hover:text-white transition">{nextLesson.title}</div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-white transition" />
                                        </button>
                                    )
                                })()}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
                            Select a lesson to start watching
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
