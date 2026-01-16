import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,          // Allows network access (same as --host)
    allowedHosts: true,  // Bypasses the block for ANY tunnel URL
  }
})