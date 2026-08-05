import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Maximize } from 'lucide-react'

import { requestExamFullscreen } from '../../lib/examFullscreen'

/**
 * Shown when a graded page is paused by a violation: skipped fullscreen, left
 * fullscreen, or switched away.
 *
 * Continue re-enters fullscreen and counts down before handing control back, so
 * nobody lands mid-question with the clock already moving.
 *
 * ORDER MATTERS. Fullscreen is requested synchronously in the click handler and
 * the countdown runs after. The obvious reading of "continue, count down, then go
 * fullscreen" cannot work: transient user activation is gone by the time a timer
 * fires, and the request is refused.
 */
export default function ExamPausedOverlay({
  reason,
  countdownSeconds = 3,
  clockNote,
  onContinue,
  requireFullscreen = true,
}: {
  reason: string
  countdownSeconds?: number
  /** e.g. the running timer, so the student knows the clock did not stop. */
  clockNote?: string
  /** Called once the countdown reaches zero. */
  onContinue: () => void
  requireFullscreen?: boolean
}) {
  const [counting, setCounting] = useState<number | null>(null)
  const [granted, setGranted] = useState<boolean | null>(null)
  const onContinueRef = useRef(onContinue)
  onContinueRef.current = onContinue

  const start = async () => {
    if (counting !== null) return
    // Before any await, or the activation from this click is spent.
    const ok = requireFullscreen ? await requestExamFullscreen() : true
    setGranted(ok)
    setCounting(countdownSeconds)
  }

  useEffect(() => {
    if (counting === null) return
    if (counting <= 0) {
      onContinueRef.current()
      return
    }
    const timer = window.setTimeout(() => setCounting(c => (c === null ? null : c - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [counting])

  const countingDown = counting !== null && counting > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/95 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-neutral-900 p-6 text-center shadow-2xl sm:p-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
        </div>

        <h2 className="mb-2 text-xl font-bold text-white">Paused</h2>
        <p className="text-sm text-neutral-300">{reason}</p>

        {clockNote && (
          <p className="mt-3 rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-400">
            {clockNote}
          </p>
        )}

        {countingDown ? (
          <div className="mt-6">
            <p className="text-5xl font-bold tabular-nums text-purple-400">{counting}</p>
            <p className="mt-2 text-xs text-neutral-500">Resuming…</p>
          </div>
        ) : (
          <button
            onClick={start}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3
              font-semibold text-white transition-all hover:bg-purple-500"
          >
            <Maximize className="h-5 w-5" />
            Continue
          </button>
        )}

        {/* Only after a refusal — saying it before the student has done anything
            would be noise. */}
        {granted === false && requireFullscreen && (
          <p className="mt-3 text-[11px] text-amber-300">
            Fullscreen was refused by the browser. This is recorded, and your
            instructor can see it.
          </p>
        )}
      </div>
    </div>
  )
}
