import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Play,
  Square,
  Volume2,
  WifiOff,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AudioMiniPlayer } from './components/AudioMiniPlayer';
import { BookmarksView } from './components/BookmarksView';
import { DoaView } from './components/DoaView';
import { HijriCalendarView } from './components/HijriCalendarView';
import { HomeView } from './components/HomeView';
import { MicrophoneModal } from './components/MicrophoneModal';
import { AboutView, MoreModal } from './components/MoreView';
import { FloatingBottomNav, Navbar } from './components/Navbar';
import { NotFoundView } from './components/NotFoundView';
import {
  OfflineManagerModal,
  OfflineStatusBanner,
} from './components/OfflineManagerModal';
import { OrientationGuard } from './components/OrientationGuard';
import { QiblaView } from './components/QiblaView';
import { SearchView } from './components/SearchView';
import { SettingsView } from './components/SettingsView';
import { ShalatView } from './components/ShalatView';
import { SplashScreen } from './components/SplashScreen';
import { SurahListView } from './components/SurahListView';
import { SurahReaderView } from './components/SurahReaderView';
import { TafsirModal } from './components/TafsirModal';
import {
  APP_CONFIG,
  APP_INFO,
  BRAND_LOGO_PATH,
  PARTNER_LOGOS,
  QARI_OPTIONS,
  YAYASAN_KPM_INFO,
} from './config/brand';

import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  ADZAN_AUDIO_STREAMS,
  clampVolume,
  createBackgroundTickerWorker,
  evaluateScheduleForTrigger,
  getLocalDateIso,
  pruneTriggeredEvents,
  resolvePrayerAudioSource,
  syncShalatScheduleToServiceWorker,
  unlockAndPrimeBackgroundAudio,
} from './services/adzanAudioService';
import { equranShalatApi } from './services/islamicApi';
import { offlineSyncService } from './services/offlineSyncService';
import { hydrateMemoryCacheFromIDB, quranApi } from './services/quranApi';
import { securityService } from './services/securityService';
import { seoService } from './services/seoService';
import { storageService } from './services/storageService';
import { pathToState, tabToPath } from './utils/navigation';
import {
  ActiveAdzanPlaybackState,
  AdzanAudioCategory,
  PrayerTimeKey,
} from './types/islamic';
import {
  ActiveTab,
  AudioPlaybackState,
  Ayat,
  BookmarkItem,
  PersonalNote,
  QariKey,
  ReadingHistoryItem,
  ReadingPreferences,
  ReadingProgress,
  SurahDetail,
  SurahSummary,
  TafsirDetail,
} from './types/quran';

export default function App() {
  const isOnline = useOnlineStatus();

  // Animated Splash Screen State (1.5s - 2.5s target duration, bounded fallback)
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [minSplashElapsed, setMinSplashElapsed] = useState<boolean>(false);

  // Navigation & View State
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [invalidRoutePath, setInvalidRoutePath] = useState<string>('');
  const [aboutFocusSection, setAboutFocusSection] = useState<'top' | 'address'>('top');
  const [surahListMode, setSurahListMode] = useState<'SURAH' | 'JUZ'>('SURAH');
  const [selectedSurahNomor, setSelectedSurahNomor] = useState<number>(1);
  const [targetAyatNomor, setTargetAyatNomor] = useState<number | null>(null);
  const [scrollTriggerKey, setScrollTriggerKey] = useState<number>(0);
  const [searchInitialQuery, setSearchInitialQuery] = useState<string>('');

  // API Data State
  const [surahs, setSurahs] = useState<SurahSummary[]>([]);
  const [isLoadingSurahs, setIsLoadingSurahs] = useState<boolean>(true);
  const [surahListError, setSurahListError] = useState<string | null>(null);

  const [currentSurahDetail, setCurrentSurahDetail] = useState<SurahDetail | null>(null);
  const [isLoadingReader, setIsLoadingReader] = useState<boolean>(false);
  const [readerError, setReaderError] = useState<string | null>(null);

  const [cachedSurahCount, setCachedSurahCount] = useState<number>(0);
  const [offlineModalOpen, setOfflineModalOpen] = useState<boolean>(false);
  const [micModalOpen, setMicModalOpen] = useState<boolean>(false);
  const [moreModalOpen, setMoreModalOpen] = useState<boolean>(false);

  // Tafsir Modal State
  const [tafsirModalOpen, setTafsirModalOpen] = useState<boolean>(false);
  const [tafsirSurahNomor, setTafsirSurahNomor] = useState<number>(1);
  const [tafsirAyatNomor, setTafsirAyatNomor] = useState<number>(1);
  const [tafsirDetail, setTafsirDetail] = useState<TafsirDetail | null>(null);
  const [isLoadingTafsir, setIsLoadingTafsir] = useState<boolean>(false);
  const [tafsirError, setTafsirError] = useState<string | null>(null);

  // Persistent User State
  const [preferences, setPreferences] = useState<ReadingPreferences>(() =>
    storageService.getPreferences()
  );
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() =>
    storageService.getBookmarks()
  );
  const [notes, setNotes] = useState<PersonalNote[]>(() =>
    storageService.getNotes()
  );
  const [lastRead, setLastRead] = useState<ReadingProgress | null>(() =>
    storageService.getLastRead()
  );
  const [history, setHistory] = useState<ReadingHistoryItem[]>(() =>
    storageService.getReadingHistory()
  );
  const [readAyatKeys, setReadAyatKeys] = useState<string[]>(() =>
    storageService.getReadAyatKeys()
  );

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Audio Player State & Ref (Quran Murottal)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playback, setPlayback] = useState<AudioPlaybackState | null>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [repeatOneAyat, setRepeatOneAyat] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Adzan & Prayer Reminder Audio State & Ref (Single Managed Instance, Never Overlaps Murottal)
  const adzanAudioRef = useRef<HTMLAudioElement | null>(null);
  const [adzanPlayback, setAdzanPlayback] = useState<ActiveAdzanPlaybackState | null>(
    null
  );
  const inMemoryTriggeredRef = useRef<Set<string>>(new Set());

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 2800);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Load 114 Surah List & Hydrate IndexedDB Cache
  const loadSurahList = useCallback(async (force = false) => {
    setIsLoadingSurahs(true);
    setSurahListError(null);
    try {
      await hydrateMemoryCacheFromIDB();
      setCachedSurahCount(quranApi.getCachedSurahCount());
      const data = await quranApi.getSurahList(force);
      setSurahs(data);
      setCachedSurahCount(quranApi.getCachedSurahCount());
    } catch (err) {
      setSurahListError(
        err instanceof Error ? err.message : 'Gagal memuat daftar 114 surat.'
      );
    } finally {
      setIsLoadingSurahs(false);
    }
  }, []);

  useEffect(() => {
    loadSurahList();
  }, [loadSurahList]);

  // Splash Screen Minimum Duration & Bounded Fallback Timer
  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const minDuration = prefersReduced ? 600 : 1750;
    const maxFallbackDuration = prefersReduced ? 1200 : 2400;

    const minTimer = setTimeout(() => {
      setMinSplashElapsed(true);
    }, minDuration);

    const maxTimer = setTimeout(() => {
      setShowSplash(false);
    }, maxFallbackDuration);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, []);

  // Dismiss Splash Screen once minimum animation duration has elapsed and initial load finished (success or error)
  useEffect(() => {
    if (minSplashElapsed && !isLoadingSurahs) {
      setShowSplash(false);
    }
  }, [minSplashElapsed, isLoadingSurahs]);

  // Initialize Offline-First Architecture & Synchronize All 135 Mandatory Resources
  useEffect(() => {
    const unsubscribe = offlineSyncService.subscribe((next) => {
      setCachedSurahCount(next.cachedSurahCount);
    });
    const timer = setTimeout(() => {
      void offlineSyncService.initialize();
    }, 600);

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  // Navigate to a tab and push browser history entry with clean path URLs
  // Selecting 'more' opens the bottom-to-top MoreModal popup instead of navigating to /lainnya/
  const handleSelectTab = useCallback((nextTab: ActiveTab, pushHistory = true) => {
    if (nextTab === 'more') {
      setMoreModalOpen((prev) => !prev);
      return;
    }
    setMoreModalOpen(false);
    setActiveTab(nextTab);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (pushHistory) {
        try {
          const nextUrl = tabToPath(nextTab);
          window.history.pushState({ tab: nextTab }, '', nextUrl);
        } catch {
          // Ignore sandboxed iframe history restrictions
        }
      }
    }
  }, []);

  // Load Specific Surah Detail for Reader
  const loadSurahForReader = useCallback(
    async (nomor: number, ayatToFocus?: number, force = false, pushHistory = true) => {
      const normalizedAyat =
        typeof ayatToFocus === 'number' && Number.isFinite(ayatToFocus) && ayatToFocus >= 1
          ? Math.floor(ayatToFocus)
          : 1;

      setSelectedSurahNomor(nomor);
      setTargetAyatNomor(normalizedAyat);
      setScrollTriggerKey((prev) => prev + 1);
      setActiveTab('reader');
      setIsLoadingReader(true);
      setReaderError(null);
      setCurrentSurahDetail((prev) => (prev?.nomor === nomor ? prev : null));

      if (pushHistory && typeof window !== 'undefined') {
        try {
          const targetUrl = tabToPath('reader', {
            surahNomor: nomor,
            ayatNomor: normalizedAyat,
          });
          window.history.pushState(
            { tab: 'reader', surah: nomor, ayat: normalizedAyat },
            '',
            targetUrl
          );
        } catch {
          // Ignore
        }
      }

      try {
        const detail = await quranApi.getSurahDetail(nomor, force);
        setCurrentSurahDetail(detail);
        setCachedSurahCount(quranApi.getCachedSurahCount());

        // Automatically record reading history & mark ayat read
        const focusAyat = ayatToFocus || 1;
        const updatedHistory = storageService.addReadingHistory({
          surahNomor: detail.nomor,
          surahNamaLatin: detail.namaLatin,
          surahNamaArab: detail.nama,
          surahArti: detail.arti,
          ayatNomor: focusAyat,
          jumlahAyat: detail.jumlahAyat,
        });
        setHistory(updatedHistory);
        setReadAyatKeys(storageService.markAyatRead(detail.nomor, focusAyat));
      } catch (err) {
        setReaderError(
          err instanceof Error
            ? err.message
            : `Gagal memuat Surat ke-${nomor}. Periksa koneksi internet Anda.`
        );
      } finally {
        setIsLoadingReader(false);
      }
    },
    []
  );

  // Support direct search engine clean paths deep-linking, legacy redirects & Browser Back/Forward (popstate)
  const initialRouteHandledRef = useRef<boolean>(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const applyUrlState = () => {
      const route = pathToState(window.location.pathname, window.location.search);

      // If incoming URL used legacy query parameters, seamlessly replaceState with clean path
      if (route.isLegacyRedirect) {
        try {
          const cleanPath = tabToPath(route.tab, {
            surahNomor: route.surahNomor,
            ayatNomor: route.ayatNomor,
            searchQuery: route.searchQuery,
          });
          window.history.replaceState(
            { tab: route.tab, surah: route.surahNomor, ayat: route.ayatNomor },
            '',
            cleanPath
          );
        } catch {
          // Ignore
        }
      }

      if (route.tab === 'reader' && route.surahNomor) {
        loadSurahForReader(route.surahNomor, route.ayatNomor || 1, false, false);
      } else if (route.tab === 'search') {
        if (route.searchQuery) {
          setSearchInitialQuery(route.searchQuery.slice(0, 120));
        }
        setActiveTab('search');
      } else if (route.tab === 'not-found') {
        setInvalidRoutePath(route.invalidPath || window.location.pathname);
        setActiveTab('not-found');
      } else {
        setActiveTab(route.tab);
      }
    };

    if (!initialRouteHandledRef.current) {
      initialRouteHandledRef.current = true;
      applyUrlState();
    }

    const handlePopState = () => {
      applyUrlState();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [loadSurahForReader]);


  // Stop Adzan Audio cleanly at any time
  const handleStopAdzanAudio = useCallback(() => {
    const adzanAudio = adzanAudioRef.current;
    if (adzanAudio) {
      try {
        adzanAudio.onended = null;
        adzanAudio.onerror = null;
        adzanAudio.onplaying = null;
        adzanAudio.pause();
        adzanAudio.currentTime = 0;
        adzanAudio.removeAttribute('src');
      } catch {
        // Ignore cleanup errors
      }
    }
    setAdzanPlayback(null);
  }, []);

  // Prime audio element on first user interaction to unlock browser autoplay policy & background keep-alive
  useEffect(() => {
    const primeAudioElement = () => {
      unlockAndPrimeBackgroundAudio(adzanAudioRef.current);
    };
    window.addEventListener('pointerdown', primeAudioElement, { once: true, passive: true });
    window.addEventListener('keydown', primeAudioElement, { once: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', primeAudioElement);
      window.removeEventListener('keydown', primeAudioElement);
    };
  }, []);

  // Synchronize live volume changes with active Adzan audio element
  const handleSetAdzanVolume = useCallback((newVol: number) => {
    const clamped = clampVolume(newVol);
    if (adzanAudioRef.current) {
      adzanAudioRef.current.volume = clamped;
    }
  }, []);

  // Play Adzan / Imsak / Terbit Audio (either scheduled or manual test) with Murottal mutual exclusion & safe error handling
  const handlePlayAdzanAudio = useCallback(
    (params: {
      category: AdzanAudioCategory;
      prayerKey?: PrayerTimeKey;
      label: string;
      locationLabel?: string;
      scheduledTime?: string;
      primaryUrl: string;
      fallbackUrl: string;
      isTest: boolean;
      volume?: number;
    }) => {
      // 1. Pause Quran Murottal immediately if playing so audio never overlaps
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setPlayback((prev) => (prev ? { ...prev, isPlaying: false } : null));
      }

      // 2. Ensure single Adzan audio element
      let adzanAudio = adzanAudioRef.current;
      if (!adzanAudio && typeof Audio !== 'undefined') {
        adzanAudio = new Audio();
        adzanAudioRef.current = adzanAudio;
      }
      if (!adzanAudio) return;

      // Stop any existing stream first
      try {
        adzanAudio.onended = null;
        adzanAudio.onerror = null;
        adzanAudio.onplaying = null;
        adzanAudio.pause();
        adzanAudio.currentTime = 0;
      } catch {
        // Ignore
      }

      const savedRem = storageService.getShalatReminders();
      const targetVolume = clampVolume(params.volume ?? savedRem.volume);
      adzanAudio.volume = targetVolume;

      const targetUrl =
        !navigator.onLine && !params.isTest && params.fallbackUrl
          ? params.fallbackUrl
          : params.primaryUrl;

      if (!securityService.isTrustedAudioUrl(targetUrl)) {
        showToast('URL audio pengingat tidak terverifikasi.');
        return;
      }

      const usingOfflineInitial = targetUrl === params.fallbackUrl && targetUrl !== params.primaryUrl;

      setAdzanPlayback({
        isPlaying: false,
        isLoading: true,
        autoplayBlocked: false,
        isTest: params.isTest,
        category: params.category,
        prayerKey: params.prayerKey,
        label: params.label,
        locationLabel: params.locationLabel,
        scheduledTime: params.scheduledTime,
        audioUrl: targetUrl,
        usingOfflineFallback: usingOfflineInitial,
        error: null,
      });

      const attemptPlayUrl = (urlToPlay: string, isFallbackAttempt: boolean) => {
        if (!adzanAudio) return;
        adzanAudio.src = urlToPlay;
        adzanAudio.currentTime = 0;
        adzanAudio.volume = targetVolume;

        adzanAudio.onplaying = () => {
          setAdzanPlayback((prev) =>
            prev
              ? {
                  ...prev,
                  isPlaying: true,
                  isLoading: false,
                  autoplayBlocked: false,
                  audioUrl: urlToPlay,
                  usingOfflineFallback: isFallbackAttempt,
                  error: null,
                }
              : null
          );
        };

        adzanAudio.onended = () => {
          setAdzanPlayback(null);
        };

        adzanAudio.onerror = () => {
          if (
            !isFallbackAttempt &&
            !params.isTest &&
            params.fallbackUrl &&
            params.fallbackUrl !== urlToPlay
          ) {
            attemptPlayUrl(params.fallbackUrl, true);
            return;
          }
          const errMsg = !navigator.onLine
            ? 'Koneksi terputus (offline). Gagal memuat audio dari server.'
            : 'Gagal memuat berkas audio. Periksa koneksi internet Anda.';
          setAdzanPlayback((prev) =>
            prev
              ? {
                  ...prev,
                  isPlaying: false,
                  isLoading: false,
                  error: errMsg,
                }
              : null
          );
          showToast(errMsg);
        };

        try {
          adzanAudio.load();
          const playPromise = adzanAudio.play();
          if (playPromise && typeof playPromise.then === 'function') {
            playPromise
              .then(() => {
                setAdzanPlayback((prev) =>
                  prev
                    ? {
                        ...prev,
                        isPlaying: true,
                        isLoading: false,
                        autoplayBlocked: false,
                        audioUrl: urlToPlay,
                        usingOfflineFallback: isFallbackAttempt,
                        error: null,
                      }
                    : null
                );
              })
              .catch((err: unknown) => {
                const errName =
                  err && typeof err === 'object' && 'name' in err
                    ? String((err as { name?: string }).name)
                    : '';

                if (errName === 'NotAllowedError') {
                  // Browser blocked autoplay without prior user gesture -> keep banner open for 1-tap play
                  setAdzanPlayback((prev) =>
                    prev
                      ? {
                          ...prev,
                          isPlaying: false,
                          isLoading: false,
                          autoplayBlocked: true,
                          error: null,
                        }
                      : null
                  );
                  showToast(
                    'Ketuk tombol "Putar Audio" pada bilah pengingat untuk memutar suara Adzan.'
                  );
                  return;
                }

                if (
                  !isFallbackAttempt &&
                  !params.isTest &&
                  params.fallbackUrl &&
                  params.fallbackUrl !== urlToPlay
                ) {
                  attemptPlayUrl(params.fallbackUrl, true);
                  return;
                }

                const errMsg = !navigator.onLine
                  ? 'Koneksi internet terputus. Audio tidak dapat dimuat.'
                  : 'Gagal memutar audio pengingat.';
                setAdzanPlayback((prev) =>
                  prev
                    ? {
                        ...prev,
                        isPlaying: false,
                        isLoading: false,
                        error: errMsg,
                      }
                    : null
                );
                showToast(errMsg);
              });
          }
        } catch {
          setAdzanPlayback(null);
        }
      };

      attemptPlayUrl(targetUrl, usingOfflineInitial);
    },
    [showToast]
  );

  // Manual test handler for the 4 audio types in ShalatView
  const handleTestAdzanCategory = useCallback(
    (category: AdzanAudioCategory) => {
      // If clicking test on the same category while it's playing/loading, stop it
      if (
        adzanPlayback &&
        adzanPlayback.isTest &&
        adzanPlayback.category === category &&
        (adzanPlayback.isPlaying || adzanPlayback.isLoading)
      ) {
        handleStopAdzanAudio();
        return;
      }

      const stream = ADZAN_AUDIO_STREAMS[category];
      const rem = storageService.getShalatReminders();
      handlePlayAdzanAudio({
        category,
        label: `Uji Audio: ${stream.label}`,
        primaryUrl: stream.url,
        fallbackUrl: stream.fallbackLocalUrl,
        isTest: true,
        volume: rem.volume,
      });
    },
    [adzanPlayback, handlePlayAdzanAudio, handleStopAdzanAudio]
  );

  // Resume blocked autoplay when user clicks "Putar Audio Sekarang"
  const handleResumeBlockedAdzan = useCallback(() => {
    if (!adzanPlayback) return;
    const rem = storageService.getShalatReminders();
    handlePlayAdzanAudio({
      category: adzanPlayback.category,
      prayerKey: adzanPlayback.prayerKey,
      label: adzanPlayback.label,
      locationLabel: adzanPlayback.locationLabel,
      scheduledTime: adzanPlayback.scheduledTime,
      primaryUrl: adzanPlayback.audioUrl,
      fallbackUrl: ADZAN_AUDIO_STREAMS[adzanPlayback.category].fallbackLocalUrl,
      isTest: adzanPlayback.isTest,
      volume: rem.volume,
    });
  }, [adzanPlayback, handlePlayAdzanAudio]);

  // Active Foreground + Background Web Worker + Service Worker Prayer Reminder & Automatic Adzan Engine
  useEffect(() => {
    // Hydrate in-memory deduplication Set from persisted triggeredEvents
    const initialRem = storageService.getShalatReminders();
    if (initialRem.triggeredEvents) {
      for (const k of Object.keys(initialRem.triggeredEvents)) {
        inMemoryTriggeredRef.current.add(k);
      }
    }
    if (initialRem.lastNotifiedKey) {
      inMemoryTriggeredRef.current.add(initialRem.lastNotifiedKey);
    }

    // Handle ?autoPlayAdzan= query parameter if launched from a background notification click
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const autoPlayKey = params.get('autoPlayAdzan') as PrayerTimeKey | null;
        if (autoPlayKey) {
          const rem = storageService.getShalatReminders();
          const loc = storageService.getShalatLocation();
          const audioSource = resolvePrayerAudioSource(autoPlayKey, rem.sound);
          if (audioSource.primaryUrl) {
            handlePlayAdzanAudio({
              category: audioSource.category,
              prayerKey: autoPlayKey,
              label: audioSource.label,
              locationLabel: `${loc.kabkota}, ${loc.provinsi}`,
              primaryUrl: audioSource.primaryUrl,
              fallbackUrl: audioSource.fallbackUrl,
              isTest: false,
              volume: rem.volume,
            });
          }
          params.delete('autoPlayAdzan');
          const nextSearch = params.toString();
          const nextUrl =
            window.location.pathname + (nextSearch ? `?${nextSearch}` : '');
          window.history.replaceState(window.history.state, '', nextUrl);
        }
      } catch {
        // Ignore
      }
    }

    let isChecking = false;

    const checkPrayerReminder = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const rem = storageService.getShalatReminders();
        const loc = storageService.getShalatLocation();
        const now = new Date();
        const sched = await equranShalatApi.getMonthlySchedule(
          loc.provinsi,
          loc.kabkota,
          now.getMonth() + 1,
          now.getFullYear()
        );

        const todayIso = getLocalDateIso(now);
        const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const tomorrowIso = getLocalDateIso(tomorrowDate);

        const todayRow =
          sched.jadwal.find((j) => j.tanggal_lengkap === todayIso) ||
          sched.jadwal.find((j) => j.tanggal === now.getDate());
        const tomorrowRow =
          sched.jadwal.find((j) => j.tanggal_lengkap === tomorrowIso) || null;

        // Always keep Service Worker schedule synced for background wakeups
        if (todayRow) {
          syncShalatScheduleToServiceWorker({
            todayRow,
            tomorrowRow,
            provinsi: sched.provinsi || loc.provinsi,
            kabkota: sched.kabkota || loc.kabkota,
            settings: rem,
          });
        }

        if (!rem.enabled || !todayRow) return;

        const trigger = evaluateScheduleForTrigger({
          todayRow,
          settings: rem,
          provinsi: sched.provinsi || loc.provinsi,
          kabkota: sched.kabkota || loc.kabkota,
          now,
          inMemoryTriggered: inMemoryTriggeredRef.current,
        });

        if (!trigger) return;

        // 1. Lock synchronously in memory to prevent any duplicate firing on overlapping ticks
        inMemoryTriggeredRef.current.add(trigger.exactKey);
        inMemoryTriggeredRef.current.add(trigger.slotKey);

        // 2. Persist to localStorage (pruning entries older than 72 hours)
        const nowMs = Date.now();
        const nextTriggeredEvents = pruneTriggeredEvents(
          {
            ...(rem.triggeredEvents || {}),
            [trigger.exactKey]: nowMs,
            [trigger.slotKey]: nowMs,
          },
          nowMs
        );

        const updatedSettings = {
          ...rem,
          lastNotifiedKey: trigger.exactKey,
          triggeredEvents: nextTriggeredEvents,
        };
        storageService.saveShalatReminders(updatedSettings);

        // Update Service Worker with the newly recorded triggeredEvents
        syncShalatScheduleToServiceWorker({
          todayRow,
          tomorrowRow,
          provinsi: sched.provinsi || loc.provinsi,
          kabkota: sched.kabkota || loc.kabkota,
          settings: updatedSettings,
        });

        // 3. Visual Toast Notification
        showToast(trigger.message);

        // 4. Play mapped Adzan / Imsak / Terbit Audio if enabled
        if (rem.audioEnabled !== false && rem.sound !== 'mute' && trigger.primaryUrl) {
          handlePlayAdzanAudio({
            category: trigger.category,
            prayerKey: trigger.prayerKey,
            label: trigger.audioLabel,
            locationLabel: `${sched.kabkota}, ${sched.provinsi}`,
            scheduledTime: trigger.scheduledTime,
            primaryUrl: trigger.primaryUrl,
            fallbackUrl: trigger.fallbackUrl,
            isTest: false,
            volume: rem.volume,
          });
        }

        // 5. Device / Browser Notification (if supported & granted)
        if (
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'
        ) {
          const notifTitle = `Ziezan Quran — Waktu ${trigger.prayerLabel} (${trigger.scheduledTime})`;
          const notifOptions: NotificationOptions & {
            renotify?: boolean;
            requireInteraction?: boolean;
            vibrate?: number[];
          } = {
            body: `${trigger.message} Suara ${trigger.audioLabel} berkumandang otomatis.`,
            icon: '/icons/ziezan-quran.png',
            badge: '/icons/ziezan-quran.png',
            tag: trigger.slotKey,
            renotify: true,
            requireInteraction: true,
            vibrate: [300, 150, 300, 150, 400],
          };

          if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.ready
              .then((reg) => reg.showNotification(notifTitle, notifOptions))
              .catch(() => {
                try {
                  new Notification(notifTitle, notifOptions);
                } catch {
                  // Ignore
                }
              });
          } else {
            try {
              new Notification(notifTitle, notifOptions);
            } catch {
              // Ignore
            }
          }
        }
      } catch {
        // Ignore background schedule check error
      } finally {
        isChecking = false;
      }
    };

    checkPrayerReminder();
    // Unthrottled Web Worker ticker so background tabs continue evaluating prayer times accurately
    const stopTicker = createBackgroundTickerWorker(checkPrayerReminder, 4000);

    const handleVisibilityOrSettings = () => {
      checkPrayerReminder();
    };

    // Listen to Service Worker background messages (e.g., periodicSync wakeup or notification action)
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'SW_STOP_ADZAN_AUDIO') {
        handleStopAdzanAudio();
        return;
      }

      if (data.type === 'SW_TRIGGER_ADZAN_AUDIO') {
        const {
          exactKey,
          slotKey,
          prayerKey,
          scheduledTime,
          locationLabel,
          message,
        } = data as {
          exactKey?: string;
          slotKey?: string;
          prayerKey?: PrayerTimeKey;
          scheduledTime?: string;
          locationLabel?: string;
          message?: string;
        };

        if (
          exactKey &&
          slotKey &&
          inMemoryTriggeredRef.current.has(exactKey) &&
          inMemoryTriggeredRef.current.has(slotKey)
        ) {
          return;
        }

        if (exactKey) inMemoryTriggeredRef.current.add(exactKey);
        if (slotKey) inMemoryTriggeredRef.current.add(slotKey);

        const rem = storageService.getShalatReminders();
        const nowMs = Date.now();
        const nextTriggeredEvents = pruneTriggeredEvents(
          {
            ...(rem.triggeredEvents || {}),
            ...(exactKey ? { [exactKey]: nowMs } : {}),
            ...(slotKey ? { [slotKey]: nowMs } : {}),
          },
          nowMs
        );
        storageService.saveShalatReminders({
          ...rem,
          lastNotifiedKey: exactKey || rem.lastNotifiedKey,
          triggeredEvents: nextTriggeredEvents,
        });

        if (message) {
          showToast(message);
        }

        if (prayerKey && rem.audioEnabled !== false && rem.sound !== 'mute') {
          const audioSource = resolvePrayerAudioSource(prayerKey, rem.sound);
          if (audioSource.primaryUrl) {
            handlePlayAdzanAudio({
              category: audioSource.category,
              prayerKey,
              label: audioSource.label,
              locationLabel,
              scheduledTime,
              primaryUrl: audioSource.primaryUrl,
              fallbackUrl: audioSource.fallbackUrl,
              isTest: false,
              volume: rem.volume,
            });
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrSettings);
    window.addEventListener('focus', handleVisibilityOrSettings);
    window.addEventListener('ziezan:shalat-settings-updated', checkPrayerReminder);
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      stopTicker();
      document.removeEventListener('visibilitychange', handleVisibilityOrSettings);
      window.removeEventListener('focus', handleVisibilityOrSettings);
      window.removeEventListener('ziezan:shalat-settings-updated', checkPrayerReminder);
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [handlePlayAdzanAudio, handleStopAdzanAudio, showToast]);


  // Dynamic SEO, AIO, AEO & GEO Meta + Schema.org JSON-LD synchronization
  useEffect(() => {
    seoService.updatePageSeo({
      activeTab,
      surah: currentSurahDetail,
      ayatNomor: targetAyatNomor,
      searchQuery: searchInitialQuery,
    });
  }, [activeTab, currentSurahDetail, targetAyatNomor, searchInitialQuery]);

  // Load Tafsir Detail when user opens Tafsir modal
  const handleOpenTafsir = useCallback(async (surah: SurahDetail, ayat: Ayat) => {
    setTafsirSurahNomor(surah.nomor);
    setTafsirAyatNomor(ayat.nomorAyat);
    setTafsirModalOpen(true);
    setIsLoadingTafsir(true);
    setTafsirError(null);

    try {
      const data = await quranApi.getTafsirDetail(surah.nomor);
      setTafsirDetail(data);
    } catch (err) {
      setTafsirError(
        err instanceof Error ? err.message : 'Gagal memuat tafsir dari server eQuran.id.'
      );
    } finally {
      setIsLoadingTafsir(false);
    }
  }, []);

  const handleRetryTafsir = useCallback(async () => {
    setIsLoadingTafsir(true);
    setTafsirError(null);
    try {
      const data = await quranApi.getTafsirDetail(tafsirSurahNomor, true);
      setTafsirDetail(data);
    } catch (err) {
      setTafsirError(
        err instanceof Error ? err.message : 'Gagal memuat tafsir dari server eQuran.id.'
      );
    } finally {
      setIsLoadingTafsir(false);
    }
  }, [tafsirSurahNomor]);

  // Preferences Handler
  const handleUpdatePreferences = useCallback((nextPrefs: ReadingPreferences) => {
    setPreferences(nextPrefs);
    storageService.savePreferences(nextPrefs);
  }, []);

  // Bookmark Handler
  const handleToggleBookmark = useCallback(
    (surah: SurahDetail, ayat: Ayat) => {
      const result = storageService.toggleBookmark({
        surahNomor: surah.nomor,
        surahNamaLatin: surah.namaLatin,
        surahNamaArab: surah.nama,
        surahArti: surah.arti,
        ayatNomor: ayat.nomorAyat,
        teksArab: ayat.teksArab,
        teksLatin: ayat.teksLatin,
        teksIndonesia: ayat.teksIndonesia,
      });
      setBookmarks(result.bookmarks);
      showToast(
        result.added
          ? `QS. ${surah.namaLatin} : ${ayat.nomorAyat} disimpan ke Penanda`
          : `Penanda QS. ${surah.namaLatin} : ${ayat.nomorAyat} dihapus`
      );
    },
    [showToast]
  );

  const handleRemoveBookmark = useCallback(
    (id: string) => {
      const updated = storageService.removeBookmark(id);
      setBookmarks(updated);
      showToast('Penanda ayat dihapus');
    },
    [showToast]
  );

  // Personal Note Handler
  const handleSaveNote = useCallback(
    (surah: SurahDetail, ayat: Ayat, noteText: string) => {
      const updated = storageService.saveNote({
        surahNomor: surah.nomor,
        surahNamaLatin: surah.namaLatin,
        surahNamaArab: surah.nama,
        ayatNomor: ayat.nomorAyat,
        teksArab: ayat.teksArab,
        teksIndonesia: ayat.teksIndonesia,
        noteText,
      });
      setNotes(updated);
      showToast(
        noteText.trim()
          ? `Catatan QS. ${surah.namaLatin} : ${ayat.nomorAyat} disimpan`
          : 'Catatan dihapus'
      );
    },
    [showToast]
  );

  const handleDeleteNote = useCallback(
    (id: string) => {
      const updated = storageService.deleteNote(id);
      setNotes(updated);
      showToast('Catatan pribadi dihapus');
    },
    [showToast]
  );

  // Mark Last Read Handler
  const handleMarkLastRead = useCallback(
    (surah: SurahDetail, ayatNomor: number) => {
      const saved = storageService.saveLastRead({
        surahNomor: surah.nomor,
        surahNamaLatin: surah.namaLatin,
        surahNamaArab: surah.nama,
        surahArti: surah.arti,
        ayatNomor,
        jumlahAyat: surah.jumlahAyat,
      });
      setLastRead(saved);
      setHistory(storageService.getReadingHistory());
      setReadAyatKeys(storageService.getReadAyatKeys());
      showToast(`Ditandai terakhir dibaca: QS. ${surah.namaLatin} Ayat ${ayatNomor}`);
    },
    [showToast]
  );

  const handleClearHistory = useCallback(() => {
    storageService.clearReadingHistory();
    setHistory([]);
    showToast('Riwayat bacaan dibersihkan');
  }, [showToast]);

  const handleRefreshStoredData = useCallback(() => {
    setPreferences(storageService.getPreferences());
    setBookmarks(storageService.getBookmarks());
    setNotes(storageService.getNotes());
    setLastRead(storageService.getLastRead());
    setHistory(storageService.getReadingHistory());
    setReadAyatKeys(storageService.getReadAyatKeys());
  }, []);

  // Audio Murottal Playback Logic with Trusted Origin Security Validation
  const startAudioUrl = useCallback(
    (state: AudioPlaybackState) => {
      const audio = audioRef.current;
      if (!audio) return;

      // Ensure Adzan / Imsak / Terbit audio stops before starting Quran murottal
      handleStopAdzanAudio();

      if (!securityService.isTrustedAudioUrl(state.audioUrl)) {
        setAudioError('Sumber audio tidak terverifikasi.');
        showToast('Sumber audio ditolak demi keamanan.');
        return;
      }

      setAudioError(null);
      setIsLoadingAudio(true);

      if (audio.src !== state.audioUrl) {
        audio.src = state.audioUrl;
        audio.load();
      }

      audio
        .play()
        .then(() => {
          setIsLoadingAudio(false);
          setPlayback({ ...state, isPlaying: true });
        })
        .catch(() => {
          setIsLoadingAudio(false);
          setAudioError('Gagal memutar audio murottal.');
          setPlayback({ ...state, isPlaying: false });
        });
    },
    [handleStopAdzanAudio, showToast]
  );

  const handlePlayAyatAudio = useCallback(
    (surah: SurahDetail, ayat: Ayat, customQari?: QariKey) => {
      const qari = customQari || preferences.selectedQari;
      const url = ayat.audio[qari];
      if (!url) {
        showToast('URL audio untuk ayat ini tidak tersedia.');
        return;
      }

      const audio = audioRef.current;
      // If clicking the exact same ayat that is currently loaded, toggle play/pause
      if (
        playback &&
        playback.mode === 'ayat' &&
        playback.surahNomor === surah.nomor &&
        playback.ayatNomor === ayat.nomorAyat &&
        playback.qari === qari &&
        audio
      ) {
        if (playback.isPlaying) {
          audio.pause();
          setPlayback({ ...playback, isPlaying: false });
        } else {
          handleStopAdzanAudio();
          audio.play().catch(() => {});
          setPlayback({ ...playback, isPlaying: true });
        }
        return;
      }

      const nextState: AudioPlaybackState = {
        isPlaying: true,
        mode: 'ayat',
        surahNomor: surah.nomor,
        surahNamaLatin: surah.namaLatin,
        surahNamaArab: surah.nama,
        ayatNomor: ayat.nomorAyat,
        jumlahAyat: surah.jumlahAyat,
        audioUrl: url,
        qari,
      };
      setPlayback(nextState);
      startAudioUrl(nextState);

      // Mark ayat read when listened
      setReadAyatKeys(storageService.markAyatRead(surah.nomor, ayat.nomorAyat));
    },
    [handleStopAdzanAudio, playback, preferences.selectedQari, showToast, startAudioUrl]
  );

  const handlePlayFullSurahAudio = useCallback(
    (surah: SurahSummary | SurahDetail, customQari?: QariKey) => {
      const qari = customQari || preferences.selectedQari;
      const url = surah.audioFull?.[qari];
      if (!url) {
        showToast('URL audio surat penuh tidak tersedia.');
        return;
      }

      const audio = audioRef.current;
      if (
        playback &&
        playback.mode === 'surah' &&
        playback.surahNomor === surah.nomor &&
        playback.qari === qari &&
        audio
      ) {
        if (playback.isPlaying) {
          audio.pause();
          setPlayback({ ...playback, isPlaying: false });
        } else {
          handleStopAdzanAudio();
          audio.play().catch(() => {});
          setPlayback({ ...playback, isPlaying: true });
        }
        return;
      }

      const nextState: AudioPlaybackState = {
        isPlaying: true,
        mode: 'surah',
        surahNomor: surah.nomor,
        surahNamaLatin: surah.namaLatin,
        surahNamaArab: surah.nama,
        jumlahAyat: surah.jumlahAyat,
        audioUrl: url,
        qari,
      };
      setPlayback(nextState);
      startAudioUrl(nextState);
    },
    [handleStopAdzanAudio, playback, preferences.selectedQari, showToast, startAudioUrl]
  );

  const handleStepAyatAudio = useCallback(
    async (direction: -1 | 1) => {
      if (!playback || playback.mode !== 'ayat' || !playback.ayatNomor) return;
      const nextAyatNumber = playback.ayatNomor + direction;
      if (nextAyatNumber < 1) return;

      let detail =
        currentSurahDetail?.nomor === playback.surahNomor ? currentSurahDetail : null;
      if (!detail) {
        try {
          detail = await quranApi.getSurahDetail(playback.surahNomor);
        } catch {
          return;
        }
      }

      if (nextAyatNumber > detail.jumlahAyat) {
        setPlayback((prev) => (prev ? { ...prev, isPlaying: false } : null));
        return;
      }

      const targetAyat = detail.ayat.find((a) => a.nomorAyat === nextAyatNumber);
      if (targetAyat) {
        handlePlayAyatAudio(detail, targetAyat, playback.qari);
      }
    },
    [currentSurahDetail, handlePlayAyatAudio, playback]
  );

  const handleChangePlayerQari = useCallback(
    async (newQari: QariKey) => {
      const nextPrefs = { ...preferences, selectedQari: newQari };
      handleUpdatePreferences(nextPrefs);

      if (!playback) return;
      let detail =
        currentSurahDetail?.nomor === playback.surahNomor ? currentSurahDetail : null;
      if (!detail) {
        try {
          detail = await quranApi.getSurahDetail(playback.surahNomor);
        } catch {
          return;
        }
      }

      if (playback.mode === 'surah') {
        handlePlayFullSurahAudio(detail, newQari);
      } else if (playback.ayatNomor) {
        const ayatObj = detail.ayat.find((a) => a.nomorAyat === playback.ayatNomor);
        if (ayatObj) {
          handlePlayAyatAudio(detail, ayatObj, newQari);
        }
      }
    },
    [
      currentSurahDetail,
      handlePlayAyatAudio,
      handlePlayFullSurahAudio,
      handleUpdatePreferences,
      playback,
      preferences,
    ]
  );

  // Attach Audio Element Event Listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setAudioCurrentTime(audio.currentTime || 0);
    const onLoadedMetadata = () => setAudioDuration(audio.duration || 0);
    const onWaiting = () => setIsLoadingAudio(true);
    const onPlaying = () => {
      setIsLoadingAudio(false);
      setAudioError(null);
    };
    const onError = () => {
      setIsLoadingAudio(false);
      setAudioError('Gagal memuat berkas audio.');
    };
    const onEnded = () => {
      if (playback?.mode === 'ayat' && repeatOneAyat && audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      if (playback?.mode === 'ayat' && preferences.autoPlayNextAyat) {
        handleStepAyatAudio(1);
      } else {
        setPlayback((prev) => (prev ? { ...prev, isPlaying: false } : null));
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('error', onError);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('ended', onEnded);
    };
  }, [handleStepAyatAudio, playback?.mode, preferences.autoPlayNextAyat, repeatOneAyat]);

  // Synchronize playback speed with HTMLAudioElement
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, playback?.audioUrl]);

  // OS Lock-Screen & Bluetooth MediaSession API Integration for Production Audio (Murottal & Adzan)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }

    if (adzanPlayback && adzanPlayback.isPlaying) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: adzanPlayback.label,
          artist: adzanPlayback.locationLabel || 'Pengingat Waktu Salat',
          album: APP_CONFIG.appName,
          artwork: [
            {
              src: BRAND_LOGO_PATH,
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          handleStopAdzanAudio();
        });
        navigator.mediaSession.setActionHandler('stop', () => {
          handleStopAdzanAudio();
        });
      } catch {
        // Ignore
      }
      return;
    }

    if (!playback) {
      return;
    }
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title:
          playback.mode === 'ayat'
            ? `QS. ${playback.surahNamaLatin} : Ayat ${playback.ayatNomor}`
            : `QS. ${playback.surahNamaLatin} (Surat Penuh)`,
        artist: QARI_OPTIONS[playback.qari].name,
        album: APP_CONFIG.appName,
        artwork: [
          {
            src: BRAND_LOGO_PATH,
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play().catch(() => {});
        setPlayback((prev) => (prev ? { ...prev, isPlaying: true } : null));
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
        setPlayback((prev) => (prev ? { ...prev, isPlaying: false } : null));
      });
      navigator.mediaSession.setActionHandler(
        'previoustrack',
        playback.mode === 'ayat' ? () => handleStepAyatAudio(-1) : null
      );
      navigator.mediaSession.setActionHandler(
        'nexttrack',
        playback.mode === 'ayat' ? () => handleStepAyatAudio(1) : null
      );
    } catch {
      // Ignore unsupported MediaSession environments
    }
  }, [adzanPlayback, handleStepAyatAudio, handleStopAdzanAudio, playback]);

  const handleToggleMiniPlayer = () => {
    const audio = audioRef.current;
    if (!audio || !playback) return;
    if (playback.isPlaying) {
      audio.pause();
      setPlayback({ ...playback, isPlaying: false });
    } else {
      handleStopAdzanAudio();
      audio.play().catch(() => {});
      setPlayback({ ...playback, isPlaying: true });
    }
  };

  const handleSeekAudio = (newTime: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = newTime;
    setAudioCurrentTime(newTime);
  };

  const handleCloseAudioPlayer = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
    }
    setPlayback(null);
    setAudioCurrentTime(0);
    setAudioDuration(0);
  };

  const currentTafsirAyatObj =
    currentSurahDetail?.nomor === tafsirSurahNomor
      ? currentSurahDetail.ayat.find((a) => a.nomorAyat === tafsirAyatNomor)
      : undefined;

  const isReaderView = activeTab === 'reader';

  return (
    <>
      {/* Reusable Full-Viewport Orientation Guard (Mobile Landscape & Desktop Portrait) */}
      <OrientationGuard />

      <div
        className={`app-viewport-shell w-full min-h-screen min-h-[100dvh] flex flex-col ${
          playback
            ? isReaderView
              ? 'pb-48'
              : 'pb-64 lg:pb-48'
            : isReaderView
              ? 'pb-12'
              : 'pb-24 lg:pb-12'
        }`}
        style={{ backgroundColor: 'var(--color-bg-page)' }}
      >
        {/* Premium Animated Splash Screen */}
        <SplashScreen isVisible={showSplash} />

        {/* Hidden Global Audio Elements (Murottal & Adzan) */}
        <audio ref={audioRef} preload="metadata" />
        <audio ref={adzanAudioRef} preload="auto" />

        {/* Top Navigation Brand Bar (Hidden on Surah Reader Detail View) */}
        <Navbar
          activeTab={activeTab}
          isMoreModalOpen={moreModalOpen}
          onSelectTab={(tab) => handleSelectTab(tab)}
          lastRead={lastRead}
          onContinueReading={() =>
            lastRead
              ? loadSurahForReader(lastRead.surahNomor, lastRead.ayatNomor)
              : loadSurahForReader(1, 1)
          }
          onOpenMicrophone={() => setMicModalOpen(true)}
        />

        {/* Offline-First Preparation Progress, Update & Connectivity Status Banner */}
        <OfflineStatusBanner onOpenModal={() => setOfflineModalOpen(true)} />

        {/* Main Content Area */}
        <main className="flex-1 w-full min-w-0 min-h-0 flex flex-col">
        {activeTab === 'home' && (
          <HomeView
            surahs={surahs}
            lastRead={lastRead}
            history={history}
            bookmarks={bookmarks}
            notes={notes}
            readAyatCount={readAyatKeys.length}
            onOpenSurah={(sNo, aNo) => loadSurahForReader(sNo, aNo)}
            onNavigateToSearch={(q) => {
              setSearchInitialQuery(q || '');
              handleSelectTab('search');
            }}
            onNavigateToSurahList={(mode) => {
              setSurahListMode(mode || 'SURAH');
              handleSelectTab('surah-list');
            }}
            onNavigateToBookmarks={() => handleSelectTab('bookmarks')}
            onSelectTab={(tab) => handleSelectTab(tab)}
            onOpenMicrophone={() => setMicModalOpen(true)}
            onActivateBackgroundAdzan={() =>
              unlockAndPrimeBackgroundAudio(adzanAudioRef.current)
            }
            adzanPlayback={adzanPlayback}
            onTestAdzanCategory={handleTestAdzanCategory}
            onStopAdzanAudio={handleStopAdzanAudio}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'surah-list' && (
          <SurahListView
            surahs={surahs}
            isLoading={isLoadingSurahs}
            error={surahListError}
            playback={playback}
            initialMode={surahListMode}
            bookmarksCount={bookmarks.length}
            notesCount={notes.length}
            onRetry={() => loadSurahList(true)}
            onSelectSurah={(sNo, aNo) => loadSurahForReader(sNo, aNo)}
            onPlayFullSurah={(surah) => handlePlayFullSurahAudio(surah)}
            onOpenSearch={(q) => {
              setSearchInitialQuery(q || '');
              handleSelectTab('search');
            }}
            onOpenBookmarks={() => handleSelectTab('bookmarks')}
            onOpenMicrophone={() => setMicModalOpen(true)}
          />
        )}

        {activeTab === 'reader' && (
          <SurahReaderView
            surah={
              currentSurahDetail?.nomor === selectedSurahNomor ? currentSurahDetail : null
            }
            allSurahs={surahs}
            isLoading={isLoadingReader}
            error={readerError}
            initialAyatNomor={targetAyatNomor}
            scrollTriggerKey={scrollTriggerKey}
            preferences={preferences}
            bookmarks={bookmarks}
            notes={notes}
            lastRead={lastRead}
            playback={playback}
            onRetry={() => loadSurahForReader(selectedSurahNomor, targetAyatNomor || 1, true)}
            onBackToList={() => handleSelectTab('surah-list')}
            onSelectSurah={(sNo, aNo) => loadSurahForReader(sNo, aNo)}
            onPlayAyatAudio={(s, a) => handlePlayAyatAudio(s, a)}
            onPlayFullSurahAudio={(s) => handlePlayFullSurahAudio(s)}
            onToggleBookmark={handleToggleBookmark}
            onSaveNote={handleSaveNote}
            onMarkLastRead={handleMarkLastRead}
            onOpenTafsir={handleOpenTafsir}
            onUpdatePreferences={handleUpdatePreferences}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'shalat' && (
          <ShalatView
            onShowToast={showToast}
            adzanPlayback={adzanPlayback}
            onTestAdzanCategory={handleTestAdzanCategory}
            onStopAdzanAudio={handleStopAdzanAudio}
            onVolumeChange={handleSetAdzanVolume}
          />
        )}

        {activeTab === 'qibla' && <QiblaView onShowToast={showToast} />}

        {activeTab === 'doa' && (
          <DoaView
            arabicFontFamily={preferences.arabicFontFamily}
            arabicFontSize={preferences.arabicFontSize}
            onShowToast={showToast}
            onOpenMicrophone={() => setMicModalOpen(true)}
          />
        )}

        {activeTab === 'hijri' && <HijriCalendarView onShowToast={showToast} />}

        {activeTab === 'search' && (
          <SearchView
            surahs={surahs}
            initialQuery={searchInitialQuery}
            preferences={preferences}
            cachedSurahCount={cachedSurahCount}
            onUpdateCachedCount={setCachedSurahCount}
            onOpenSurah={(sNo, aNo) => loadSurahForReader(sNo, aNo)}
            onOpenMicrophone={() => setMicModalOpen(true)}
          />
        )}

        {activeTab === 'bookmarks' && (
          <BookmarksView
            bookmarks={bookmarks}
            notes={notes}
            history={history}
            onOpenSurah={(sNo, aNo) => loadSurahForReader(sNo, aNo)}
            onRemoveBookmark={handleRemoveBookmark}
            onDeleteNote={handleDeleteNote}
            onClearHistory={handleClearHistory}
            onDataImported={handleRefreshStoredData}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            preferences={preferences}
            cachedSurahCount={cachedSurahCount}
            onUpdatePreferences={handleUpdatePreferences}
            onUpdateCachedCount={setCachedSurahCount}
            onShowToast={showToast}
            onOpenOfflineModal={() => setOfflineModalOpen(true)}
          />
        )}

        {activeTab === 'about' && (
          <AboutView
            onBack={() => setMoreModalOpen(true)}
            focusSection={aboutFocusSection}
          />
        )}

        {activeTab === 'not-found' && (
          <NotFoundView
            invalidPath={invalidRoutePath}
            onBackToHome={() => handleSelectTab('home')}
          />
        )}
      </main>

      {/* Minimalist, Responsive Application Footer */}
      <footer
        className="w-full border-t bg-white/95 backdrop-blur-xs"
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <div className="container-app py-6 sm:py-7 flex flex-col items-center text-center space-y-4">
          {/* Identity & Navigation Links (Centered) */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <img
                src={BRAND_LOGO_PATH}
                alt={APP_CONFIG.appName}
                className="w-6 h-6 object-contain shrink-0"
                referrerPolicy="no-referrer"
              />
              <span className="font-display text-base sm:text-lg font-bold text-[#035328] tracking-tight">
                {APP_CONFIG.appName}
              </span>
              <span className="text-[#C9D4CA]" aria-hidden="true">
                |
              </span>
              <span className="text-xs sm:text-sm font-medium text-[#24352B]">
                {YAYASAN_KPM_INFO.identityTagline}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAboutFocusSection('top');
                  handleSelectTab('about');
                }}
                className="text-[#046D38] hover:text-[#035328] hover:underline transition-colors cursor-pointer whitespace-nowrap"
              >
                Tentang Aplikasi &rarr;
              </button>
              <span className="text-[#C9D4CA]" aria-hidden="true">
                &middot;
              </span>
              <button
                type="button"
                onClick={() => {
                  setAboutFocusSection('address');
                  handleSelectTab('about');
                }}
                className="text-[#046D38] hover:text-[#035328] hover:underline transition-colors cursor-pointer whitespace-nowrap"
              >
                Alamat Yayasan &rarr;
              </button>
            </div>
          </div>

          {/* Partner Logos — Centered, Unwrapped Icons, 10s Continuous Smooth Auto-Slide */}
          <div className="w-full flex flex-col items-center justify-center gap-2 py-3 border-y border-[#E3E9E3]/80">
            <span className="text-[11px] font-medium text-[#68756C] tracking-wide">
              Didukung &amp; Berkolaborasi Bersama
            </span>
            <div
              className="ziezan-footer-marquee-mask max-w-[320px] sm:max-w-[480px] md:max-w-[540px] py-1 mx-auto"
              aria-label="Mitra Kolaborasi Ziezan Quran"
            >
              <div className="ziezan-footer-marquee-track">
                {[0, 1].map((loopIndex) => (
                  <div
                    key={loopIndex}
                    aria-hidden={loopIndex === 1 ? 'true' : undefined}
                    className="flex items-center gap-6 sm:gap-8 pr-6 sm:pr-8 shrink-0"
                  >
                    {PARTNER_LOGOS.map((partner) => (
                      <button
                        key={`${loopIndex}-${partner.id}`}
                        type="button"
                        tabIndex={loopIndex === 1 ? -1 : 0}
                        onClick={() => {
                          setAboutFocusSection(
                            partner.id === 'yayasan-kpm' ? 'address' : 'top'
                          );
                          handleSelectTab('about');
                        }}
                        title={partner.name}
                        className="group inline-flex items-center gap-2.5 bg-transparent border-0 p-0 transition-opacity hover:opacity-80 cursor-pointer shrink-0"
                      >
                        <img
                          src={partner.logoPath}
                          alt={partner.name}
                          className={`${partner.aspectClass} object-contain shrink-0`}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-xs font-semibold text-[#24352B] group-hover:text-[#035328] transition-colors whitespace-nowrap">
                          {partner.shortName}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Row: Copyright (Centered) */}
          <div className="flex items-center justify-center text-center text-xs text-[#68756C]">
            <p className="m-0">
              &copy; 2026{' '}
              <strong className="font-semibold text-[#24352B]">
                {APP_CONFIG.appName}
              </strong>{' '}
              &middot; Dikembangkan oleh{' '}
              <strong className="font-semibold text-[#035328]">
                {APP_INFO.developerName}
              </strong>
              .
            </p>
          </div>
        </div>
      </footer>

      {/* Universal Cross-Device, Cross-OS & Cross-Browser Microphone Modal */}
      <MicrophoneModal
        isOpen={micModalOpen}
        onClose={() => setMicModalOpen(false)}
        surahs={surahs}
        onApplyQuery={(q) => {
          setSearchInitialQuery(q);
          handleSelectTab('search');
        }}
        onOpenSurah={(sNo, aNo) => loadSurahForReader(sNo, aNo)}
        onSelectTab={(tab) => handleSelectTab(tab)}
        onPauseBackgroundAudio={() => {
          handleStopAdzanAudio();
          if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
            setPlayback((prev) => (prev ? { ...prev, isPlaying: false } : null));
          }
        }}
        onShowToast={showToast}
      />

      {/* Offline-First & PWA Control Center Modal */}
      <OfflineManagerModal
        isOpen={offlineModalOpen}
        onClose={() => setOfflineModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Bottom-to-Top Expandable More Menu Modal Popup (Replaces /lainnya/ page) */}
      <MoreModal
        isOpen={moreModalOpen}
        onClose={() => setMoreModalOpen(false)}
        onSelectTab={(tab) => handleSelectTab(tab)}
        bookmarksCount={bookmarks.length}
        notesCount={notes.length}
        cachedSurahCount={cachedSurahCount}
        onOpenOfflineModal={() => setOfflineModalOpen(true)}
        onOpenMicrophoneModal={() => setMicModalOpen(true)}
      />

      {/* Official Tafsir Modal */}
      <TafsirModal
        isOpen={tafsirModalOpen}
        surahNomor={tafsirSurahNomor}
        surahNamaLatin={
          tafsirDetail?.namaLatin || currentSurahDetail?.namaLatin || `Surat ${tafsirSurahNomor}`
        }
        surahNamaArab={tafsirDetail?.nama || currentSurahDetail?.nama || ''}
        ayatNomor={tafsirAyatNomor}
        ayatData={currentTafsirAyatObj}
        tafsirDetail={tafsirDetail}
        isLoading={isLoadingTafsir}
        error={tafsirError}
        onRetry={handleRetryTafsir}
        onChangeAyat={(newAyat) => setTafsirAyatNomor(newAyat)}
        onClose={() => setTafsirModalOpen(false)}
      />

      {/* Non-Overlapping Floating Stack Above Bottom Navbar: Toast + AudioMiniPlayer */}
      <div
        className={`fixed left-0 right-0 z-40 pointer-events-none flex flex-col items-center gap-2 sm:gap-2.5 container-app ${
          isReaderView
            ? 'bottom-2'
            : 'mobile-landscape-floating-stack bottom-[calc(64px+env(safe-area-inset-bottom,0px))] lg:bottom-3'
        }`}
      >
        {/* 1. Notification Toast Layer — Centered, Proportional & Never Overlaps */}
        <AnimatePresence mode="wait">
          {toastMessage && (
            <motion.div
              key={toastMessage}
              layout
              initial={{ y: 24, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto max-w-[min(92vw,440px)] px-3.5 sm:px-4 py-2.5 rounded-full shadow-[0_10px_28px_rgba(3,83,40,0.24)] border flex items-center gap-2.5 text-white"
              style={{
                backgroundColor: 'var(--color-header)',
                borderColor: 'rgba(251, 198, 71, 0.45)',
              }}
              role="status"
              aria-live="polite"
            >
              <CheckCircle2 className="w-4 h-4 text-[#FBC647] shrink-0" />
              <span className="text-xs sm:text-[13px] font-semibold leading-snug truncate">
                {toastMessage}
              </span>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                aria-label="Tutup notifikasi"
                className="w-5 h-5 -mr-1 rounded-full flex items-center justify-center text-white/75 hover:text-white hover:bg-white/15 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1.5 Active Adzan / Prayer Audio Floating Control Bar (Global Stop & Autoplay Fallback) */}
        <AnimatePresence>
          {adzanPlayback &&
            (adzanPlayback.isPlaying ||
              adzanPlayback.isLoading ||
              adzanPlayback.autoplayBlocked) && (
              <motion.div
                key="adzan-floating-player"
                layout
                initial={{ y: 20, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 16, opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.22 }}
                className="pointer-events-auto w-full max-w-xl rounded-2xl border-2 border-[#035328] bg-white p-3.5 shadow-[0_12px_32px_rgba(3,83,40,0.18)]"
                role="region"
                aria-label="Kontrol Pemutaran Audio Adzan"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#035328] text-[#FBC647]">
                      {adzanPlayback.autoplayBlocked ? (
                        <Bell className="h-5 w-5 animate-bounce" />
                      ) : (
                        <Volume2 className="h-5 w-5 animate-pulse" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-[#F7F8F5] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#035328]">
                          {adzanPlayback.isTest ? 'Uji Audio' : 'Pengingat Waktu Salat'}
                        </span>
                        {adzanPlayback.scheduledTime && (
                          <span className="font-mono text-[11px] font-bold text-[#046D38]">
                            {adzanPlayback.scheduledTime}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs sm:text-sm font-bold text-[#24352B] mt-0.5">
                        {adzanPlayback.label}
                        {adzanPlayback.locationLabel
                          ? ` — ${adzanPlayback.locationLabel}`
                          : ''}
                      </p>
                      <p className="text-[11px] text-[#68756C]">
                        {adzanPlayback.autoplayBlocked
                          ? 'Browser menahan suara otomatis. Ketuk "Putar Audio" untuk mendengarkan.'
                          : adzanPlayback.isLoading
                            ? 'Sedang memuat audio...'
                            : adzanPlayback.usingOfflineFallback
                              ? 'Memutar nada pengingat lokal (mode offline).'
                              : 'Audio sedang diputar — Murottal dijeda otomatis.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-auto">
                    {adzanPlayback.autoplayBlocked && (
                      <button
                        type="button"
                        onClick={handleResumeBlockedAdzan}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#046D38] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#035328] transition-colors cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5 fill-current text-[#FBC647]" />
                        <span>Putar Audio</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleStopAdzanAudio}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#035328] bg-[#035328] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#046D38] transition-colors cursor-pointer"
                    >
                      <Square className="h-3.5 w-3.5 fill-current text-[#FBC647]" />
                      <span>
                        {adzanPlayback.autoplayBlocked ? 'Tutup' : 'Hentikan Audio'}
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
        </AnimatePresence>

        {/* 2. Persistent Audio Mini-Player */}
        <AudioMiniPlayer
          playback={playback}
          currentTime={audioCurrentTime}
          duration={audioDuration}
          isLoadingAudio={isLoadingAudio}
          audioError={audioError}
          autoPlayNext={preferences.autoPlayNextAyat}
          repeatOneAyat={repeatOneAyat}
          playbackSpeed={playbackSpeed}
          onTogglePlay={handleToggleMiniPlayer}
          onSeek={handleSeekAudio}
          onPrevAyat={() => handleStepAyatAudio(-1)}
          onNextAyat={() => handleStepAyatAudio(1)}
          onChangeQari={handleChangePlayerQari}
          onToggleAutoPlayNext={() =>
            handleUpdatePreferences({
              ...preferences,
              autoPlayNextAyat: !preferences.autoPlayNextAyat,
            })
          }
          onToggleRepeatOne={() => {
            setRepeatOneAyat((prev) => {
              const next = !prev;
              showToast(
                next
                  ? 'Mode Tahfidz: Mengulang 1 ayat terus-menerus'
                  : 'Mode Tahfidz dinonaktifkan'
              );
              return next;
            });
          }}
          onCycleSpeed={() => {
            setPlaybackSpeed((prev) => {
              const next = prev === 1 ? 1.25 : prev === 1.25 ? 0.85 : 1;
              showToast(`Kecepatan audio: ${next}x`);
              return next;
            });
          }}
          onClose={handleCloseAudioPlayer}
          onNavigateToCurrent={() => {
            if (playback) {
              loadSurahForReader(playback.surahNomor, playback.ayatNomor || 1);
            }
          }}
        />
      </div>

        {/* 3. Native-Style Fixed Bottom Navigation Bar (Mobile & Tablet < 1024px) */}
        <FloatingBottomNav
          activeTab={activeTab}
          isMoreModalOpen={moreModalOpen}
          onSelectTab={(tab) => handleSelectTab(tab)}
          bookmarksCount={bookmarks.length}
        />
      </div>
    </>
  );
}

