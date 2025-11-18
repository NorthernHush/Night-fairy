/*
  *  The main config for setting up hosting and rest API requests to the backend for payment.
*/
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5179, // * port for localhost by start, may switch
    host: true,
    allowedHosts: [
      'transcondyloid-marcellus-subangularly.ngrok-free.dev', // * ngrok http server, may another url(but no localhost)
      'localhost',
      '127.0.0.1'
    ],
    proxy: {
      '/api': {
        target: 'https://transcondyloid-marcellus-subangularly.ngrok-free.dev', // * for rest api payment request
        changeOrigin: true,
        secure: false
      }
    }
  }
})