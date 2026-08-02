import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      manifestFilename: 'manifest.webmanifest',

      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-512x512.png',
      ],

      manifest: {
        id: '/',
        name: 'Haymclub | إدارة الأكاديميات الرياضية',
        short_name: 'Haymclub',

        description:
          'منصة متكاملة لإدارة الأكاديميات الرياضية والمتدربين والمجموعات والاشتراكات والحضور.',

        lang: 'ar',
        dir: 'rtl',

        start_url: '/',
        scope: '/',

        display: 'standalone',
        orientation: 'any',

        background_color: '#0f172a',
        theme_color: '#2563eb',

        categories: [
          'sports',
          'business',
          'education',
          'productivity',
        ],

        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,

        navigateFallback: '/index.html',

        navigateFallbackDenylist: [
          /^\/api(?:\/|$)/,
        ],

        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,webp,woff,woff2}',
        ],
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],

  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,

    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,

    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
