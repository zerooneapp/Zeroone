import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'force-exit-after-build',
      apply: 'build',
      closeBundle() {
        setTimeout(() => process.exit(0), 1000);
      }
    }
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5003'
    }
  }
})
