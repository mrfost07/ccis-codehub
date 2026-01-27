/**
 * Feature Flags Panel Component
 * 
 * Toggle feature flags with minimal, clean design
 */

import { useState, useEffect } from 'react'
import {
    ToggleLeft, ToggleRight,
    Users, BarChart, Bot, Code, Trophy,
    FolderGit, MessageSquare, BookOpen, Clock
} from 'lucide-react'
import api from '../../../services/api'
import settingsService from '../../../services/settingsService'
import toast from 'react-hot-toast'

interface FeatureFlag {
    key: string
    label: string
    description: string
    icon: React.ReactNode
    enabled: boolean
}

export default function FeatureFlagsPanel() {
    const [flags, setFlags] = useState<FeatureFlag[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState<string | null>(null)
    const [lastUpdated, setLastUpdated] = useState<{ by: string; at: string } | null>(null)

    useEffect(() => {
        loadFlags()
    }, [])

    const loadFlags = async () => {
        try {
            const response = await api.get('/settings/')
            const features = response.data.features || {}

            setFlags([
                {
                    key: 'enable_user_delete',
                    label: 'User Delete',
                    description: 'Allow admins to delete user accounts',
                    icon: <Users className="w-5 h-5" />,
                    enabled: features.user_delete || false
                },
                {
                    key: 'enable_analytics',
                    label: 'Analytics',
                    description: 'Enable analytics dashboard and metrics',
                    icon: <BarChart className="w-5 h-5" />,
                    enabled: features.analytics !== false
                },
                {
                    key: 'enable_ai_mentor',
                    label: 'AI Mentor',
                    description: 'Enable AI-powered coding mentor',
                    icon: <Bot className="w-5 h-5" />,
                    enabled: features.ai_mentor !== false
                },
                {
                    key: 'enable_code_editor',
                    label: 'Code Editor',
                    description: 'Enable integrated code editor',
                    icon: <Code className="w-5 h-5" />,
                    enabled: features.code_editor !== false
                },
                {
                    key: 'enable_competitions',
                    label: 'Competitions',
                    description: 'Enable coding competitions feature',
                    icon: <Trophy className="w-5 h-5" />,
                    enabled: features.competitions !== false
                },
                {
                    key: 'enable_projects',
                    label: 'Projects',
                    description: 'Enable projects showcase feature',
                    icon: <FolderGit className="w-5 h-5" />,
                    enabled: features.projects !== false
                },
                {
                    key: 'enable_community',
                    label: 'Community',
                    description: 'Enable community discussions',
                    icon: <MessageSquare className="w-5 h-5" />,
                    enabled: features.community !== false
                },
                {
                    key: 'enable_learning_paths',
                    label: 'Learning Paths',
                    description: 'Enable structured learning paths',
                    icon: <BookOpen className="w-5 h-5" />,
                    enabled: features.learning_paths !== false
                }
            ])

            setLoading(false)
        } catch (error) {
            console.error('Failed to load feature flags:', error)
            toast.error('Failed to load settings')
            setLoading(false)
        }
    }

    const toggleFlag = async (flag: FeatureFlag) => {
        const previousValue = flag.enabled
        setUpdating(flag.key)

        // Optimistic update
        setFlags(prev => prev.map(f =>
            f.key === flag.key ? { ...f, enabled: !f.enabled } : f
        ))

        try {
            const response = await api.put('/settings/', {
                [flag.key]: !flag.enabled
            })

            if (response.data.success) {
                setLastUpdated({
                    by: response.data.updated_by,
                    at: new Date(response.data.updated_at).toLocaleString()
                })

                // Invalidate settings cache
                settingsService.clearCache()

                toast.success(`${flag.label} ${!flag.enabled ? 'enabled' : 'disabled'}`)
            }
        } catch (error: any) {
            // Revert on error
            setFlags(prev => prev.map(f =>
                f.key === flag.key ? { ...f, enabled: previousValue } : f
            ))

            toast.error(error.response?.data?.error || 'Failed to update setting')
            console.error('Failed to toggle flag:', error)
        } finally {
            setUpdating(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-slate-400">Loading settings...</div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white">Feature Flags</h3>
                    <p className="text-sm text-slate-400 mt-1">
                        Toggle features on or off without rebuilding
                    </p>
                </div>

                {lastUpdated && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Updated by {lastUpdated.by} at {lastUpdated.at}</span>
                    </div>
                )}
            </div>

            {/* Flags Grid */}
            <div className="grid gap-3 sm:grid-cols-2">
                {flags.map((flag) => (
                    <button
                        key={flag.key}
                        onClick={() => toggleFlag(flag)}
                        disabled={updating === flag.key}
                        className="group relative flex items-start gap-4 p-4 bg-slate-900/30 hover:bg-slate-900/50 border border-slate-700/50 rounded-xl transition-all text-left disabled:opacity-50"
                    >
                        {/* Icon */}
                        <div className={`p-2.5 rounded-lg transition-colors ${flag.enabled
                                ? 'bg-purple-500/10 text-purple-400'
                                : 'bg-slate-700/50 text-slate-500'
                            }`}>
                            {flag.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <h4 className="font-medium text-white">{flag.label}</h4>
                                {flag.enabled ? (
                                    <ToggleRight className="w-5 h-5 text-purple-400 flex-shrink-0" />
                                ) : (
                                    <ToggleLeft className="w-5 h-5 text-slate-600 flex-shrink-0" />
                                )}
                            </div>
                            <p className="text-sm text-slate-400">{flag.description}</p>

                            {/* Status Badge */}
                            <div className="mt-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${flag.enabled
                                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                        : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                                    }`}>
                                    {updating === flag.key ? 'Updating...' : flag.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )
}
