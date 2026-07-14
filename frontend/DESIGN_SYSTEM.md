# CCIS-CodeHub — Design System

> **Source of truth** for the product's design language. The system is a
> disciplined, SaaS-grade dark UI: **near-black neutrals + near-white text +
> one purple accent**, hairline borders, quiet motion, and dense-but-breathable
> layouts in the vein of Linear / Vercel / Stripe dashboards.
>
> **Legend:** ✅ = implemented in code today · 🧩 = specified here, build with
> these exact recipes when first needed. Never invent a parallel pattern for
> something this document already defines.

---

## Table of contents

1. [Design principles](#1-design-principles)
2. [Color system](#2-color-system) ✅
3. [Typography](#3-typography)
4. [Layout & responsiveness](#4-layout--responsiveness)
5. [Spacing rhythm](#5-spacing-rhythm)
6. [Elevation & layering](#6-elevation--layering)
7. [Interaction states](#7-interaction-states)
8. [Motion](#8-motion)
9. [Core component library](#9-core-component-library) ✅
10. [Extended component kit](#10-extended-component-kit) 🧩
11. [Page & layout patterns](#11-page--layout-patterns)
12. [UX states: loading, empty, error](#12-ux-states-loading-empty-error)
13. [Accessibility standard](#13-accessibility-standard)
14. [Performance budget](#14-performance-budget)
15. [Anti-generic-design guide](#15-anti-generic-design-guide)
16. [Signature details](#16-signature-details)
17. [File map](#17-file-map)
18. [Enhancement roadmap](#18-enhancement-roadmap)

---

## 1. Design principles

1. **Hierarchy through restraint.** One accent (purple). Hierarchy is built
   with weight, spacing, and border contrast — not with more colors. If a
   screen needs a second decorative hue to "work," the layout is wrong.
2. **Borders over shadows.** On dark UIs, separation comes from hairline
   borders (`border-neutral-800`) and surface steps, not drop shadows. Shadow
   exists only to communicate *floating* (dropdowns, modals, toasts).
3. **Status colors are verbs, not decoration.** Green = succeeded, red =
   destructive/failed, amber = needs attention. They appear on badges, dots,
   toasts, and results — never as page chrome.
4. **Density with air.** Real SaaS tools are information-dense but never
   cramped: tight type scale, 4-px spacing rhythm, generous section gaps.
   Prefer showing more with smaller, well-set type over hiding content behind
   oversized cards.
5. **Every state is designed.** A view isn't done until loading, empty, error,
   and success are designed (see §12). Unstyled spinners and blank panels are
   defects.
6. **Motion is feedback, not theater.** 150–300 ms, ease-out, on user action
   or content entry. Nothing loops, nothing animates on scroll, nothing moves
   that the user didn't cause.
7. **One restrained glow.** Where a page wants ambiance (auth, hero), use a
   single soft purple radial (`bg-purple-600/10 blur-3xl`) — never two
   competing blobs, never animated.

---

## 2. Color system ✅

All colors are driven from `tailwind.config.js`. Every legacy Tailwind family
the codebase used is **remapped** onto five semantic ramps, so the whole app is
consistent without per-page edits. Multi-color gradients collapse to
mono-purple automatically.

### Remap table

| Semantic ramp | Source families remapped onto it |
|---|---|
| **neutral** (base) | `slate`, `gray`, `zinc`, `stone`, `neutral` |
| **purple** (accent) | `purple`, `primary`, `violet`, `indigo`, `blue`, `sky`, `cyan`, `teal`, `fuchsia`, `pink` |
| **green** (success) | `green`, `emerald` |
| **red** (danger) | `red`, `rose` |
| **amber** (warning) | `amber`, `yellow`, `orange` |

> `bg-indigo-600`, `text-blue-400`, `from-cyan-500` all render purple.
> `text-emerald-400` renders green, `bg-rose-500` renders red, etc.

### Ramps

```
neutral  50 #fafafa  100 #f4f4f5  200 #e4e4e7  300 #d4d4d8  400 #a1a1aa  500 #71717a
         600 #52525b 700 #3f3f46  800 #27272a  850 #1f1f23  900 #18181b  950 #0a0a0b

purple   50 #f5f3ff  100 #ede9fe  200 #ddd6fe  300 #c4b5fd  400 #a78bfa  500 #8b5cf6
         600 #7c3aed 700 #6d28d9  800 #5b21b6  900 #4c1d95  950 #2e1065

green    500 #10b981 · 400 #34d399      red   500 #ef4444 · 600 #dc2626
amber    500 #f59e0b · 400 #fbbf24
```

Primary accent = **`purple-500 #8b5cf6`** (borders, glows, focus) and
**`purple-600 #7c3aed`** (solid fills/buttons).

### Semantic surface tokens

```
surface.DEFAULT #0a0a0b   // app background (= neutral-950)
surface.raised  #18181b   // cards (= neutral-900)
surface.overlay #1f1f23   // popovers / inputs / hover rows (= neutral-850)
accent          → purple ramp
```

### Text-on-surface contrast rules (WCAG)

| Token | On `neutral-950/900` | Allowed use |
|---|---|---|
| `text-white` / `text-neutral-100` | ~17–19:1 ✓ | Headings, primary values |
| `text-neutral-300` | ~11:1 ✓ | Body copy |
| `text-neutral-400` | ~6.5:1 ✓ | Secondary text, descriptions, labels |
| `text-neutral-500` | ~3.5:1 ✗ AA | **Meta only** (timestamps, counts, placeholders) — never body copy or anything the user must read to act |
| `text-purple-400` | ~5.5:1 ✓ | Accent text, links, active states |
| `text-purple-300` | ~8:1 ✓ | Accent text on tinted purple chips |

Status text on dark cards uses the `-300`/`-400` steps (`text-green-400`,
`text-red-400`, `text-amber-400`) — the `-500` fills are for solid badges and
buttons with white text.

### Alpha conventions

Translucency is a tool for *tint*, not for legibility surfaces:

- Tinted chips/pills: `bg-purple-500/10`–`/15` + `border-purple-500/30`.
- Card translucency: `bg-neutral-900/70 backdrop-blur-sm` **only** when
  something (glow, image) sits behind it; plain regions use solid
  `bg-neutral-900`.
- Never put long-form text on a translucent surface over busy content.

---

## 3. Typography

Fonts load in `index.html` (Google Fonts), configured in `tailwind.config.js`:

- **Sans (UI/body):** `Inter` → system-ui fallback. Weights 400/500/600/700/800.
- **Mono (code, IDs, numbers-as-data):** `JetBrains Mono` → ui-monospace. 400/500.

Global (from `styles/global.css`): headings are `font-weight:700;
letter-spacing:-0.02em; color:#fafafa`; body is `#fafafa` on `#0a0a0b`,
antialiased.

### Role scale — the only sizes we use

Hierarchy comes from **weight + color**, not from piling on sizes. Stay inside
this table; if a design "needs" a new size, it needs a layout fix.

| Role | Classes |
|---|---|
| Page title (h1) | `text-2xl sm:text-3xl font-bold tracking-tight text-white` |
| Section title (h2) | `text-lg sm:text-xl font-bold tracking-tight text-white` |
| Card / widget title | `text-base font-semibold text-white` |
| Eyebrow / group label | `text-xs font-semibold uppercase tracking-wider text-neutral-500` |
| Body | `text-sm text-neutral-300 leading-relaxed` |
| Secondary / description | `text-sm text-neutral-400 leading-relaxed` |
| Meta / caption | `text-xs text-neutral-500` |
| Big stat number | `text-3xl font-bold text-white tabular-nums` |
| Table cell / dense list | `text-sm text-neutral-300` |
| Code / identifier | `font-mono text-[13px] text-neutral-300` |

Marketing-scale display type (`text-4xl+`) is reserved for the public home/hero
page only — never inside the logged-in app.

### Typographic hygiene

- **`tabular-nums` on every number that updates or aligns**: stats, counters,
  table columns, timers, points. Non-negotiable — proportional digits jitter.
- **Truncation is deliberate:** single line `truncate` + `title` attr; multi
  line `line-clamp-2` for card descriptions. Never let user content blow up a
  grid row.
- Line length for prose: `max-w-3xl` (~65ch). Don't set paragraphs full-width.
- Links inside prose: `text-purple-400 hover:text-purple-300
  underline-offset-4 hover:underline` (no default underline in chrome/nav).
- Don't letter-space body text; `tracking-wider` belongs to uppercase eyebrows
  only.

---

## 4. Layout & responsiveness

Design mobile-first; verify every change at **375 / 768 / 1280** (dark only).

### Breakpoint intent

| Breakpoint | Meaning for this app |
|---|---|
| `<640` | Single column, bottom nav (`MobileBottomNav`), full-width cards, sheets instead of popovers |
| `sm 640` | 2-up grids begin, inline actions return to headers |
| `md 768` | Bottom nav is replaced by top nav; side-by-side split layouts allowed |
| `lg 1024` | 3–4-up stat grids, persistent side panels/rails |
| `xl 1280` | Max content width reached; whitespace grows, content doesn't stretch |

### Page shell (every page)

```html
<div class="min-h-screen bg-neutral-950">
  <main class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
    …sections…
  </main>
</div>
```

- `max-w-7xl` for dashboards/workspaces, `max-w-6xl` for content pages,
  `max-w-3xl` for reading/detail prose, `max-w-md` for auth.
- Mobile bottom-nav safe area is handled globally in `global.css`
  (`padding-bottom: 5rem` on page wrappers under 768 px) — don't re-add it.

### Grid recipes (reuse verbatim)

```html
<!-- Stat cards -->
<div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">…</div>

<!-- Content cards / catalog -->
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">…</div>

<!-- Main + rail (rail drops below on mobile) -->
<div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">…</div>

<!-- Form rows -->
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">…</div>
```

### Responsive behavior rules

- **Stat cards go 2-up on mobile**, not 1-up — four stacked full-width stat
  cards is wasted scroll.
- **Tables become cards** under `md`: hide the `<table>` (`hidden md:table`)
  and render the same data as a stacked card list (`md:hidden`). Never force
  horizontal table scroll for primary content.
- **Toolbars wrap, never shrink:** `flex flex-wrap items-center gap-2`. On
  mobile, secondary filters collapse into a "Filters" button + sheet.
- **Touch targets ≥ 44 px** on mobile: icon buttons `h-10 w-10` minimum;
  never `h-8` icon buttons below `sm`.
- Sticky page-level headers: `sticky top-0 z-40 border-b border-neutral-800
  bg-neutral-950/80 backdrop-blur` — the blur-on-scroll header is the one
  sanctioned use of heavy blur.

---

## 5. Spacing rhythm

4-px base grid. Standard steps only: **2 · 3 · 4 · 5 · 6 · 8 · 12** (Tailwind
units). Arbitrary values (`p-[13px]`) are banned.

| Context | Token |
|---|---|
| Inside chips/badges | `px-2.5 py-0.5` |
| Between icon and label | `gap-2` |
| Between related controls (toolbar) | `gap-2`–`gap-3` |
| Card padding | `p-4` mobile → `p-5`/`p-6` desktop (`p-4 sm:p-6`) |
| Between cards in a grid | `gap-3 sm:gap-4` |
| Between page sections | `space-y-6 sm:space-y-8` |
| Page gutters | `px-4 sm:px-6 lg:px-8` |

Vertical rhythm inside a card: title `mb-1`, description `mb-4`, then content.
Lists inside cards separate with `divide-y divide-neutral-800`, not margins.

---

## 6. Elevation & layering

Three surface steps + one border do all the work:

```
Level 0  page       bg-neutral-950                      no border
Level 1  card       bg-neutral-900 (or /70+blur)        border-neutral-800
Level 2  nested     bg-neutral-850 / bg-neutral-800     border-neutral-700/50
Float    overlays   bg-neutral-900                      border-neutral-700 + shadow
```

- **Shadows (neutral, from config):** `shadow-card` (resting, optional),
  `shadow-card-hover` (hover on interactive cards), `shadow-accent` (single
  restrained purple glow — hero CTAs only, at most one per page).
- Floating elements (dropdown, modal, toast) get real shadow:
  `shadow-xl shadow-black/40`.
- Never nest more than one level inside a card. If a card needs cards inside
  cards, flatten with `divide-y` rows instead.

### Z-index scale 🧩 (use these exact values)

```
z-30  dropdowns, popovers, tooltips
z-40  sticky navbar / page header, mobile bottom nav
z-50  modal overlay + modal
z-60  toasts (above modals)
```

---

## 7. Interaction states

Every interactive element ships with **all five states**. This matrix is the
default; components in §9 already implement it.

| State | Treatment |
|---|---|
| Rest | Per component spec |
| Hover | One-step surface/border shift: `hover:bg-neutral-800`, `hover:border-neutral-700`, or `hover:bg-purple-500` on solid purple. `transition-colors duration-150`. **Color/border/opacity/transform only — never `transition-all`.** |
| Active | One step darker (`active:bg-purple-700`) or `active:scale-[0.98]` on cards/tiles |
| Focus | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950` — keyboard-only, never removed |
| Disabled | `disabled:opacity-50 disabled:pointer-events-none` — no color swap |

Additional rules:

- **Clickable cards** lift subtly: `hover:border-neutral-700
  hover:bg-neutral-900 hover:shadow-card-hover transition-all duration-200` —
  no translate, no scale-up, no purple border on hover (purple border = selected).
- **Selected ≠ hovered.** Selection is purple (`border-purple-500` or
  `bg-purple-600`); hover is neutral. Users must be able to tell them apart.
- **Destructive actions** are neutral until engaged: ghost/outline red
  (`text-red-400 hover:bg-red-500/10`) in menus; solid `bg-red-600` only on
  the final confirm button.
- Anything clickable gets `cursor-pointer`; disabled gets none (pointer-events
  are off).

---

## 8. Motion

Tokens (from config): `animate-fade-in` (0.4s), `animate-slide-in` (0.3s,
8 px rise), `animate-scale-in` (0.2s, from 0.98). `framer-motion` is reserved
for page transitions and the hero.

| Event | Spec |
|---|---|
| Hover/press feedback | 150 ms, `transition-colors` |
| Dropdown / popover open | `animate-scale-in` (origin top) |
| Modal open | overlay `animate-fade-in`, panel `animate-scale-in` |
| Toast in | `animate-slide-in` |
| Page content entry | one `animate-fade-in` on the main container — **not** staggered per-card cascades |
| Progress/loading | `animate-pulse` skeletons; `animate-spin` only on action spinners |

Hard rules: no infinite decorative loops, no scroll-triggered reveals, no
parallax, no animated gradients. Honor reduced motion 🧩 — add once, globally:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. Core component library ✅

`src/components/ui/` — import from `../components/ui`. `cn()` is the className
joiner. **Always reach for these before writing raw markup.**

### Button (`Button.tsx`)
Props: `variant` `primary|secondary|ghost|danger|outline`, `size` `sm|md|lg`,
`loading`, `fullWidth`.
```
primary   → bg-purple-600 text-white hover:bg-purple-500 active:bg-purple-700 shadow-sm
secondary → bg-neutral-800 text-neutral-100 hover:bg-neutral-700 border border-neutral-700
ghost     → text-neutral-300 hover:bg-neutral-800 hover:text-white
danger    → bg-red-600 text-white hover:bg-red-500 active:bg-red-700
outline   → border border-neutral-700 text-neutral-200 hover:border-purple-500 hover:text-white
sizes: sm h-8 px-3 · md h-10 px-4 · lg h-12 px-6  (rounded-lg, font-medium)
```
Focus ring per §7. `loading` swaps in a `Loader2` spinner and disables.
Usage: **one primary per view region.** Secondary for alternates, ghost for
toolbars/menus, outline for "selectable" actions.

### Card (`Card.tsx`)
```
Card       → rounded-xl border border-neutral-800 bg-neutral-900/70 backdrop-blur-sm
             (interactive → hover:border-neutral-700 hover:bg-neutral-900)
CardHeader → p-5 border-b border-neutral-800
CardBody   → p-5
CardTitle  → text-base font-semibold text-white
```

### Badge (`Badge.tsx`)
Props: `tone` `neutral|accent|success|danger|warning`. Bordered pills,
`rounded-full px-2.5 py-0.5 text-xs font-medium border`:
```
neutral → bg-neutral-800 text-neutral-300 border-neutral-700
accent  → bg-purple-500/15 text-purple-300 border-purple-500/30
success → bg-green-500/15 text-green-300 border-green-500/30
danger  → bg-red-500/15 text-red-300 border-red-500/30
warning → bg-amber-500/15 text-amber-300 border-amber-500/30
```

### Input (`Input.tsx`)
Props: `label`, `icon` (leading), `error`.
```
input → h-10 rounded-lg border bg-neutral-900 text-neutral-100 px-3 text-sm
        placeholder:text-neutral-500 border-neutral-700
        focus:border-purple-500 focus:ring-1 focus:ring-purple-500
        (icon → pl-10 ; error → border-red-500/60)
label → text-sm font-medium text-neutral-300
error → text-xs text-red-400
```

### Feedback (`Feedback.tsx`)
- `Spinner` — `Loader2` in `text-purple-500`.
- `LoadingState` — centered spinner + label, `min-h-[40vh]` (route-level only;
  prefer skeletons inside layouts, §12).
- `EmptyState` — dashed `border-neutral-800 bg-neutral-900/40` panel with
  optional icon/title/description/action.

**Icons:** `lucide-react` only, one set app-wide. Default sizes `w-4 h-4`
inline / `w-5 h-5` in chips. Accent icons `text-purple-400`; neutral
`text-neutral-400/500`. **Never use emoji as icons.**

---

## 10. Extended component kit 🧩

Build these into `src/components/ui/` with these exact recipes when a page
first needs them (several pages currently hand-roll approximations — replace
on touch).

### Skeleton
```html
<div class="animate-pulse rounded-lg bg-neutral-800/80 h-4 w-2/3"></div>
```
Compose per layout (avatar circle + two lines, stat block, card grid). Match
the real content's geometry so nothing jumps on load.

### Modal / Dialog
```html
<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
  <div class="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"></div>
  <div class="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-neutral-800
              bg-neutral-900 shadow-xl shadow-black/40 animate-scale-in">
    <div class="flex items-center justify-between p-5 border-b border-neutral-800">
      <h2 class="text-base font-semibold text-white">Title</h2>
      <button class="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white"><X/></button>
    </div>
    <div class="p-5">…</div>
    <div class="flex justify-end gap-2 p-5 border-t border-neutral-800">
      <Button variant="secondary">Cancel</Button><Button>Confirm</Button>
    </div>
  </div>
</div>
```
Mobile: bottom sheet (`items-end`, `rounded-t-2xl`). Esc + overlay click close;
focus trapped; scroll locked.

### Dropdown / Menu
```html
<div class="z-30 min-w-[180px] rounded-xl border border-neutral-700/60 bg-neutral-900
            shadow-xl shadow-black/40 p-1 animate-scale-in origin-top">
  <button class="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm
                 text-neutral-300 hover:bg-neutral-800 hover:text-white">…</button>
  <div class="my-1 h-px bg-neutral-800"></div>
  <button class="… text-red-400 hover:bg-red-500/10">Delete</button>
</div>
```

### Tabs (underline style — default for page sections)
```html
<div class="flex gap-1 border-b border-neutral-800 overflow-x-auto scrollbar-hide">
  <button class="relative px-3.5 py-2.5 text-sm font-medium text-white">
    Active
    <span class="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-purple-500"></span>
  </button>
  <button class="px-3.5 py-2.5 text-sm font-medium text-neutral-400 hover:text-neutral-200">
    Inactive <span class="ml-1.5 text-xs text-neutral-500 tabular-nums">12</span>
  </button>
</div>
```
Segmented control (pill style) for view switchers: container `rounded-lg
bg-neutral-900 border border-neutral-800 p-1`, active segment `bg-neutral-800
text-white rounded-md shadow-sm`.

### Table (desktop) — collapses to cards under `md` (§4)
```html
<div class="rounded-xl border border-neutral-800 overflow-hidden">
  <table class="w-full text-sm">
    <thead>
      <tr class="border-b border-neutral-800 bg-neutral-900/60">
        <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">…</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-neutral-800/70">
      <tr class="hover:bg-neutral-900/60 transition-colors">
        <td class="px-4 py-3 text-neutral-300">…</td>
        <td class="px-4 py-3 text-right tabular-nums text-neutral-300">…</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Toast ✅
Toasts are **`react-hot-toast`** (used app-wide), themed centrally on the
`<Toaster>` in `App.tsx` — never restyle per call site. House theme:
bottom-right, 4 s, `bg #18181b`, `border rgba(63,63,70,.6)`, `rounded-xl`,
`shadow-xl shadow-black/40`, max width `min(92vw, 380px)`; success icon
`#34d399`, error icon `#f87171`. Icon color is the only status signal — the
toast surface stays neutral. Fire with `toast.success('Saved')` /
`toast.error('Couldn't save')` from `react-hot-toast`.

### Tooltip
`z-30 rounded-md bg-neutral-800 border border-neutral-700/60 px-2 py-1 text-xs
text-neutral-200 shadow-lg` — 300 ms hover delay, never contains actions.

### Avatar
`rounded-full bg-neutral-800 text-neutral-300 font-medium` with initials
fallback; sizes `w-6/8/10`. Presence dot: `absolute -bottom-0 -right-0 w-2.5
h-2.5 rounded-full bg-green-500 ring-2 ring-neutral-900`.

### Kbd (shortcuts)
`rounded-md border border-neutral-700 bg-neutral-850 px-1.5 py-0.5 font-mono
text-[11px] text-neutral-400 shadow-[inset_0_-1px_0_rgba(0,0,0,.4)]`.

---

## 11. Page & layout patterns

Reuse these verbatim — they are the house style.

### Page header (replaces saturated banners)
```html
<div class="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 sm:p-8">
  <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent"></div>
  <p class="text-xs font-semibold uppercase tracking-wider text-purple-400 mb-2">Eyebrow</p>
  <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-white">Title</h1>
  <p class="mt-2 text-neutral-400 max-w-3xl leading-relaxed">Description</p>
</div>
```
The 1-px purple hairline is the signature — keep it. Page-level actions sit
top-right inside the header (`flex items-start justify-between`), wrapping
below the title on mobile.

### Dashboard stat card (dark card + icon chip, never a colored slab)
```html
<div class="rounded-xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
  <div class="flex items-center justify-between mb-4">
    <div class="p-2.5 sm:p-3 rounded-lg bg-purple-500/10 text-purple-400"><Icon class="w-5 h-5"/></div>
    <span class="text-2xl sm:text-3xl font-bold text-white tabular-nums">{value}</span>
  </div>
  <h3 class="text-neutral-200 font-semibold text-sm sm:text-base">Label</h3>
  <p class="text-neutral-500 text-xs sm:text-sm">Sub-label</p>
</div>
```
Icon-chip accents by meaning: purple (default), green (completed), amber
(points/streaks). Optional trend: `<span class="text-xs font-medium
text-green-400 tabular-nums">+12%</span>` next to the value — text only, no
pill, no arrow art.

### Accent / CTA banner (subtle tint, not saturated)
```html
<div class="rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-600/15 to-transparent p-6">
  <h3 class="text-xl font-bold text-white">Ready to learn?</h3>
  <p class="mt-1 text-neutral-400">…</p>
  <Button class="mt-4">Explore</Button>
</div>
```
Max one per page. This mono-purple fade is the **only** sanctioned gradient
besides the header hairline.

### Auth pages (single glow + card)
```html
<div class="relative min-h-screen bg-neutral-950 flex items-center justify-center p-4">
  <div class="pointer-events-none absolute inset-0 overflow-hidden">
    <div class="absolute left-1/2 top-0 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-purple-600/10 blur-3xl"></div>
  </div>
  <div class="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/70
              backdrop-blur-sm p-6 sm:p-8 shadow-card">…</div>
</div>
```

### List / feed rows
Rows inside one card with `divide-y divide-neutral-800`, row padding
`px-4 py-3 sm:px-5`, `hover:bg-neutral-900/60`. Layout: leading icon/avatar →
`flex-1 min-w-0` (title `truncate`, meta `text-xs text-neutral-500`) →
trailing action/badge. Whole-row click; secondary actions in a `⋯` menu.

### Filter toolbar
```html
<div class="flex flex-wrap items-center gap-2">
  <Input icon={Search} placeholder="Search…" class="w-full sm:w-64"/>
  <!-- filter pills -->
  <button class="rounded-full border px-3 py-1.5 text-sm font-medium
                 border-neutral-700 text-neutral-300 hover:border-neutral-600
                 data-[active]:border-purple-500/50 data-[active]:bg-purple-500/10 data-[active]:text-purple-300">
    All</button>
  <div class="ms-auto"><Button size="sm">New</Button></div>
</div>
```

### Forms
Single column, `space-y-4`; pair short fields with the form-row grid (§4).
Labels above inputs, helper `text-xs text-neutral-500 mt-1`, errors replace
helpers (`text-xs text-red-400`) with `border-red-500/60` on the field.
Submit row: right-aligned, primary + ghost cancel; sticky bottom bar
(`border-t border-neutral-800 bg-neutral-950/80 backdrop-blur`) on long forms.
Validate on blur, re-validate on change after first error; never on first
keystroke.

### Quiz answers
Container `rounded-xl border p-4`; default `bg-neutral-800 border-neutral-700`;
**selected `bg-purple-600 border-purple-500`**. Letter badge (A/B/C/D): neutral
chip → purple when selected (never Kahoot-multicolor). Results: correct
`bg-green-600`, incorrect `bg-red-600`.

### Progress bars
Track `h-2 rounded-full bg-neutral-800`, fill solid `bg-purple-500` (never a
two-tone gradient), width transition `transition-[width] duration-300`.
Meaning-complete bars may use `bg-green-500`.

---

## 12. UX states: loading, empty, error

**The state-completeness rule:** every data view ships loading + empty + error
+ populated. PRs that add a view without all four are incomplete.

- **Loading:** skeletons (§10) matching the final layout — grids get skeleton
  cards, lists get skeleton rows. Full-screen `LoadingState` only for
  route-level suspense. Buttons show inline `loading`; content areas never
  show a lone centered spinner if the layout is known.
- **Empty (no data yet):** `EmptyState` with icon, one-line title, one-line
  description, and a **primary action** ("No projects yet" → "Create your
  first project"). Empty ≠ blank; it's an onboarding surface.
- **Empty (no results from filter/search):** lighter — "No matches for
  '{query}'" + "Clear filters" ghost button. Do not show the onboarding CTA.
- **Error:** bordered panel `border-red-500/30 bg-red-500/10` with
  `AlertTriangle` in `text-red-400`, human title ("Couldn't load projects"),
  one-line cause if known, and a **Retry** button. Never a raw error string,
  never a dead-end.
- **Optimistic UI** for likes/toggles/small mutations: apply instantly, revert
  + toast on failure. Full-form saves wait for the server with a button
  spinner.

---

## 13. Accessibility standard

- Contrast per §2 table; `text-neutral-500` never carries required information.
- Color never carries meaning alone: status = icon or label + color
  (badge text, toast icon), not a bare colored dot.
- Focus ring (§7) on every interactive element; never `outline-none` without
  the ring replacement. Tab order follows visual order.
- Icon-only buttons require `aria-label`. Decorative icons get
  `aria-hidden="true"`.
- Semantic HTML first: `<button>` for actions, `<a>` for navigation, one `<h1>`
  per page with ordered heading levels, `<nav>`/`<main>` landmarks.
- Modals: focus trap, Esc closes, focus returns to the trigger.
- Forms: `<label htmlFor>` (the `Input` component handles it), errors linked
  via `aria-describedby`, `aria-invalid` on failed fields.
- Respect `prefers-reduced-motion` (§8).
- Touch targets ≥ 44 px on mobile (§4).

---

## 14. Performance budget

Perceived speed is part of the design language.

- **Heavy libs stay lazy:** three.js / recharts / monaco are code-split behind
  `React.lazy` + vendor `manualChunks` in `vite.config.ts`. New heavy deps
  follow the same pattern — the initial app chunk stays under ~300 KB.
- Route-level `React.lazy` for role/secondary pages (already in place — keep
  new routes consistent).
- Skeletons render immediately (no spinner-then-skeleton double loading).
- Images: explicit `width`/`height` or `aspect-*` to prevent layout shift;
  `loading="lazy"` below the fold; `object-cover` in fixed frames.
- Animate only `transform` and `opacity` where possible; no `blur()`
  transitions; `backdrop-blur` only on the few sanctioned surfaces (§2, §4).
- Long feeds paginate or infinite-scroll with `IntersectionObserver` — never
  render unbounded lists.

---

## 15. Anti-generic-design guide

The fastest way to look like template output is to use template moves. Each
banned move has a house replacement — use it.

| ✗ Banned (generic tell) | ✓ House move |
|---|---|
| Dual blurred gradient blobs (purple top-left + blue bottom-right) | One soft purple radial, top-center (§1.7) |
| Full-bleed saturated banner (`bg-gradient-to-r from-X-600 to-Y-600`) | Bordered header card with 1-px purple hairline (§11) |
| Multi-stop / cross-hue gradients (`from-purple via-pink to-blue`) | Mono-purple fade to transparent, or none |
| Gradient text headlines | Solid white, `tracking-tight`; purple on ≤2 words only if the hero truly needs it |
| Emoji as icons (🚀 ✨ 🎯 in cards/headings) | `lucide-react` icon in a tinted chip |
| Colored glow drop-shadows on every card | Borders for separation; `shadow-accent` once per page max |
| Glassmorphism everywhere | Solid `bg-neutral-900`; blur only over glows/images and the sticky header |
| Identical 3-col feature cards, centered icon + title + blurb | Vary density: stat row + list + detail card; left-align content |
| Per-card staggered fade-up on scroll | One fade-in on the container, content just *is there* |
| `rounded-3xl` everything | `rounded-xl` cards / `rounded-lg` controls / `rounded-full` pills |
| Oversized empty whitespace hero inside the app | Dense header card with real data/actions |
| Uppercase tracking on body/buttons | Uppercase for §3 eyebrows only |
| WebGL / animated page backgrounds | Static. (three.js Hyperspeed is opt-in profile-only, lazy-loaded) |
| Kahoot multicolor option tiles | Neutral tiles, purple selection (§11) |
| Placeholder-sounding copy ("Empower your journey") | Plain, specific product language (what it is, what to do) |

**The real anti-slop test:** could this screen ship in Linear or Vercel
without anyone flinching? If a element exists only to "add visual interest,"
remove it — interest comes from real content, good hierarchy, and one or two
signature details.

---

## 16. Signature details

The finishing touches that make the product feel designed, not themed. Sprinkle
deliberately — most screens use two or three, never all.

- **The hairline:** 1-px `via-purple-500/60` gradient line on header cards and
  above key sections — our most recognizable mark.
- **Purple selection + scrollbar:** `::selection` is purple at 35 %; scrollbar
  thumb turns purple on hover (already global).
- **Icon chips:** `p-2.5 rounded-lg bg-purple-500/10 text-purple-400` — the
  standard way an icon gets presence without a color slab.
- **Tabular numerals everywhere data lives** — quiet, but users feel it.
- **Live dot:** `w-2 h-2 rounded-full bg-green-500` + `animate-ping` twin at
  `/40` opacity — for "online"/"live" only, one per view.
- **Count pills in tabs/nav:** `text-xs text-neutral-500 tabular-nums` after
  the label — density without clutter.
- **`<kbd>` hints** (§10) in tooltips and search inputs (`/` to focus, `⌘K`).
- **Dashed-border affordances:** dashed `border-neutral-800` for "add new"
  tiles and drop zones — dashed always means "nothing here yet, act."
- **Focus ring offset:** rings sit 2 px off on `ring-offset-neutral-950`, so
  keyboard focus looks crafted, not default.

---

## 17. File map

| Concern | File |
|---|---|
| Tokens: colors, fonts, radius, shadow, motion | `tailwind.config.js` |
| Global base, scrollbar, selection, focus, headings, mobile safe-area | `src/styles/index.css`, `src/styles/global.css` |
| Web fonts (Inter, JetBrains Mono) | `index.html` |
| UI primitives ✅ | `src/components/ui/` (Button, Card, Badge, Input, Feedback, cn) |
| Extended kit 🧩 | add to `src/components/ui/` per §10 recipes |
| Shared chrome | `src/components/Navbar.tsx`, `MobileBottomNav.tsx` |
| Reference pages (clean patterns) | `HomeEnhanced`, `Login`, `Register`, `ModuleLearningEnhanced`, `StudentLearningDashboard` |
| Charts | `components/*Analytics*` — purple-monochrome series, neutral axes |

---

## 18. Enhancement roadmap

Priorities for the next design passes, in order:

1. **Extended kit extraction (§10).** Pages hand-roll modals, tabs, tables,
   and toasts today — extract to `ui/` on first touch of each page; do not
   restyle in place.
2. **State completeness sweep (§12).** Audit data views for missing
   skeleton/empty/error states; the fastest UX win available.
3. **Structural rebuilds.** Large pages not yet on `ui/` primitives (already
   color-consistent): `ProjectsEnhanced`, `CommunityEnhanced`, `ProjectDetail`,
   `InstructorDashboard` (4.6 k lines — split into components first).
4. **Responsive tables.** Convert any horizontally-scrolling tables to the
   card-collapse pattern (§4).
5. **Reduced-motion + z-index tokens.** Two small global additions (§6, §8).

Working rules for any enhancement agent:

- The `tailwind.config.js` remap is the leverage point — changing a ramp
  re-themes the app. Keep the five-ramp model; never reintroduce raw
  multi-hue families.
- Keep new heavy deps behind `React.lazy` + `manualChunks` (§14).
- Verify at 375 / 768 / 1280, dark theme only, before calling a change done.
- When this document and a page disagree, the document wins — fix the page.
