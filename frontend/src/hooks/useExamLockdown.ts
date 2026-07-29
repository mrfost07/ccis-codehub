import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Reusable in-browser exam lockdown for quizzes and coding challenges.
 *
 * Honest scope: a web page CANNOT block OS-level Alt-Tab or suspend other
 * processes — only the operating system can. What this hook does enforce:
 *   - fullscreen (re-entry prompted on exit)
 *   - focus-loss detection (tab switch / window blur) with violation counting
 *   - clipboard blocking (copy / cut / paste) and right-click
 *   - devtools / print / view-source / save keyboard-shortcut blocking
 *   - auto-submit (onMaxViolations) once the violation budget is exhausted
 *
 * All listeners read the latest options via refs, so callers don't have to
 * memoise callbacks and there are no stale-closure bugs.
 */

export type ViolationType =
  | 'fullscreen_exit'
  | 'tab_switch'
  | 'blur'
  | 'copy'
  | 'cut'
  | 'paste'
  | 'contextmenu'
  | 'devtools'
  | 'print'

export interface ExamLockdownOptions {
  /** Engage the lockdown. When false, all listeners are torn down. */
  active: boolean
  /** Violations allowed before onMaxViolations fires. Default 3. */
  maxViolations?: number
  /** Require and re-prompt fullscreen. Default true. */
  enforceFullscreen?: boolean
  /** Block copy/cut/paste and paste shortcuts. Default true. */
  blockClipboard?: boolean
  /** Called for every counted violation. */
  onViolation?: (info: { type: ViolationType; count: number }) => void
  /** Called once when the violation budget is exhausted (e.g. auto-submit). */
  onMaxViolations?: () => void
}

export interface ExamLockdownState {
  violations: number
  isFullscreen: boolean
  /** True after a focus-loss/fullscreen-exit until the user resumes. */
  paused: boolean
  /** Request fullscreen (call from a user gesture for best browser support). */
  enterFullscreen: () => void
  /** Clear the paused state after the user returns to fullscreen. */
  resume: () => void
}

const COOLDOWN_MS = 600 // coalesce blur+visibility firing for one tab switch

export function useExamLockdown(options: ExamLockdownOptions): ExamLockdownState {
  const {
    active,
    maxViolations = 3,
    enforceFullscreen = true,
    blockClipboard = true,
  } = options

  const [violations, setViolations] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [paused, setPaused] = useState(false)

  // Latest values for use inside listeners without re-subscribing.
  const optsRef = useRef(options)
  optsRef.current = options
  const activeRef = useRef(active)
  activeRef.current = active
  const lastViolationAt = useRef(0)
  const maxFiredRef = useRef(false)

  const enterFullscreen = useCallback(() => {
    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => void
    }
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {})
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen()
    }
  }, [])

  const resume = useCallback(() => setPaused(false), [])

  const registerViolation = useCallback(
    (type: ViolationType, { pause = false, coalesce = false } = {}) => {
      if (!activeRef.current) return
      const now = Date.now()
      if (coalesce && now - lastViolationAt.current < COOLDOWN_MS) return
      lastViolationAt.current = now

      setViolations((prev) => {
        const count = prev + 1
        optsRef.current.onViolation?.({ type, count })
        const max = optsRef.current.maxViolations ?? 3
        if (count >= max && !maxFiredRef.current) {
          maxFiredRef.current = true
          optsRef.current.onMaxViolations?.()
        }
        return count
      })
      if (pause) setPaused(true)
    },
    [],
  )

  // Fullscreen: enter on activate, watch for exit.
  useEffect(() => {
    if (!active || !enforceFullscreen) return
    enterFullscreen()

    const onFsChange = () => {
      const full = !!document.fullscreenElement
      setIsFullscreen(full)
      if (!full) registerViolation('fullscreen_exit', { pause: true, coalesce: true })
    }
    document.addEventListener('fullscreenchange', onFsChange)
    document.addEventListener('webkitfullscreenchange', onFsChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange)
      document.removeEventListener('webkitfullscreenchange', onFsChange)
    }
  }, [active, enforceFullscreen, enterFullscreen, registerViolation])

  // Focus loss: tab switch (visibility) + window blur.
  useEffect(() => {
    if (!active) return
    const onVisibility = () => {
      if (document.hidden) registerViolation('tab_switch', { pause: true, coalesce: true })
    }
    const onBlur = () => registerViolation('blur', { pause: true, coalesce: true })
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
    }
  }, [active, registerViolation])

  // Clipboard + right-click blocking.
  useEffect(() => {
    if (!active || !blockClipboard) return
    const blockClip = (type: ViolationType) => (e: Event) => {
      e.preventDefault()
      registerViolation(type)
    }
    const onCopy = blockClip('copy')
    const onCut = blockClip('cut')
    const onPaste = blockClip('paste')
    const onContext = (e: Event) => e.preventDefault()

    // NOTE: 'selectstart' is deliberately NOT blocked.
    //
    // It used to be cancelled document-wide, which also cancels selection
    // inside the code editor — selecting a line to replace it, double-clicking
    // a word, drag-selecting a block. That is core editing, not cheating, and
    // this hook is active the whole time a challenge is open.
    //
    // It bought nothing anyway: taking a copy of the text is already stopped by
    // the 'copy' and 'cut' handlers below, which fire regardless of how the
    // selection was made. Blocking selection only punished honest editing.
    document.addEventListener('copy', onCopy)
    document.addEventListener('cut', onCut)
    document.addEventListener('paste', onPaste)
    document.addEventListener('contextmenu', onContext)
    return () => {
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('cut', onCut)
      document.removeEventListener('paste', onPaste)
      document.removeEventListener('contextmenu', onContext)
    }
  }, [active, blockClipboard, registerViolation])

  // Block devtools / print / view-source / save shortcuts.
  useEffect(() => {
    if (!active) return
    const onKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      // F12 devtools
      if (e.key === 'F12') {
        e.preventDefault()
        registerViolation('devtools')
        return
      }
      // Ctrl/Cmd+Shift+I/J/C devtools
      if (ctrl && e.shiftKey && ['i', 'j', 'c'].includes(key)) {
        e.preventDefault()
        registerViolation('devtools')
        return
      }
      // Ctrl/Cmd+U view-source, +S save
      if (ctrl && ['u', 's'].includes(key)) {
        e.preventDefault()
        registerViolation('devtools')
        return
      }
      // Ctrl/Cmd+P print
      if (ctrl && key === 'p') {
        e.preventDefault()
        registerViolation('print')
        return
      }
      // Clipboard shortcuts when clipboard is blocked
      if (optsRef.current.blockClipboard !== false && ctrl && ['c', 'v', 'x'].includes(key)) {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [active, registerViolation])

  // Reset the "max fired" latch when lockdown disengages.
  useEffect(() => {
    if (!active) maxFiredRef.current = false
  }, [active])

  return { violations, isFullscreen, paused, enterFullscreen, resume }
}

export default useExamLockdown
