import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@admin': path.resolve(__dirname, 'src/admin'),
    },
  },
  server: {
    host: true, // Listen on all network interfaces
    port: 5173,
    fs: {
      allow: ['..'], // Allow serving files from parent directory
    },
  }
})
