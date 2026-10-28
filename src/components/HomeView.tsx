import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bell,
  BookHeart,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Crown,
  Droplet,
  Headphones,
  Heart,
  Leaf,
  Mic,
  MicOff,
  Search,
  Sparkles,
  Sun,
  Volume2,
  X,
} from 'lucide-react';
import { FEATURED_SURAHS } from '../config/brand';
import {
  computeNextPrayer,
  equranShalatApi,
  formatCountdown,
  mabimsHijriApi,
} from '../services/islamicApi';
import { storageService } from '../services/storageService';
import {
  DailyTasksState,
  MabimsTodayResponse,
  ShalatDailySchedule,
  ShalatMonthlyData,
} from '../types/islamic';
import {
  ActiveTab,
  BookmarkItem,
  PersonalNote,
  ReadingHistoryItem,
  ReadingProgress,
  SurahSummary,
} from '../types/quran';

interface HomeViewProps {
  surahs: SurahSummary[];
  lastRead: ReadingProgress | null;
  history: ReadingHistoryItem[];
  bookmarks: BookmarkItem[];
  notes: PersonalNote[];
  readAyatCount: number;
  onOpenSurah: (surahNomor: number, ayatNomor?: number) => void;
  onNavigateToSearch: (initialQuery?: string) => void;
  onNavigateToSurahList: (initialMode?: 'SURAH' | 'JUZ') => void;
  onNavigateToBookmarks: () => void;
  onSelectTab: (tab: ActiveTab) => void;
}

const TOTAL_QURAN_AYATS = 6236;

const BG_LANDSCAPE_PATH = '/assets/aistudio/bg-landscape_42f05623.png';
const BG_PORTRAIT_PATH = '/assets/aistudio/bg-potrait_806f7ab7.png';

function getFormattedIslamicDate(): string {
  try {
    const now = new Date();
    return new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(now);
  } catch {
    return '16 Jumadil Awal 1448 H';
  }
}

function getFormattedGregorianDate(): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  } catch {
    return 'Selasa, 28 Oktober 2026';
  }
}

export const HomeView: React.FC<HomeViewProps> = ({
  surahs,
  lastRead,
  readAyatCount,
  onOpenSurah,
  onNavigateToSearch,
  onNavigateToSurahList,
  onSelectTab,
}) => {
  const [quickSearch, setQuickSearch] = useState('');
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [voiceToast, setVoiceToast] = useState<string | null>(null);

  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [notifPermissionGranted, setNotifPermissionGranted] = useState(() => {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
  });

  const [dailyTasksState, setDailyTasksState] = useState<DailyTasksState>(() =>
    storageService.getDailyTasks()
  );

  const [mabimsToday, setMabimsToday] = useState<MabimsTodayResponse | null>(null);
  const [shalatSummary, setShalatSummary] = useState<ShalatMonthlyData | null>(null);
  const [nowTick, setNowTick] = useState<Date>(() => new Date());

  const recognitionRef = useRef<any>(null);

  const fallbackHijriStr = useMemo(() => getFormattedIslamicDate(), []);
  const gregorianDateStr = useMemo(() => getFormattedGregorianDate(), []);

  useEffect(() => {
    let mounted = true;

    // Fetch Today's Hijri Date
    mabimsHijriApi
      .getToday('Asia/Jakarta')
      .then((res) => {
        if (mounted) setMabimsToday(res);
      })
      .catch(() => {});

    // Fetch Monthly Prayer Schedule
    const loc = storageService.getShalatLocation();
    const d = new Date();
    equranShalatApi
      .getMonthlySchedule(loc.provinsi, loc.kabkota, d.getMonth() + 1, d.getFullYear())
      .then((res) => {
        if (mounted) setShalatSummary(res);
      })
      .catch(() => {});

    const timer = window.setInterval(() => setNowTick(new Date()), 1000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const hijriDateStr = useMemo(() => {
    if (mabimsToday?.output) {
      return `${mabimsToday.output.day} ${mabimsToday.output.month_name} ${mabimsToday.output.year} H`;
    }
    return fallbackHijriStr || '16 Jumadil Awal 1448 H';
  }, [mabimsToday, fallbackHijriStr]);

  const todayShalatRow: ShalatDailySchedule | null = useMemo(() => {
    if (!shalatSummary?.jadwal?.length) return null;
    const y = nowTick.getFullYear();
    const m = String(nowTick.getMonth() + 1).padStart(2, '0');
    const d = String(nowTick.getDate()).padStart(2, '0');
    const todayIso = `${y}-${m}-${d}`;
    return (
      shalatSummary.jadwal.find((j) => j.tanggal_lengkap === todayIso) ||
      shalatSummary.jadwal.find((j) => j.tanggal === nowTick.getDate()) ||
      null
    );
  }, [shalatSummary, nowTick]);

  const nextPrayerHome = useMemo(() => {
    if (!shalatSummary?.jadwal?.length || !todayShalatRow) return null;
    const idx = shalatSummary.jadwal.indexOf(todayShalatRow);
    const tomorrowRow =
      idx >= 0 && idx + 1 < shalatSummary.jadwal.length
        ? shalatSummary.jadwal[idx + 1]
        : todayShalatRow;
    return computeNextPrayer(todayShalatRow, tomorrowRow, nowTick);
  }, [shalatSummary, todayShalatRow, nowTick]);

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      onNavigateToSearch(quickSearch.trim());
    }
  };

  // Robust Speak-to-Text Handler with Web Speech API
  const handleVoiceSearch = () => {
    // If currently recording, tap to stop cleanly
    if (isListeningVoice && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      setIsListeningVoice(false);
      setVoiceToast('Perekaman suara dihentikan.');
      setTimeout(() => setVoiceToast(null), 2500);
      return;
    }

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
        .SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceToast('Pencarian suara tidak didukung di peramban ini. Silakan ketik kata kunci.');
      setTimeout(() => setVoiceToast(null), 3500);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'id-ID';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListeningVoice(true);
        setVoiceToast('Mendengarkan ucapan Anda... Ucapkan nama surat atau kata kunci.');
      };

      recognition.onresult = (event: any) => {
        let interimStr = '';
        let finalStr = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalStr += trans;
          } else {
            interimStr += trans;
          }
        }

        const currentSpoken = (finalStr || interimStr).trim();
        if (currentSpoken) {
          setQuickSearch(currentSpoken);
        }

        if (finalStr.trim()) {
          setIsListeningVoice(false);
          setVoiceToast(`Menemukan: "${finalStr.trim()}"`);
          setTimeout(() => {
            setVoiceToast(null);
            onNavigateToSearch(finalStr.trim());
          }, 800);
        }
      };

      recognition.onerror = (evt: any) => {
        setIsListeningVoice(false);
        const errType = evt?.error;
        if (errType === 'not-allowed' || errType === 'service-not-allowed') {
          setVoiceToast('Izin mikrofon belum diberikan. Izinkan akses mikrofon di pengaturan browser Anda.');
        } else if (errType === 'no-speech') {
          setVoiceToast('Suara tidak terdeteksi. Silakan coba lagi.');
        } else if (errType === 'network') {
          setVoiceToast('Masalah koneksi saat mengenali suara.');
        } else {
          setVoiceToast('Suara tidak terdengar jelas. Silakan coba lagi atau ketik.');
        }
        setTimeout(() => setVoiceToast(null), 3500);
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
      };

      recognition.start();
    } catch {
      setIsListeningVoice(false);
      setVoiceToast('Gagal mengakses mikrofon.');
      setTimeout(() => setVoiceToast(null), 3000);
    }
  };

  // Toggle Daily Tasks
  const handleToggleTask = (taskId: string) => {
    const nextState = storageService.toggleDailyTask(taskId);
    setDailyTasksState(nextState);
  };

  // Request Browser Notification Permission
  const handleRequestNotifPermission = async () => {
    if (typeof Notification === 'undefined') {
      setVoiceToast('Notifikasi perangkat tidak didukung di browser ini.');
      setTimeout(() => setVoiceToast(null), 3000);
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setNotifPermissionGranted(true);
        setVoiceToast('Notifikasi pengingat shalat dan tugas harian telah diaktifkan!');
      } else {
        setNotifPermissionGranted(false);
        setVoiceToast('Izin notifikasi ditolak oleh peramban.');
      }
    } catch {
      setVoiceToast('Gagal meminta izin notifikasi.');
    }
    setTimeout(() => setVoiceToast(null), 3000);
  };

  const pendingTaskCount = dailyTasksState.tasks.filter((t) => !t.completed).length;
  const completedTaskCount = dailyTasksState.tasks.length - pendingTaskCount;
  const taskProgressPercent = Math.round(
    (completedTaskCount / Math.max(1, dailyTasksState.tasks.length)) * 100
  );

  const effectiveReadCount = Math.max(readAyatCount, 10);
  const khatamPercentage = Math.min(
    100,
    Number(((effectiveReadCount / TOTAL_QURAN_AYATS) * 100).toFixed(1))
  );

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* FULL-BLEED RESPONSIVE PORTRAIT & LANDSCAPE BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden">
        <picture>
          <source media="(orientation: landscape)" srcSet={BG_LANDSCAPE_PATH} />
          <source media="(min-width: 768px)" srcSet={BG_LANDSCAPE_PATH} />
          <source media="(orientation: portrait)" srcSet={BG_PORTRAIT_PATH} />
          <img
            src={BG_PORTRAIT_PATH}
            alt="Latar Masjid Ziezan Quran"
            className="w-full h-full object-cover object-top"
          />
        </picture>
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(247,248,245,0.18) 34%, rgba(247,248,245,0.78) 54%, rgba(247,248,245,0.88) 100%)',
          }}
        />
      </div>

      {/* MAIN CONTENT CONTAINER - Full-Viewport Responsive Width */}
      <div className="relative z-10 container-app pt-3 sm:pt-5 pb-8 space-y-4 sm:space-y-5">
        {/* Voice Search Feedback Banner */}
        {voiceToast && (
          <div className="bg-[#035328] text-white px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-lg animate-fade-in">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-[#FBC647] animate-pulse shrink-0" />
              <span>{voiceToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setVoiceToast(null)}
              className="text-white/80 hover:text-white cursor-pointer"
              aria-label="Tutup pesan suara"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* A. HEADER DAN HERO */}
        <section className="pt-1 sm:pt-2 space-y-3.5 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-[#035328] ring-2 ring-[#FBC647] p-0.5 flex items-center justify-center shrink-0 shadow-md">
                <img
                  src="/icons/ziezan-quran.png"
                  alt="Ziezan Quran"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#14261C] leading-none tracking-tight drop-shadow-[0_1px_2px_rgba(255,255,255,0.85)]">
                  Ziezan Quran
                </h1>
                <p className="text-[11px] sm:text-xs font-medium text-[#1F3327] mt-1 truncate drop-shadow-[0_1px_2px_rgba(255,255,255,0.85)]">
                  Dekat dengan Al-Qur&apos;an, Tenang dalam Kehidupan
                </p>
              </div>
            </div>

            {/* Notification Bell with Dynamic Task / Prayer Badge */}
            <button
              type="button"
              onClick={() => setShowNotifDrawer(true)}
              aria-label="Pengingat Waktu Salat & Tugas Harian"
              title="Buka Pengingat & Tugas Ibadah Harian"
              className="relative w-10 h-10 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-xs flex items-center justify-center text-white transition-transform active:scale-95 shrink-0 cursor-pointer shadow-sm"
            >
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow" />
              {pendingTaskCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] px-1 rounded-full bg-[#E53935] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white shadow-xs">
                  {pendingTaskCount}
                </span>
              ) : (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#046D38] ring-2 ring-white" />
              )}
            </button>
          </div>

          {/* Greeting & Hijri Date + Quick Search (Side-by-Side in Mobile Landscape) */}
          <div className="mobile-landscape-hero-grid space-y-3.5 sm:space-y-4">
            <div className="pt-1 sm:pt-2 max-w-[300px] sm:max-w-xl lg:max-w-2xl">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#14261C] leading-tight tracking-tight drop-shadow-[0_1px_2px_rgba(255,255,255,0.85)]">
                Assalamu’alaikum
              </h2>
              <p className="text-xs sm:text-sm font-medium text-[#24352B] mt-1 leading-snug drop-shadow-[0_1px_2px_rgba(255,255,255,0.85)]">
                Semoga hari ini penuh dengan ilmu, iman dan amal yang bermanfaat.
              </p>

              <button
                type="button"
                onClick={() => onSelectTab('hijri')}
                className="mt-3 inline-flex items-center gap-2.5 rounded-2xl bg-white/85 hover:bg-white/95 backdrop-blur-md border border-white/90 px-3.5 py-2.5 shadow-sm text-left transition-all cursor-pointer"
              >
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#046D38] shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-bold text-[#14261C] leading-tight">
                    {hijriDateStr}
                  </p>
                  <p className="text-[11px] text-[#68756C] mt-0.5 font-medium">
                    {gregorianDateStr}
                  </p>
                </div>
              </button>
            </div>

            {/* B. SEARCH BAR & TARGETED SPEAK TO TEXT BUTTON */}
            <div className="pt-1">
              <form onSubmit={handleQuickSearchSubmit}>
                <div className="flex items-center bg-white/95 backdrop-blur-md rounded-full border border-white shadow-[0_6px_24px_rgba(3,83,40,0.12)] p-1.5 pl-4 pr-1.5 focus-within:ring-2 focus-within:ring-[#046D38]/30 transition-all">
                  <Search className="w-5 h-5 text-[#68756C] shrink-0 mr-2.5" />
                  <input
                    type="text"
                    value={quickSearch}
                    onChange={(e) => setQuickSearch(e.target.value)}
                    placeholder="Cari surat, ayat, atau kata kunci..."
                    aria-label="Cari surat, ayat, atau kata kunci"
                    className="w-full bg-transparent text-xs sm:text-sm text-[#24352B] placeholder:text-[#68756C] focus:outline-none py-1.5"
                  />
                  {quickSearch && (
                    <button
                      type="button"
                      onClick={() => setQuickSearch('')}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[#68756C] hover:bg-stone-100 mr-1 cursor-pointer"
                      aria-label="Bersihkan pencarian"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {/* TARGETED SPEAK TO TEXT MICROPHONE BUTTON */}
                  <button
                    type="button"
                    onClick={handleVoiceSearch}
                    aria-label={isListeningVoice ? 'Hentikan perekaman suara' : 'Tekan untuk bicara (Pencarian Suara Al-Qur\'an)'}
                    title={isListeningVoice ? 'Hentikan suara' : 'Pencarian Suara (Speak to Text)'}
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all transform active:scale-95 shadow-sm cursor-pointer ${
                      isListeningVoice
                        ? 'relative bg-[#E53935] text-white ring-4 ring-[#E53935]/40 animate-pulse'
                        : 'bg-[#046D38] hover:bg-[#035328] text-white'
                    }`}
                  >
                    {isListeningVoice ? (
                      <MicOff className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    ) : (
                      <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* C. SHORTCUT TEMATIK (5 ITEM: Sabar, Tenang, Syukur, Rezeki, Ampunan) */}
        <section className="pt-0.5">
          <div className="grid grid-cols-5 gap-2 sm:gap-3.5 text-center">
            <button
              type="button"
              onClick={() => onNavigateToSearch('Sabar')}
              className="flex flex-col items-center gap-1.5 group cursor-pointer min-w-0"
            >
              <div className="w-full h-13 sm:h-15 rounded-2xl bg-white/88 backdrop-blur-md border border-white/95 shadow-[0_4px_14px_rgba(3,83,40,0.08)] flex items-center justify-center transition-transform group-hover:scale-105">
                <Heart className="w-6 h-6 sm:w-7 sm:h-7 text-[#EF5350] fill-[#EF5350] drop-shadow-2xs" />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-[#14261C] truncate max-w-full drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                Sabar
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateToSearch('Tenang')}
              className="flex flex-col items-center gap-1.5 group cursor-pointer min-w-0"
            >
              <div className="w-full h-13 sm:h-15 rounded-2xl bg-white/88 backdrop-blur-md border border-white/95 shadow-[0_4px_14px_rgba(3,83,40,0.08)] flex items-center justify-center transition-transform group-hover:scale-105">
                <Leaf className="w-6 h-6 sm:w-7 sm:h-7 text-[#1B8A4B] fill-[#1B8A4B] drop-shadow-2xs" />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-[#14261C] truncate max-w-full drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                Tenang
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateToSearch('Syukur')}
              className="flex flex-col items-center gap-1.5 group cursor-pointer min-w-0"
            >
              <div className="w-full h-13 sm:h-15 rounded-2xl bg-white/88 backdrop-blur-md border border-white/95 shadow-[0_4px_14px_rgba(3,83,40,0.08)] flex items-center justify-center transition-transform group-hover:scale-105">
                <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-[#046D38] fill-[#046D38]/15 drop-shadow-2xs" />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-[#14261C] truncate max-w-full drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                Syukur
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateToSearch('Rezeki')}
              className="flex flex-col items-center gap-1.5 group cursor-pointer min-w-0"
            >
              <div className="w-full h-13 sm:h-15 rounded-2xl bg-white/88 backdrop-blur-md border border-white/95 shadow-[0_4px_14px_rgba(3,83,40,0.08)] flex items-center justify-center transition-transform group-hover:scale-105">
                <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-[#F59E0B] fill-[#FBBF24] drop-shadow-2xs" />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-[#14261C] truncate max-w-full drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                Rezeki
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateToSearch('Ampunan')}
              className="flex flex-col items-center gap-1.5 group cursor-pointer min-w-0"
            >
              <div className="w-full h-13 sm:h-15 rounded-2xl bg-white/88 backdrop-blur-md border border-white/95 shadow-[0_4px_14px_rgba(3,83,40,0.08)] flex items-center justify-center transition-transform group-hover:scale-105">
                <Droplet className="w-6 h-6 sm:w-7 sm:h-7 text-[#0288D1] fill-[#29B6F6] drop-shadow-2xs" />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-[#14261C] truncate max-w-full drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                Ampunan
              </span>
            </button>
          </div>
        </section>

        {/* D & E. KARTU JADWAL SALAT & KARTU LANJUTKAN MEMBACA (Stacked on Mobile/Tablet Portrait, Side-by-Side Full-Width on Mobile Landscape, Tablet Landscape & Desktop) */}
        <div className="mobile-landscape-dashboard-grid grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        {/* D. KARTU JADWAL SALAT */}
        <section className="mobile-landscape-col-7 lg:col-span-7 bg-white/92 backdrop-blur-md rounded-[26px] border border-white/95 p-3.5 sm:p-5 shadow-[0_8px_30px_rgba(3,83,40,0.08)] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-10 h-10 rounded-full bg-[#EDF5F0] flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-[#046D38]" />
              </span>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-bold text-[#14261C] truncate">
                  Waktu Salat Berikutnya
                </h2>
                <p className="text-[11px] sm:text-xs text-[#68756C] truncate font-medium">
                  {shalatSummary
                    ? `${shalatSummary.kabkota}, ${shalatSummary.provinsi}`
                    : 'Kab. Serang, Banten'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectTab('shalat')}
              className="px-3.5 py-1.5 rounded-full bg-[#EDF5F0] hover:bg-[#046D38] text-[#035328] hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span>Buka Adzan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative rounded-2xl overflow-hidden p-4 sm:p-5 text-white min-h-[112px] sm:min-h-[128px] flex items-end justify-between shadow-sm">
            <img
              src={BG_LANDSCAPE_PATH}
              alt="Masjid Waktu Salat"
              className="absolute inset-0 w-full h-full object-cover object-[center_35%] pointer-events-none"
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(90deg, rgba(6,62,33,0.92) 0%, rgba(6,62,33,0.68) 45%, rgba(6,62,33,0.20) 100%)',
              }}
            />

            <div className="relative z-10 flex w-full items-end justify-between gap-2">
              <div>
                <p className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight drop-shadow">
                  {nextPrayerHome ? nextPrayerHome.label : 'Asar'}
                </p>
                <p className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white leading-none mt-0.5 drop-shadow">
                  {nextPrayerHome ? nextPrayerHome.timeStr : '14:55'}
                </p>
              </div>

              <div className="bg-[#0B2B19]/90 backdrop-blur-md border border-[#FBC647]/35 text-[#FBC647] font-mono-num font-bold text-xs sm:text-sm px-3 sm:px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-md shrink-0">
                <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FBC647] shrink-0" />
                <span>
                  -{nextPrayerHome ? formatCountdown(nextPrayerHome.remainingSeconds) : '01:48:42'}
                </span>
              </div>
            </div>
          </div>

          {todayShalatRow ? (
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center">
              {[
                { key: 'subuh', label: 'Subuh', time: todayShalatRow.subuh },
                { key: 'dzuhur', label: 'Zuhur', time: todayShalatRow.dzuhur },
                { key: 'ashar', label: 'Asar', time: todayShalatRow.ashar },
                { key: 'maghrib', label: 'Magrib', time: todayShalatRow.maghrib },
                { key: 'isya', label: 'Isya', time: todayShalatRow.isya },
              ].map((item) => {
                const isNext = nextPrayerHome?.key === item.key && !nextPrayerHome.isTomorrow;
                return (
                  <div
                    key={item.key}
                    className={`rounded-2xl py-2 sm:py-2.5 px-1 border transition-colors min-w-0 ${
                      isNext
                        ? 'bg-[#046D38] border-[#046D38] text-white shadow-xs'
                        : 'bg-[#F4F6F3] border-[#E3E9E3] text-[#14261C]'
                    }`}
                  >
                    <p
                      className={`text-[10px] sm:text-xs font-medium truncate ${
                        isNext ? 'text-white/90' : 'text-[#68756C]'
                      }`}
                    >
                      {item.label}
                    </p>
                    <p className="font-mono-num text-xs sm:text-sm font-bold mt-0.5 truncate">
                      {item.time}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center">
              {[
                { label: 'Subuh', time: '04:13', active: false },
                { label: 'Zuhur', time: '11:43', active: false },
                { label: 'Asar', time: '14:55', active: true },
                { label: 'Magrib', time: '17:51', active: false },
                { label: 'Isya', time: '19:02', active: false },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-2xl py-2 sm:py-2.5 px-1 border transition-colors min-w-0 ${
                    item.active
                      ? 'bg-[#046D38] border-[#046D38] text-white shadow-xs'
                      : 'bg-[#F4F6F3] border-[#E3E9E3] text-[#14261C]'
                  }`}
                >
                  <p
                    className={`text-[10px] sm:text-xs font-medium truncate ${
                      item.active ? 'text-white/90' : 'text-[#68756C]'
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="font-mono-num text-xs sm:text-sm font-bold mt-0.5 truncate">
                    {item.time}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-0.5">
            <button
              type="button"
              onClick={() => onSelectTab('shalat')}
              className="p-2.5 sm:p-3 rounded-2xl bg-[#F4F6F3] hover:bg-[#EDF5F0] border border-[#E3E9E3] hover:border-[#046D38] transition-colors flex items-center justify-between text-left cursor-pointer group min-w-0"
            >
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <Headphones className="w-5 h-5 text-[#046D38] shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-[#14261C] truncate">
                    Buka Adzan
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-[#68756C] truncate">
                    Putar adzan saat waktu salat
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#68756C] group-hover:text-[#046D38] shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('shalat')}
              className="p-2.5 sm:p-3 rounded-2xl bg-[#F4F6F3] hover:bg-[#EDF5F0] border border-[#E3E9E3] hover:border-[#046D38] transition-colors flex items-center justify-between text-left cursor-pointer group min-w-0"
            >
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <Calendar className="w-5 h-5 text-[#046D38] shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-[#14261C] truncate">
                    Jadwal Lengkap
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-[#68756C] truncate">
                    Lihat semua waktu salat
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#68756C] group-hover:text-[#046D38] shrink-0" />
            </button>
          </div>
        </section>

        {/* E. KARTU LANJUTKAN MEMBACA */}
        <section
          className="mobile-landscape-col-5 lg:col-span-5 rounded-[26px] p-4 sm:p-5 text-white border border-[#FBC647]/30 shadow-[0_8px_28px_rgba(3,83,40,0.18)] relative overflow-hidden flex flex-col justify-between"
          style={{
            background: 'linear-gradient(135deg, #064E28 0%, #033A1D 100%)',
          }}
        >
          <div className="absolute right-0 top-0 bottom-0 w-[46%] sm:w-[42%] pointer-events-none overflow-hidden">
            <img
              src={BG_LANDSCAPE_PATH}
              alt="Al-Qur'an dan Masjid"
              className="w-full h-full object-cover object-center opacity-85"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(90deg, #054523 0%, rgba(5,69,35,0.55) 35%, rgba(5,69,35,0.05) 100%)',
              }}
            />
          </div>

          <div className="relative z-10 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-start gap-2.5">
              <BookOpen className="w-6 h-6 text-[#FBC647] shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display text-base sm:text-lg font-bold text-white leading-tight">
                  Lanjutkan Membaca
                </h2>
                <p className="text-xs text-white/90 font-medium">
                  {effectiveReadCount}/{TOTAL_QURAN_AYATS} Ayat ({khatamPercentage}%)
                </p>
              </div>
            </div>

            <div className="pt-0.5 max-w-[62%]">
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight truncate">
                {lastRead ? `Surat ${lastRead.surahNamaLatin}` : 'Surat Al-Fatihah'}
              </h3>
              <p className="text-xs sm:text-sm text-white/90 mt-0.5 font-medium">
                {lastRead ? `Ayat ${lastRead.ayatNomor} - Juz 1` : 'Ayat 1 - Juz 1'}
              </p>

              <button
                type="button"
                onClick={() =>
                  lastRead
                    ? onOpenSurah(lastRead.surahNomor, lastRead.ayatNomor)
                    : onOpenSurah(1, 1)
                }
                className="mt-3 px-5 py-2 rounded-full bg-[#FBC647] hover:bg-[#f5bc33] text-[#14261C] text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-transform active:scale-95 shadow-sm cursor-pointer"
              >
                <span>Mulai Baca</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-1 flex items-center gap-3">
              <div className="flex-1 bg-white/20 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#FBC647] h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(12, khatamPercentage)}%` }}
                />
              </div>
              <span className="text-[11px] font-mono-num font-semibold text-white/95 shrink-0">
                {effectiveReadCount}/{TOTAL_QURAN_AYATS} Ayat ({khatamPercentage}%)
              </span>
            </div>
          </div>
        </section>
        </div>

        {/* F. FITUR PILIHAN */}
        <section className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#14261C]">
              Fitur Pilihan
            </h2>
            <button
              type="button"
              onClick={() => onSelectTab('more')}
              className="text-xs sm:text-sm font-bold text-[#046D38] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 min-[360px]:grid-cols-4 gap-2 sm:gap-3.5 lg:gap-4">
            <button
              type="button"
              onClick={() => onNavigateToSurahList('SURAH')}
              className="bg-white/92 backdrop-blur-md rounded-2xl p-2.5 sm:p-3.5 border border-white/95 shadow-[0_4px_16px_rgba(3,83,40,0.06)] hover:border-[#046D38] flex flex-col items-center text-center transition-all cursor-pointer group min-w-0"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#EDF5F0] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-[#046D38]" />
              </div>
              <span className="font-bold text-[11px] sm:text-xs text-[#14261C] truncate max-w-full">
                Al-Qur&apos;an
              </span>
              <span className="text-[9.5px] sm:text-[11px] text-[#68756C] mt-0.5 truncate max-w-full">
                114 Surat
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('doa')}
              className="bg-white/92 backdrop-blur-md rounded-2xl p-2.5 sm:p-3.5 border border-white/95 shadow-[0_4px_16px_rgba(3,83,40,0.06)] hover:border-[#046D38] flex flex-col items-center text-center transition-all cursor-pointer group min-w-0"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#FDF2F2] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <BookHeart className="w-5 h-5 sm:w-6 sm:h-6 text-[#EF5350]" />
              </div>
              <span className="font-bold text-[11px] sm:text-xs text-[#14261C] truncate max-w-full">
                Doa &amp; Dzikir
              </span>
              <span className="text-[9.5px] sm:text-[11px] text-[#68756C] mt-0.5 truncate max-w-full">
                Kumpulan Doa
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('qibla')}
              className="bg-white/92 backdrop-blur-md rounded-2xl p-2.5 sm:p-3.5 border border-white/95 shadow-[0_4px_16px_rgba(3,83,40,0.06)] hover:border-[#046D38] flex flex-col items-center text-center transition-all cursor-pointer group min-w-0"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#E0F2F1] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Compass className="w-5 h-5 sm:w-6 sm:h-6 text-[#046D38]" />
              </div>
              <span className="font-bold text-[11px] sm:text-xs text-[#14261C] truncate max-w-full">
                Kiblat
              </span>
              <span className="text-[9.5px] sm:text-[11px] text-[#68756C] mt-0.5 truncate max-w-full">
                Arah Ka&apos;bah
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('hijri')}
              className="bg-white/92 backdrop-blur-md rounded-2xl p-2.5 sm:p-3.5 border border-white/95 shadow-[0_4px_16px_rgba(3,83,40,0.06)] hover:border-[#046D38] flex flex-col items-center text-center transition-all cursor-pointer group min-w-0"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#FFF3E0] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-[#F57C00]" />
              </div>
              <span className="font-bold text-[11px] sm:text-xs text-[#14261C] truncate max-w-full">
                Kalender
              </span>
              <span className="text-[9.5px] sm:text-[11px] text-[#68756C] mt-0.5 truncate max-w-full">
                Tanggal Hijriah
              </span>
            </button>
          </div>
        </section>

        {/* Surat Pilihan */}
        <section className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#14261C]">
              Surat Pilihan
            </h2>
            <button
              type="button"
              onClick={() => onNavigateToSurahList('SURAH')}
              className="text-xs sm:text-sm font-bold text-[#046D38] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat 114 Surat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {FEATURED_SURAHS.map((feat) => {
              const fullInfo = surahs.find((s) => s.nomor === feat.nomor);
              return (
                <button
                  key={feat.nomor}
                  type="button"
                  onClick={() => onOpenSurah(feat.nomor, 1)}
                  className="p-3 rounded-2xl border border-white/95 bg-white/92 backdrop-blur-md hover:border-[#046D38] shadow-xs transition-all text-left flex flex-col justify-between group cursor-pointer min-w-0"
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-[#EDF5F0] text-[#046D38] border border-[#E3E9E3] group-hover:bg-[#046D38] group-hover:text-white group-hover:border-[#046D38] flex items-center justify-center text-[11px] font-mono-num font-bold shrink-0 transition-colors">
                      {String(feat.nomor).padStart(2, '0')}
                    </span>
                    {fullInfo && (
                      <span className="font-arabic-amiri text-lg font-bold text-[#035328] shrink-0">
                        {fullInfo.nama}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 min-w-0">
                    <h3 className="font-bold text-xs text-[#14261C] group-hover:text-[#046D38] transition-colors truncate">
                      {feat.namaLatin}
                    </h3>
                    <p className="text-[11px] text-[#68756C] mt-0.5 truncate">
                      {feat.arti} · {feat.ayatCount} Ayat
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* PANEL NOTIFIKASI & SINKRONISASI TUGAS HARIAN / JADWAL SHALAT */}
      {showNotifDrawer && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notif-panel-title"
        >
          <div
            className="fixed inset-0"
            onClick={() => setShowNotifDrawer(false)}
            aria-hidden="true"
          />

          <div className="relative z-10 w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#E3E9E3] p-5 sm:p-6 max-h-[88dvh] overflow-y-auto space-y-4">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[#E3E9E3] pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-2xl bg-[#046D38] text-white flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5" />
                </span>
                <div>
                  <h3 id="notif-panel-title" className="font-serif text-lg sm:text-xl font-bold text-[#14261C]">
                    Pengingat &amp; Tugas Harian
                  </h3>
                  <p className="text-xs text-[#68756C]">
                    Sinkronisasi Ibadah Harian &amp; Jadwal Salat
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowNotifDrawer(false)}
                className="w-8 h-8 rounded-full bg-[#F4F6F3] hover:bg-stone-200 flex items-center justify-center text-[#14261C] cursor-pointer"
                aria-label="Tutup panel notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Section 1: Jadwal Salat Akan Datang (Synchronized) */}
            <div className="rounded-2xl border border-[#E3E9E3] bg-[#F7F8F5] p-3.5 sm:p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#046D38]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#046D38]">
                    Salat Akan Datang
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-[#68756C]">
                  {shalatSummary ? `${shalatSummary.kabkota}` : 'Kab. Serang'}
                </span>
              </div>

              <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-[#E3E9E3]">
                <div>
                  <p className="text-xs text-[#68756C]">Waktu Berikutnya</p>
                  <p className="font-serif text-xl font-bold text-[#14261C]">
                    {nextPrayerHome ? nextPrayerHome.label : 'Asar'} · {nextPrayerHome ? nextPrayerHome.timeStr : '14:55'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#68756C] block">Hitung Mundur</span>
                  <span className="font-mono-num text-xs font-bold text-[#046D38] bg-[#EDF5F0] px-2.5 py-1 rounded-lg inline-block mt-0.5">
                    -{nextPrayerHome ? formatCountdown(nextPrayerHome.remainingSeconds) : '01:48:42'}
                  </span>
                </div>
              </div>

              {/* Notification System Permission Status & Toggle */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-medium text-[#24352B]">
                  Notifikasi Perangkat: {notifPermissionGranted ? 'Aktif (Diberikan)' : 'Belum Diizinkan'}
                </span>
                {!notifPermissionGranted && (
                  <button
                    type="button"
                    onClick={handleRequestNotifPermission}
                    className="px-3 py-1.5 rounded-full bg-[#046D38] text-white text-xs font-bold hover:bg-[#035328] transition-colors cursor-pointer"
                  >
                    Aktifkan Notifikasi
                  </button>
                )}
              </div>
            </div>

            {/* Section 2: Daftar Tugas Ibadah Harian (Interactive Checklist) */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#14261C]">
                    Checklist Ibadah Harian Hari Ini
                  </h4>
                  <p className="text-xs text-[#68756C]">
                    Progres: {completedTaskCount}/{dailyTasksState.tasks.length} Selesai ({taskProgressPercent}%)
                  </p>
                </div>
                <span className="font-mono-num font-bold text-xs text-[#046D38] bg-[#EDF5F0] px-2.5 py-1 rounded-full">
                  {taskProgressPercent}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#E3E9E3] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#046D38] h-full rounded-full transition-all duration-300"
                  style={{ width: `${taskProgressPercent}%` }}
                />
              </div>

              {/* Task Items List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {dailyTasksState.tasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => handleToggleTask(task.id)}
                    className={`w-full p-3 rounded-xl border text-left flex items-start justify-between gap-3 transition-colors cursor-pointer ${
                      task.completed
                        ? 'bg-[#EDF5F0] border-[#046D38]/40 text-[#14261C]'
                        : 'bg-white border-[#E3E9E3] hover:border-[#046D38] text-[#24352B]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold ${task.completed ? 'line-through text-[#68756C]' : 'text-[#14261C]'}`}>
                        {task.title}
                      </p>
                      <p className="text-[11px] text-[#68756C] mt-0.5 truncate">
                        {task.description}
                      </p>
                    </div>
                    <CheckCircle2
                      className={`w-5 h-5 shrink-0 transition-colors ${
                        task.completed ? 'text-[#046D38] fill-[#046D38]/20' : 'text-[#C9D4CA]'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Action */}
            <div className="pt-2 border-t border-[#E3E9E3] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowNotifDrawer(false);
                  onSelectTab('shalat');
                }}
                className="w-full py-2.5 rounded-xl bg-[#046D38] hover:bg-[#035328] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <span>Pengaturan Audio &amp; Jadwal Salat Lengkap</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
