/**
 * Coding Challenges API Service
 * LeetCode-style coding challenges
 */
import api from './api'

export interface CodingChallenge {
    id: string
    title: string
    slug: string
    description: string
    difficulty: 'easy' | 'medium' | 'hard'
    category: string
    tags: string[]
    supported_languages: string[]
    starter_code: Record<string, string>
    test_cases: { input: string; expected_output: string }[]
    constraints: string
    hints: string[]
    points: number
    time_limit_seconds: number
    acceptance_rate: number
    total_attempts: number
    total_solved: number
    user_status?: 'solved' | 'attempted' | 'not_started'
}

export interface CodingSubmissionResult {
    submission_id: string
    status: 'accepted' | 'wrong_answer' | 'partial' | 'error' | 'timeout'
    passed_tests: number
    total_tests: number
    points_earned: number
    execution_time_ms: number
    badges_earned?: string[]
    results: {
        test_case_index: number
        passed: boolean
        stdout?: string
        stderr?: string
        expected?: string
        error?: string
        is_hidden?: boolean
    }[]
}

export interface CodingStats {
    solved: number
    total_challenges: number
    total_submissions: number
    total_points: number
    easy_solved: number
    medium_solved: number
    hard_solved: number
}

export interface SubmissionHistory {
    id: string
    language: string
    status: string
    passed_tests: number
    total_tests: number
    execution_time_ms: number
    points_earned: number
    submitted_at: string
}

class CodingService {
    private baseUrl = '/learning/challenges'

    async getChallenges(params?: {
        difficulty?: string
        category?: string
        search?: string
    }): Promise<CodingChallenge[]> {
        const response = await api.get(`${this.baseUrl}/`, { params })
        return response.data
    }

    async getChallenge(slug: string): Promise<CodingChallenge> {
        const response = await api.get(`${this.baseUrl}/${slug}/`)
        return response.data
    }

    async runCode(slug: string, code: string, language: string): Promise<{
        status: string; passed: number; total: number;
        results: CodingSubmissionResult['results']
    }> {
        const response = await api.post(`${this.baseUrl}/${slug}/run/`, { code, language })
        return response.data
    }

    async submitCode(slug: string, code: string, language: string): Promise<CodingSubmissionResult> {
        const response = await api.post(`${this.baseUrl}/${slug}/submit/`, {
            code,
            language,
        })
        return response.data
    }

    async getSubmissions(slug: string): Promise<SubmissionHistory[]> {
        const response = await api.get(`${this.baseUrl}/${slug}/submissions/`)
        return response.data
    }

    async getStats(): Promise<CodingStats> {
        const response = await api.get(`${this.baseUrl}/stats/`)
        return response.data
    }

    async runCustom(slug: string, code: string, language: string, customInput: string): Promise<{
        stdout: string
        stderr: string
        error: string | null
        execution_time_ms: number
        timed_out: boolean
    }> {
        const response = await api.post(`${this.baseUrl}/${slug}/run-custom/`, {
            code,
            language,
            custom_input: customInput,
        })
        return response.data
    }
}

export default new CodingService()
