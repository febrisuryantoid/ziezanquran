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
  'surah',
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
  'pengaturan',
  'settings',
  'tentang',
  'about',
];

const ROUTE_SEO_META: Record<
  string,
  { title: string; description: string; canonicalPath: string; noindex?: boolean }
> = {
  shalat: {
    title: 'Jadwal Salat & Adzan Seluruh Indonesia Hari Ini — Ziezan Quran',
    description:
      'Jadwal Imsak, Subuh, Terbit, Duha, Zuhur, Asar, Magrib, dan Isya resmi seluruh provinsi & kabupaten/kota di Indonesia lengkap hitung mundur dan pengingat adzan di https://quran.ziezan.id.',
    canonicalPath: '/shalat/',
  },
  salat: {
    title: 'Jadwal Salat & Adzan Seluruh Indonesia Hari Ini — Ziezan Quran',
    description:
      'Jadwal Imsak, Subuh, Terbit, Duha, Zuhur, Asar, Magrib, dan Isya resmi seluruh provinsi & kabupaten/kota di Indonesia di https://quran.ziezan.id.',
    canonicalPath: '/shalat/',
  },
  'jadwal-shalat': {
    title: 'Jadwal Salat & Adzan Seluruh Indonesia Hari Ini — Ziezan Quran',
    description:
      'Jadwal Imsak, Subuh, Terbit, Duha, Zuhur, Asar, Magrib, dan Isya resmi seluruh Indonesia di https://quran.ziezan.id.',
    canonicalPath: '/shalat/',
  },
  'jadwal-salat': {
    title: 'Jadwal Salat & Adzan Seluruh Indonesia Hari Ini — Ziezan Quran',
    description:
      'Jadwal Imsak, Subuh, Terbit, Duha, Zuhur, Asar, Magrib, dan Isya resmi seluruh Indonesia di https://quran.ziezan.id.',
    canonicalPath: '/shalat/',
  },
  adzan: {
    title: 'Jadwal Salat & Adzan Seluruh Indonesia Hari Ini — Ziezan Quran',
    description:
      'Jadwal waktu salat dan pengingat suara adzan seluruh Indonesia di https://quran.ziezan.id.',
    canonicalPath: '/shalat/',
  },
  kiblat: {
    title: "Penentu Arah Kiblat & Kompas Ka'bah Akurat — Ziezan Quran",
    description:
      'Hitung derajat arah kiblat presisi (Great-Circle & Geodesik WGS-84) menuju Masjid al-Haram, Makkah lengkap kompas visual di https://quran.ziezan.id.',
    canonicalPath: '/kiblat/',
  },
  qibla: {
    title: "Penentu Arah Kiblat & Kompas Ka'bah Akurat — Ziezan Quran",
    description:
      'Hitung derajat arah kiblat presisi menuju Masjid al-Haram, Makkah di https://quran.ziezan.id.',
    canonicalPath: '/kiblat/',
  },
  'arah-kiblat': {
    title: "Penentu Arah Kiblat & Kompas Ka'bah Akurat — Ziezan Quran",
    description:
      'Hitung derajat arah kiblat presisi menuju Masjid al-Haram, Makkah di https://quran.ziezan.id.',
    canonicalPath: '/kiblat/',
  },
  doa: {
    title: 'Kumpulan Doa & Dzikir Harian Lengkap (Arab, Latin & Arti) — Ziezan Quran',
    description:
      'Kumpulan doa dan dzikir harian shahih lengkap teks Arab, transliterasi Latin, terjemahan bahasa Indonesia, dan referensi hadis di https://quran.ziezan.id.',
    canonicalPath: '/doa/',
  },
  dzikir: {
    title: 'Kumpulan Doa & Dzikir Harian Lengkap (Arab, Latin & Arti) — Ziezan Quran',
    description:
      'Kumpulan doa dan dzikir harian shahih lengkap teks Arab, Latin, dan terjemahan Indonesia di https://quran.ziezan.id.',
    canonicalPath: '/doa/',
  },
  surat: {
    title: "Daftar 114 Surat Al-Qur'an Lengkap (Juz 1 - 30) — Ziezan Quran",
    description:
      "Indeks lengkap 114 Surat Al-Qur'an (Makkiyah, Madaniyah & Juz Amma) beserta teks Arab, terjemahan Indonesia, dan audio murottal di https://quran.ziezan.id.",
    canonicalPath: '/surat/',
  },
  surah: {
    title: "Daftar 114 Surat Al-Qur'an Lengkap (Juz 1 - 30) — Ziezan Quran",
    description:
      "Indeks lengkap 114 Surat Al-Qur'an beserta teks Arab, terjemahan Indonesia, dan audio murottal di https://quran.ziezan.id.",
    canonicalPath: '/surat/',
  },
  mushaf: {
    title: "Daftar 114 Surat Al-Qur'an Lengkap (Juz 1 - 30) — Ziezan Quran",
    description:
      "Mushaf Al-Qur'an Digital 114 Surat (6.236 Ayat) lengkap di https://quran.ziezan.id.",
    canonicalPath: '/surat/',
  },
  quran: {
    title: "Daftar 114 Surat Al-Qur'an Lengkap (Juz 1 - 30) — Ziezan Quran",
    description:
      "Mushaf Al-Qur'an Digital 114 Surat (6.236 Ayat) lengkap di https://quran.ziezan.id.",
    canonicalPath: '/surat/',
  },
  hijriah: {
    title: 'Kalender Hijriah Indonesia (MABIMS Kemenag RI) & Hari Besar Islam — Ziezan Quran',
    description:
      'Kalender Hijriah Indonesia berdasarkan kriteria MABIMS Kemenag RI, konversi tanggal Masehi ke Hijriah, dan daftar hari besar Islam di https://quran.ziezan.id.',
    canonicalPath: '/hijriah/',
  },
  hijri: {
    title: 'Kalender Hijriah Indonesia (MABIMS Kemenag RI) & Hari Besar Islam — Ziezan Quran',
    description:
      'Kalender Hijriah Indonesia kriteria MABIMS Kemenag RI dan daftar hari besar Islam di https://quran.ziezan.id.',
    canonicalPath: '/hijriah/',
  },
  'kalender-hijriah': {
    title: 'Kalender Hijriah Indonesia (MABIMS Kemenag RI) & Hari Besar Islam — Ziezan Quran',
    description:
      'Kalender Hijriah Indonesia kriteria MABIMS Kemenag RI dan daftar hari besar Islam di https://quran.ziezan.id.',
    canonicalPath: '/hijriah/',
  },
  cari: {
    title: "Cari Ayat & Makna Al-Qur'an 114 Surat — Ziezan Quran",
    description:
      "Telusuri terjemahan ayat, nomor surat:ayat (2:255), dan topik makna di seluruh 114 surat Al-Qur'an pada Ziezan Quran (https://quran.ziezan.id).",
    canonicalPath: '/cari/',
  },
  search: {
    title: "Cari Ayat & Makna Al-Qur'an 114 Surat — Ziezan Quran",
    description:
      "Telusuri terjemahan ayat dan topik makna di seluruh 114 surat Al-Qur'an pada Ziezan Quran (https://quran.ziezan.id).",
    canonicalPath: '/cari/',
  },
  bookmark: {
    title: 'Penanda Ayat, Catatan Tadabbur & Riwayat — Ziezan Quran',
    description:
      "Simpan penanda ayat Al-Qur'an, catatan tadabbur pribadi, dan riwayat tilawah di Ziezan Quran (https://quran.ziezan.id).",
    canonicalPath: '/bookmark/',
  },
  bookmarks: {
    title: 'Penanda Ayat, Catatan Tadabbur & Riwayat — Ziezan Quran',
    description:
      "Simpan penanda ayat Al-Qur'an, catatan tadabbur pribadi, dan riwayat tilawah di Ziezan Quran (https://quran.ziezan.id).",
    canonicalPath: '/bookmark/',
  },
  tersimpan: {
    title: 'Penanda Ayat, Catatan Tadabbur & Riwayat — Ziezan Quran',
    description:
      "Simpan penanda ayat Al-Qur'an, catatan tadabbur pribadi, dan riwayat tilawah di Ziezan Quran (https://quran.ziezan.id).",
    canonicalPath: '/bookmark/',
  },
  tentang: {
    title: 'Tentang Ziezan Quran (Febri Suryanto · Ziezan Solutions)',
    description:
      'Ziezan Quran (https://quran.ziezan.id) — Dari Baros, Kab. Serang, Banten untuk Indonesia. Dikembangkan oleh Febri Suryanto.',
    canonicalPath: '/tentang/',
  },
  about: {
    title: 'Tentang Ziezan Quran (Febri Suryanto · Ziezan Solutions)',
    description:
      'Ziezan Quran (https://quran.ziezan.id) — Dari Baros, Kab. Serang, Banten untuk Indonesia. Dikembangkan oleh Febri Suryanto.',
    canonicalPath: '/tentang/',
  },
  pengaturan: {
    title: 'Pengaturan Mushaf & Aplikasi — Ziezan Quran',
    description:
      'Atur jenis huruf Arab, ukuran teks, qari murottal, dan cache offline 114 surat di Ziezan Quran.',
    canonicalPath: '/pengaturan/',
    noindex: true,
  },
  settings: {
    title: 'Pengaturan Mushaf & Aplikasi — Ziezan Quran',
    description:
      'Atur jenis huruf Arab, ukuran teks, qari murottal, dan cache offline 114 surat di Ziezan Quran.',
    canonicalPath: '/pengaturan/',
    noindex: true,
  },
};

function customizeHtmlWithSeo(
  baseHtml: string,
  meta: { title: string; description: string; canonicalPath: string; noindex?: boolean }
): string {
  const fullCanonical = `https://quran.ziezan.id${meta.canonicalPath}`;
  const robotsValue = meta.noindex
    ? 'noindex, nofollow'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  return baseHtml
    .replace(/<title>.*?<\/title>/i, `<title>${meta.title}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${meta.description}" />`
    )
    .replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${fullCanonical}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${meta.title}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:description" content="${meta.description}" />`
    )
    .replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:url" content="${fullCanonical}" />`
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:title" content="${meta.title}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:description" content="${meta.description}" />`
    )
    .replace(
      /<meta\s+name="twitter:url"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:url" content="${fullCanonical}" />`
    )
    .replace(
      /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="robots" content="${robotsValue}" />`
    );
}

/**
 * Generates static `<route>/index.html`, `<route>.html`, `/surat/1..114/index.html`,
 * and `404.html` inside `dist/` with route-specific SEO tags so that Vercel Edge
 * and search engine crawlers always resolve direct requests and page refreshes
 * at the filesystem level with HTTP 200 OK.
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

      // 1. Emit dist/404.html fallback for unknown routes
      const notFoundHtml = customizeHtmlWithSeo(htmlContent, {
        title: '404 Halaman Tidak Ditemukan — Ziezan Quran',
        description: 'Halaman yang Anda tuju tidak ditemukan di Ziezan Quran (https://quran.ziezan.id).',
        canonicalPath: '/',
        noindex: true,
      });
      fs.writeFileSync(path.join(distDir, '404.html'), notFoundHtml, 'utf-8');

      // 2. Emit dist/_redirects for Cloudflare Pages / Netlify fallback compatibility
      fs.writeFileSync(path.join(distDir, '_redirects'), '/* /index.html 200\n', 'utf-8');

      // 3. Emit dist/<route>/index.html AND dist/<route>.html for all primary clean routes
      for (const route of STATIC_SPA_ROUTES) {
        const meta = ROUTE_SEO_META[route] || {
          title: 'Ziezan Quran',
          description: "Aplikasi Al-Qur'an Digital 114 Surat & Ibadah Harian.",
          canonicalPath: `/${route}/`,
        };
        const routeHtml = customizeHtmlWithSeo(htmlContent, meta);
        const routeDir = path.join(distDir, route);
        fs.mkdirSync(routeDir, { recursive: true });
        fs.writeFileSync(path.join(routeDir, 'index.html'), routeHtml, 'utf-8');
        fs.writeFileSync(path.join(distDir, `${route}.html`), routeHtml, 'utf-8');
      }

      // 4. Emit static HTML for all 114 Surahs (/surat/1/index.html .. /surat/114/index.html and /surat/1.html .. /surat/114.html)
      for (let surahNo = 1; surahNo <= 114; surahNo++) {
        const surahHtml = customizeHtmlWithSeo(htmlContent, {
          title: `Baca Al-Qur'an Surat ke-${surahNo} Arab, Latin & Terjemahan — Ziezan Quran`,
          description: `Baca Al-Qur'an Surat ke-${surahNo} lengkap teks Arab berharakat, Latin, terjemahan Kemenag RI, tafsir & audio murottal 6 qari di Ziezan Quran (https://quran.ziezan.id/surat/${surahNo}/).`,
          canonicalPath: `/surat/${surahNo}/`,
        });
        const surahDir = path.join(distDir, 'surat', String(surahNo));
        fs.mkdirSync(surahDir, { recursive: true });
        fs.writeFileSync(path.join(surahDir, 'index.html'), surahHtml, 'utf-8');
        fs.writeFileSync(path.join(distDir, 'surat', `${surahNo}.html`), surahHtml, 'utf-8');
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
          'sw-shalat-notifier.js',
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
          importScripts: ['/sw-shalat-notifier.js'],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,wav,woff,woff2,txt,xml,webmanifest}'],
          globIgnores: [
            '**/404.html',
            'surat/**/*.html',
            ...STATIC_SPA_ROUTES.map((route) => `${route}.html`),
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
              urlPattern: /^https:\/\/.*\.public\.blob\.vercel-storage\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'ziezan-adzan-audio-cache-v3',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 90, // 90 days
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

