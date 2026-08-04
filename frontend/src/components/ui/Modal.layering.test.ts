import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

// globals: false disables Testing Library's automatic cleanup, and the render
// test below portals a dialog into document.body. Without this an assertion
// that throws leaves it mounted for the rest of the run.
afterEach(async () => {
  const { cleanup } = await import('@testing-library/react')
  cleanup()
})

/**
 * The mobile bottom nav has to stay below dialogs.
 *
 * It was `z-[60]` — the toast layer — while Modal is `z-50`, so on a phone the
 * nav dock rendered on top of every dialog and the panel's lowest rows could not
 * be reached. Reported as "it's so lower, it's almost covered by the navigation
 * tabs in the bottom".
 *
 * Nothing catches this in review: both numbers look deliberate in isolation, and
 * on a desktop viewport the nav is `md:hidden` so the collision never appears.
 *
 * DESIGN_SYSTEM.md §6:
 *   z-30  dropdowns, popovers, tooltips
 *   z-40  sticky navbar / page header, mobile bottom nav
 *   z-50  modal overlay + modal
 *   z-60  toasts (above modals)
 */

const COMPONENTS = join(__dirname, '..')

/** Tailwind z utilities: `z-40` and the arbitrary form `z-[60]`. */
const Z_CLASS = /(?:^|\s|")z-(?:\[(\d+)\]|(\d+))(?=\s|"|$)/g

/**
 * Source with comments removed.
 *
 * Needed because the comments in Modal.tsx explain what the old broken markup
 * was, quoting `items-end` verbatim — so a naive scan of the raw file matches the
 * explanation of the bug and reports the bug as still present. These assertions
 * are about code, so strip prose first.
 */
function codeOf(relativePath: string): string {
  return readFileSync(join(COMPONENTS, relativePath), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')          // block comments, incl. JSDoc
    .split('\n')
    .filter(line => !/^\s*(\/\/|\*)/.test(line)) // whole-line // and JSDoc bodies
    .join('\n')
}

function zIndexesIn(relativePath: string): number[] {
  const found: number[] = []
  for (const match of codeOf(relativePath).matchAll(Z_CLASS)) {
    found.push(Number(match[1] ?? match[2]))
  }
  return found
}

const MODAL_LAYER = 50
const TOAST_LAYER = 60

describe('mobile bottom nav layers below dialogs', () => {
  it('declares a z-index at all', () => {
    // If the class is removed or renamed, the assertions below would pass while
    // checking nothing.
    expect(zIndexesIn('MobileBottomNav.tsx').length).toBeGreaterThan(0)
  })

  it('never reaches the modal layer', () => {
    const nav = zIndexesIn('MobileBottomNav.tsx')
    const tooHigh = nav.filter(z => z >= MODAL_LAYER)

    expect(tooHigh, [
      `MobileBottomNav uses z-index ${tooHigh.join(', ')}, which is at or above`,
      `the modal layer (z-${MODAL_LAYER}). The dock will render on top of every`,
      'dialog on mobile. Per DESIGN_SYSTEM.md §6 the nav belongs at z-40.',
    ].join('\n')).toEqual([])
  })

  it('puts the modal above the nav and below toasts', () => {
    const modal = zIndexesIn('ui/Modal.tsx')
    expect(modal).toContain(MODAL_LAYER)
    expect(Math.max(...modal)).toBeLessThan(TOAST_LAYER)
    expect(Math.max(...zIndexesIn('MobileBottomNav.tsx'))).toBeLessThan(MODAL_LAYER)
  })
})

describe('Modal stays clear of mobile chrome', () => {
  const source = codeOf('ui/Modal.tsx')

  it('is not flush to the bottom of the viewport', () => {
    // `items-end` with no bottom padding is what put the panel under the nav and
    // under the home indicator.
    expect(source).not.toMatch(/items-end/)
    expect(source).toMatch(/items-center/)
  })

  it('reserves the safe-area inset', () => {
    expect(source).toContain('env(safe-area-inset-bottom)')
  })

  it('caps height with dvh on mobile, not vh', () => {
    // vh is the largest viewport on mobile browsers — measured as though the
    // address bar were hidden — so a vh cap overflows behind browser chrome.
    expect(source).toMatch(/max-h-\[\d+dvh\]/)
  })
})

describe('Modal, as actually rendered', () => {
  // The scans above read source text. These render it, so a change that keeps the
  // right strings in the file but stops applying them to the panel still fails.
  it('centers the panel and reserves the safe-area inset', async () => {
    const { cleanup, render } = await import('@testing-library/react')
    const { createElement } = await import('react')
    const { default: Modal } = await import('./Modal')

    // children goes in the props object: ModalProps declares it as required, and
    // the third-argument overload of createElement does not satisfy that.
    const view = render(createElement(Modal, {
      open: true,
      onClose: () => {},
      title: 'T',
      children: 'body',
    }))

    // Scoped to this render's baseElement, not document. Modal portals into the
    // body, so a global query can match a dialog some other test left mounted —
    // this test failed once in a full run and passed on its own, which is the
    // signature of exactly that.
    const panel = view.baseElement.querySelector('[role="dialog"]')
    expect(panel).not.toBeNull()

    const wrapper = panel!.parentElement!
    expect(wrapper.className).toContain('items-center')
    expect(wrapper.className).not.toContain('items-end')
    expect(wrapper.className).toContain('z-50')
    // jsdom keeps the declaration even though it cannot compute env().
    expect(wrapper.getAttribute('style') ?? '').toContain('safe-area-inset-bottom')
    expect(panel!.className).toContain('max-h-[85dvh]')

    // Also cleaned up here for the passing path; the afterEach below is what
    // covers a thrown assertion, which would otherwise leave the portalled
    // dialog in the body for whatever runs next.
    cleanup()
  })
})

describe('full-screen overlays sit above the mobile dock', () => {
  /** `fixed inset-0 ... z-NN` — an overlay covering the whole viewport. */
  const OVERLAY = /fixed inset-0[^"'`]*?z-(?:\[(\d+)\]|(\d+))/g

  function overlayLayersIn(relativePath: string): number[] {
    const found: number[] = []
    for (const match of codeOf(relativePath).matchAll(OVERLAY)) {
      found.push(Number(match[1] ?? match[2]))
    }
    return found
  }

  it('finds the workspace overlays at all', () => {
    // The channel drawer and the thread pane. If these stop being `fixed
    // inset-0` the assertion below would pass while checking nothing.
    expect(overlayLayersIn('ProjectWorkspace.tsx').length).toBeGreaterThan(0)
  })

  it('never leaves one on the nav layer, where the dock can paint over it', () => {
    // This recurred: the channel drawer and thread pane shipped at z-40, the
    // same layer as MobileBottomNav, which is the bug already fixed once for
    // Modal. An overlay that covers the viewport belongs on the modal layer.
    const tooLow = overlayLayersIn('ProjectWorkspace.tsx').filter(z => z < MODAL_LAYER)

    expect(tooLow, [
      `Full-screen overlays in ProjectWorkspace are at z-index ${tooLow.join(', ')},`,
      `below the modal layer (z-${MODAL_LAYER}). The mobile bottom nav is z-40 and`,
      'will render on top of them. Raise the overlay, do not lower the nav.',
    ].join('\n')).toEqual([])
  })

  it('keeps them below the toast layer', () => {
    const layers = overlayLayersIn('ProjectWorkspace.tsx')
    expect(Math.max(...layers)).toBeLessThan(TOAST_LAYER)
  })
})

describe('the career tree fits a phone', () => {
  const CAREER_MAP = '../pages/CareerMap.tsx'

  it('does not force horizontal scrolling with a min-width', () => {
    // It shipped with min-w-[34rem] — 544px — so every phone had to be scrolled
    // sideways to read a tree that is meant to be browsed vertically.
    const wide = [...codeOf(CAREER_MAP).matchAll(/min-w-\[(\d+(?:\.\d+)?)rem\]/g)]
      .map(match => Number(match[1]))
      .filter(rem => rem > 20)   // 20rem = 320px, narrower than any phone

    expect(wide, [
      `CareerMap sets min-w-[${wide.join('rem, ')}rem], which is wider than a phone`,
      'viewport and forces horizontal scrolling. Reduce indentation instead.',
    ].join('\n')).toEqual([])
  })

  it('indents less on mobile than on desktop', () => {
    // Three levels of desktop indent plus a card leaves nothing on a 375px
    // screen, so the mobile step has to be smaller.
    const source = codeOf(CAREER_MAP)
    expect(source).toMatch(/ml-3 sm:ml-10/)
    expect(source).toMatch(/pl-3 sm:pl-4/)
  })
})
