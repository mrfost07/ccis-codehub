/**
 * Admin Settings Tab
 * 
 * Main system settings component with password protection and tabbed panels
 */

import { useState, useEffect } from 'react'
import { Settings, Flag, Activity } from 'lucide-react'
import PasswordModal from './settings/PasswordModal'
import FeatureFlagsPanel from './settings/FeatureFlagsPanel'
import SystemHealthPanel from './settings/SystemHealthPanel'

type SettingsTab = 'flags' | 'health'

export default function AdminSettingsTab() {
    const [isVerified, setIsVerified] = useState(false)
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [activeTab, setActiveTab] = useState<SettingsTab>('flags')

    // Check if already verified in session
    useEffect(() => {
        const verified = sessionStorage.getItem('settings_verified')
        if (verified === 'true') {
            setIsVerified(true)
        } else {
            setShowPasswordModal(true)
        }

        // Auto-lock after 15 minutes of inactivity
        const timeout = setTimeout(() => {
            sessionStorage.removeItem('settings_verified')
            setIsVerified(false)
            setShowPasswordModal(true)
        }, 15 * 60 * 1000)

        return () => clearTimeout(timeout)
    }, [])

    const handleVerify = () => {
        sessionStorage.setItem('settings_verified', 'true')
        setIsVerified(true)
        setShowPasswordModal(false)
    }

    const tabs = [
        { id: 'flags' as const, label: 'Feature Flags', icon: Flag },
        { id: 'health' as const, label: 'System Health', icon: Activity }
    ]

    if (!isVerified) {
        return (
            <>
                <PasswordModal
                    isOpen={showPasswordModal}
                    onClose={() => setShowPasswordModal(false)}
                    onVerify={handleVerify}
                />
                <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-12">
                    <div className="text-center">
                        <div className="inline-flex p-4 bg-purple-500/10 rounded-2xl mb-4">
                            <Settings className="w-8 h-8 text-purple-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">System Settings</h2>
                        <p className="text-slate-400 mb-4">Verification required to access settings</p>
                        <button
                            onClick={() => setShowPasswordModal(true)}
                            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors font-medium"
                        >
                            Enter Settings Key
                        </button>
                    </div>
                </div>
            </>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-purple-500/10 rounded-lg">
                        <Settings className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">System Settings</h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Manage feature flags and monitor system health
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-slate-700">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 ${isActive
                                        ? 'text-purple-400 border-purple-500'
                                        : 'text-slate-400 border-transparent hover:text-slate-300'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
                {activeTab === 'flags' && <FeatureFlagsPanel />}
                {activeTab === 'health' && <SystemHealthPanel />}
            </div>
        </div>
    )
}
