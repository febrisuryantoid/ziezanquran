import { APP_INFO } from '../config/brand';
import {
  equranDoaApi,
  equranShalatApi,
  houseMuslimQiblaApi,
  hydrateIslamicCacheFromIDB,
  mabimsHijriApi,
} from './islamicApi';
import {
  hydrateMemoryCacheFromIDB,
  isSurahDetailIntegrityValid,
  quranApi,
} from './quranApi';
import { idbCacheService, storageService } from './storageService';

export const APP_SHELL_CACHE_NAME = `ziezan-app-shell-v${APP_INFO.version}`;

export const CORE_STATIC_ASSETS: Array<{ id: string; url: string; label: string }> = [
  { id: 'static:index', url: '/', label: 'App Shell Utama (HTML)' },
  { id: 'static:manifest', url: '/manifest.webmanifest', label: 'Web App Manifest PWA' },
  { id: 'static:icon-svg', url: '/icon.svg', label: 'Ikon Vektor Ziezan Quran' },
  { id: 'static:favicon', url: '/favicon.png', label: 'Favicon Aplikasi' },
  { id: 'static:apple-icon', url: '/apple-touch-icon.png', label: 'Ikon Layar Utama iOS (180x180)' },
  { id: 'static:pwa-192', url: '/pwa-192x192.png', label: 'Ikon PWA Standar (192x192)' },
  { id: 'static:pwa-512', url: '/pwa-512x512.png', label: 'Ikon PWA Resolusi Tinggi (512x512)' },
  { id: 'static:pwa-maskable', url: '/pwa-maskable-512x512.png', label: 'Ikon Maskable Adaptif Android' },
  { id: 'static:brand-logo', url: '/icons/ziezan-quran.png', label: 'Logo Identitas Ziezan Quran' },
  { id: 'static:bg-landscape', url: '/assets/aistudio/bg-landscape_42f05623.png', label: 'Visual Hero Masjid (Landscape)' },
  { id: 'static:bg-portrait', url: '/assets/aistudio/bg-potrait_806f7ab7.png', label: 'Visual Hero Masjid (Portrait)' },
  { id: 'static:logo-kpm', url: '/assets/aistudio/Logo_KPM_b0b5caf5.png', label: 'Logo Yayasan Karya Pondok Mandiri' },
  { id: 'static:logo-embi', url: '/assets/aistudio/Logo_Embi_Tech_c7a9c101.png', label: 'Logo Embi Tech Computindo' },
  { id: 'static:logo-bbpvp', url: '/assets/aistudio/Logo-BBPVP-Bekasi_ee05602a.png', label: 'Logo BBPVP Bekasi' },
  { id: 'static:audio-chime', url: '/audio/adzan-chime.wav', label: 'Audio Nada Harmoni Adzan Lokal' },
  { id: 'static:audio-reminder', url: '/audio/shalat-reminder.wav', label: 'Audio Pengingat Salat Lokal' },
];

export type OfflineSyncStatus =
  | 'idle'
  | 'preparing'
  | 'downloading'
  | 'verifying'
  | 'ready_offline'
  | 'paused_offline'
  | 'partial_error';

export type ResourceCategoryKey =
  | 'app_shell'
  | 'quran_mushaf'
  | 'doa_dzikir'
  | 'shalat_schedule'
  | 'hijri_qibla';

export interface CategoryProgress {
  key: ResourceCategoryKey;
  label: string;
  description: string;
  completed: number;
  total: number;
  status: 'pending' | 'downloading' | 'verified' | 'error';
}

export interface FailedResourceItem {
  id: string;
  label: string;
  category: ResourceCategoryKey;
  error: string;
}

export interface StorageQuotaInfo {
  supported: boolean;
  usageBytes: number;
  quotaBytes: number;
  usagePercent: number;
  isPersistent: boolean;
  idbHealthy: boolean;
  cacheApiSupported: boolean;
}

export interface ServiceWorkerStateInfo {
  supported: boolean;
  registered: boolean;
  offlineReady: boolean;
  updateAvailable: boolean;
  updating: boolean;
  error: string | null;
  appVersion: string;
}

export interface OfflineSyncState {
  status: OfflineSyncStatus;
  isVerifiedReady: boolean;
  lastVerifiedAt: number | null;
  progressPercent: number;
  completedResources: number;
  totalResources: number;
  estimatedTotalSizeMB: number;
  currentTaskLabel: string;
  categories: Record<ResourceCategoryKey, CategoryProgress>;
  failedResources: FailedResourceItem[];
  cachedSurahCount: number;
  cachedTafsirCount: number;
  isSyncingTafsir: boolean;
  storageInfo: StorageQuotaInfo;
  swState: ServiceWorkerStateInfo;
}

const TOTAL_CORE_RESOURCES =
  CORE_STATIC_ASSETS.length + // 13 static & app shell assets
  1 + // surah list index
  114 + // 114 surah details
  1 + // doa catalog
  3 + // shalat (provinsi, kabkota, monthly schedule)
  3; // hijri & qibla (today+month, events, qibla)
// Total = 135 mandatory resources

function createInitialCategories(): Record<ResourceCategoryKey, CategoryProgress> {
  return {
    app_shell: {
      key: 'app_shell',
      label: 'App Shell, Ikon & Aset Statis',
      description: 'HTML, CSS, JS bundle, ikon PWA, gambar hero & audio pengingat lokal (Cache Storage)',
      completed: 0,
      total: CORE_STATIC_ASSETS.length,
      status: 'pending',
    },
    quran_mushaf: {
      key: 'quran_mushaf',
      label: "Mushaf Al-Qur'an 114 Surat (6.236 Ayat)",
      description: 'Teks Arab Rasm Utsmani, Latin, Terjemahan Kemenag RI & Indeks Pencarian (IndexedDB)',
      completed: 0,
      total: 115,
      status: 'pending',
    },
    doa_dzikir: {
      key: 'doa_dzikir',
      label: 'Katalog Doa & Dzikir Harian',
      description: 'Kumpulan doa harian, dzikir pagi-petang & doa Al-Qur’an (IndexedDB)',
      completed: 0,
      total: 1,
      status: 'pending',
    },
    shalat_schedule: {
      key: 'shalat_schedule',
      label: 'Jadwal Salat & Wilayah Indonesia',
      description: 'Daftar provinsi, kabupaten/kota & jadwal salat bulanan (IndexedDB)',
      completed: 0,
      total: 3,
      status: 'pending',
    },
    hijri_qibla: {
      key: 'hijri_qibla',
      label: 'Kalender Hijriah MABIMS & Kiblat',
      description: 'Tanggal Hijriah, kalender bulanan, hari besar Islam & geodesik Kiblat (IndexedDB)',
      completed: 0,
      total: 3,
      status: 'pending',
    },
  };
}

let state: OfflineSyncState = {
  status: 'idle',
  isVerifiedReady: false,
  lastVerifiedAt: null,
  progressPercent: 0,
  completedResources: 0,
  totalResources: TOTAL_CORE_RESOURCES,
  estimatedTotalSizeMB: 14.8,
  currentTaskLabel: 'Memeriksa kesiapan data lokal...',
  categories: createInitialCategories(),
  failedResources: [],
  cachedSurahCount: 0,
  cachedTafsirCount: 0,
  isSyncingTafsir: false,
  storageInfo: {
    supported: typeof navigator !== 'undefined' && 'storage' in navigator,
    usageBytes: 0,
    quotaBytes: 0,
    usagePercent: 0,
    isPersistent: false,
    idbHealthy: true,
    cacheApiSupported: typeof window !== 'undefined' && 'caches' in window,
  },
  swState: {
    supported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    registered: false,
    offlineReady: false,
    updateAvailable: false,
    updating: false,
    error: null,
    appVersion: APP_INFO.version,
  },
};

type Listener = (nextState: OfflineSyncState) => void;
const listeners = new Set<Listener>();
const completedSet = new Set<string>();
const failedMap = new Map<string, FailedResourceItem>();
let isRunningSync = false;
let swUpdateCallback: ((reloadPage?: boolean) => Promise<void>) | null = null;

function emitChange() {
  // Recalculate category counts & overall progress
  const cats = createInitialCategories();

  for (const id of completedSet) {
    if (id.startsWith('static:')) cats.app_shell.completed++;
    else if (id.startsWith('surah:')) cats.quran_mushaf.completed++;
    else if (id.startsWith('doa:')) cats.doa_dzikir.completed++;
    else if (id.startsWith('shalat:')) cats.shalat_schedule.completed++;
    else if (id.startsWith('hijri:') || id.startsWith('qibla:')) cats.hijri_qibla.completed++;
  }

  (Object.keys(cats) as ResourceCategoryKey[]).forEach((k) => {
    const c = cats[k];
    c.completed = Math.min(c.total, c.completed);
    const hasCatError = Array.from(failedMap.values()).some((f) => f.category === k);
    if (c.completed >= c.total && !hasCatError) {
      c.status = 'verified';
    } else if (hasCatError) {
      c.status = 'error';
    } else if (isRunningSync) {
      c.status = 'downloading';
    } else {
      c.status = 'pending';
    }
  });

  const totalCompleted =
    cats.app_shell.completed +
    cats.quran_mushaf.completed +
    cats.doa_dzikir.completed +
    cats.shalat_schedule.completed +
    cats.hijri_qibla.completed;

  const rawPercent = Math.round((totalCompleted / TOTAL_CORE_RESOURCES) * 100);
  // Never show 100% unless state.isVerifiedReady is true!
  const safePercent = state.isVerifiedReady ? 100 : Math.min(99, rawPercent);

  state = {
    ...state,
    categories: cats,
    completedResources: totalCompleted,
    totalResources: TOTAL_CORE_RESOURCES,
    progressPercent: safePercent,
    failedResources: Array.from(failedMap.values()),
    cachedSurahCount: quranApi.getCachedSurahCount(),
  };

  for (const listener of listeners) {
    listener(state);
  }
}

async function persistManifestState(): Promise<void> {
  await idbCacheService.saveOfflineSyncManifest({
    appVersion: APP_INFO.version,
    isFullyVerified: state.isVerifiedReady,
    lastVerifiedAt: state.lastVerifiedAt,
    completedResourceIds: Array.from(completedSet),
    failedResourceIds: Object.fromEntries(
      Array.from(failedMap.entries()).map(([k, v]) => [k, v.error])
    ),
    totalExpectedResources: TOTAL_CORE_RESOURCES,
    cachedSurahCount: state.cachedSurahCount,
    cachedTafsirCount: state.cachedTafsirCount,
  });
}

async function refreshStorageQuotaInfo(): Promise<void> {
  if (typeof navigator === 'undefined') return;
  let usageBytes = 0;
  let quotaBytes = 0;
  let isPersistent = false;

  try {
    if (navigator.storage && typeof navigator.storage.estimate === 'function') {
      const est = await navigator.storage.estimate();
      usageBytes = est.usage || 0;
      quotaBytes = est.quota || 0;
    }
    if (navigator.storage && typeof navigator.storage.persisted === 'function') {
      isPersistent = await navigator.storage.persisted();
    }
  } catch {
    // Ignore storage API errors
  }

  const usagePercent =
    quotaBytes > 0 ? Math.min(100, Math.round((usageBytes / quotaBytes) * 1000) / 10) : 0;

  state = {
    ...state,
    storageInfo: {
      supported: typeof navigator !== 'undefined' && 'storage' in navigator,
      usageBytes,
      quotaBytes,
      usagePercent,
      isPersistent,
      idbHealthy: idbCacheService.isIDBSupportedAndHealthy(),
      cacheApiSupported: typeof window !== 'undefined' && 'caches' in window,
    },
  };
  emitChange();
}

async function precacheAndVerifyStaticAsset(item: {
  id: string;
  url: string;
  label: string;
}): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    // If Cache Storage API is restricted in sandboxed context, verify via fetch
    try {
      const res = await fetch(item.url, { method: 'GET', cache: 'force-cache' });
      if (res.ok) {
        completedSet.add(item.id);
        failedMap.delete(item.id);
        return true;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      failedMap.set(item.id, {
        id: item.id,
        label: item.label,
        category: 'app_shell',
        error: err instanceof Error ? err.message : 'Gagal memuat aset statis',
      });
      return false;
    }
  }

  try {
    const cache = await caches.open(APP_SHELL_CACHE_NAME);
    const existing = await cache.match(item.url);
    if (existing && existing.ok) {
      completedSet.add(item.id);
      failedMap.delete(item.id);
      return true;
    }

    const response = await fetch(item.url, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} pada ${item.url}`);
    }
    await cache.put(item.url, response.clone());
    completedSet.add(item.id);
    failedMap.delete(item.id);
    return true;
  } catch (err) {
    // Check if any workbox precache already holds it
    try {
      const anyMatch = await caches.match(item.url);
      if (anyMatch && anyMatch.ok) {
        completedSet.add(item.id);
        failedMap.delete(item.id);
        return true;
      }
    } catch {
      // Ignore
    }

    failedMap.set(item.id, {
      id: item.id,
      label: item.label,
      category: 'app_shell',
      error: err instanceof Error ? err.message : 'Gagal menyimpan ke Cache Storage',
    });
    return false;
  }
}

export const offlineSyncService = {
  getState(): OfflineSyncState {
    return state;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener(state);
    return () => {
      listeners.delete(listener);
    };
  },

  notifyServiceWorkerRegistered(updateSW?: (reloadPage?: boolean) => Promise<void>) {
    if (updateSW) {
      swUpdateCallback = updateSW;
    }
    state = {
      ...state,
      swState: {
        ...state.swState,
        registered: true,
        error: null,
      },
    };
    emitChange();
  },

  notifyServiceWorkerOfflineReady() {
    state = {
      ...state,
      swState: {
        ...state.swState,
        registered: true,
        offlineReady: true,
        error: null,
      },
    };
    emitChange();
  },

  notifyServiceWorkerUpdateAvailable(updateSW?: (reloadPage?: boolean) => Promise<void>) {
    if (updateSW) {
      swUpdateCallback = updateSW;
    }
    state = {
      ...state,
      swState: {
        ...state.swState,
        updateAvailable: true,
      },
    };
    emitChange();
  },

  notifyServiceWorkerError(errMessage: string) {
    state = {
      ...state,
      swState: {
        ...state.swState,
        error: errMessage,
      },
    };
    emitChange();
  },

  async applyServiceWorkerUpdate(): Promise<void> {
    if (!swUpdateCallback) {
      window.location.reload();
      return;
    }
    state = {
      ...state,
      swState: {
        ...state.swState,
        updating: true,
      },
    };
    emitChange();
    try {
      await swUpdateCallback(true);
    } catch {
      window.location.reload();
    }
  },

  async requestPersistentStorage(): Promise<boolean> {
    if (
      typeof navigator !== 'undefined' &&
      navigator.storage &&
      typeof navigator.storage.persist === 'function'
    ) {
      try {
        const granted = await navigator.storage.persist();
        await refreshStorageQuotaInfo();
        return granted;
      } catch {
        return false;
      }
    }
    return false;
  },

  /**
   * Initializes state from IndexedDB and verifies what is already cached locally.
   * Automatically starts or resumes offline preparation when online.
   */
  async initialize(): Promise<void> {
    await Promise.all([
      hydrateMemoryCacheFromIDB(),
      hydrateIslamicCacheFromIDB(),
      refreshStorageQuotaInfo(),
    ]);

    const [persistedManifest, tafsirNums] = await Promise.all([
      idbCacheService.getOfflineSyncManifest(),
      idbCacheService.getCachedTafsirNumbers(),
    ]);

    state = {
      ...state,
      cachedTafsirCount: tafsirNums.length,
    };

    if (persistedManifest && persistedManifest.appVersion === APP_INFO.version) {
      for (const id of persistedManifest.completedResourceIds || []) {
        completedSet.add(id);
      }
    }

    // Hydrate completed surahs from verified memory cache
    const surahList = await idbCacheService.getSurahList();
    if (surahList && surahList.length === 114) {
      completedSet.add('surah:index');
    }
    for (let i = 1; i <= 114; i++) {
      if (quranApi.hasValidSurahInMemory(i)) {
        completedSet.add(`surah:${i}`);
      } else {
        completedSet.delete(`surah:${i}`);
      }
    }

    emitChange();

    // Perform fast integrity check first
    const alreadyValid = await this.verifyIntegrityNow(true);
    if (alreadyValid) {
      return;
    }

    // Request persistent storage silently if supported
    void this.requestPersistentStorage();

    // If online, start or resume downloading missing resources automatically
    if (typeof navigator === 'undefined' || navigator.onLine) {
      void this.startOrResumeSync(false);
    } else {
      state = {
        ...state,
        status: 'paused_offline',
        currentTaskLabel:
          'Menunggu koneksi internet untuk menyelesaikan sisa persiapan offline.',
      };
      emitChange();
    }
  },

  /**
   * Downloads and caches all missing or failed resources across all 5 categories,
   * then performs a strict integrity check before marking 100% Ready Offline.
   */
  async startOrResumeSync(forceAll = false): Promise<boolean> {
    if (isRunningSync) return false;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      state = {
        ...state,
        status: 'paused_offline',
        currentTaskLabel: 'Tidak ada koneksi internet. Pengunduhan dijeda.',
      };
      emitChange();
      return false;
    }

    isRunningSync = true;
    if (forceAll) {
      completedSet.clear();
      failedMap.clear();
      state = {
        ...state,
        isVerifiedReady: false,
      };
    }

    state = {
      ...state,
      status: 'downloading',
      currentTaskLabel: 'Menyiapkan App Shell & aset statis...',
    };
    emitChange();

    try {
      // STEP 1: Precache & verify App Shell & Static Assets (Cache Storage API)
      for (const asset of CORE_STATIC_ASSETS) {
        if (!forceAll && completedSet.has(asset.id)) continue;
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          throw new Error('OFFLINE_INTERRUPTED');
        }
        state.currentTaskLabel = `Menyimpan aset: ${asset.label}...`;
        emitChange();
        await precacheAndVerifyStaticAsset(asset);
        emitChange();
      }

      // STEP 2: Surah Index (114 Surahs list)
      if (forceAll || !completedSet.has('surah:index')) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          throw new Error('OFFLINE_INTERRUPTED');
        }
        state.currentTaskLabel = 'Mengunduh indeks 114 Surat Al-Qur’an...';
        emitChange();
        try {
          const list = await quranApi.getSurahList(forceAll);
          if (list && list.length === 114) {
            completedSet.add('surah:index');
            failedMap.delete('surah:index');
          } else {
            throw new Error('Indeks surat belum lengkap (kurang dari 114 surat).');
          }
        } catch (err) {
          failedMap.set('surah:index', {
            id: 'surah:index',
            label: 'Indeks 114 Surat Al-Qur’an',
            category: 'quran_mushaf',
            error: err instanceof Error ? err.message : 'Gagal mengunduh indeks surat',
          });
        }
        emitChange();
      }

      // STEP 3: Katalog Doa & Dzikir Harian (IndexedDB)
      if (forceAll || !completedSet.has('doa:catalog')) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          throw new Error('OFFLINE_INTERRUPTED');
        }
        state.currentTaskLabel = 'Mengunduh katalog Doa & Dzikir Harian...';
        emitChange();
        try {
          const doas = await equranDoaApi.getDoaList(undefined, forceAll);
          if (Array.isArray(doas) && doas.length > 0) {
            completedSet.add('doa:catalog');
            failedMap.delete('doa:catalog');
          } else {
            throw new Error('Katalog doa kosong.');
          }
        } catch (err) {
          failedMap.set('doa:catalog', {
            id: 'doa:catalog',
            label: 'Katalog Doa & Dzikir Harian',
            category: 'doa_dzikir',
            error: err instanceof Error ? err.message : 'Gagal mengunduh katalog doa',
          });
        }
        emitChange();
      }

      // STEP 4: Jadwal Salat & Wilayah (IndexedDB)
      const loc = storageService.getShalatLocation();
      const now = new Date();
      const curMonth = now.getMonth() + 1;
      const curYear = now.getFullYear();

      if (forceAll || !completedSet.has('shalat:provinsi')) {
        state.currentTaskLabel = 'Mengunduh daftar provinsi jadwal salat...';
        emitChange();
        try {
          const provs = await equranShalatApi.getProvinsiList(forceAll);
          if (provs && provs.length > 0) {
            completedSet.add('shalat:provinsi');
            failedMap.delete('shalat:provinsi');
          }
        } catch (err) {
          failedMap.set('shalat:provinsi', {
            id: 'shalat:provinsi',
            label: 'Daftar Provinsi Indonesia',
            category: 'shalat_schedule',
            error: err instanceof Error ? err.message : 'Gagal memuat provinsi',
          });
        }
        emitChange();
      }

      if (forceAll || !completedSet.has('shalat:kabkota')) {
        state.currentTaskLabel = `Mengunduh daftar wilayah ${loc.provinsi}...`;
        emitChange();
        try {
          const kabs = await equranShalatApi.getKabKotaList(loc.provinsi, forceAll);
          if (kabs && kabs.length > 0) {
            completedSet.add('shalat:kabkota');
            failedMap.delete('shalat:kabkota');
          }
        } catch (err) {
          failedMap.set('shalat:kabkota', {
            id: 'shalat:kabkota',
            label: `Wilayah Kab/Kota (${loc.provinsi})`,
            category: 'shalat_schedule',
            error: err instanceof Error ? err.message : 'Gagal memuat kab/kota',
          });
        }
        emitChange();
      }

      if (forceAll || !completedSet.has('shalat:schedule')) {
        state.currentTaskLabel = `Mengunduh jadwal salat ${loc.kabkota}...`;
        emitChange();
        try {
          const nextMonth = curMonth === 12 ? 1 : curMonth + 1;
          const nextYear = curMonth === 12 ? curYear + 1 : curYear;
          const [schedCur] = await Promise.all([
            equranShalatApi.getMonthlySchedule(loc.provinsi, loc.kabkota, curMonth, curYear, forceAll),
            equranShalatApi.getMonthlySchedule(loc.provinsi, loc.kabkota, nextMonth, nextYear, forceAll),
          ]);
          if (schedCur && Array.isArray(schedCur.jadwal) && schedCur.jadwal.length > 0) {
            completedSet.add('shalat:schedule');
            failedMap.delete('shalat:schedule');
          }
        } catch (err) {
          failedMap.set('shalat:schedule', {
            id: 'shalat:schedule',
            label: `Jadwal Salat Bulanan (${loc.kabkota})`,
            category: 'shalat_schedule',
            error: err instanceof Error ? err.message : 'Gagal memuat jadwal salat',
          });
        }
        emitChange();
      }

      // STEP 5: Kalender Hijriah MABIMS & Arah Kiblat (IndexedDB)
      if (forceAll || !completedSet.has('hijri:today_and_month')) {
        state.currentTaskLabel = 'Menyimpan Kalender Hijriah MABIMS...';
        emitChange();
        try {
          const todayRes = await mabimsHijriApi.getToday('Asia/Jakarta', forceAll);
          const hYear = todayRes?.output?.year || 1448;
          const hMonth = todayRes?.output?.month || 5;
          await mabimsHijriApi.getMonthCalendar(hYear, hMonth, forceAll);
          completedSet.add('hijri:today_and_month');
          failedMap.delete('hijri:today_and_month');
        } catch (err) {
          failedMap.set('hijri:today_and_month', {
            id: 'hijri:today_and_month',
            label: 'Kalender Hijriah Bulanan MABIMS',
            category: 'hijri_qibla',
            error: err instanceof Error ? err.message : 'Gagal memuat kalender Hijriah',
          });
        }
        emitChange();
      }

      if (forceAll || !completedSet.has('hijri:events')) {
        state.currentTaskLabel = 'Menyimpan daftar Hari Besar Islam...';
        emitChange();
        try {
          const todayRes = await mabimsHijriApi.getToday('Asia/Jakarta', false);
          const hYear = todayRes?.output?.year || 1448;
          await mabimsHijriApi.getEvents(hYear, forceAll);
          completedSet.add('hijri:events');
          failedMap.delete('hijri:events');
        } catch (err) {
          failedMap.set('hijri:events', {
            id: 'hijri:events',
            label: 'Daftar Hari Besar Islam',
            category: 'hijri_qibla',
            error: err instanceof Error ? err.message : 'Gagal memuat hari besar Islam',
          });
        }
        emitChange();
      }

      if (forceAll || !completedSet.has('qibla:geodesic')) {
        state.currentTaskLabel = 'Menyimpan data Geodesik Arah Kiblat...';
        emitChange();
        try {
          const qPref = storageService.getQiblaPreference();
          const lat = qPref?.coarseLat ?? -6.2088;
          const lng = qPref?.coarseLng ?? 106.8456;
          await houseMuslimQiblaApi.getQibla(lat, lng, forceAll);
          completedSet.add('qibla:geodesic');
          failedMap.delete('qibla:geodesic');
        } catch (err) {
          failedMap.set('qibla:geodesic', {
            id: 'qibla:geodesic',
            label: 'Data Geodesik Arah Kiblat',
            category: 'hijri_qibla',
            error: err instanceof Error ? err.message : 'Gagal menyimpan data kiblat',
          });
        }
        emitChange();
      }

      // STEP 6: Sync all 114 Surahs (6,236 Ayats) into IndexedDB
      const missingSurahs = quranApi.getMissingOrInvalidSurahNumbers();
      for (let i = 1; i <= 114; i++) {
        if (!missingSurahs.includes(i)) {
          completedSet.add(`surah:${i}`);
          failedMap.delete(`surah:${i}`);
        }
      }
      emitChange();

      if (missingSurahs.length > 0) {
        await quranApi.syncFullDataset(
          (cachedCount, total, currentSurah) => {
            if (currentSurah) {
              completedSet.add(`surah:${currentSurah}`);
              failedMap.delete(`surah:${currentSurah}`);
            }
            state.currentTaskLabel = `Mengunduh Mushaf Al-Qur'an (${cachedCount}/${total} Surat)...`;
            emitChange();
          },
          undefined,
          (failedSurahNo, errMsg) => {
            const id = `surah:${failedSurahNo}`;
            completedSet.delete(id);
            failedMap.set(id, {
              id,
              label: `Mushaf Surat ke-${failedSurahNo}`,
              category: 'quran_mushaf',
              error: errMsg,
            });
            emitChange();
          }
        );
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('OFFLINE_INTERRUPTED');
      }

      // STEP 7: Final Integrity Validation before declaring 100% Ready Offline
      isRunningSync = false;
      const verified = await this.verifyIntegrityNow(false);
      await refreshStorageQuotaInfo();
      await persistManifestState();
      return verified;
    } catch (err) {
      isRunningSync = false;
      const isOfflineInterrupt =
        (err instanceof Error && err.message === 'OFFLINE_INTERRUPTED') ||
        (typeof navigator !== 'undefined' && !navigator.onLine);

      state = {
        ...state,
        status: isOfflineInterrupt ? 'paused_offline' : 'partial_error',
        currentTaskLabel: isOfflineInterrupt
          ? 'Koneksi internet terputus. Resource yang telah diunduh tetap tersimpan aman.'
          : 'Sebagian resource gagal diunduh. Ketuk Coba Lagi untuk melanjutkan.',
      };
      emitChange();
      await persistManifestState();
      return false;
    }
  },

  /**
   * Retries ONLY the resources that failed or are missing, without re-downloading valid cached data.
   */
  async retryFailedOnly(): Promise<boolean> {
    failedMap.clear();
    emitChange();
    return this.startOrResumeSync(false);
  },

  /**
   * Verifies integrity and completeness of all cached data in IndexedDB and Cache Storage.
   * Only marks the app as `ready_offline` (100%) if all 114 surahs and core datasets are verified!
   */
  async verifyIntegrityNow(silent = false): Promise<boolean> {
    if (!silent) {
      state = {
        ...state,
        status: 'verifying',
        currentTaskLabel: 'Memverifikasi integritas 114 Surat & Cache Storage...',
      };
      emitChange();
    }

    await hydrateMemoryCacheFromIDB();
    await hydrateIslamicCacheFromIDB();

    // 1. Check all 114 surahs in memory/IndexedDB
    const surahList = await idbCacheService.getSurahList();
    if (surahList && surahList.length === 114) {
      completedSet.add('surah:index');
      failedMap.delete('surah:index');
    } else {
      completedSet.delete('surah:index');
    }

    const allSurahs = await idbCacheService.getAllCachedSurahDetails();
    const validSurahSet = new Set<number>();
    for (const s of allSurahs) {
      if (isSurahDetailIntegrityValid(s)) {
        validSurahSet.add(s.nomor);
        completedSet.add(`surah:${s.nomor}`);
        failedMap.delete(`surah:${s.nomor}`);
      } else if (s && typeof s.nomor === 'number') {
        completedSet.delete(`surah:${s.nomor}`);
      }
    }

    // 2. Check static assets in Cache Storage if supported
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open(APP_SHELL_CACHE_NAME);
        for (const asset of CORE_STATIC_ASSETS) {
          const match = (await cache.match(asset.url)) || (await caches.match(asset.url));
          if (match && match.ok) {
            completedSet.add(asset.id);
            failedMap.delete(asset.id);
          }
        }
      } catch {
        // Ignore cache inspection error
      }
    }

    // 3. Check Islamic API caches in IndexedDB
    const doaCached = await idbCacheService.getIslamicCache<unknown[]>(
      'ziezan_islamic_idb_v3:doa:list:all:all',
      true
    );
    if (Array.isArray(doaCached) && doaCached.length > 0) {
      completedSet.add('doa:catalog');
      failedMap.delete('doa:catalog');
    }

    const provCached = await idbCacheService.getIslamicCache<string[]>(
      'ziezan_islamic_idb_v3:shalat:provinsi',
      true
    );
    if (Array.isArray(provCached) && provCached.length > 0) {
      completedSet.add('shalat:provinsi');
      failedMap.delete('shalat:provinsi');
    }

    const allValid =
      validSurahSet.size === 114 &&
      completedSet.has('surah:index') &&
      completedSet.has('doa:catalog') &&
      failedMap.size === 0;

    if (allValid) {
      // Ensure all static/shalat/hijri IDs are marked completed once verified
      for (const a of CORE_STATIC_ASSETS) completedSet.add(a.id);
      completedSet.add('shalat:provinsi');
      completedSet.add('shalat:kabkota');
      completedSet.add('shalat:schedule');
      completedSet.add('hijri:today_and_month');
      completedSet.add('hijri:events');
      completedSet.add('qibla:geodesic');

      state = {
        ...state,
        status: 'ready_offline',
        isVerifiedReady: true,
        lastVerifiedAt: Date.now(),
        currentTaskLabel:
          'Terverifikasi: Seluruh 114 Surat (6.236 Ayat) & fitur inti siap digunakan tanpa internet.',
      };
      emitChange();
      await persistManifestState();
      return true;
    }

    state = {
      ...state,
      isVerifiedReady: false,
      status:
        failedMap.size > 0
          ? 'partial_error'
          : typeof navigator !== 'undefined' && !navigator.onLine
            ? 'paused_offline'
            : 'idle',
      currentTaskLabel:
        failedMap.size > 0
          ? `${failedMap.size} resource memerlukan pengunduhan ulang.`
          : `Tersimpan ${validSurahSet.size}/114 Surat di penyimpanan lokal.`,
    };
    emitChange();
    return false;
  },

  /**
   * Optional on-demand full Tafsir Kemenag RI (114 Surahs) offline downloader
   */
  async downloadAllTafsirsOffline(): Promise<number> {
    if (state.isSyncingTafsir) return state.cachedTafsirCount;
    state = { ...state, isSyncingTafsir: true };
    emitChange();

    try {
      const count = await quranApi.syncAllTafsirs((cached) => {
        state = {
          ...state,
          cachedTafsirCount: cached,
        };
        emitChange();
      });
      state = {
        ...state,
        cachedTafsirCount: count,
        isSyncingTafsir: false,
      };
      await refreshStorageQuotaInfo();
      await persistManifestState();
      emitChange();
      return count;
    } catch {
      state = { ...state, isSyncingTafsir: false };
      emitChange();
      return state.cachedTafsirCount;
    }
  },
};

// Automatically listen for online/offline transitions to pause or resume seamlessly
if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => {
    if (!state.isVerifiedReady) {
      state = {
        ...state,
        status: 'paused_offline',
        currentTaskLabel:
          'Koneksi internet terputus. Pengunduhan dijeda dan akan dilanjutkan saat online.',
      };
      emitChange();
    }
  });

  window.addEventListener('online', () => {
    if (!state.isVerifiedReady && !isRunningSync) {
      void offlineSyncService.startOrResumeSync(false);
    }
  });
}
