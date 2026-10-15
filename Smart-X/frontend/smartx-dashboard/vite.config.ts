import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Read VITE_* settings (Firebase etc.) from Smart-X/.env, the same file
  // docker-compose uses, so there is only one place to configure them.
  envDir: '../..',

  server: {
    port: 5173,

    // In development the dashboard calls "/api/..." on its own address and
    // Vite forwards those calls to the .NET API, exactly like nginx does in
    // Docker. No CORS or HTTPS certificate setup is needed.
    proxy: {
      '/api': {
        target: 'http://localhost:5217',
        changeOrigin: true,
      },
    },
  },
})
