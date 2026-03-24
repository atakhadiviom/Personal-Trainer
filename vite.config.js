import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'NovaFit AI Gym Trainer',
        short_name: 'NovaFit',
        description: 'Your personalized 12-week AI fitness transformation program.',
        theme_color: '#141210',
        background_color: '#141210',
        display: 'standalone',
        background_color: '#141210'
      }
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: true,
  }
})
