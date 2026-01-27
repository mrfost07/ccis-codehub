/**
 * Settings Key Modal Component
 * 
 * Prompts admin for settings key verification with minimal, clean design
 */

import { useState } from 'react'
import { Lock, X, AlertCircle } from 'lucide-react'
import api from '../../../services/api'

interface PasswordModalProps {
    isOpen: boolean
    onClose: () => void
    onVerify: () => void
}

export default function PasswordModal({ isOpen, onClose, onVerify }: PasswordModalProps) {
    const [key, setKey] = useState('')
    const [error, setError] = useState('')
    const [isVerifying, setIsVerifying] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsVerifying(true)

        try {
            const response = await api.post('/auth/admin/verify-password/', { key })

            if (response.data.valid) {
                onVerify()
                setKey('')
            } else {
                setError('Invalid settings key')
            }
        } catch (err: any) {
            if (err.response?.status === 429) {
                setError('Too many attempts. Please wait a minute.')
            } else {
                setError(err.response?.data?.error || 'Verification failed')
            }
        } finally {
            setIsVerifying(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-md w-full shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Lock className="w-5 h-5 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Admin Verification</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-slate-300 text-sm">
                        Enter the system settings key to access configuration
                    </p>

                    <div>
                        <input
                            type="password"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            placeholder="Enter settings key"
                            autoFocus
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                            disabled={isVerifying}
                        />
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-red-300">{error}</span>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
                            disabled={isVerifying}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!key || isVerifying}
                            className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors font-medium"
                        >
                            {isVerifying ? 'Verifying...' : 'Verify'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
