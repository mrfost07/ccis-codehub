/**
 * Live Quiz API Service
 * Handles all API calls for live quiz management
 */
import api from './api'

// Types
export interface LiveQuiz {
    id: string
    instructor: string
    instructor_name: string
    title: string
    description: string
    creation_method: 'manual' | 'pdf' | 'ai'
    source_file?: string
    ai_prompt_text?: string
    is_active: boolean
    join_code: string
    max_participants: number
    auto_advance_questions: boolean
    show_leaderboard: boolean
    show_correct_answers: boolean
    allow_late_join: boolean
    shuffle_questions: boolean
    shuffle_answers: boolean
    require_fullscreen: boolean
    auto_pause_on_exit: boolean
    max_violations: number
    violation_penalty_points: number
    // Phase 2: Anti-cheat action configuration
    fullscreen_exit_action: 'warn' | 'pause' | 'close'
    alt_tab_action: 'warn' | 'shuffle' | 'close'
    enable_ai_proctor: boolean
    enable_code_execution: boolean
    default_question_time: number
    break_between_questions: number
    // Scheduling fields
    scheduled_start?: string
    deadline?: string
    max_retakes: number
    time_limit_minutes?: number
    status_text: string
    is_open: boolean
    // Timestamps
    created_at: string
    updated_at: string
    started_at?: string
    ended_at?: string
    questions_count: number
    questions?: LiveQuizQuestion[]
}

export interface LiveQuizQuestion {
    id: string
    quiz: string
    question_text: string
    question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'coding'
    order: number
    image_url?: string
    option_a?: string
    option_b?: string
    option_c?: string
    option_d?: string
    correct_answer: string
    explanation?: string
    programming_language?: string
    starter_code?: string
    test_cases?: string
    solution_code?: string
    points: number
    time_limit: number
    time_bonus_enabled: boolean
    created_at: string
    updated_at: string
}

export interface LiveQuizSession {
    id: string
    quiz: string
    quiz_info?: LiveQuiz
    status: 'lobby' | 'in_progress' | 'ended'
    current_question?: string
    current_question_info?: LiveQuizQuestion
    current_question_started_at?: string
    total_participants: number
    active_participants: number
    total_questions_shown: number
    created_at: string
    updated_at: string
    participants?: LiveQuizParticipant[]
}

export interface LiveQuizParticipant {
    id: string
    session: string
    student?: string
    student_info?: any
    nickname: string
    total_score: number
    total_correct: number
    total_attempted: number
    average_response_time: number
    rank: number
    fullscreen_violations: number
    tab_switch_count: number
    copy_paste_attempts: number
    is_flagged: boolean
    is_paused: boolean
    pause_reason?: string
    is_active: boolean
    joined_at: string
    left_at?: string
    last_seen: string
}

export interface CreateLiveQuizData {
    title: string
    description?: string
    max_participants?: number
    default_question_time?: number
    show_leaderboard?: boolean
    show_correct_answers?: boolean
    require_fullscreen?: boolean
    allow_late_join?: boolean
    shuffle_questions?: boolean
    shuffle_answers?: boolean
    auto_pause_on_exit?: boolean
    max_violations?: number
    violation_penalty_points?: number
    // Scheduling fields
    scheduled_start?: string   // ISO datetime string
    deadline?: string          // ISO datetime string
    max_retakes?: number       // 0 = unlimited
    time_limit_minutes?: number
}

export interface CreateQuestionData {
    question_text: string
    question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'coding'
    order: number
    option_a?: string
    option_b?: string
    option_c?: string
    option_d?: string
    correct_answer: string
    explanation?: string
    points?: number
    time_limit?: number
    time_bonus_enabled?: boolean
}

// API Functions
class LiveQuizService {
    private baseUrl = '/learning/live-quiz'

    // Quiz CRUD
    async getQuizzes(): Promise<LiveQuiz[]> {
        const response = await api.get(this.baseUrl + '/')
        return response.data.results || response.data
    }

    async getQuiz(id: string): Promise<LiveQuiz> {
        const response = await api.get(`${this.baseUrl}/${id}/`)
        return response.data
    }

    async createQuiz(data: CreateLiveQuizData): Promise<LiveQuiz> {
        const response = await api.post(this.baseUrl + '/', {
            ...data,
            creation_method: 'manual'
        })
        return response.data
    }

    async updateQuiz(id: string, data: Partial<CreateLiveQuizData>): Promise<LiveQuiz> {
        const response = await api.patch(`${this.baseUrl}/${id}/`, data)
        return response.data
    }

    async deleteQuiz(id: string): Promise<void> {
        await api.delete(`${this.baseUrl}/${id}/`)
    }

    // Quiz Actions
    async startQuiz(id: string): Promise<LiveQuizSession> {
        const response = await api.post(`${this.baseUrl}/${id}/start/`)
        return response.data
    }

    async endQuiz(id: string): Promise<any> {
        const response = await api.post(`${this.baseUrl}/${id}/end/`)
        return response.data
    }

    async joinByCode(joinCode: string, nickname: string): Promise<any> {
        const response = await api.post(`${this.baseUrl}/join_by_code/`, {
            join_code: joinCode,
            nickname: nickname
        })
        return response.data
    }

    async getQuizInfo(joinCode: string): Promise<any> {
        const response = await api.get(`${this.baseUrl}/join_info/?join_code=${joinCode}`)
        return response.data
    }

    // Questions
    async getQuestions(quizId: string): Promise<LiveQuizQuestion[]> {
        const response = await api.get('/learning/live-quiz-questions/', {
            params: { quiz_id: quizId }
        })
        return response.data.results || response.data
    }

    async createQuestion(quizId: string, data: CreateQuestionData): Promise<LiveQuizQuestion> {
        const response = await api.post('/learning/live-quiz-questions/', {
            ...data,
            quiz: quizId
        })
        return response.data
    }

    async updateQuestion(id: string, data: Partial<CreateQuestionData>): Promise<LiveQuizQuestion> {
        const response = await api.patch(`/learning/live-quiz-questions/${id}/`, data)
        return response.data
    }

    async deleteQuestion(id: string): Promise<void> {
        await api.delete(`/learning/live-quiz-questions/${id}/`)
    }

    // Sessions
    async getSession(id: string): Promise<LiveQuizSession> {
        const response = await api.get(`/learning/live-quiz-sessions/${id}/`)
        return response.data
    }

    async getLeaderboard(sessionId: string): Promise<any> {
        const response = await api.get(`/learning/live-quiz-sessions/${sessionId}/leaderboard/`)
        return response.data
    }

    async nextQuestion(sessionId: string): Promise<LiveQuizSession> {
        const response = await api.post(`/learning/live-quiz-sessions/${sessionId}/next_question/`)
        return response.data
    }

    // Responses
    async submitResponse(data: {
        participant_id: string
        question_id: string
        answer_text?: string
        code_submission?: string
        response_time_seconds: number
    }): Promise<any> {
        const response = await api.post('/learning/live-quiz-responses/', data)
        return response.data
    }

    // Analytics
    async getFinalOverview(quizId: string): Promise<any> {
        const response = await api.get(`${this.baseUrl}/${quizId}/final_overview/`)
        return response.data
    }
}

export default new LiveQuizService()
