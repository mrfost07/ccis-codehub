import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: false,
    host: true,  // This allows access from localhost, 127.0.0.1, and network
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 900,
    // NOTE: no manualChunks.
    //
    // The previous config pulled react/react-dom into a "react-vendor" chunk
    // while React-dependent libraries (recharts, framer-motion, monaco,
    // react-markdown …) fell through to "vendor". Rollup then emitted "vendor"
    // ahead of "react-vendor", so those libraries ran before React existed and
    // the app died on load with:
    //
    //     TypeError: Cannot read properties of undefined (reading 'memo')
    //
    // producing a blank page in production only — dev serves unbundled modules,
    // so the ordering problem never appears there.
    //
    // Rollup's automatic chunking already splits by the real import graph and
    // gets the ordering right. Route-level code splitting (React.lazy in
    // App.tsx) is what actually keeps the initial payload small. If manual
    // chunks are ever reintroduced, every React-dependent package must sit in
    // the SAME chunk as react/react-dom, and the built output must be verified
    // by serving dist/ — not just by a successful build.
  },
})

