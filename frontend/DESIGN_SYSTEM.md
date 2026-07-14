# CCIS-CodeHub — Frontend Design System

> Reference for the current design language. Hand this to an enhancing agent
> (Fable) as the source of truth for colors, type, components, and patterns.
> The system is intentionally restrained: **near-black base + white text + a
> single purple accent**, with green/red/amber reserved for status only.

---

## 1. Design philosophy

- **Black / white + purple.** Backgrounds are near-black neutrals, text is
  near-white, and **purple is the only decorative accent**. No multi-color
  gradients, no rainbow.
- **Status colors are functional, not decorative.** Green = success, red =
  error/destructive, amber = warning. Use them sparingly, never as chrome.
- **No "AI slop."** Banned: dual blurred gradient blobs, saturated full-bleed
  color banners, multi-stop rainbow gradients, WebGL/animated page backgrounds.
- **Surfaces over slabs.** Content sits on dark bordered cards, not on saturated
  color blocks. Accents are thin lines, small icon chips, and bordered pills.
- **One restrained glow.** Where a page wants ambiance, use a single soft purple
  radial glow (`bg-purple-600/10 blur-3xl`) — never two competing blobs.

---

## 2. Color system

All colors are driven from `tailwind.config.js`. Every legacy Tailwind color
family the codebase used is **remapped** onto five semantic ramps, so the whole
app is consistent without per-page edits. Multi-color gradients collapse to
mono-purple automatically.

### Remap table (what each utility family resolves to)

| Semantic ramp | Source families remapped onto it |
|---|---|
| **neutral** (base) | `slate`, `gray`, `zinc`, `stone`, `neutral` |
| **purple** (accent) | `purple`, `primary`, `violet`, `indigo`, `blue`, `sky`, `cyan`, `teal`, `fuchsia`, `pink` |
| **green** (success) | `green`, `emerald` |
| **red** (danger) | `red`, `rose` |
| **amber** (warning) | `amber`, `yellow`, `orange` |

> So `bg-indigo-600`, `text-blue-400`, `from-cyan-500` all render as purple.
> `text-emerald-400` renders green, `bg-rose-500` renders red, etc.

### Neutral ramp (base — pure grayscale)

```
50 #fafafa   100 #f4f4f5  200 #e4e4e7  300 #d4d4d8
400 #a1a1aa  500 #71717a  600 #52525b  700 #3f3f46
800 #27272a  850 #1f1f23  900 #18181b  950 #0a0a0b
```

### Purple ramp (accent)

```
50 #f5f3ff   100 #ede9fe  200 #ddd6fe  300 #c4b5fd
400 #a78bfa  500 #8b5cf6  600 #7c3aed  700 #6d28d9
800 #5b21b6  900 #4c1d95  950 #2e1065
```
Primary accent = **`purple-500 #8b5cf6`** (glow/borders), **`purple-600 #7c3aed`** (solid buttons).

### Status ramps

- **green**: `500 #10b981` … `400 #34d399`
- **red**: `500 #ef4444` … `600 #dc2626`
- **amber**: `500 #f59e0b` … `400 #fbbf24`

### Semantic surface tokens

```
surface.DEFAULT #0a0a0b   // app background (near-black, = neutral-950)
surface.raised  #18181b   // cards (= neutral-900)
surface.overlay #1f1f23   // popovers / inputs (= neutral-850)
accent          → purple ramp
```

### Usage conventions

- Page background: `bg-neutral-950` (#0a0a0b).
- Card surface: `bg-neutral-900` / `bg-neutral-900/70` with `border-neutral-800`.
- Body text: `text-neutral-100`/`text-white`; secondary `text-neutral-400`; muted `text-neutral-500`.
- Accent text/icon: `text-purple-400`; accent fill `bg-purple-600`.
- Borders: `border-neutral-800` (cards), `border-neutral-700` (inputs/controls).

---

## 3. Typography

Fonts are loaded in `index.html` (Google Fonts) and set in `tailwind.config.js`.

- **Sans (UI/body):** `Inter` → system-ui fallback. Weights 400/500/600/700/800.
- **Mono (code):** `JetBrains Mono` → ui-monospace fallback. Weights 400/500.

```
font-sans: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, …
font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace
```

### Headings (global, from `styles/global.css`)

```css
h1–h6 { font-weight: 700; letter-spacing: -0.02em; color: #fafafa; }
```

### Type scale in use (Tailwind classes)

| Role | Classes |
|---|---|
| Page title (h1) | `text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white` |
| Section title (h2/h3) | `text-lg sm:text-xl font-bold text-white` |
| Card title | `text-base font-semibold text-white` |
| Body | `text-sm` / `text-base` `text-neutral-300` |
| Secondary / description | `text-sm text-neutral-400 leading-relaxed` |
| Muted / meta | `text-xs text-neutral-500` |
| Big stat number | `text-3xl font-bold text-white` |

Base body: `#fafafa` on `#0a0a0b`, antialiased, `text-rendering: optimizeLegibility`.

---

## 4. Radius, spacing, elevation, motion

From `tailwind.config.js`:

- **Radius:** default Tailwind + `xl 0.875rem`, `2xl 1.125rem`. Cards use `rounded-xl`/`rounded-2xl`; buttons/inputs `rounded-lg`; pills `rounded-full`.
- **Shadows (neutral, no colored glow):**
  - `shadow-card` → `0 1px 2px rgba(0,0,0,.4), 0 1px 3px rgba(0,0,0,.3)`
  - `shadow-card-hover` → `0 4px 12px -2px rgba(0,0,0,.5)`
  - `shadow-accent` → single restrained purple focus glow (use rarely)
- **Motion:** `animate-fade-in` (0.4s), `animate-slide-in` (0.3s), `animate-scale-in` (0.2s). Prefer subtle; `framer-motion` used for page/hero transitions.
- **Spacing:** cards `p-5`/`p-6`; page gutters `px-4 sm:px-6 lg:px-8`; max width `max-w-6xl`/`max-w-7xl mx-auto`.

---

## 5. Global CSS (`src/styles/global.css`)

- App background `#0a0a0b`, text `#fafafa`, Inter.
- **Selection:** `::selection { background: rgba(139,92,246,.35); color:#fff }`.
- **Focus ring:** `:focus-visible { outline: 2px solid #8b5cf6; outline-offset: 2px }`.
- **Scrollbar:** thin, thumb `#3f3f46` (neutral-700), **hover → `#8b5cf6` (purple)**, transparent track, rounded.
- `html { scroll-behavior: smooth }`.
- Mobile bottom-nav safe-area padding for `.min-h-screen` page wrappers (< 768px).

---

## 6. Component library (`src/components/ui/`)

Import from `../components/ui`. `cn()` is a tiny className joiner.

### Button (`Button.tsx`)
Props: `variant` `primary|secondary|ghost|danger|outline`, `size` `sm|md|lg`, `loading`, `fullWidth`.
```
primary   → bg-purple-600 text-white hover:bg-purple-500 active:bg-purple-700
secondary → bg-neutral-800 text-neutral-100 hover:bg-neutral-700 border border-neutral-700
ghost     → text-neutral-300 hover:bg-neutral-800 hover:text-white
danger    → bg-red-600 text-white hover:bg-red-500
outline   → border border-neutral-700 hover:border-purple-500
sizes: sm h-8 px-3 · md h-10 px-4 · lg h-12 px-6   (rounded-lg, font-medium)
```
Focus: `ring-2 ring-purple-500 ring-offset-2 ring-offset-neutral-950`. `loading` shows a `Loader2` spinner.

### Card (`Card.tsx`)
```
Card      → rounded-xl border border-neutral-800 bg-neutral-900/70 backdrop-blur-sm
            (interactive → hover:border-neutral-700 hover:bg-neutral-900)
CardHeader → p-5 border-b border-neutral-800
CardBody   → p-5
CardTitle  → text-base font-semibold text-white
```

### Badge (`Badge.tsx`)
Props: `tone` `neutral|accent|success|danger|warning`. Bordered pills:
```
neutral → bg-neutral-800 text-neutral-300 border-neutral-700
accent  → bg-purple-500/15 text-purple-300 border-purple-500/30
success → bg-green-500/15 text-green-300 border-green-500/30
danger  → bg-red-500/15 text-red-300 border-red-500/30
warning → bg-amber-500/15 text-amber-300 border-amber-500/30
(rounded-full px-2.5 py-0.5 text-xs font-medium border)
```

### Input (`Input.tsx`)
Props: `label`, `icon` (leading), `error`.
```
input → h-10 rounded-lg border bg-neutral-900 text-neutral-100
        placeholder:text-neutral-500 px-3 text-sm
        focus:border-purple-500 focus:ring-1 focus:ring-purple-500
        (icon → pl-10 ; error → border-red-500/60)
label → text-sm font-medium text-neutral-300
error → text-xs text-red-400
```

### Feedback (`Feedback.tsx`)
- `Spinner` — `Loader2` in `text-purple-500`.
- `LoadingState` — centered spinner + label, `min-h-[40vh]`.
- `EmptyState` — dashed `border-neutral-800 bg-neutral-900/40` panel with optional icon/title/description/action.

**Icons:** `lucide-react` is the single icon set. Accent icons `text-purple-400`; neutral icons `text-neutral-400/500`.

---

## 7. Established layout patterns (reuse these verbatim)

### Page header (replaces saturated banners)
```html
<div class="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 sm:p-8">
  <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent"></div>
  <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">Title</h1>
  <p class="text-neutral-400 max-w-3xl leading-relaxed">Description</p>
</div>
```

### Dashboard stat card (dark card + icon chip, NOT a colored slab)
```html
<div class="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
  <div class="flex items-center justify-between mb-4">
    <div class="p-3 rounded-lg bg-purple-500/10 text-purple-400"><Icon/></div>
    <span class="text-3xl font-bold text-white">{value}</span>
  </div>
  <h3 class="text-neutral-200 font-semibold">Label</h3>
  <p class="text-neutral-500 text-sm">Sub-label</p>
</div>
```
Icon-chip accents by meaning: purple (default/accent), green (completed), amber (points/warning).

### Accent / hero call-to-action banner (subtle tint, not saturated)
```html
<div class="rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-600/15 to-transparent p-6">
  <h3 class="text-xl font-bold text-white">Ready to learn?</h3>
  <p class="text-neutral-400">…</p>
  <button class="bg-purple-600 hover:bg-purple-500 text-white rounded-lg px-5 py-2.5 font-semibold">Explore</button>
</div>
```

### Auth pages (single glow + card)
```html
<div class="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
  <div class="pointer-events-none absolute inset-0 overflow-hidden">
    <div class="absolute left-1/2 top-0 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-purple-600/10 blur-3xl"></div>
  </div>
  <div class="rounded-2xl border border-neutral-800 bg-neutral-900/70 backdrop-blur-sm p-6 sm:p-8 shadow-card">…</div>
</div>
```

### Quiz answer options
- Container: `rounded-xl border p-4`; default `bg-neutral-800 border-neutral-700`; **selected `bg-purple-600 border-purple-500`**.
- Letter badge (A/B/C/D): neutral chip → purple when selected (never Kahoot-multicolor).
- Result states: correct `bg-green-600`, incorrect `bg-red-600`.

### Progress bars
Solid `bg-purple-500` (never a two-tone gradient).

---

## 8. Do / Don't

**Do**
- Use dark bordered cards, thin purple accent lines, bordered pills, icon chips.
- Keep purple as the only accent; keep green/red/amber for status only.
- Use a single soft purple radial glow for ambiance.
- Use `lucide-react` icons and the `ui/` components.

**Don't**
- Full-bleed saturated color banners (`bg-gradient-to-r from-X-600 to-Y-600`).
- Dual blurred gradient **blobs** behind cards.
- Multi-stop / cross-hue gradients (`from-purple via-pink to-blue`).
- WebGL / animated page backgrounds (three.js Hyperspeed is opt-in profile-only, lazy-loaded).
- Colored drop-shadow "glow" on everything.

---

## 9. File map

| Concern | File |
|---|---|
| Tokens: colors, fonts, radius, shadow, motion | `tailwind.config.js` |
| Global base, scrollbar, selection, focus, headings | `src/styles/index.css`, `src/styles/global.css` |
| Web fonts (Inter, JetBrains Mono) | `index.html` |
| UI primitives | `src/components/ui/` (Button, Card, Badge, Input, Feedback, cn) |
| Shared chrome | `src/components/Navbar.tsx`, `MobileBottomNav.tsx` |
| Reference pages (clean patterns) | `HomeEnhanced`, `Login`, `Register`, `ModuleLearningEnhanced`, `StudentLearningDashboard` |

---

## 10. Notes for enhancement (Fable)

- The color remap in `tailwind.config.js` is the leverage point: changing a ramp
  re-themes the whole app. Keep the five-ramp model; don't reintroduce raw
  multi-hue families.
- Large pages **not yet structurally rebuilt** with `ui/` (already color-consistent):
  `ProjectsEnhanced`, `CommunityEnhanced`, `ProjectDetail`, `InstructorDashboard`
  (4.6k lines — split into components). These are the best targets for deeper polish.
- Charts use a purple-monochrome palette with neutral axes (see `components/*Analytics*`).
- Heavy libs are code-split (three.js/recharts/monaco lazy) — keep new heavy deps
  behind `React.lazy` + the vendor `manualChunks` in `vite.config.ts`.
- Verify visual changes at mobile (375), tablet (768), desktop (1280); dark theme only.
