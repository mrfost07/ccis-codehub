import { useState } from 'react'
import { Maximize, ShieldAlert } from 'lucide-react'

import { requestExamFullscreen } from '../../lib/examFullscreen'

/**
 * The reminder shown before a graded page opens.
 *
 * A reminder, not a wall: Skip is offered, and taking it is recorded and flags
 * the student to the instructor. That is deliberate — a hard block would strand
 * anyone whose browser refuses fullscreen, and there is no way to tell that apart
 * from refusing on purpose.
 *
 * Start calls requestExamFullscreen() synchronously in the click handler, which
 * is the only context a browser will grant it in.
 */
export default function FullscreenGate({
  title = 'Fullscreen required',
  description,
  onReady,
  onSkip,
}: {
  title?: string
  description?: string
  /** Fullscreen was granted. Passed whether it actually engaged. */
  onReady: (granted: boolean) => void
  /** The student declined. The caller reports this as a violation. */
  onSkip: () => void
}) {
  const [busy, setBusy] = useState(false)

  const start = async () => {
    setBusy(true)
    // Requested before any await, so the click's activation still counts.
    const granted = await requestExamFullscreen()
    setBusy(false)
    onReady(granted)
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
        from-purple-900/20 via-neutral-950 to-neutral-950" />
      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 text-center
          shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-600/20">
            <Maximize className="h-8 w-8 text-purple-400" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-white sm:text-2xl">{title}</h1>
          <p className="mb-6 text-sm text-neutral-400">
            {description
              ?? 'This is taken in fullscreen so everyone sits the same assessment.'}
          </p>

          <button
            onClick={start}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3
              font-semibold text-white transition-all hover:bg-purple-500 disabled:opacity-60"
          >
            <Maximize className="h-5 w-5" />
            {busy ? 'Opening…' : 'Start in fullscreen'}
          </button>

          <button
            onClick={onSkip}
            className="mt-3 w-full rounded-xl py-3 text-sm text-neutral-400 transition-colors
              hover:bg-neutral-800/60 hover:text-neutral-200"
          >
            Skip for now
          </button>

          {/* Said plainly and up front, so being flagged is never a surprise. */}
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/20
            bg-amber-500/10 p-3 text-left text-[11px] leading-relaxed text-amber-300">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Skipping, leaving fullscreen, or switching away is recorded and shown
              to your instructor, and may flag your attempt.
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
