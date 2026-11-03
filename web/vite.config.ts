import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import { execSync } from 'node:child_process'

const appVersion = process.env.APP_VERSION || (() => {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'dev'
  }
})()

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Series Tracker',
        short_name: 'Serie',
        start_url: '/',
        display: 'standalone',
        background_color: '#f7f7fb',
        theme_color: '#f7f7fb',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      includeAssets: ['apple-touch-icon.png', 'favicon-48.png'],
      workbox: { navigateFallbackDenylist: [/^\/api/] },
    }),
  ],
  server: { proxy: { '/api': 'http://localhost:3000' } },
})
