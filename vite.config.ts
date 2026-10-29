import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATIC_SPA_ROUTES = [
  'kiblat',
  'qibla',
  'arah-kiblat',
  'shalat',
  'salat',
  'jadwal-shalat',
  'jadwal-salat',
  'adzan',
  'doa',
  'dzikir',
  'surat',
  'mushaf',
  'quran',
  'hijriah',
  'hijri',
  'kalender-hijriah',
  'bookmark',
  'bookmarks',
  'tersimpan',
  'cari',
  'search',
  'lainnya',
  'more',
  'pengaturan',
  'settings',
  'tentang',
  'about',
];

/**
 * Generates static `<route>/index.html` and `404.html` copies inside `dist/`
 * after the Vite build completes so that Vercel Edge (and any static host)
 * resolves direct requests like `https://quran.ziezan.id/kiblat/` at the
 * filesystem level with HTTP 200 OK in addition to `vercel.json` rewrites.
 */
function ziezanSpaStaticRoutesPlugin(): Plugin {
  return {
    name: 'ziezan-spa-static-routes',
    apply: 'build',
    enforce: 'post',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const indexHtmlPath = path.join(distDir, 'index.html');
      if (!fs.existsSync(indexHtmlPath)) return;

      const htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');

      // 1. Emit dist/404.html fallback
      fs.writeFileSync(path.join(distDir, '404.html'), htmlContent, 'utf-8');

      // 2. Emit dist/<route>/index.html for all primary clean routes
      for (const route of STATIC_SPA_ROUTES) {
        const routeDir = path.join(distDir, route);
        fs.mkdirSync(routeDir, { recursive: true });
        fs.writeFileSync(path.join(routeDir, 'index.html'), htmlContent, 'utf-8');
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icons/ziezan-quran.png',
          'assets/aistudio/bg-landscape_42f05623.png',
          'assets/aistudio/bg-potrait_806f7ab7.png',
          'assets/aistudio/Logo_Embi_Tech_c7a9c101.png',
          'assets/aistudio/Logo_KPM_b0b5caf5.png',
          'assets/aistudio/Logo-BBPVP-Bekasi_ee05602a.png',
          'audio/adzan-chime.wav',
          'audio/shalat-reminder.wav',
          'icon.svg',
          'favicon.png',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'robots.txt',
          'sitemap.xml',
          'llms.txt',
        ],
        manifest: {
          id: '/',
          name: "Ziezan Quran — Al-Qur'an Digital & Ibadah Offline",
          short_name: 'Ziezan Quran',
          description:
            "Aplikasi Al-Qur'an Digital 114 Surat (6.236 Ayat), Tajwid Berwarna, Doa & Dzikir, Jadwal Salat, Arah Kiblat & Kalender Hijriah dengan Arsitektur Offline-First.",
          theme_color: '#035328',
          background_color: '#035328',
          display: 'standalone',
          display_override: ['standalone', 'window-controls-overlay', 'minimal-ui'],
          orientation: 'any',
          start_url: '/',
          scope: '/',
          lang: 'id',
          dir: 'ltr',
          prefer_related_applications: false,
          categories: ['lifestyle', 'education', 'utilities', 'books'],
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
            {
              src: '/icons/ziezan-quran.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
          ],
          shortcuts: [
            {
              name: "Al-Qur'an Digital",
              short_name: "Al-Qur'an",
              description: "Membaca 114 Surat Al-Qur'an Digital Offline",
              url: '/surat/',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'Jadwal Salat & Adzan',
              short_name: 'Adzan',
              description: 'Jadwal Salat & Pengingat Suara Adzan',
              url: '/shalat/',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'Doa & Dzikir Harian',
              short_name: 'Doa',
              description: 'Kumpulan Doa & Dzikir Harian Shahih',
              url: '/doa/',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'Arah Kiblat',
              short_name: 'Kiblat',
              description: "Kompas Presisi Arah Ka'bah",
              url: '/kiblat/',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,wav,woff,woff2,txt,xml,webmanifest}'],
          globIgnores: [
            '**/404.html',
            ...STATIC_SPA_ROUTES.map((route) => `**/${route}/index.html`),
          ],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [
            /^\/api\//,
            /^\/robots\.txt$/,
            /^\/sitemap\.xml$/,
            /^\/llms\.txt$/,
            /^\/manifest\.webmanifest$/,
            /^\/manifest\.json$/,
          ],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/equran\.id\/api\/(v2|doa).*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'equran-api-v2-and-doa-cache-v3',
                networkTimeoutSeconds: 6,
                expiration: {
                  maxEntries: 400,
                  maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/api\.mabims\.dev\/api\/v1\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'mabims-hijri-api-cache-v3',
                networkTimeoutSeconds: 6,
                expiration: {
                  maxEntries: 150,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/api\.housemuslim\.org\/api\/v1\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'housemuslim-qibla-api-cache-v3',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 120,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/cdn\.equran\.id\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'equran-audio-cache-v3',
                expiration: {
                  maxEntries: 150,
                  maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache-v3',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache-v3',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
      ziezanSpaStaticRoutesPlugin(),
    ],
    build: {
      sourcemap: false,
      target: 'es2020',
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules')) {
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('motion')) return 'vendor-motion';
              if (id.includes('react')) return 'vendor-react';
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

