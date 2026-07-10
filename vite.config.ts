import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  // Served from https://seehiong.github.io/md-editor-pro/
  base: '/md-editor-pro/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Markdown Editor Pro',
        short_name: 'MD Editor',
        description: 'Local-first markdown editor with math, Mermaid diagrams and live preview',
        theme_color: '#2563eb',
        background_color: '#0d1117',
        display: 'standalone',
        start_url: '/md-editor-pro/',
        scope: '/md-editor-pro/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // The main chunk (mermaid + katex) exceeds the 2 MB default
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
