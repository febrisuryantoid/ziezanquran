import { ActiveTab } from '../types/quran';

export interface RouteResolution {
  tab: ActiveTab;
  surahNomor?: number;
  ayatNomor?: number;
  searchQuery?: string;
  isLegacyRedirect?: boolean;
}

/**
 * Maps an ActiveTab and optional parameters to its clean canonical path URL.
 * Routes strictly match:
 * - home: /
 * - surah-list: /surat/
 * - reader (ayat 1): /surat/ayat/1 or /surat/:surahNomor/ayat/:ayatNomor
 * - shalat: /shalat/
 * - doa: /doa/
 * - qibla: /kiblat/
 * - hijri: /hijriah/
 * - more: /lainnya/ (marked with noindex)
 * - settings: /pengaturan/ (marked with noindex)
 * - about: /tentang/
 * - bookmarks: /bookmark/
 * - search: /cari/ (or /cari/?q=...)
 */
export function tabToPath(
  tab: ActiveTab,
  options?: {
    surahNomor?: number | null;
    ayatNomor?: number | null;
    searchQuery?: string;
  }
): string {
  switch (tab) {
    case 'home':
      return '/';

    case 'surah-list':
      return '/surat/';

    case 'reader': {
      const sNomor =
        typeof options?.surahNomor === 'number' &&
        options.surahNomor >= 1 &&
        options.surahNomor <= 114
          ? options.surahNomor
          : 1;
      const aNomor =
        typeof options?.ayatNomor === 'number' && options.ayatNomor >= 1
          ? Math.floor(options.ayatNomor)
          : 1;

      if (sNomor === 1) {
        return `/surat/ayat/${aNomor}`;
      }
      return `/surat/${sNomor}/ayat/${aNomor}`;
    }

    case 'shalat':
      return '/shalat/';

    case 'doa':
      return '/doa/';

    case 'qibla':
      return '/kiblat/';

    case 'hijri':
      return '/hijriah/';

    case 'more':
      return '/lainnya/';

    case 'settings':
      return '/pengaturan/';

    case 'about':
      return '/tentang/';

    case 'bookmarks':
      return '/bookmark/';

    case 'search': {
      const q = options?.searchQuery?.trim();
      return q ? `/cari/?q=${encodeURIComponent(q)}` : '/cari/';
    }

    default:
      return '/';
  }
}

/**
 * Parses pathname and search query from browser location into application state.
 * Fully supports clean paths, direct Vercel links, and backwards-compatible legacy query params (?tab=..., ?surah=...&ayat=...).
 */
export function pathToState(pathname: string, search: string): RouteResolution {
  const normalizedPath =
    pathname
      .replace(/\/index\.html$/i, '')
      .replace(/\/+$/, '')
      .toLowerCase() || '/';
  const params = new URLSearchParams(search);

  // 1. Direct Ayat Deep-links: /surat/ayat/:ayatNomor (e.g. /surat/ayat/1)
  const singleAyatMatch = normalizedPath.match(/^\/surat\/ayat\/(\d+)$/);
  if (singleAyatMatch) {
    const ayatNomor = parseInt(singleAyatMatch[1], 10);
    const surahParam = parseInt(params.get('surah') || '', 10);
    const surahNomor =
      Number.isInteger(surahParam) && surahParam >= 1 && surahParam <= 114
        ? surahParam
        : 1;
    return {
      tab: 'reader',
      surahNomor,
      ayatNomor: Math.max(1, ayatNomor),
    };
  }

  // 2. Surah & Ayat Deep-links: /surat/:surahNomor/ayat/:ayatNomor (e.g. /surat/2/ayat/255)
  const surahAyatMatch = normalizedPath.match(/^\/surat\/(\d+)\/ayat\/(\d+)$/);
  if (surahAyatMatch) {
    const surahNomor = parseInt(surahAyatMatch[1], 10);
    const ayatNomor = parseInt(surahAyatMatch[2], 10);
    if (surahNomor >= 1 && surahNomor <= 114) {
      return {
        tab: 'reader',
        surahNomor,
        ayatNomor: Math.max(1, ayatNomor),
      };
    }
  }

  // 3. Surah Detail Deep-link: /surat/:surahNomor (e.g. /surat/36)
  const surahOnlyMatch = normalizedPath.match(/^\/surat\/(\d+)$/);
  if (surahOnlyMatch) {
    const surahNomor = parseInt(surahOnlyMatch[1], 10);
    if (surahNomor >= 1 && surahNomor <= 114) {
      const ayatParam = parseInt(params.get('ayat') || '1', 10);
      return {
        tab: 'reader',
        surahNomor,
        ayatNomor: Math.max(1, ayatParam),
      };
    }
  }

  // 4. Clean Path Matches
  if (
    normalizedPath === '/surat' ||
    normalizedPath === '/mushaf' ||
    normalizedPath === '/quran'
  ) {
    // If query has ayat/surah, treat as reader
    const surahParam = parseInt(params.get('surah') || '', 10);
    const ayatParam = parseInt(params.get('ayat') || '', 10);
    if (Number.isInteger(surahParam) && surahParam >= 1 && surahParam <= 114) {
      return {
        tab: 'reader',
        surahNomor: surahParam,
        ayatNomor: Number.isInteger(ayatParam) && ayatParam >= 1 ? ayatParam : 1,
        isLegacyRedirect: true,
      };
    }
    return { tab: 'surah-list' };
  }

  if (
    normalizedPath === '/shalat' ||
    normalizedPath === '/salat' ||
    normalizedPath === '/jadwal-shalat' ||
    normalizedPath === '/jadwal-salat' ||
    normalizedPath === '/adzan'
  ) {
    return { tab: 'shalat' };
  }

  if (normalizedPath === '/doa' || normalizedPath === '/dzikir') {
    return { tab: 'doa' };
  }

  if (
    normalizedPath === '/kiblat' ||
    normalizedPath === '/qibla' ||
    normalizedPath === '/arah-kiblat'
  ) {
    return { tab: 'qibla' };
  }

  if (
    normalizedPath === '/hijriah' ||
    normalizedPath === '/hijri' ||
    normalizedPath === '/kalender-hijriah'
  ) {
    return { tab: 'hijri' };
  }

  if (normalizedPath === '/lainnya' || normalizedPath === '/more') {
    return { tab: 'more' };
  }

  if (normalizedPath === '/pengaturan' || normalizedPath === '/settings') {
    return { tab: 'settings' };
  }

  if (normalizedPath === '/tentang' || normalizedPath === '/about') {
    return { tab: 'about' };
  }

  if (
    normalizedPath === '/bookmark' ||
    normalizedPath === '/bookmarks' ||
    normalizedPath === '/tersimpan'
  ) {
    return { tab: 'bookmarks' };
  }

  if (normalizedPath === '/cari' || normalizedPath === '/search') {
    return {
      tab: 'search',
      searchQuery: params.get('q') || '',
    };
  }

  // 5. Root Path with Legacy Query Parameters Fallback
  if (normalizedPath === '/') {
    const tabParam = params.get('tab');
    const surahParam = parseInt(params.get('surah') || '', 10);
    const ayatParam = parseInt(params.get('ayat') || '', 10);
    const queryParam = params.get('q');

    if (Number.isInteger(surahParam) && surahParam >= 1 && surahParam <= 114) {
      return {
        tab: 'reader',
        surahNomor: surahParam,
        ayatNomor: Number.isInteger(ayatParam) && ayatParam >= 1 ? ayatParam : 1,
        isLegacyRedirect: true,
      };
    }

    if (queryParam && queryParam.trim()) {
      return {
        tab: 'search',
        searchQuery: queryParam.trim(),
        isLegacyRedirect: true,
      };
    }

    if (tabParam) {
      switch (tabParam) {
        case 'surah-list':
          return { tab: 'surah-list', isLegacyRedirect: true };
        case 'shalat':
          return { tab: 'shalat', isLegacyRedirect: true };
        case 'doa':
          return { tab: 'doa', isLegacyRedirect: true };
        case 'qibla':
          return { tab: 'qibla', isLegacyRedirect: true };
        case 'hijri':
          return { tab: 'hijri', isLegacyRedirect: true };
        case 'more':
          return { tab: 'more', isLegacyRedirect: true };
        case 'settings':
          return { tab: 'settings', isLegacyRedirect: true };
        case 'about':
          return { tab: 'about', isLegacyRedirect: true };
        case 'bookmarks':
          return { tab: 'bookmarks', isLegacyRedirect: true };
        case 'search':
          return { tab: 'search', isLegacyRedirect: true };
        default:
          return { tab: 'home' };
      }
    }

    return { tab: 'home' };
  }

  // Default fallback for unknown routes
  return { tab: 'home' };
}
