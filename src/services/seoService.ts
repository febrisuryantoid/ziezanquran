import { APP_CONFIG, APP_INFO, SITE_URL } from '../config/brand';
import { ActiveTab, SurahDetail, SurahSummary } from '../types/quran';
import { tabToPath } from '../utils/navigation';

const DYNAMIC_JSONLD_ID = 'ziezan-dynamic-jsonld';

function setMetaContent(selector: string, content: string): void {
  if (typeof document === 'undefined') return;
  const el = document.querySelector<HTMLMetaElement>(selector);
  if (el) {
    el.setAttribute('content', content);
  }
}

function setCanonicalUrl(url: string): void {
  if (typeof document === 'undefined') return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

function setDynamicJsonLd(data: Record<string, unknown>): void {
  if (typeof document === 'undefined') return;
  let script = document.getElementById(DYNAMIC_JSONLD_ID) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = DYNAMIC_JSONLD_ID;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

export const seoService = {
  /**
   * Updates document title, meta description, OpenGraph, Twitter card, canonical URL,
   * robots indexing policy, and Schema.org JSON-LD for search engines (Google, Bing, etc.)
   * using clean path-based routing.
   *
   * Enforces noindex, nofollow on /lainnya/ and /pengaturan/.
   */
  updatePageSeo(params: {
    activeTab: ActiveTab;
    surah?: SurahDetail | SurahSummary | null;
    ayatNomor?: number | null;
    searchQuery?: string;
  }): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const baseUrl = SITE_URL.replace(/\/+$/, '');
    let pageTitle = `${APP_CONFIG.appName} — Al-Qur'an Digital 114 Surat & Terjemahan | By ${APP_INFO.developerName}`;
    let pageDesc = `Baca Al-Qur'an Digital 114 Surat (6.236 Ayat) lengkap teks Arab, Latin, terjemahan Kemenag RI, tafsir, dan murottal 6 qari di ${SITE_URL}. Karya ${APP_INFO.developerName} (${APP_INFO.agencyName}).`;
    let canonical = `${baseUrl}/`;

    // Robots directive: strictly noindex for /lainnya/ and /pengaturan/
    const isNoIndex = params.activeTab === 'more' || params.activeTab === 'settings';
    const robotsContent = isNoIndex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

    if (params.activeTab === 'reader' && params.surah) {
      const s = params.surah;
      const hasSpecificAyat = typeof params.ayatNomor === 'number' && params.ayatNomor > 1;
      const ayatSuffix = hasSpecificAyat ? ` Ayat ${params.ayatNomor}` : '';

      pageTitle = `Surat ${s.namaLatin}${ayatSuffix} (${s.arti}) Arab, Latin & Terjemahan — ${APP_CONFIG.appName}`;
      pageDesc = `Baca QS. ${s.namaLatin} (Surat ke-${s.nomor}${ayatSuffix}, ${s.jumlahAyat} Ayat, ${s.tempatTurun}) lengkap teks Arab, Latin, terjemahan Indonesia, tafsir Kemenag RI & audio murottal di ${APP_CONFIG.appName} (${APP_CONFIG.domain}) oleh ${APP_INFO.developerName} (${APP_INFO.agencyName}).`;

      const path = tabToPath('reader', {
        surahNomor: s.nomor,
        ayatNomor: params.ayatNomor || 1,
      });
      canonical = `${baseUrl}${path}`;

      setDynamicJsonLd({
        '@context': 'https://schema.org',
        '@type': 'Chapter',
        '@id': `${canonical}#chapter`,
        name: `QS. ${s.namaLatin}${ayatSuffix} (${s.arti})`,
        alternateName: s.nama,
        position: s.nomor,
        url: canonical,
        inLanguage: ['ar', 'id'],
        description: pageDesc,
        isPartOf: {
          '@type': 'Book',
          '@id': `${baseUrl}/#mushaf-alquran-114`,
          name: "Al-Qur'an Al-Karim (Mushaf Standar Indonesia)",
          url: `${baseUrl}/`,
          numberOfPages: 604,
        },
        author: {
          '@type': 'Person',
          '@id': `${baseUrl}/#febri-suryanto`,
          name: APP_INFO.developerName,
          jobTitle: APP_INFO.developerRole,
          email: APP_INFO.developerMailtoUrl,
          url: `${baseUrl}/`,
        },
        publisher: {
          '@type': 'Organization',
          '@id': `${baseUrl}/#ziezan-solutions`,
          name: APP_INFO.agencyName,
          email: APP_INFO.developerContact,
          url: `${baseUrl}/`,
          founder: {
            '@type': 'Person',
            '@id': `${baseUrl}/#febri-suryanto`,
            name: APP_INFO.developerName,
            jobTitle: APP_INFO.developerRole,
            email: APP_INFO.developerMailtoUrl,
          },
        },
      });
    } else if (params.activeTab === 'surah-list') {
      pageTitle = `Daftar 114 Surat Al-Qur'an Lengkap (Juz 1 - 30) — ${APP_CONFIG.appName}`;
      pageDesc = `Indeks lengkap 114 Surat Al-Qur'an (Makkiyah, Madaniyah & Juz Amma) beserta teks Arab, terjemahan Indonesia, dan audio murottal di ${SITE_URL} oleh ${APP_INFO.developerName} (${APP_INFO.agencyName}).`;
      canonical = `${baseUrl}/surat/`;
    } else if (params.activeTab === 'search') {
      const q = params.searchQuery?.trim();
      pageTitle = q
        ? `Pencarian Ayat "${q}" dalam Al-Qur'an — ${APP_CONFIG.appName}`
        : `Cari Ayat & Makna Al-Qur'an 114 Surat — ${APP_CONFIG.appName}`;
      pageDesc = `Telusuri terjemahan ayat, nomor surat:ayat (2:255), dan topik makna di seluruh 114 surat Al-Qur'an pada ${APP_CONFIG.appName} (${SITE_URL} · ${APP_INFO.agencyName}).`;
      canonical = q ? `${baseUrl}/cari/?q=${encodeURIComponent(q)}` : `${baseUrl}/cari/`;
    } else if (params.activeTab === 'shalat') {
      pageTitle = `Jadwal Salat & Adzan Seluruh Indonesia Hari Ini — ${APP_CONFIG.appName}`;
      pageDesc = `Jadwal Imsak, Subuh, Terbit, Duha, Zuhur, Asar, Magrib, dan Isya resmi seluruh provinsi & kabupaten/kota di Indonesia lengkap hitung mundur dan pengingat adzan di ${SITE_URL}.`;
      canonical = `${baseUrl}/shalat/`;
    } else if (params.activeTab === 'qibla') {
      pageTitle = `Penentu Arah Kiblat & Kompas Ka'bah Akurat — ${APP_CONFIG.appName}`;
      pageDesc = `Hitung derajat arah kiblat presisi (Great-Circle & Geodesik WGS-84) menuju Masjid al-Haram, Makkah lengkap kompas visual di ${SITE_URL}.`;
      canonical = `${baseUrl}/kiblat/`;
    } else if (params.activeTab === 'doa') {
      pageTitle = `Kumpulan Doa & Dzikir Harian Lengkap (Arab, Latin & Arti) — ${APP_CONFIG.appName}`;
      pageDesc = `Kumpulan doa dan dzikir harian shahih lengkap teks Arab, transliterasi Latin, terjemahan bahasa Indonesia, dan referensi hadis di ${SITE_URL}.`;
      canonical = `${baseUrl}/doa/`;
    } else if (params.activeTab === 'hijri') {
      pageTitle = `Kalender Hijriah Indonesia (MABIMS Kemenag RI) & Hari Besar Islam — ${APP_CONFIG.appName}`;
      pageDesc = `Kalender Hijriah Indonesia berdasarkan kriteria MABIMS Kemenag RI, konversi tanggal Masehi ke Hijriah, dan daftar hari besar Islam di ${SITE_URL}.`;
      canonical = `${baseUrl}/hijriah/`;
    } else if (params.activeTab === 'bookmarks') {
      pageTitle = `Penanda Ayat, Catatan Tadabbur & Riwayat — ${APP_CONFIG.appName}`;
      canonical = `${baseUrl}/bookmark/`;
    } else if (params.activeTab === 'settings') {
      pageTitle = `Pengaturan Mushaf & Aplikasi — ${APP_CONFIG.appName}`;
      pageDesc = `Atur jenis huruf Arab, ukuran teks, qari murottal, cache offline 114 surat, dan pencadangan data di ${APP_CONFIG.appName} (${SITE_URL}).`;
      canonical = `${baseUrl}/pengaturan/`;
    } else if (params.activeTab === 'more') {
      pageTitle = `Menu Lainnya (Jadwal Salat, Kalender Hijriah, Pengaturan & Tentang) — ${APP_CONFIG.appName}`;
      pageDesc = `Akses fitur ibadah tambahan, pengaturan mushaf, dan informasi aplikasi Ziezan Quran.`;
      canonical = `${baseUrl}/lainnya/`;
    } else if (params.activeTab === 'about') {
      pageTitle = `Tentang ${APP_CONFIG.appName} (${APP_INFO.developerName} · ${APP_INFO.agencyName})`;
      pageDesc = `${APP_CONFIG.appName} (${SITE_URL}) dikembangkan oleh ${APP_INFO.developerName}, ${APP_INFO.developerRole} di ${APP_INFO.agencyName}.`;
      canonical = `${baseUrl}/tentang/`;
    }

    document.title = pageTitle;
    setMetaContent('meta[name="description"]', pageDesc);
    setMetaContent('meta[property="og:title"]', pageTitle);
    setMetaContent('meta[property="og:description"]', pageDesc);
    setMetaContent('meta[property="og:url"]', canonical);
    setMetaContent('meta[name="twitter:title"]', pageTitle);
    setMetaContent('meta[name="twitter:description"]', pageDesc);
    setMetaContent('meta[name="twitter:url"]', canonical);

    // Dynamic Robots Meta (noindex for /lainnya/ and /pengaturan/)
    setMetaContent('meta[name="robots"]', robotsContent);
    setMetaContent('meta[name="googlebot"]', robotsContent);
    setMetaContent('meta[name="bingbot"]', robotsContent);

    setCanonicalUrl(canonical);
  },
};


