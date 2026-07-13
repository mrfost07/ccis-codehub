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
    rollupOptions: {
      output: {
        // Split heavy libraries into their own cacheable chunks so the initial
        // load stays small and vendor code is cached across app deploys.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (id.includes('monaco-editor') || id.includes('@monaco-editor')) return 'monaco'
          if (id.includes('/three/') || id.includes('three-')) return 'three'
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory-')) return 'charts'
          if (id.includes('framer-motion')) return 'motion'
          if (
            id.includes('react-markdown') || id.includes('remark') ||
            id.includes('micromark') || id.includes('mdast') ||
            id.includes('prismjs') || id.includes('katex') || id.includes('hast')
          ) return 'markdown'
          if (
            id.includes('/react/') || id.includes('/react-dom/') ||
            id.includes('react-router') || id.includes('@tanstack')
          ) return 'react-vendor'
          return 'vendor'
        },
      },
    },
  },
})

