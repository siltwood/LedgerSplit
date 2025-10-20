import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ['localtest.ngrok-free.app'],
    proxy: {
      '/api': {
        target: 'https://chromous-unattributabley-yee.ngrok-free.dev',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
