/**
 * System Health Panel Component
 * 
 * Display system health metrics with minimal design
 */

import { useState, useEffect } from 'react'
import { Server, Database, Zap, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import api from '../../../services/api'

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'critical'
    database: boolean
    cache: boolean
    timestamp: string
}

export default function SystemHealthPanel() {
    const [health, setHealth] = useState<HealthStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        fetchHealth()
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchHealth, 30000)
        return () => clearInterval(interval)
    }, [])

    const fetchHealth = async () => {
        try {
            const response = await api.get('/system/health/')
            setHealth(response.data)
            setError(false)
        } catch (err) {
            console.error('Failed to fetch system health:', err)
            setError(true)
        } finally {
            setLoading(false)
        }
    }

    const getStatusIcon = (isHealthy: boolean) => {
        if (isHealthy) {
            return <CheckCircle className="w-5 h-5 text-green-400" />
        }
        return <XCircle className="w-5 h-5 text-red-400" />
    }

    const getStatusBadge = (status: string) => {
        const badges = {
            healthy: 'bg-green-500/10 text-green-400 border-green-500/20',
            degraded: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
            critical: 'bg-red-500/10 text-red-400 border-red-500/20'
        }
        return badges[status as keyof typeof badges] || badges.critical
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-slate-400">Loading health status...</div>
            </div>
        )
    }

    if (error || !health) {
        return (
            <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    <span>Unable to fetch system health</span>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white">System Health</h3>
                    <p className="text-sm text-slate-400 mt-1">
                        Server status and connectivity
                    </p>
                </div>

                <button
                    onClick={fetchHealth}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors text-sm text-slate-300"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh</span>
                </button>
            </div>

            {/* Overall Status */}
            <div className="p-4 bg-slate-900/30 border border-slate-700/50 rounded-xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${health.status === 'healthy'
                                ? 'bg-green-500/10'
                                : health.status === 'degraded'
                                    ? 'bg-yellow-500/10'
                                    : 'bg-red-500/10'
                            }`}>
                            <Server className={`w-5 h-5 ${health.status === 'healthy'
                                    ? 'text-green-400'
                                    : health.status === 'degraded'
                                        ? 'text-yellow-400'
                                        : 'text-red-400'
                                }`} />
                        </div>
                        <div>
                            <h4 className="font-medium text-white">Overall Status</h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Last checked: {new Date(health.timestamp).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>

                    <span className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${getStatusBadge(health.status)}`}>
                        {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
                    </span>
                </div>
            </div>

            {/* Service Status Grid */}
            <div className="grid gap-3 sm:grid-cols-2">
                {/* Database */}
                <div className="p-4 bg-slate-900/30 border border-slate-700/50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${health.database ? 'bg-green-500/10' : 'bg-red-500/10'
                                }`}>
                                <Database className={`w-4 h-4 ${health.database ? 'text-green-400' : 'text-red-400'
                                    }`} />
                            </div>
                            <span className="font-medium text-white">Database</span>
                        </div>
                        {getStatusIcon(health.database)}
                    </div>
                    <p className="text-xs text-slate-400">
                        {health.database ? 'Connected' : 'Disconnected'}
                    </p>
                </div>

                {/* Cache */}
                <div className="p-4 bg-slate-900/30 border border-slate-700/50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${health.cache ? 'bg-green-500/10' : 'bg-red-500/10'
                                }`}>
                                <Zap className={`w-4 h-4 ${health.cache ? 'text-green-400' : 'text-red-400'
                                    }`} />
                            </div>
                            <span className="font-medium text-white">Cache</span>
                        </div>
                        {getStatusIcon(health.cache)}
                    </div>
                    <p className="text-xs text-slate-400">
                        {health.cache ? 'Connected' : 'Disconnected'}
                    </p>
                </div>
            </div>
        </div>
    )
}
