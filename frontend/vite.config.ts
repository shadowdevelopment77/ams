import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icons/apple-touch-icon.png'],
      manifest: {
        name: 'AMS — Workforce Attendance',
        short_name: 'AMS',
        description: 'Attendance, checklist, and visit-log management for outsourced field staff.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
  },
})
