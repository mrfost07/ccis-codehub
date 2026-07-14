/** @type {import('tailwindcss').Config} */

// ── CCIS-CodeHub design system ───────────────────────────────────────────────
// A disciplined black/white + purple system. Every color family the codebase
// already uses is remapped onto one of five semantic ramps, so all ~40 pages
// adopt the same language without per-page edits:
//   neutral base  ← slate, gray, zinc, stone, neutral
//   purple accent ← purple, violet, indigo, blue, sky, cyan, teal, fuchsia, pink
//   success       ← green, emerald
//   danger        ← red, rose
//   warning       ← amber, yellow, orange
// Multi-color "AI-slop" gradients collapse into clean monochrome-purple tones.

const neutral = {
  50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8',
  400: '#a1a1aa', 500: '#71717a', 600: '#52525b', 700: '#3f3f46',
  800: '#27272a', 850: '#1f1f23', 900: '#18181b', 950: '#0a0a0b',
}

const purple = {
  50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd',
  400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9',
  800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065',
}

const green = {
  50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7',
  400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857',
  800: '#065f46', 900: '#064e3b', 950: '#022c22',
}

const red = {
  50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5',
  400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
  800: '#991b1b', 900: '#7f1d1d', 950: '#450a0a',
}

const amber = {
  50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
  400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
  800: '#92400e', 900: '#78350f', 950: '#451a03',
}

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Neutral base (black → white)
        slate: neutral, gray: neutral, zinc: neutral, stone: neutral, neutral,
        // Purple accent — everything decorative unifies here
        primary: purple, purple, violet: purple, indigo: purple, blue: purple,
        sky: purple, cyan: purple, teal: purple, fuchsia: purple, pink: purple,
        // Functional status
        green, emerald: green, red, rose: red, amber, yellow: amber, orange: amber,
        // Semantic aliases (used by the ui/ component library)
        surface: {
          DEFAULT: '#0a0a0b', // app background (near-black)
          raised: '#18181b',  // cards
          overlay: '#1f1f23', // popovers / inputs
        },
        accent: purple,
      },
      fontFamily: {
        sans: [
          'Inter', 'ui-sans-serif', 'system-ui', '-apple-system',
          'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif',
        ],
        mono: [
          'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo',
          'Consolas', 'monospace',
        ],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      boxShadow: {
        // Soft, neutral elevation (no colored glows)
        card: '0 1px 2px 0 rgba(0,0,0,0.4), 0 1px 3px 0 rgba(0,0,0,0.3)',
        'card-hover': '0 4px 12px -2px rgba(0,0,0,0.5)',
        // A single restrained purple focus glow for accents
        accent: '0 0 0 1px rgba(139,92,246,0.4), 0 8px 24px -6px rgba(139,92,246,0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideIn: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.98)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
