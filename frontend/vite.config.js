import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectRegister: null,
      injectManifest: {
        globPatterns: [],
        injectionPoint: 'self.__WB_MANIFEST',
        minify: false,
        rollupOptions: {
          output: {
            format: 'es',
          },
          treeshake: false,
        },
      },
      manifest: {
        name: 'CCB — Controle de Presenças',
        short_name: 'CCB Presenças',
        description: 'Sistema de controle de presença de jovens e menores da CCB',
        start_url: '/',
        display: 'standalone',
        background_color: '#1c1917',
        theme_color: '#1c1917',
        lang: 'pt-BR',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
