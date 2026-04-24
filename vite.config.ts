import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite config: React plugin and Tailwind CSS v4 plugin for utility-first styles
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Build: split large vendor deps into stable chunks and adjust warning threshold
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          tiptap: [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-placeholder',
          ],
          date: ['luxon', 'chrono-node'],
          csv: ['papaparse'],
        },
      },
    },
  },
  // Server: explicit host so Cursor Simple Browser and other tools can connect
  server: {
    host: true,
    strictPort: true,
    port: 5173,
  },
})
