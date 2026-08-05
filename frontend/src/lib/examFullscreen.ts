/**
 * Entering fullscreen for a graded page.
 *
 * One implementation. There were three near-identical copies — in
 * useExamLockdown, LiveQuizSession and SelfPacedQuizSession — and they had
 * already drifted on whether the rejection was reported.
 *
 * MUST be called synchronously inside a user gesture. Browsers require transient
 * user activation; a call from an effect, a timer, or after an `await` is
 * refused. Verified in Chrome 148: `TypeError: Permissions check failed`, with
 * document.fullscreenElement left null.
 *
 * That last part is the trap for a "press continue, count down, then go
 * fullscreen" flow: by the time a countdown finishes, the activation is gone.
 * Request first, count down afterwards.
 */

type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

/** True when the document is currently fullscreen. */
export function isFullscreenNow(): boolean {
  const doc = document as Document & { webkitFullscreenElement?: Element | null }
  return !!(document.fullscreenElement || doc.webkitFullscreenElement)
}

/**
 * Ask for fullscreen. Resolves true when it was granted.
 *
 * Never rejects — callers treat a refusal as a violation, not an exception.
 */
export async function requestExamFullscreen(): Promise<boolean> {
  const el = document.documentElement as FullscreenCapableElement
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen()
    } else if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen()
    } else {
      return false
    }
    return isFullscreenNow()
  } catch {
    // Refused: almost always no user activation, or the user dismissed it.
    return false
  }
}

/** Leave fullscreen, if we are in it. Used when an exam finishes. */
export async function exitExamFullscreen(): Promise<void> {
  const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> | void }
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen()
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen()
    }
  } catch {
    // Nothing to do — the page is already out, or the browser refused.
  }
}
