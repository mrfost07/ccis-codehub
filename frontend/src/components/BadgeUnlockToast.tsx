/**
 * Badge Unlock Toast — Animated celebration when a new badge is earned
 * Shows a full-screen overlay with particle effects and badge reveal
 */
import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'

interface BadgeUnlockToastProps {
  badgeNames: string[]
  onComplete?: () => void
}

export default function BadgeUnlockToast({ badgeNames, onComplete }: BadgeUnlockToastProps) {
  const [visible, setVisible] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [animPhase, setAnimPhase] = useState<'enter' | 'show' | 'exit'>('enter')

  useEffect(() => {
    if (!badgeNames.length) return

    // Enter animation
    const enterTimer = setTimeout(() => setAnimPhase('show'), 100)

    // Auto-advance after 3s
    const showTimer = setTimeout(() => {
      setAnimPhase('exit')
      setTimeout(() => {
        if (currentIndex < badgeNames.length - 1) {
          setCurrentIndex(prev => prev + 1)
          setAnimPhase('enter')
          setTimeout(() => setAnimPhase('show'), 100)
        } else {
          setVisible(false)
          onComplete?.()
        }
      }, 400)
    }, 3000)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(showTimer)
    }
  }, [currentIndex, badgeNames.length])

  if (!visible || !badgeNames.length) return null

  const badgeName = badgeNames[currentIndex]

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
      aria-live="polite"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${
          animPhase === 'enter' ? 'opacity-0' : animPhase === 'show' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Particle burst */}
      <div className={`absolute inset-0 overflow-hidden ${animPhase === 'show' ? 'animate-pulse' : ''}`}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              left: `${50 + (Math.random() - 0.5) * 60}%`,
              top: `${50 + (Math.random() - 0.5) * 60}%`,
              background: ['#a855f7', '#f59e0b', '#3b82f6', '#10b981', '#ec4899'][i % 5],
              animation: animPhase === 'show'
                ? `badgeParticle ${1.5 + Math.random()}s ease-out ${Math.random() * 0.3}s forwards`
                : 'none',
              opacity: 0,
            }}
          />
        ))}
      </div>

      {/* Badge card */}
      <div
        className={`relative flex flex-col items-center gap-4 p-8 rounded-2xl border transition-all duration-500 ${
          animPhase === 'enter'
            ? 'scale-50 opacity-0'
            : animPhase === 'show'
            ? 'scale-100 opacity-100'
            : 'scale-110 opacity-0'
        }`}
        style={{
          background: 'linear-gradient(135deg, rgba(168,85,247,0.2) 0%, rgba(59,130,246,0.15) 100%)',
          borderColor: 'rgba(168,85,247,0.5)',
          boxShadow: '0 0 60px rgba(168,85,247,0.3), 0 0 120px rgba(168,85,247,0.1)',
        }}
      >
        {/* Glow ring */}
        <div className="relative">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-purple-500 via-yellow-400 to-purple-500 opacity-30 blur-xl animate-spin" style={{ animationDuration: '3s' }} />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 flex items-center justify-center shadow-2xl">
            <Trophy className="w-12 h-12 text-white drop-shadow-lg" />
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold text-purple-400 uppercase tracking-widest mb-1">
            Badge Unlocked!
          </p>
          <h2 className="text-2xl font-bold text-white">
            {badgeName}
          </h2>
        </div>

        {badgeNames.length > 1 && (
          <p className="text-xs text-slate-500">
            {currentIndex + 1} / {badgeNames.length}
          </p>
        )}

        <p className="text-xs text-slate-400 animate-pulse">Click anywhere to dismiss</p>
      </div>

      {/* Click to dismiss */}
      <button
        className="absolute inset-0 pointer-events-auto cursor-default"
        onClick={() => { setVisible(false); onComplete?.() }}
        aria-label="Dismiss badge notification"
      />

      <style>{`
        @keyframes badgeParticle {
          0% { transform: scale(0) translate(0, 0); opacity: 1; }
          50% { opacity: 1; }
          100% {
            transform: scale(1) translate(
              ${Math.random() > 0.5 ? '' : '-'}${40 + Math.random() * 80}px,
              ${Math.random() > 0.5 ? '' : '-'}${40 + Math.random() * 80}px
            );
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
