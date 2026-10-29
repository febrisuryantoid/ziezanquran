import { ActiveTab } from '../types/quran';

export interface RouteResolution {
  tab: ActiveTab;
  surahNomor?: number;
  ayatNomor?: number;
  searchQuery?: string;
  isLegacyRedirect?: boolean;
  invalidPath?: string;
}

/**
 * Maps an ActiveTab and optional parameters to its clean canonical path URL.
 * Routes strictly match:
 * - home: /
 * - surah-list: /surat/
 * - reader: /surat/:surahNomor/ (or /surat/:surahNomor/ayat/:ayatNomor when ayat > 1)
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
    searchQuery?: string | null;
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

      if (aNomor > 1) {
        return `/surat/${sNomor}/ayat/${aNomor}`;
      }
      return `/surat/${sNomor}/`;
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
      return '/';

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

    case 'not-found':
      return '/404';

    default:
      return '/';
  }
}

/**
 * Parses pathname and search query from browser location into application state.
 * Fully supports clean paths, trailing slashes, .html suffixes, direct Vercel links,
 * and backwards-compatible legacy query params (?tab=..., ?surah=...&ayat=...).
 * Unknown or invalid URLs resolve to { tab: 'not-found', invalidPath }.
 */
export function pathToState(pathname: string, search: string): RouteResolution {
  const normalizedPath =
    pathname
      .replace(/\/index\.html$/i, '')
      .replace(/\.html$/i, '')
      .replace(/\/+$/, '')
      .toLowerCase() || '/';
  const params = new URLSearchParams(search);

  // Explicit 404 path
  if (normalizedPath === '/404' || normalizedPath === '/not-found') {
    return { tab: 'not-found', invalidPath: pathname };
  }

  // 1. Direct Ayat Deep-links: /surat/ayat/:ayatNomor (e.g. /surat/ayat/1)
  const singleAyatMatch = normalizedPath.match(/^\/surat\/ayat\/(\d+)$/);
  if (singleAyatMatch) {
    const ayatNomor = parseInt(singleAyatMatch[1], 10);
    const surahParam = parseInt(params.get('surah') || '', 10);
    const surahNomor =
      Number.isInteger(surahParam) && surahParam >= 1 && surahParam <= 114
        ? surahParam
        : 1;
    if (ayatNomor >= 1 && ayatNomor <= 286) {
      return {
        tab: 'reader',
        surahNomor,
        ayatNomor,
      };
    }
    return { tab: 'not-found', invalidPath: pathname };
  }

  // 2. Surah & Ayat Deep-links: /surat/:surahNomor/ayat/:ayatNomor (e.g. /surat/2/ayat/255)
  const surahAyatMatch = normalizedPath.match(/^\/surat\/(\d+)\/ayat\/(\d+)$/);
  if (surahAyatMatch) {
    const surahNomor = parseInt(surahAyatMatch[1], 10);
    const ayatNomor = parseInt(surahAyatMatch[2], 10);
    if (surahNomor >= 1 && surahNomor <= 114 && ayatNomor >= 1 && ayatNomor <= 286) {
      return {
        tab: 'reader',
        surahNomor,
        ayatNomor,
      };
    }
    return { tab: 'not-found', invalidPath: pathname };
  }

  // 3. Surah Detail Deep-link: /surat/:surahNomor (e.g. /surat/36)
  const surahOnlyMatch = normalizedPath.match(/^\/(surat|surah|mushaf|quran)\/(\d+)$/);
  if (surahOnlyMatch) {
    const surahNomor = parseInt(surahOnlyMatch[2], 10);
    if (surahNomor >= 1 && surahNomor <= 114) {
      const ayatParam = parseInt(params.get('ayat') || '1', 10);
      return {
        tab: 'reader',
        surahNomor,
        ayatNomor: Number.isInteger(ayatParam) && ayatParam >= 1 ? ayatParam : 1,
      };
    }
    return { tab: 'not-found', invalidPath: pathname };
  }

  // 4. Clean Path Matches
  if (
    normalizedPath === '/surat' ||
    normalizedPath === '/surah' ||
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

  if (normalizedPath === '/beranda' || normalizedPath === '/home') {
    return { tab: 'home', isLegacyRedirect: true };
  }

  // 5. Root Path with Legacy Query Parameters Fallback
  if (normalizedPath === '/') {
    const tabParam = params.get('tab');
    const surahParam = parseInt(params.get('surah') || '', 10);
    const ayatParam = parseInt(params.get('ayat') || '', 10);
    const queryParam = params.get('q');

    if (params.has('surah')) {
      if (Number.isInteger(surahParam) && surahParam >= 1 && surahParam <= 114) {
        return {
          tab: 'reader',
          surahNomor: surahParam,
          ayatNomor: Number.isInteger(ayatParam) && ayatParam >= 1 ? ayatParam : 1,
          isLegacyRedirect: true,
        };
      }
      return { tab: 'not-found', invalidPath: `${pathname}${search}` };
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
        case 'home':
          return { tab: 'home', isLegacyRedirect: true };
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
        case 'settings':
          return { tab: 'settings', isLegacyRedirect: true };
        case 'about':
          return { tab: 'about', isLegacyRedirect: true };
        case 'bookmarks':
          return { tab: 'bookmarks', isLegacyRedirect: true };
        case 'search':
          return { tab: 'search', isLegacyRedirect: true };
        default:
          return { tab: 'not-found', invalidPath: `${pathname}${search}` };
      }
    }

    return { tab: 'home' };
  }

  // Unknown route -> dedicated 404 view
  return {
    tab: 'not-found',
    invalidPath: pathname,
  };
}

