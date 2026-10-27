import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookHeart,
  BookOpen,
  Bookmark,
  Calendar,
  Clock,
  Compass,
  FileText,
  Layers,
  MapPin,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import {
  DAILY_TADABBUR_VERSES,
  FEATURED_SURAHS,
  SUGGESTED_SEARCH_TOPICS,
} from '../config/brand';
import {
  computeNextPrayer,
  equranDoaApi,
  equranShalatApi,
  formatCountdown,
  mabimsHijriApi,
} from '../services/islamicApi';
import { storageService } from '../services/storageService';
import {
  DoaItem,
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

function getFormattedIslamicDate(): string {
  try {
    const now = new Date();
    return new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(now);
  } catch {
    return '';
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
    return '';
  }
}

export const HomeView: React.FC<HomeViewProps> = ({
  surahs,
  lastRead,
  history,
  bookmarks,
  notes,
  readAyatCount,
  onOpenSurah,
  onNavigateToSearch,
  onNavigateToSurahList,
  onNavigateToBookmarks,
  onSelectTab,
}) => {
  const [quickSearch, setQuickSearch] = useState('');
  const [mabimsToday, setMabimsToday] = useState<MabimsTodayResponse | null>(null);
  const [shalatSummary, setShalatSummary] = useState<ShalatMonthlyData | null>(null);
  const [recommendedDoa, setRecommendedDoa] = useState<DoaItem | null>(null);
  const [nowTick, setNowTick] = useState<Date>(() => new Date());

  const fallbackHijriStr = useMemo(() => getFormattedIslamicDate(), []);
  const gregorianDateStr = useMemo(() => getFormattedGregorianDate(), []);

  useEffect(() => {
    let mounted = true;

    // 1. Fetch Today's Hijri Date (MABIMS API)
    mabimsHijriApi
      .getToday('Asia/Jakarta')
      .then((res) => {
        if (mounted) setMabimsToday(res);
      })
      .catch(() => {
        // Keep fallback
      });

    // 2. Fetch Monthly Prayer Schedule for User's Active Location (eQuran.id API)
    const loc = storageService.getShalatLocation();
    const d = new Date();
    equranShalatApi
      .getMonthlySchedule(loc.provinsi, loc.kabkota, d.getMonth() + 1, d.getFullYear())
      .then((res) => {
        if (mounted) setShalatSummary(res);
      })
      .catch(() => {
        // Keep silent on home summary
      });

    // 3. Fetch Daily Recommended Doa from Official eQuran.id Doa API
    equranDoaApi
      .getDoaList()
      .then((list) => {
        if (!mounted || !list.length) return;
        const startOfYear = new Date(d.getFullYear(), 0, 0);
        const dayOfYear = Math.floor(
          (d.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
        );
        setRecommendedDoa(list[dayOfYear % list.length]);
      })
      .catch(() => {
        // Keep fallback Tadabbur only
      });

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
    return fallbackHijriStr;
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

  // Deterministic Daily Tadabbur Verse based on day of the year
  const dailyVerse = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    return DAILY_TADABBUR_VERSES[dayOfYear % DAILY_TADABBUR_VERSES.length];
  }, []);

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigateToSearch(quickSearch.trim());
  };

  const khatamPercentage = Math.min(
    100,
    Number(((readAyatCount / TOTAL_QURAN_AYATS) * 100).toFixed(1))
  );

  const surahProgressPercent = lastRead
    ? Math.min(100, Math.round((lastRead.ayatNomor / Math.max(1, lastRead.jumlahAyat)) * 100))
    : 0;

  return (
    <div className="container-app py-3.5 sm:py-6 space-y-4 sm:space-y-5">
      {/* Header Sapaan & Pencarian Cepat */}
      <section className="card-surface space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#046D38]">
              Assalamu&apos;alaikum Warahmatullahi Wabarakatuh
            </p>
            {hijriDateStr && (
              <button
                type="button"
                onClick={() => onSelectTab('hijri')}
                className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#F7F8F5] border border-[#E3E9E3] px-2.5 py-0.5 text-xs font-semibold text-[#035328] hover:border-[#046D38] transition-colors cursor-pointer"
              >
                <Calendar className="w-3 h-3 text-[#046D38]" />
                <span>{hijriDateStr}</span>
              </button>
            )}
          </div>

          <span
            className="font-arabic-amiri text-2xl sm:text-3xl font-bold shrink-0 hidden sm:inline"
            style={{ color: 'var(--color-header)' }}
          >
            القرآن الكريم
          </span>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleQuickSearchSubmit} className="flex gap-2 pt-1">
          <div className="relative flex-1 min-w-0">
            <Search
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <input
              type="text"
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              placeholder="Cari surat, ayat (2:255), atau terjemahan..."
              aria-label="Cari surat atau ayat"
              className="w-full min-h-[42px] sm:min-h-[44px] pl-10 pr-9 py-2 rounded-full border text-xs sm:text-sm bg-[#F7F8F5] focus:bg-white focus:outline-none transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            {quickSearch && (
              <button
                type="button"
                onClick={() => setQuickSearch('')}
                className="w-7 h-7 rounded-full flex items-center justify-center absolute right-1.5 top-1/2 -translate-y-1/2 hover:bg-stone-200/60 cursor-pointer"
                aria-label="Bersihkan kata kunci"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="min-h-[42px] sm:min-h-[44px] px-5 py-2 rounded-full text-xs sm:text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <span>Cari</span>
          </button>
        </form>

        {/* Compact Thematic Search Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {SUGGESTED_SEARCH_TOPICS.slice(0, 5).map((topic) => (
            <button
              key={topic.query}
              type="button"
              onClick={() => onNavigateToSearch(topic.query)}
              className="px-2.5 py-1 rounded-full bg-[#F7F8F5] hover:bg-[#EDF5F0] border border-[#E3E9E3] hover:border-[#046D38] text-[11px] font-medium text-[#24352B] transition-colors cursor-pointer"
            >
              {topic.label}
            </button>
          ))}
        </div>
      </section>

      {/* PRIORITAS 2 & 3: Ringkasan Jadwal Salat Berikutnya & Kartu Lanjutkan Membaca */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-5 items-stretch">
        {/* PRIORITAS 2: Ringkasan Jadwal Salat Berikutnya */}
        <div className="lg:col-span-6 rounded-[var(--radius-card)] border border-[#E3E9E3] bg-white p-4 sm:p-5 flex flex-col justify-between min-w-0">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E3E9E3]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-[#EDF5F0] flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-[#046D38]" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#035328] truncate">
                    Jadwal Salat Berikutnya
                  </h2>
                  <p className="text-[11px] text-[#68756C] flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-[#046D38] shrink-0" />
                    <span className="truncate">
                      {shalatSummary
                        ? `${shalatSummary.kabkota}, ${shalatSummary.provinsi}`
                        : 'Memuat lokasi...'}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectTab('shalat')}
                className="text-xs font-semibold text-[#046D38] hover:underline shrink-0 cursor-pointer flex items-center gap-1"
              >
                <span>Buka Adzan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {nextPrayerHome && todayShalatRow ? (
              <>
                <div className="rounded-2xl bg-[#F7F8F5] border border-[#E3E9E3] p-3 sm:p-4 flex items-center justify-between gap-2.5 min-w-0">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] min-[360px]:text-[11px] font-medium text-[#68756C] truncate block">
                      Waktu Salat Berikutnya {nextPrayerHome.isTomorrow ? '(Besok)' : '(Hari Ini)'}
                    </span>
                    <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2.5 mt-0.5 min-w-0">
                      <span className="font-display text-lg min-[360px]:text-xl sm:text-2xl font-bold text-[#24352B] truncate">
                        {nextPrayerHome.label}
                      </span>
                      <span className="font-mono-num text-sm min-[360px]:text-base sm:text-lg font-bold text-[#046D38]">
                        {nextPrayerHome.timeStr}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[9px] min-[360px]:text-[10px] font-semibold uppercase tracking-wider text-[#68756C] block">
                      Hitung Mundur
                    </span>
                    <span className="inline-block mt-0.5 rounded-lg bg-[#035328] px-2 min-[360px]:px-2.5 py-0.5 min-[360px]:py-1 font-mono-num text-xs min-[360px]:text-sm sm:text-base font-bold text-[#FBC647]">
                      -{formatCountdown(nextPrayerHome.remainingSeconds)}
                    </span>
                  </div>
                </div>

                {/* Strip 5 Waktu Salat Wajib Hari Ini */}
                <div className="grid grid-cols-5 gap-1 min-[360px]:gap-1.5 text-center">
                  {(
                    [
                      { key: 'subuh', label: 'Subuh', time: todayShalatRow.subuh },
                      { key: 'dzuhur', label: 'Zuhur', time: todayShalatRow.dzuhur },
                      { key: 'ashar', label: 'Asar', time: todayShalatRow.ashar },
                      { key: 'maghrib', label: 'Magrib', time: todayShalatRow.maghrib },
                      { key: 'isya', label: 'Isya', time: todayShalatRow.isya },
                    ] as const
                  ).map((item) => {
                    const isNext =
                      nextPrayerHome.key === item.key && !nextPrayerHome.isTomorrow;
                    return (
                      <div
                        key={item.key}
                        className={`rounded-xl py-1.5 min-[360px]:py-2 px-0.5 min-[360px]:px-1 border transition-colors min-w-0 ${
                          isNext
                            ? 'bg-[#046D38] border-[#046D38] text-white'
                            : 'bg-[#F7F8F5] border-[#E3E9E3] text-[#24352B]'
                        }`}
                      >
                        <p
                          className={`text-[9px] min-[360px]:text-[10px] font-semibold truncate ${
                            isNext ? 'text-[#FBC647]' : 'text-[#68756C]'
                          }`}
                        >
                          {item.label}
                        </p>
                        <p className="font-mono-num text-[10px] min-[360px]:text-xs font-bold mt-0.5 truncate">
                          {item.time}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="rounded-2xl bg-[#F7F8F5] border border-[#E3E9E3] p-4 text-xs text-[#68756C]">
                Menampilkan jadwal salat resmi Kementerian Agama RI melalui eQuran.id. Ketuk tombol di bawah untuk memilih wilayah kabupaten/kota Anda.
              </div>
            )}
          </div>

          <div className="mt-3.5 pt-3 border-t border-[#E3E9E3] flex items-center justify-between gap-2">
            <span className="text-xs text-[#68756C] truncate">
              Pengingat &amp; adzan lokal
            </span>
            <button
              type="button"
              onClick={() => onSelectTab('shalat')}
              className="px-3 py-1.5 rounded-full bg-[#EDF5F0] hover:bg-[#046D38] text-[#046D38] hover:text-white text-xs font-bold transition-colors shrink-0 cursor-pointer"
            >
              Jadwal Lengkap →
            </button>
          </div>
        </div>

        {/* PRIORITAS 3: Kartu Lanjutkan Membaca (Progres Bacaan Aktual) */}
        <div
          className="lg:col-span-6 rounded-[var(--radius-card)] p-4 sm:p-5 flex flex-col justify-between min-w-0 text-white border"
          style={{
            backgroundColor: 'var(--color-header)',
            borderColor: 'rgba(251, 198, 71, 0.25)',
          }}
        >
          <div>
            <div
              className="flex items-center justify-between gap-2 pb-3 border-b min-w-0"
              style={{ borderColor: 'rgba(255, 255, 255, 0.14)' }}
            >
              <span className="text-xs font-bold uppercase tracking-wider truncate flex items-center gap-1.5 text-white/90">
                <BookOpen className="w-3.5 h-3.5 text-[#FBC647] shrink-0" />
                <span>Lanjutkan Membaca</span>
              </span>
              <span
                className="text-xs font-mono-num font-bold shrink-0"
                style={{ color: 'var(--color-gold)' }}
              >
                {readAyatCount}/{TOTAL_QURAN_AYATS} Ayat ({khatamPercentage}%)
              </span>
            </div>

            {lastRead ? (
              <div className="mt-3.5 space-y-3">
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-white/75">Bacaan terakhir tersimpan</p>
                    <h2 className="font-display text-lg min-[360px]:text-xl sm:text-2xl font-bold mt-0.5 truncate text-white">
                      QS. {lastRead.surahNamaLatin} ({lastRead.surahNomor})
                    </h2>
                    <p className="text-xs text-white/85 mt-0.5 truncate">
                      {lastRead.surahArti} · Ayat {lastRead.ayatNomor} dari {lastRead.jumlahAyat}
                    </p>
                  </div>
                  <span
                    className="font-arabic-amiri text-xl min-[360px]:text-2xl sm:text-3xl font-bold shrink-0"
                    style={{ color: 'var(--color-gold)' }}
                  >
                    {lastRead.surahNamaArab}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-white/85">
                    <span className="truncate">Progres Surat</span>
                    <span className="font-mono-num font-semibold text-[#FBC647] shrink-0">
                      {surahProgressPercent}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/15">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(5, surahProgressPercent)}%`,
                        backgroundColor: 'var(--color-gold)',
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-1">
                <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                  Mulai Tilawah Al-Qur&apos;an
                </h2>
                <p className="text-xs text-white/80">
                  Surat Al-Fatihah dan 114 surat lengkap siap dibaca.
                </p>
              </div>
            )}
          </div>

          <div
            className="mt-4 pt-3.5 border-t space-y-3"
            style={{ borderColor: 'rgba(255, 255, 255, 0.14)' }}
          >
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onNavigateToBookmarks}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition-colors flex items-center justify-between gap-2 text-left cursor-pointer min-w-0"
              >
                <div className="min-w-0">
                  <p className="text-[11px] text-white/75 truncate">Penanda Ayat</p>
                  <p className="text-sm sm:text-base font-bold font-mono-num text-white">
                    {bookmarks.length}
                  </p>
                </div>
                <Bookmark className="w-4 h-4 text-[#FBC647] shrink-0" />
              </button>

              <button
                type="button"
                onClick={onNavigateToBookmarks}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition-colors flex items-center justify-between gap-2 text-left cursor-pointer min-w-0"
              >
                <div className="min-w-0">
                  <p className="text-[11px] text-white/75 truncate">Catatan Tadabbur</p>
                  <p className="text-sm sm:text-base font-bold font-mono-num text-white">
                    {notes.length}
                  </p>
                </div>
                <FileText className="w-4 h-4 text-[#FBC647] shrink-0" />
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                lastRead
                  ? onOpenSurah(lastRead.surahNomor, lastRead.ayatNomor)
                  : onOpenSurah(1, 1)
              }
              className="w-full min-h-[42px] sm:min-h-[44px] py-2 px-4 rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-transform active:scale-98 cursor-pointer min-w-0"
              style={{
                backgroundColor: 'var(--color-gold)',
                color: '#1D2B22',
              }}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {lastRead
                  ? `Lanjutkan QS. ${lastRead.surahNamaLatin} : ${lastRead.ayatNomor}`
                  : 'Mulai Baca QS. Al-Fatihah'}
              </span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      </section>

      {/* PRIORITAS 4: Pintasan Ibadah & Al-Qur'an */}
      <section className="space-y-3">
        {/* 3 Pintasan Utama: Kiblat, Doa, Kalender Hijriah */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
          {/* Pintasan 1: Kiblat */}
          <button
            type="button"
            onClick={() => onSelectTab('qibla')}
            className="p-3.5 rounded-2xl border border-[#E3E9E3] bg-white hover:border-[#046D38] transition-colors text-left flex items-center gap-3 group cursor-pointer min-w-0"
          >
            <span className="w-10 h-10 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3] group-hover:bg-[#035328] group-hover:border-[#035328] flex items-center justify-center shrink-0 transition-colors">
              <Compass className="w-5 h-5 text-[#035328] group-hover:text-[#FBC647]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h3 className="font-display font-bold text-sm sm:text-base text-[#24352B] group-hover:text-[#046D38] truncate">
                  Arah Kiblat
                </h3>
                <ArrowRight className="w-4 h-4 text-[#68756C] group-hover:text-[#046D38] shrink-0" />
              </div>
              <p className="text-xs text-[#68756C] truncate">
                Kompas presisi Ka&apos;bah
              </p>
            </div>
          </button>

          {/* Pintasan 2: Doa & Dzikir */}
          <button
            type="button"
            onClick={() => onSelectTab('doa')}
            className="p-3.5 rounded-2xl border border-[#E3E9E3] bg-white hover:border-[#046D38] transition-colors text-left flex items-center gap-3 group cursor-pointer min-w-0"
          >
            <span className="w-10 h-10 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3] group-hover:bg-[#035328] group-hover:border-[#035328] flex items-center justify-center shrink-0 transition-colors">
              <BookHeart className="w-5 h-5 text-[#035328] group-hover:text-[#FBC647]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h3 className="font-display font-bold text-sm sm:text-base text-[#24352B] group-hover:text-[#046D38] truncate">
                  Doa &amp; Dzikir
                </h3>
                <ArrowRight className="w-4 h-4 text-[#68756C] group-hover:text-[#046D38] shrink-0" />
              </div>
              <p className="text-xs text-[#68756C] truncate">
                Kumpulan doa harian shahih
              </p>
            </div>
          </button>

          {/* Pintasan 3: Kalender Hijriah */}
          <button
            type="button"
            onClick={() => onSelectTab('hijri')}
            className="p-3.5 rounded-2xl border border-[#E3E9E3] bg-white hover:border-[#046D38] transition-colors text-left flex items-center gap-3 group cursor-pointer min-w-0"
          >
            <span className="w-10 h-10 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3] group-hover:bg-[#035328] group-hover:border-[#035328] flex items-center justify-center shrink-0 transition-colors">
              <Calendar className="w-5 h-5 text-[#035328] group-hover:text-[#FBC647]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h3 className="font-display font-bold text-sm sm:text-base text-[#24352B] group-hover:text-[#046D38] truncate">
                  Kalender Hijriah
                </h3>
                <ArrowRight className="w-4 h-4 text-[#68756C] group-hover:text-[#046D38] shrink-0" />
              </div>
              <p className="text-xs text-[#68756C] truncate">
                Penanggalan MABIMS &amp; hari besar
              </p>
            </div>
          </button>
        </div>

        {/* Baris Pintasan Cepat Al-Qur'an: 114 Surat, 30 Juz, Ayat Kursi, Penanda */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => onNavigateToSurahList('SURAH')}
            className="min-h-[48px] px-3.5 py-2.5 rounded-2xl bg-white border border-[#E3E9E3] hover:border-[#046D38] transition-colors flex items-center gap-2.5 text-left cursor-pointer group"
          >
            <BookOpen className="w-4 h-4 text-[#046D38] shrink-0" />
            <span className="text-xs font-semibold text-[#24352B] group-hover:text-[#046D38] truncate">
              Daftar 114 Surah
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToSurahList('JUZ')}
            className="min-h-[48px] px-3.5 py-2.5 rounded-2xl bg-white border border-[#E3E9E3] hover:border-[#046D38] transition-colors flex items-center gap-2.5 text-left cursor-pointer group"
          >
            <Layers className="w-4 h-4 text-[#046D38] shrink-0" />
            <span className="text-xs font-semibold text-[#24352B] group-hover:text-[#046D38] truncate">
              Indeks 30 Juz
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenSurah(2, 255)}
            className="min-h-[48px] px-3.5 py-2.5 rounded-2xl bg-white border border-[#E3E9E3] hover:border-[#046D38] transition-colors flex items-center gap-2.5 text-left cursor-pointer group"
          >
            <Sparkles className="w-4 h-4 text-[#046D38] shrink-0" />
            <span className="text-xs font-semibold text-[#24352B] group-hover:text-[#046D38] truncate">
              Ayat Kursi (2:255)
            </span>
          </button>

          <button
            type="button"
            onClick={onNavigateToBookmarks}
            className="min-h-[48px] px-3.5 py-2.5 rounded-2xl bg-white border border-[#E3E9E3] hover:border-[#046D38] transition-colors flex items-center gap-2.5 text-left cursor-pointer group"
          >
            <Bookmark className="w-4 h-4 text-[#046D38] shrink-0" />
            <span className="text-xs font-semibold text-[#24352B] group-hover:text-[#046D38] truncate">
              Penanda &amp; Catatan
            </span>
          </button>
        </div>
      </section>

      {/* PRIORITAS 5: Rekomendasi Doa Harian & Aktivitas Membaca (Tadabbur + Surat Pilihan) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-5 items-stretch">
        {/* Rekomendasi Doa Pilihan Hari Ini (dari API eQuran.id) */}
        <div className="lg:col-span-6 card-surface flex flex-col justify-between gap-3.5">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#046D38]">
                <BookHeart className="w-4 h-4 shrink-0" />
                <span>Rekomendasi Doa Harian</span>
              </div>
              {recommendedDoa?.grup && (
                <span className="px-2 py-0.5 rounded-md bg-[#F7F8F5] border border-[#E3E9E3] text-[10px] font-semibold text-[#68756C] truncate max-w-[180px]">
                  {recommendedDoa.grup}
                </span>
              )}
            </div>

            {recommendedDoa ? (
              <div className="space-y-2 pt-1">
                <h3 className="font-display text-sm sm:text-base font-bold text-[#24352B]">
                  {recommendedDoa.nama}
                </h3>
                <p
                  dir="rtl"
                  className="font-arabic-amiri text-xl sm:text-2xl leading-loose text-right text-[#035328] line-clamp-2"
                >
                  {recommendedDoa.ar}
                </p>
                <p className="text-xs text-[#68756C] leading-relaxed line-clamp-2">
                  &ldquo;{recommendedDoa.idn}&rdquo;
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 pt-1">
                <h3 className="font-display text-sm sm:text-base font-bold text-[#24352B]">
                  Doa &amp; Dzikir Harian Shahih
                </h3>
                <p className="text-xs text-[#68756C] leading-relaxed">
                  Telusuri kumpulan doa pagi-petang, doa setelah salat, dan dzikir harian lengkap teks Arab, transliterasi Latin, dan terjemahan bahasa Indonesia.
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#E3E9E3] flex items-center justify-between gap-2">
            <span className="text-xs text-[#68756C] truncate">
              Doa harian &amp; dzikir
            </span>
            <button
              type="button"
              onClick={() => onSelectTab('doa')}
              className="px-3.5 py-1.5 rounded-full bg-[#046D38] hover:bg-[#035328] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
            >
              <span>Buka Doa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tadabbur Ayat Harian */}
        <div
          className="lg:col-span-6 card-surface flex flex-col justify-between gap-3.5"
          style={{
            backgroundColor: '#FAFDFB',
            borderColor: 'rgba(4, 109, 56, 0.22)',
          }}
        >
          <div className="space-y-2">
            <div
              className="flex items-center gap-1.5 text-xs font-bold"
              style={{ color: 'var(--color-primary)' }}
            >
              <Sparkles className="w-4 h-4 text-[#FBC647] fill-[#FBC647] shrink-0" />
              <span>Tadabbur Hari Ini · {dailyVerse.theme}</span>
            </div>
            <p
              dir="rtl"
              className="font-arabic-amiri text-xl sm:text-2xl leading-loose text-right"
              style={{ color: 'var(--color-header)' }}
            >
              {dailyVerse.teksArab}
            </p>
            <p
              className="text-xs sm:text-sm leading-relaxed"
              style={{ color: 'var(--color-text-primary)' }}
            >
              &ldquo;{dailyVerse.teksIndonesia}&rdquo;
            </p>
          </div>

          <div className="pt-2 border-t border-[#E3E9E3] flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#046D38]">
              QS. {dailyVerse.surahNamaLatin} : {dailyVerse.ayatNomor}
            </span>
            <button
              type="button"
              onClick={() => onOpenSurah(dailyVerse.surahNomor, dailyVerse.ayatNomor)}
              className="min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold text-white inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <span>Baca &amp; Tadabbur</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>
      </section>

      {/* Surat Pilihan */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2
            className="font-display text-fluid-lg font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Surat Pilihan
          </h2>
          <button
            type="button"
            onClick={() => onNavigateToSurahList('SURAH')}
            className="text-xs font-semibold flex items-center gap-1 hover:underline cursor-pointer shrink-0"
            style={{ color: 'var(--color-primary)' }}
          >
            <span>Lihat 114 Surat</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {FEATURED_SURAHS.map((feat) => {
            const fullInfo = surahs.find((s) => s.nomor === feat.nomor);
            return (
              <button
                key={feat.nomor}
                type="button"
                onClick={() => onOpenSurah(feat.nomor, 1)}
                className="p-3.5 rounded-2xl border bg-white hover:border-[#046D38] transition-all text-left flex flex-col justify-between group cursor-pointer min-w-0"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span
                    className="w-7 h-7 rounded-lg bg-[#F7F8F5] group-hover:bg-[#046D38] group-hover:text-white flex items-center justify-center text-[11px] font-mono-num font-bold shrink-0 transition-colors"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {String(feat.nomor).padStart(2, '0')}
                  </span>
                  {fullInfo && (
                    <span
                      className="font-arabic-amiri text-lg sm:text-xl font-bold shrink-0"
                      style={{ color: 'var(--color-header)' }}
                    >
                      {fullInfo.nama}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 min-w-0">
                  <h3
                    className="font-semibold text-xs sm:text-sm group-hover:text-[#046D38] transition-colors truncate"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {feat.namaLatin}
                  </h3>
                  <p
                    className="text-[11px] mt-0.5 truncate"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {feat.arti} · {feat.ayatCount} Ayat
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Riwayat Bacaan & Penanda Tersimpan */}
      {(history.length > 0 || bookmarks.length > 0) && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5">
          {/* Riwayat Bacaan */}
          <div className="card-surface space-y-2.5 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="w-4 h-4 text-[#046D38] shrink-0" />
                <h3
                  className="font-semibold text-sm sm:text-base truncate"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Riwayat Terakhir
                </h3>
              </div>
              <button
                type="button"
                onClick={onNavigateToBookmarks}
                className="text-xs font-semibold hover:underline shrink-0 cursor-pointer"
                style={{ color: 'var(--color-primary)' }}
              >
                Semua
              </button>
            </div>

            {history.length === 0 ? (
              <p className="text-xs py-2" style={{ color: 'var(--color-text-secondary)' }}>
                Belum ada riwayat bacaan.
              </p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {history.slice(0, 3).map((item) => (
                  <button
                    key={`${item.surahNomor}-${item.ayatNomor}`}
                    type="button"
                    onClick={() => onOpenSurah(item.surahNomor, item.ayatNomor)}
                    className="w-full min-h-[46px] py-2 flex items-center justify-between gap-3 text-left hover:bg-[#F7F8F5] px-2 rounded-xl transition-colors cursor-pointer min-w-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs sm:text-sm font-semibold truncate"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        QS. {item.surahNamaLatin} : Ayat {item.ayatNomor}
                      </p>
                      <p
                        className="text-[11px] truncate"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {item.surahArti}
                      </p>
                    </div>
                    <span
                      className="font-arabic-amiri text-lg font-bold shrink-0"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      {item.surahNamaArab}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Penanda Ayat Terbaru */}
          <div className="card-surface space-y-2.5 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Bookmark className="w-4 h-4 text-[#046D38] shrink-0" />
                <h3
                  className="font-semibold text-sm sm:text-base truncate"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Penanda Tersimpan
                </h3>
              </div>
              <button
                type="button"
                onClick={onNavigateToBookmarks}
                className="text-xs font-semibold hover:underline shrink-0 cursor-pointer"
                style={{ color: 'var(--color-primary)' }}
              >
                Kelola ({bookmarks.length})
              </button>
            </div>

            {bookmarks.length === 0 ? (
              <p className="text-xs py-2" style={{ color: 'var(--color-text-secondary)' }}>
                Belum ada penanda ayat.
              </p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {bookmarks.slice(0, 3).map((bm) => (
                  <button
                    key={bm.id}
                    type="button"
                    onClick={() => onOpenSurah(bm.surahNomor, bm.ayatNomor)}
                    className="w-full min-h-[46px] py-2 flex items-start justify-between gap-3 text-left hover:bg-[#F7F8F5] px-2 rounded-xl transition-colors cursor-pointer min-w-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs sm:text-sm font-semibold truncate"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        QS. {bm.surahNamaLatin} ({bm.surahNomor}:{bm.ayatNomor})
                      </p>
                      <p
                        className="text-[11px] line-clamp-1 mt-0.5"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {bm.teksIndonesia}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 shrink-0 mt-1 text-[#046D38]" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
