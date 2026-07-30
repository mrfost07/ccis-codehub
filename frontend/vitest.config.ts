import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * Test config, deliberately separate from vite.config.ts.
 *
 * Keeping it out of the build config means the production build cannot break
 * because of a test setting, and vite.config.ts keeps importing defineConfig
 * from 'vite' rather than 'vitest/config'. Vitest prefers this file when both
 * exist.
 *
 * No path aliases here on purpose: tsconfig declares "@/*" but vite.config.ts
 * never implemented it, so nothing in src/ can be using it (the build would
 * fail). Adding it here would let tests resolve imports the app cannot.
 *
 * globals: false — tests import describe/it/expect from 'vitest' explicitly.
 * tsconfig only lists "vite/client" in types, and `npm run build` runs tsc over
 * src/, so relying on globals would make the production build fail on unknown
 * names unless tsconfig were also changed.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    restoreMocks: true,
    clearMocks: true,
  },
})
