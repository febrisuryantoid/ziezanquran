import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  HelpCircle,
  Info,
  Languages,
  Palette,
  Pause,
  Play,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
  Subtitles,
  Volume2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ARABIC_FONT_OPTIONS, SITE_URL } from '../config/brand';
import { renderTajweedText, TAJWEED_RULES_LIST } from '../utils/tajweedParser';
import {
  AudioPlaybackState,
  Ayat,
  BookmarkItem,
  PersonalNote,
  ReadingPreferences,
  ReadingProgress,
  SurahDetail,
  SurahSummary,
} from '../types/quran';

interface SurahReaderViewProps {
  surah: SurahDetail | null;
  allSurahs: SurahSummary[];
  isLoading: boolean;
  error: string | null;
  initialAyatNomor: number | null;
  scrollTriggerKey?: number;
  preferences: ReadingPreferences;
  bookmarks: BookmarkItem[];
  notes: PersonalNote[];
  lastRead: ReadingProgress | null;
  playback: AudioPlaybackState | null;
  onRetry: () => void;
  onBackToList: () => void;
  onSelectSurah: (surahNomor: number, ayatNomor?: number) => void;
  onPlayAyatAudio: (surah: SurahDetail, ayat: Ayat) => void;
  onPlayFullSurahAudio: (surah: SurahDetail) => void;
  onToggleBookmark: (surah: SurahDetail, ayat: Ayat) => void;
  onSaveNote: (surah: SurahDetail, ayat: Ayat, noteText: string) => void;
  onMarkLastRead: (surah: SurahDetail, ayatNomor: number) => void;
  onOpenTafsir: (surah: SurahDetail, ayat: Ayat) => void;
  onUpdatePreferences: (next: ReadingPreferences) => void;
  onShowToast?: (msg: string) => void;
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .trim();
}

export const SurahReaderView: React.FC<SurahReaderViewProps> = ({
  surah,
  allSurahs,
  isLoading,
  error,
  initialAyatNomor,
  scrollTriggerKey = 0,
  preferences,
  bookmarks,
  notes,
  lastRead,
  playback,
  onRetry,
  onBackToList,
  onSelectSurah,
  onPlayAyatAudio,
  onPlayFullSurahAudio,
  onToggleBookmark,
  onSaveNote,
  onMarkLastRead,
  onOpenTafsir,
  onUpdatePreferences,
  onShowToast,
}) => {
  const [showDescription, setShowDescription] = useState(false);
  const [showTajweedLegend, setShowTajweedLegend] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [inSurahQuery, setInSurahQuery] = useState('');
  const [copiedAyat, setCopiedAyat] = useState<number | null>(null);
  const [editingNoteAyat, setEditingNoteAyat] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [selectedAyatJump, setSelectedAyatJump] = useState<number>(initialAyatNomor || 1);
  const [highlightedAyat, setHighlightedAyat] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);

  const arabicFontClass = useMemo(() => {
    const found = ARABIC_FONT_OPTIONS.find((f) => f.id === preferences.arabicFontFamily);
    return found ? found.className : 'font-arabic-amiri';
  }, [preferences.arabicFontFamily]);

  const alignToAyatElement = (ayatNum: number, behavior: ScrollBehavior = 'auto') => {
    const el = document.getElementById(`ayat-card-${ayatNum}`);
    if (!el) return false;
    const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 60;
    const targetTop =
      el.getBoundingClientRect().top + window.scrollY - (headerHeight + 14);
    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior,
    });
    return true;
  };

  // Reset state when changing surah
  useEffect(() => {
    setInSurahQuery('');
    setShowSearchBar(false);
    setEditingNoteAyat(null);
  }, [surah?.nomor]);

  // Focus search input when toggled open
  useEffect(() => {
    if (showSearchBar) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [showSearchBar]);

  // Deterministically scroll to target ayat (e.g. Ayat Kursi 2:255) when surah finishes loading
  useEffect(() => {
    if (!surah || isLoading) return;

    const targetAyat =
      initialAyatNomor && initialAyatNomor >= 1 && initialAyatNomor <= surah.jumlahAyat
        ? initialAyatNomor
        : 1;

    setSelectedAyatJump(targetAyat);

    if (targetAyat > 1) {
      setHighlightedAyat(targetAyat);
      setInSurahQuery('');

      // Multi-stage alignment so long surahs (like Al-Baqarah 286 verses) land on the exact verse
      // immediately and stay locked even after web fonts settle.
      const rafId = window.requestAnimationFrame(() => {
        alignToAyatElement(targetAyat, 'auto');
      });
      const t1 = window.setTimeout(() => {
        alignToAyatElement(targetAyat, 'auto');
      }, 60);
      const t2 = window.setTimeout(() => {
        alignToAyatElement(targetAyat, 'auto');
      }, 180);
      const t3 = window.setTimeout(() => {
        alignToAyatElement(targetAyat, 'smooth');
      }, 340);

      return () => {
        window.cancelAnimationFrame(rafId);
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        window.clearTimeout(t3);
      };
    } else {
      setHighlightedAyat(null);
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [surah?.nomor, initialAyatNomor, isLoading, scrollTriggerKey]);

  // Auto-scroll smoothly when audio plays or advances in per-ayat mode
  useEffect(() => {
    if (
      playback &&
      playback.isPlaying &&
      playback.mode === 'ayat' &&
      playback.surahNomor === surah?.nomor &&
      playback.ayatNomor
    ) {
      setSelectedAyatJump(playback.ayatNomor);
      alignToAyatElement(playback.ayatNomor, 'smooth');
    }
  }, [
    playback?.ayatNomor,
    playback?.surahNomor,
    playback?.isPlaying,
    playback?.mode,
    surah?.nomor,
  ]);

  const handleJumpToAyat = (ayatNum: number) => {
    if (!ayatNum) return;
    setInSurahQuery('');
    setSelectedAyatJump(ayatNum);
    setHighlightedAyat(ayatNum);
    window.requestAnimationFrame(() => {
      alignToAyatElement(ayatNum, 'auto');
    });
    window.setTimeout(() => {
      alignToAyatElement(ayatNum, 'smooth');
    }, 90);
  };

  const handleShareAyat = async (ayat: Ayat) => {
    if (!surah) return;
    const path =
      surah.nomor === 1
        ? `/surat/ayat/${ayat.nomorAyat}`
        : `/surat/${surah.nomor}/ayat/${ayat.nomorAyat}`;
    const shareUrl = `${SITE_URL}${path}`;
    const shareTitle = `QS. ${surah.namaLatin} (${surah.nomor}): Ayat ${ayat.nomorAyat} — Ziezan Quran`;
    const shareText = `${ayat.teksArab}\n\n${ayat.teksLatin}\n\n"${ayat.teksIndonesia}"\n\n— QS. ${surah.namaLatin} (${surah.nomor}): Ayat ${ayat.nomorAyat} | Ziezan Quran\n${shareUrl}`;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedAyat(ayat.nomorAyat);
      onShowToast?.(`QS. ${surah.namaLatin} : ${ayat.nomorAyat} disalin ke papan klip`);
      setTimeout(() => setCopiedAyat(null), 2000);
    } catch {
      onShowToast?.('Gagal menyalin teks ayat');
    }
  };

  const openNoteEditor = (ayat: Ayat) => {
    if (!surah) return;
    const existing = notes.find(
      (n) => n.surahNomor === surah.nomor && n.ayatNomor === ayat.nomorAyat
    );
    setNoteDraft(existing ? existing.noteText : '');
    setEditingNoteAyat(ayat.nomorAyat);
  };

  const saveCurrentNote = (ayat: Ayat) => {
    if (!surah) return;
    onSaveNote(surah, ayat, noteDraft);
    setEditingNoteAyat(null);
  };

  const filteredAyatList = useMemo(() => {
    if (!surah) return [];
    const q = inSurahQuery.trim().toLowerCase();
    if (!q) return surah.ayat;
    return surah.ayat.filter(
      (a) =>
        String(a.nomorAyat) === q ||
        a.teksIndonesia.toLowerCase().includes(q) ||
        a.teksLatin.toLowerCase().includes(q) ||
        a.teksArab.includes(q)
    );
  }, [surah, inSurahQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        {/* Skeleton Minimalist Top Header */}
        <div
          className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur-md"
          style={{
            borderColor: 'var(--color-border)',
            paddingTop: 'var(--safe-top)',
          }}
        >
          <div className="container-reader h-14 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onBackToList}
              aria-label="Kembali ke Daftar Surat"
              className="w-10 h-10 rounded-full border flex items-center justify-center bg-[#F7F8F5] cursor-pointer"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="h-8 w-44 rounded-full bg-[#F0F3EE] animate-pulse" />
            <div className="flex items-center gap-1.5">
              <div className="w-9 h-9 rounded-full bg-[#F0F3EE] animate-pulse" />
              <div className="w-9 h-9 rounded-full bg-[#F0F3EE] animate-pulse" />
            </div>
          </div>
        </div>

        <div className="container-reader py-5 sm:py-7 space-y-4">
          <div
            className="h-32 sm:h-36 rounded-2xl border bg-white p-5 animate-pulse"
            style={{ borderColor: 'var(--color-border)' }}
          />
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-44 rounded-2xl border bg-white p-5 animate-pulse"
              style={{ borderColor: 'var(--color-border)' }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !surah) {
    return (
      <div className="container-reader py-10">
        <div className="card-surface text-center space-y-4">
          <p className="text-sm sm:text-base font-semibold text-red-700">
            {error || 'Data surat tidak dapat dimuat.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onBackToList}
              className="min-h-[44px] px-4 py-2 rounded-xl border text-xs sm:text-sm font-medium bg-white hover:bg-[#F7F8F5] cursor-pointer"
              style={{ borderColor: 'var(--color-border)' }}
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={onRetry}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white inline-flex items-center gap-2 cursor-pointer"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Coba Lagi</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isPlayingFullSurah =
    playback?.isPlaying &&
    playback?.mode === 'surah' &&
    playback?.surahNomor === surah.nomor;

  return (
    <div>
      {/* Minimalist Sticky Reader Header: Back Button + Compact Switcher + Icon-Only Actions */}
      <header
        ref={headerRef}
        className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur-xl transition-colors"
        style={{
          borderColor: 'var(--color-border)',
          paddingTop: 'var(--safe-top)',
        }}
      >
        <div className="container-reader mobile-landscape-reader-header h-13 sm:h-15 flex items-center justify-between gap-1 sm:gap-2.5 min-w-0">
          {/* Left: Back Icon Button Only */}
          <button
            type="button"
            onClick={onBackToList}
            aria-label="Kembali ke Daftar Surat"
            title="Kembali ke Daftar Surat"
            className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-full border bg-[#F7F8F5] hover:bg-[#EDF5F0] hover:border-[#046D38]/40 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            <ArrowLeft className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
          </button>

          {/* Center: Compact Surah & Ayat Jump Selectors */}
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1 max-w-md lg:max-w-xl mx-auto">
            <select
              value={surah.nomor}
              onChange={(e) => onSelectSurah(Number(e.target.value), 1)}
              aria-label="Pilih Surat"
              className="h-8.5 sm:h-10 min-w-0 flex-1 px-2 sm:px-3 rounded-full border text-[11px] sm:text-sm font-semibold bg-[#F7F8F5] truncate focus:outline-none cursor-pointer"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              {allSurahs.map((s) => (
                <option key={s.nomor} value={s.nomor}>
                  {s.nomor}. {s.namaLatin}
                </option>
              ))}
            </select>

            <select
              value={selectedAyatJump}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val) handleJumpToAyat(val);
              }}
              aria-label="Lompat ke Ayat"
              className="h-8.5 sm:h-10 w-[64px] min-[360px]:w-[76px] sm:w-[96px] shrink-0 px-1 min-[360px]:px-2 rounded-full border text-[10px] min-[360px]:text-xs font-mono-num font-semibold bg-[#F7F8F5] focus:outline-none cursor-pointer"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-primary)',
              }}
            >
              {surah.ayat.map((a) => (
                <option key={a.nomorAyat} value={a.nomorAyat}>
                  {a.nomorAyat}
                </option>
              ))}
            </select>
          </div>

          {/* Right: Relevant Icon-Only Actions (Fluid & Overlap-Proof) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Toggle Tajweed Color Icon */}
            <button
              type="button"
              onClick={() =>
                onUpdatePreferences({
                  ...preferences,
                  showTajweed: !preferences.showTajweed,
                })
              }
              aria-label={
                preferences.showTajweed
                  ? 'Sembunyikan warna Tajwid'
                  : 'Tampilkan warna Tajwid'
              }
              title={
                preferences.showTajweed
                  ? 'Pewarnaan Tajwid: Aktif'
                  : 'Pewarnaan Tajwid: Nonaktif'
              }
              className={`w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                preferences.showTajweed
                  ? 'bg-[#046D38] text-white border-[#046D38]'
                  : 'bg-[#F7F8F5] text-[#68756C] hover:text-[#24352B] border-[#E3E9E3]'
              }`}
            >
              <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Search in Surah Toggle Icon */}
            <button
              type="button"
              onClick={() => {
                setShowSearchBar((prev) => {
                  if (prev) setInSurahQuery('');
                  return !prev;
                });
              }}
              aria-label="Cari ayat di dalam surat ini"
              title="Cari di dalam surat"
              className={`w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                showSearchBar || inSurahQuery
                  ? 'bg-[#046D38] text-white border-[#046D38]'
                  : 'bg-[#F7F8F5] text-[#68756C] hover:text-[#24352B] border-[#E3E9E3]'
              }`}
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Toggle Latin Icon (Hidden on screens < 440px to prevent overcrowding) */}
            <button
              type="button"
              onClick={() =>
                onUpdatePreferences({ ...preferences, showLatin: !preferences.showLatin })
              }
              aria-label={
                preferences.showLatin
                  ? 'Sembunyikan transliterasi Latin'
                  : 'Tampilkan transliterasi Latin'
              }
              title={
                preferences.showLatin
                  ? 'Transliterasi Latin: Aktif'
                  : 'Transliterasi Latin: Nonaktif'
              }
              className={`hidden min-[440px]:flex w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-full border items-center justify-center transition-colors cursor-pointer ${
                preferences.showLatin
                  ? 'bg-[#046D38] text-white border-[#046D38]'
                  : 'bg-[#F7F8F5] text-[#68756C] hover:text-[#24352B] border-[#E3E9E3]'
              }`}
            >
              <Languages className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Toggle Translation Icon (Hidden on screens < 440px to prevent overcrowding) */}
            <button
              type="button"
              onClick={() =>
                onUpdatePreferences({
                  ...preferences,
                  showTranslation: !preferences.showTranslation,
                })
              }
              aria-label={
                preferences.showTranslation
                  ? 'Sembunyikan terjemahan Indonesia'
                  : 'Tampilkan terjemahan Indonesia'
              }
              title={
                preferences.showTranslation
                  ? 'Terjemahan Indonesia: Aktif'
                  : 'Terjemahan Indonesia: Nonaktif'
              }
              className={`hidden min-[440px]:flex w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-full border items-center justify-center transition-colors cursor-pointer ${
                preferences.showTranslation
                  ? 'bg-[#046D38] text-white border-[#046D38]'
                  : 'bg-[#F7F8F5] text-[#68756C] hover:text-[#24352B] border-[#E3E9E3]'
              }`}
            >
              <Subtitles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Surah Introduction / Info Icon (Hidden on screens < 520px) */}
            <button
              type="button"
              onClick={() => setShowDescription(true)}
              aria-label={`Informasi & Pengantar Surat ${surah.namaLatin}`}
              title="Informasi & Pengantar Surat"
              className={`hidden min-[520px]:flex w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-full border items-center justify-center transition-colors cursor-pointer ${
                showDescription
                  ? 'bg-[#046D38] text-white border-[#046D38]'
                  : 'bg-[#F7F8F5] text-[#68756C] hover:text-[#24352B] border-[#E3E9E3]'
              }`}
            >
              <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Play / Pause Full Surah Audio Icon */}
            <button
              type="button"
              onClick={() => onPlayFullSurahAudio(surah)}
              aria-label={
                isPlayingFullSurah
                  ? `Jeda Murottal Surat ${surah.namaLatin}`
                  : `Putar Murottal Surat ${surah.namaLatin}`
              }
              title={
                isPlayingFullSurah
                  ? `Jeda Murottal Surat ${surah.namaLatin}`
                  : `Putar Murottal Surat ${surah.namaLatin}`
              }
              className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-2xs shrink-0"
              style={{
                backgroundColor: isPlayingFullSurah
                  ? 'var(--color-gold)'
                  : 'var(--color-header)',
                color: isPlayingFullSurah ? '#1D2B22' : 'var(--color-gold)',
              }}
            >
              {isPlayingFullSurah ? (
                <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible In-Surah Search Bar (Only visible when Search icon is toggled) */}
        <AnimatePresence>
          {showSearchBar && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t bg-[#F7F8F5]"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="container-reader py-2.5 flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search
                    className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--color-text-secondary)' }}
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={inSurahQuery}
                    onChange={(e) => setInSurahQuery(e.target.value)}
                    placeholder={`Cari nomor ayat atau kata di QS. ${surah.namaLatin}...`}
                    aria-label={`Cari ayat di dalam surat ${surah.namaLatin}`}
                    className="w-full h-9 pl-9 pr-9 rounded-full border text-xs sm:text-sm bg-white focus:outline-none"
                    style={{
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                  {inSurahQuery && (
                    <button
                      type="button"
                      onClick={() => setInSurahQuery('')}
                      className="w-6 h-6 rounded-full flex items-center justify-center absolute right-1.5 top-1/2 -translate-y-1/2 hover:bg-stone-100 cursor-pointer"
                      aria-label="Bersihkan kata kunci"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Reader Content */}
      <div className="container-reader py-4 sm:py-6 space-y-3.5 sm:space-y-5">
        {/* Clean, Serene Surah Calligraphy Banner (No Cluttered Buttons) */}
        <div
          className="rounded-[var(--radius-card)] px-4 sm:px-6 py-4 sm:py-5 border shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{
            backgroundColor: 'var(--color-header)',
            backgroundImage:
              'radial-gradient(circle at top right, rgba(251, 198, 71, 0.14), transparent 60%)',
            borderColor: 'rgba(251, 198, 71, 0.25)',
          }}
        >
          <div className="min-w-0 flex-1 space-y-1">
            <div
              className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-fluid-xs font-semibold"
              style={{ color: 'var(--color-gold)' }}
            >
              <span>Surat ke-{surah.nomor}</span>
              <span aria-hidden="true">·</span>
              <span>{surah.tempatTurun}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{surah.jumlahAyat} Ayat</span>
            </div>
            <h1 className="font-display text-fluid-xl font-bold tracking-tight text-white truncate">
              {surah.namaLatin}
            </h1>
            <p className="text-xs sm:text-sm text-white/80 truncate">{surah.arti}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setShowTajweedLegend(true)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer bg-white/10 hover:bg-white/20 text-white border-white/25"
              title="Lihat Legenda Warna Tajwid"
            >
              <Palette className="w-3.5 h-3.5 text-[#FBC647]" />
              <span>Legenda Tajwid</span>
            </button>
            <span
              className="font-arabic-amiri text-3xl sm:text-4xl lg:text-5xl font-bold"
              style={{ color: 'var(--color-gold)' }}
            >
              {surah.nama}
            </span>
          </div>
        </div>

        {/* Basmalah Opening (Shown for all surahs except Al-Fatihah #1 and At-Taubah #9) */}
        {surah.nomor !== 1 && surah.nomor !== 9 && !inSurahQuery && (
          <div className="card-surface !py-4 sm:!py-5 text-center">
            <p
              className={`${arabicFontClass} text-2xl sm:text-3xl`}
              style={{ color: 'var(--color-header)' }}
            >
              {renderTajweedText('بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ', preferences.showTajweed)}
            </p>
          </div>
        )}

        {/* Ayat List */}
        <div className="space-y-3 sm:space-y-4">
          {filteredAyatList.length === 0 ? (
            <div className="card-surface text-center space-y-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Tidak ditemukan ayat dengan kata kunci &ldquo;{inSurahQuery}&rdquo; di Surat{' '}
                {surah.namaLatin}.
              </p>
            </div>
          ) : (
            filteredAyatList.map((ayat) => {
              const bookmarkId = `${surah.nomor}:${ayat.nomorAyat}`;
              const isBookmarked = bookmarks.some((b) => b.id === bookmarkId);
              const existingNote = notes.find((n) => n.id === bookmarkId);
              const isLastRead =
                lastRead?.surahNomor === surah.nomor &&
                lastRead?.ayatNomor === ayat.nomorAyat;
              const isPlayingThisAyat =
                playback?.mode === 'ayat' &&
                playback?.surahNomor === surah.nomor &&
                playback?.ayatNomor === ayat.nomorAyat &&
                playback?.isPlaying;
              const isHighlightedTarget = highlightedAyat === ayat.nomorAyat;
              const isAyatKursi = surah.nomor === 2 && ayat.nomorAyat === 255;

              return (
                <article
                  key={ayat.nomorAyat}
                  id={`ayat-card-${ayat.nomorAyat}`}
                  className={`card-surface ayat-card-optimized transition-all space-y-4 sm:space-y-5 ${
                    isHighlightedTarget ? 'ring-2 ring-[#FBC647] shadow-sm' : ''
                  }`}
                  style={{
                    borderColor:
                      isPlayingThisAyat || isLastRead || isHighlightedTarget
                        ? 'var(--color-primary)'
                        : 'var(--color-border)',
                    backgroundColor:
                      isPlayingThisAyat || isHighlightedTarget
                        ? '#F6FBF8'
                        : 'var(--color-surface)',
                  }}
                >
                  {/* Ayat Top Bar: Verse Number & Clean Icon-Only Action Bar */}
                  <div
                    className="flex items-center justify-between gap-2 pb-2.5 sm:pb-3 border-b min-w-0"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-center gap-2 min-w-0 shrink-0">
                      <span
                        className="px-2.5 py-1 rounded-lg font-mono-num text-xs font-bold border whitespace-nowrap"
                        style={{
                          backgroundColor:
                            isLastRead || isHighlightedTarget
                              ? 'var(--color-primary)'
                              : '#F7F8F5',
                          color:
                            isLastRead || isHighlightedTarget
                              ? '#FFFFFF'
                              : 'var(--color-primary)',
                          borderColor:
                            isLastRead || isHighlightedTarget
                              ? 'var(--color-primary)'
                              : 'var(--color-border)',
                        }}
                      >
                        {surah.nomor}:{ayat.nomorAyat}
                      </span>

                      {isAyatKursi && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border whitespace-nowrap"
                          style={{
                            backgroundColor: '#FDF6E2',
                            borderColor: 'var(--color-gold)',
                            color: 'var(--color-header)',
                          }}
                        >
                          <Sparkles className="w-3 h-3 text-[#046D38] shrink-0" />
                          <span>Ayat Kursi</span>
                        </span>
                      )}

                      {isLastRead && (
                        <CheckCircle2
                          className="w-4 h-4 text-[#FBC647] fill-[#046D38] shrink-0"
                          aria-label="Posisi Terakhir Dibaca"
                        />
                      )}
                    </div>

                    {/* Uniform Icon-Only Action Toolbar (Clean & Non-Texty on Mobile & Desktop) */}
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                      {/* 1. Play/Pause Ayat Audio */}
                      <button
                        type="button"
                        onClick={() => onPlayAyatAudio(surah, ayat)}
                        aria-label={
                          isPlayingThisAyat
                            ? `Jeda audio ayat ${ayat.nomorAyat}`
                            : `Putar audio ayat ${ayat.nomorAyat}`
                        }
                        title={
                          isPlayingThisAyat
                            ? `Jeda audio ayat ${ayat.nomorAyat}`
                            : `Putar audio ayat ${ayat.nomorAyat}`
                        }
                        className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors cursor-pointer ${
                          isPlayingThisAyat
                            ? 'bg-[#046D38] text-white border-[#046D38]'
                            : 'bg-[#F7F8F5] hover:bg-[#EDF5F0] text-[#046D38] border-[#E3E9E3]'
                        }`}
                      >
                        {isPlayingThisAyat ? (
                          <Pause className="w-4 h-4 fill-current text-[#FBC647]" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </button>

                      {/* 2. Open Tafsir */}
                      <button
                        type="button"
                        onClick={() => onOpenTafsir(surah, ayat)}
                        aria-label={`Baca Tafsir ayat ${ayat.nomorAyat}`}
                        title={`Tafsir ayat ${ayat.nomorAyat}`}
                        className="w-9 h-9 rounded-xl border bg-[#F7F8F5] hover:bg-[#EDF5F0] flex items-center justify-center transition-colors cursor-pointer"
                        style={{
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-primary)',
                        }}
                      >
                        <BookOpen className="w-4 h-4" />
                      </button>

                      {/* 3. Mark as Last Read */}
                      <button
                        type="button"
                        onClick={() => onMarkLastRead(surah, ayat.nomorAyat)}
                        aria-label={`Tandai ayat ${ayat.nomorAyat} sebagai terakhir dibaca`}
                        title="Tandai terakhir dibaca"
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                          isLastRead
                            ? 'bg-[#FDF6E2] border-[#FBC647] text-[#035328]'
                            : 'bg-[#F7F8F5] hover:bg-[#EDF5F0] text-[#046D38] border-[#E3E9E3]'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>

                      {/* 4. Bookmark Ayat */}
                      <button
                        type="button"
                        onClick={() => onToggleBookmark(surah, ayat)}
                        aria-label={
                          isBookmarked
                            ? `Hapus penanda ayat ${ayat.nomorAyat}`
                            : `Simpan penanda ayat ${ayat.nomorAyat}`
                        }
                        title={isBookmarked ? 'Tersimpan di Penanda' : 'Simpan ke Penanda'}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                          isBookmarked
                            ? 'bg-[#FDF6E2] border-[#FBC647] text-[#035328]'
                            : 'bg-[#F7F8F5] hover:bg-[#EDF5F0] text-[#046D38] border-[#E3E9E3]'
                        }`}
                      >
                        <Bookmark
                          className={`w-4 h-4 ${
                            isBookmarked ? 'fill-[#FBC647] text-[#035328]' : ''
                          }`}
                        />
                      </button>

                      {/* 5. Personal Note */}
                      <button
                        type="button"
                        onClick={() => openNoteEditor(ayat)}
                        aria-label={`Catatan pribadi ayat ${ayat.nomorAyat}`}
                        title="Catatan Tadabbur"
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                          existingNote
                            ? 'bg-[#FDF6E2] border-[#FBC647] text-[#035328]'
                            : 'bg-[#F7F8F5] hover:bg-[#EDF5F0] text-[#046D38] border-[#E3E9E3]'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                      </button>

                      {/* 6. Share Ayat */}
                      <button
                        type="button"
                        onClick={() => handleShareAyat(ayat)}
                        aria-label={`Bagikan ayat ${ayat.nomorAyat}`}
                        title="Bagikan ayat"
                        className="w-9 h-9 rounded-xl border bg-[#F7F8F5] hover:bg-[#EDF5F0] flex items-center justify-center transition-colors cursor-pointer"
                        style={{
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {copiedAyat === ayat.nomorAyat ? (
                          <Check className="w-4 h-4 text-[#046D38]" />
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Arabic Verse Text with Tajweed Color Coding & Complete Harakat Support */}
                  <div className="pt-1 sm:pt-2 min-w-0">
                    <p
                      className={`${arabicFontClass} text-right select-text leading-loose`}
                      style={{
                        fontSize: `clamp(22px, 4.5vw, ${preferences.arabicFontSize}px)`,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {renderTajweedText(ayat.teksArab, preferences.showTajweed)}
                    </p>
                  </div>

                  {/* Transliteration & Indonesian Translation */}
                  {(preferences.showLatin || preferences.showTranslation) && (
                    <div className="space-y-2 sm:space-y-2.5 pt-1 min-w-0">
                      {preferences.showLatin && ayat.teksLatin && (
                        <p
                          className="text-fluid-sm italic leading-relaxed break-words"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          {ayat.teksLatin}
                        </p>
                      )}

                      {preferences.showTranslation && ayat.teksIndonesia && (
                        <p
                          className="leading-relaxed break-words"
                          style={{
                            fontSize: `clamp(13px, 2.5vw, ${preferences.translationFontSize}px)`,
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {ayat.teksIndonesia}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Saved Personal Reflection Note Display */}
                  {existingNote && (
                    <div
                      className="p-3.5 sm:p-4 rounded-xl bg-[#F7F8F5] border space-y-1.5"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-xs font-semibold"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          Catatan Tadabbur
                        </span>
                        <button
                          type="button"
                          onClick={() => openNoteEditor(ayat)}
                          className="text-xs font-medium hover:underline cursor-pointer"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          Ubah
                        </button>
                      </div>
                      <p
                        className="text-fluid-sm whitespace-pre-line break-words"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {existingNote.noteText}
                      </p>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>

        {/* Adjacent Surah Navigation */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {surah.suratSebelumnya ? (
            <button
              type="button"
              onClick={() =>
                surah.suratSebelumnya && onSelectSurah(surah.suratSebelumnya.nomor, 1)
              }
              className="card-surface !p-4 hover:border-[#046D38] transition-colors flex items-center justify-between gap-3 text-left cursor-pointer min-w-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ChevronLeft className="w-5 h-5 text-[#046D38] shrink-0" />
                <div className="min-w-0">
                  <p className="text-fluid-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Sebelumnya
                  </p>
                  <p
                    className="font-semibold text-sm sm:text-base truncate"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {surah.suratSebelumnya.nomor}. {surah.suratSebelumnya.namaLatin}
                  </p>
                </div>
              </div>
              <span
                className="font-arabic-amiri text-2xl font-bold shrink-0"
                style={{ color: 'var(--color-header)' }}
              >
                {surah.suratSebelumnya.nama}
              </span>
            </button>
          ) : (
            <div className="hidden sm:block" />
          )}

          {surah.suratSelanjutnya ? (
            <button
              type="button"
              onClick={() =>
                surah.suratSelanjutnya && onSelectSurah(surah.suratSelanjutnya.nomor, 1)
              }
              className="card-surface !p-4 hover:border-[#046D38] transition-colors flex items-center justify-between gap-3 text-right cursor-pointer min-w-0"
            >
              <span
                className="font-arabic-amiri text-2xl font-bold shrink-0"
                style={{ color: 'var(--color-header)' }}
              >
                {surah.suratSelanjutnya.nama}
              </span>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="min-w-0">
                  <p className="text-fluid-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Selanjutnya
                  </p>
                  <p
                    className="font-semibold text-sm sm:text-base truncate"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {surah.suratSelanjutnya.nomor}. {surah.suratSelanjutnya.namaLatin}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#046D38] shrink-0" />
              </div>
            </button>
          ) : (
            <div className="hidden sm:block" />
          )}
        </div>
      </div>

      {/* Bottom-to-Top Pop-up Sheet: Pengantar & Keterangan Surat */}
      <AnimatePresence>
        {showDescription && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:px-4"
            role="dialog"
            aria-modal="true"
            aria-label={`Pengantar Surat ${surah.namaLatin}`}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setShowDescription(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-2xl max-h-[82dvh] bg-white border-t border-x shadow-2xl flex flex-col overflow-hidden"
              style={{
                borderColor: 'var(--color-border)',
                borderTopLeftRadius: 'var(--radius-card)',
                borderTopRightRadius: 'var(--radius-card)',
              }}
            >
              <div
                className="pt-2.5 pb-1 flex justify-center shrink-0"
                style={{ backgroundColor: 'var(--color-header)' }}
              >
                <span className="w-10 h-1 rounded-full bg-white/30" />
              </div>

              <div
                className="px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-3 border-b shrink-0"
                style={{
                  backgroundColor: 'var(--color-header)',
                  borderColor: 'rgba(255,255,255,0.12)',
                }}
              >
                <div className="min-w-0">
                  <h3 className="font-display text-base sm:text-xl font-bold text-white truncate">
                    Pengantar QS. {surah.namaLatin} ({surah.nomor})
                  </h3>
                  <p className="text-xs text-white/75 truncate">
                    {surah.arti} · {surah.tempatTurun} · {surah.jumlahAyat} Ayat
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDescription(false)}
                  className="min-w-[44px] min-h-[44px] -mr-1 rounded-xl flex items-center justify-center text-white/85 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Tutup pengantar surat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div
                className="p-4 sm:p-6 overflow-y-auto space-y-4 text-fluid-base leading-relaxed"
                style={{
                  color: 'var(--color-text-primary)',
                  paddingBottom: 'calc(1.25rem + var(--safe-bottom))',
                }}
              >
                {surah.deskripsi && (
                  <p className="whitespace-pre-line">{stripHtmlTags(surah.deskripsi)}</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom-to-Top Pop-up Sheet: Catatan Tadabbur Editor */}
      <AnimatePresence>
        {editingNoteAyat !== null && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:px-4"
            role="dialog"
            aria-modal="true"
            aria-label={`Catatan Tadabbur Ayat ${editingNoteAyat}`}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setEditingNoteAyat(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-xl max-h-[88dvh] overflow-y-auto bg-white border-t border-x shadow-2xl flex flex-col"
              style={{
                borderColor: 'var(--color-border)',
                borderTopLeftRadius: 'var(--radius-card)',
                borderTopRightRadius: 'var(--radius-card)',
                paddingBottom: 'calc(1rem + var(--safe-bottom))',
              }}
            >
              <div
                className="pt-2.5 pb-1 flex justify-center shrink-0"
                style={{ backgroundColor: 'var(--color-header)' }}
              >
                <span className="w-10 h-1 rounded-full bg-white/30" />
              </div>

              <div
                className="px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-3 border-b shrink-0"
                style={{
                  backgroundColor: 'var(--color-header)',
                  borderColor: 'rgba(255,255,255,0.12)',
                }}
              >
                <div className="min-w-0">
                  <h3 className="font-display text-base sm:text-xl font-bold text-white truncate">
                    Catatan Tadabbur
                  </h3>
                  <p className="text-xs text-white/75 truncate">
                    QS. {surah.namaLatin} ({surah.nomor}) · Ayat {editingNoteAyat}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingNoteAyat(null)}
                  className="min-w-[44px] min-h-[44px] -mr-1 rounded-xl flex items-center justify-center text-white/85 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Tutup editor catatan"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                <textarea
                  id={`note-input-${editingNoteAyat}`}
                  rows={4}
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Tulis perenungan, doa, atau poin penting dari ayat ini..."
                  className="w-full rounded-xl border p-3.5 text-sm bg-[#F7F8F5] focus:bg-white focus:outline-none"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                />
                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingNoteAyat(null)}
                    className="min-h-[44px] px-4 py-2 rounded-xl border text-xs sm:text-sm font-semibold bg-white hover:bg-[#F7F8F5] cursor-pointer"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const targetAyat = surah.ayat.find((a) => a.nomorAyat === editingNoteAyat);
                      if (targetAyat) {
                        saveCurrentNote(targetAyat);
                      } else {
                        setEditingNoteAyat(null);
                      }
                    }}
                    className="min-h-[44px] px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white cursor-pointer"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom-to-Top Pop-up Sheet: Legenda Warna Tajwid */}
      <AnimatePresence>
        {showTajweedLegend && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:px-4"
            role="dialog"
            aria-modal="true"
            aria-label="Legenda Warna Tajwid Ziezan Quran"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setShowTajweedLegend(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-2xl max-h-[85dvh] bg-white border-t border-x shadow-2xl flex flex-col overflow-hidden"
              style={{
                borderColor: 'var(--color-border)',
                borderTopLeftRadius: 'var(--radius-card)',
                borderTopRightRadius: 'var(--radius-card)',
              }}
            >
              <div
                className="pt-2.5 pb-1 flex justify-center shrink-0"
                style={{ backgroundColor: 'var(--color-header)' }}
              >
                <span className="w-10 h-1 rounded-full bg-white/30" />
              </div>

              <div
                className="px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-3 border-b shrink-0"
                style={{
                  backgroundColor: 'var(--color-header)',
                  borderColor: 'rgba(255,255,255,0.12)',
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#FBC647]/20 border border-[#FBC647]/40 flex items-center justify-center shrink-0">
                    <Palette className="w-4 h-4 text-[#FBC647]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-base sm:text-lg font-bold text-white truncate">
                      Legenda Warna Tajwid
                    </h3>
                    <p className="text-xs text-white/75 truncate">
                      Panduan Kaidah & Pewarnaan Hukum Bacaan Al-Qur'an
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTajweedLegend(false)}
                  className="min-w-[44px] min-h-[44px] -mr-1 rounded-xl flex items-center justify-center text-white/85 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Tutup panduan tajwid"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div
                className="p-4 sm:p-6 overflow-y-auto space-y-3.5 sm:space-y-4"
                style={{
                  paddingBottom: 'calc(1.5rem + var(--safe-bottom))',
                }}
              >
                <div className="p-3 rounded-xl bg-[#F6FBF8] border border-[#046D38]/20 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-[#035328]">
                      Status Pewarnaan Tajwid
                    </p>
                    <p className="text-[11px] text-[#68756C]">
                      {preferences.showTajweed
                        ? 'Warna Tajwid sedang aktif pada teks ayat.'
                        : 'Warna Tajwid sedang dinonaktifkan.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdatePreferences({
                        ...preferences,
                        showTajweed: !preferences.showTajweed,
                      })
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border shrink-0 transition-colors cursor-pointer ${
                      preferences.showTajweed
                        ? 'bg-[#046D38] text-white border-[#046D38]'
                        : 'bg-white text-[#68756C] border-[#E3E9E3]'
                    }`}
                  >
                    {preferences.showTajweed ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TAJWEED_RULES_LIST.map((rule) => (
                    <div
                      key={rule.key}
                      className="p-3.5 rounded-xl border space-y-2 transition-shadow hover:shadow-xs"
                      style={{
                        backgroundColor: rule.bgColor,
                        borderColor: `${rule.color}33`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="px-2.5 py-0.5 rounded-md text-xs font-bold text-white shadow-2xs"
                          style={{ backgroundColor: rule.color }}
                        >
                          {rule.label}
                        </span>
                        <span
                          className="font-arabic-amiri text-base font-bold select-text"
                          style={{ color: rule.color }}
                        >
                          {rule.example}
                        </span>
                      </div>
                      <p className="text-xs text-[#24352B] leading-relaxed">
                        {rule.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
