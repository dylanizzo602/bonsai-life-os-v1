import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite config: React plugin and Tailwind CSS v4 plugin for utility-first styles
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Server: explicit host so Cursor Simple Browser and other tools can connect
  server: {
    host: true,
    strictPort: true,
    port: 5173,
  },
})
