import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpDown,
  BookOpen,
  Bookmark,
  Layers,
  Pause,
  Play,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { JUZ_LIST } from '../config/brand';
import { AudioPlaybackState, SurahSummary } from '../types/quran';

interface SurahListViewProps {
  surahs: SurahSummary[];
  isLoading: boolean;
  error: string | null;
  playback?: AudioPlaybackState | null;
  initialMode?: 'SURAH' | 'JUZ';
  bookmarksCount?: number;
  notesCount?: number;
  onRetry: () => void;
  onSelectSurah: (nomor: number, ayatNomor?: number) => void;
  onPlayFullSurah: (surah: SurahSummary) => void;
  onOpenSearch?: (initialQuery?: string) => void;
  onOpenBookmarks?: () => void;
}

type PlaceFilter = 'ALL' | 'JUZ_AMMA' | 'Mekah' | 'Madinah';
type SortMode = 'NOMOR_ASC' | 'NOMOR_DESC' | 'NAMA_ASC' | 'AYAT_DESC';

export const SurahListView: React.FC<SurahListViewProps> = ({
  surahs,
  isLoading,
  error,
  playback,
  initialMode = 'SURAH',
  bookmarksCount = 0,
  notesCount = 0,
  onRetry,
  onSelectSurah,
  onPlayFullSurah,
  onOpenSearch,
  onOpenBookmarks,
}) => {
  const [directoryMode, setDirectoryMode] = useState<'SURAH' | 'JUZ'>(initialMode);
  const [filterText, setFilterText] = useState('');
  const [placeFilter, setPlaceFilter] = useState<PlaceFilter>('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('NOMOR_ASC');

  useEffect(() => {
    setDirectoryMode(initialMode);
  }, [initialMode]);

  const filteredSurahs = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    const qNorm = q.replace(/[^a-z0-9]/g, '');

    const list = surahs.filter((s) => {
      if (placeFilter === 'JUZ_AMMA' && s.nomor < 78) {
        return false;
      }
      if (
        (placeFilter === 'Mekah' || placeFilter === 'Madinah') &&
        s.tempatTurun.toLowerCase() !== placeFilter.toLowerCase()
      ) {
        return false;
      }
      if (!q) return true;
      const latinNorm = s.namaLatin.toLowerCase().replace(/[^a-z0-9]/g, '');
      return (
        String(s.nomor) === q ||
        s.namaLatin.toLowerCase().includes(q) ||
        latinNorm.includes(qNorm) ||
        s.arti.toLowerCase().includes(q) ||
        s.nama.includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortMode === 'NOMOR_DESC') return b.nomor - a.nomor;
      if (sortMode === 'NAMA_ASC') return a.namaLatin.localeCompare(b.namaLatin);
      if (sortMode === 'AYAT_DESC') return b.jumlahAyat - a.jumlahAyat;
      return a.nomor - b.nomor;
    });
  }, [surahs, filterText, placeFilter, sortMode]);

  const filteredJuzList = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return JUZ_LIST;
    return JUZ_LIST.filter(
      (j) =>
        String(j.juz) === q ||
        `juz ${j.juz}` === q ||
        j.name.toLowerCase().includes(q) ||
        j.startSurahName.toLowerCase().includes(q) ||
        j.endSurahName.toLowerCase().includes(q)
    );
  }, [filterText]);

  const filterTabs: { id: PlaceFilter; label: string }[] = [
    { id: 'ALL', label: 'Semua' },
    { id: 'JUZ_AMMA', label: 'Juz Amma' },
    { id: 'Mekah', label: 'Makkiyah' },
    { id: 'Madinah', label: 'Madaniyah' },
  ];

  return (
    <div className="container-app py-3.5 sm:py-6 space-y-3.5 sm:space-y-5">
      {/* Header & Mode Switcher (114 Surat, 30 Juz, Pencarian Ayat, Penanda & Catatan) */}
      <div className="card-surface space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="min-w-0">
            <h1
              className="font-display text-fluid-xl font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Al-Qur&apos;an Digital
            </h1>
            <p className="text-xs text-[#68756C] mt-0.5">
              114 Surat &amp; 30 Juz
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Primary Segmented Switcher: 114 Surat vs 30 Juz */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-[#F0F3EE] flex-1 sm:flex-initial">
              <button
                type="button"
                onClick={() => setDirectoryMode('SURAH')}
                className={`min-h-[34px] px-3.5 py-1 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  directoryMode === 'SURAH'
                    ? 'bg-[#046D38] text-white shadow-xs'
                    : 'text-[#68756C] hover:text-[#24352B]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>114 Surat</span>
              </button>
              <button
                type="button"
                onClick={() => setDirectoryMode('JUZ')}
                className={`min-h-[34px] px-3.5 py-1 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  directoryMode === 'JUZ'
                    ? 'bg-[#046D38] text-white shadow-xs'
                    : 'text-[#68756C] hover:text-[#24352B]'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>30 Juz</span>
              </button>
            </div>

            {/* Sub-features inside Al-Qur'an: Pencarian Ayat & Penanda/Catatan */}
            {onOpenSearch && (
              <button
                type="button"
                onClick={() => onOpenSearch(filterText.trim() || undefined)}
                className="min-h-[36px] px-3.5 py-1.5 rounded-full border border-[#E3E9E3] bg-[#F7F8F5] hover:border-[#046D38] text-xs font-semibold text-[#24352B] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-[#046D38]" />
                <span>Cari Ayat</span>
              </button>
            )}

            {onOpenBookmarks && (
              <button
                type="button"
                onClick={onOpenBookmarks}
                className="min-h-[36px] px-3.5 py-1.5 rounded-full border border-[#E3E9E3] bg-[#F7F8F5] hover:border-[#046D38] text-xs font-semibold text-[#24352B] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5 text-[#046D38]" />
                <span>Penanda ({bookmarksCount + notesCount})</span>
              </button>
            )}
          </div>
        </div>


        {/* Search & Interactive Segmented Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
          {/* Quick Filter Input */}
          <div
            className={`${
              directoryMode === 'SURAH' ? 'md:col-span-2 lg:col-span-5' : 'md:col-span-2 lg:col-span-12'
            } relative min-w-0`}
          >
            <Search
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder={
                directoryMode === 'SURAH'
                  ? 'Cari nama surat, nomor (1-114), atau arti...'
                  : 'Cari nomor Juz (1-30), nama Juz, atau nama surat...'
              }
              aria-label="Saring daftar"
              className="w-full min-h-[40px] sm:min-h-[42px] pl-10 pr-9 py-2 rounded-full border text-xs sm:text-sm bg-[#F7F8F5] focus:bg-white focus:outline-none transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            {filterText && (
              <button
                type="button"
                onClick={() => setFilterText('')}
                className="w-7 h-7 rounded-full flex items-center justify-center absolute right-1.5 top-1/2 -translate-y-1/2 hover:bg-stone-200/60 cursor-pointer"
                aria-label="Hapus filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {directoryMode === 'SURAH' && (
            <>
              {/* Interactive Full-Rounded Filter Tabs */}
              <div className="md:col-span-1 lg:col-span-4 grid grid-cols-4 gap-1 p-1 rounded-full bg-[#F0F3EE] min-w-0">
                {filterTabs.map((tab) => {
                  const active = placeFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPlaceFilter(tab.id)}
                      className={`min-h-[34px] px-1.5 sm:px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap truncate cursor-pointer ${
                        active
                          ? 'bg-[#046D38] text-white shadow-xs'
                          : 'text-[#68756C] hover:text-[#24352B]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Sort Selector */}
              <div className="md:col-span-1 lg:col-span-3 flex items-center gap-2 min-w-0">
                <ArrowUpDown className="w-4 h-4 shrink-0 text-[#68756C] hidden sm:block" />
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  aria-label="Urutkan daftar surat"
                  className="w-full min-h-[40px] sm:min-h-[42px] px-3.5 py-2 rounded-full border text-xs sm:text-sm font-medium bg-[#F7F8F5] truncate focus:outline-none cursor-pointer"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <option value="NOMOR_ASC">Urutan Mushaf (1 - 114)</option>
                  <option value="NOMOR_DESC">Urutan Terbalik (114 - 1)</option>
                  <option value="NAMA_ASC">Abjad Nama (A - Z)</option>
                  <option value="AYAT_DESC">Jumlah Ayat Terbanyak</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && directoryMode === 'SURAH' && (
        <div className="card-surface text-center space-y-3">
          <p className="text-xs sm:text-sm font-medium text-red-700">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-[42px] px-4 py-2 rounded-full text-xs font-semibold text-white inline-flex items-center gap-2 cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Muat Ulang</span>
          </button>
        </div>
      )}

      {/* DIRECTORY MODE: 30 JUZ */}
      {directoryMode === 'JUZ' ? (
        filteredJuzList.length === 0 ? (
          <div className="card-surface !p-8 text-center space-y-1.5">
            <p
              className="text-sm sm:text-base font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Juz &ldquo;{filterText}&rdquo; tidak ditemukan
            </p>
            <p className="text-fluid-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Ketik angka 1 hingga 30 atau nama surat pembuka Juz.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
            {filteredJuzList.map((item) => (
              <button
                key={item.juz}
                type="button"
                onClick={() => onSelectSurah(item.startSurahNomor, item.startAyat)}
                className="rounded-2xl border bg-white p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:border-[#046D38] transition-all text-left min-w-0 group cursor-pointer"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-mono-num text-xs font-bold shrink-0 border group-hover:bg-[#046D38] group-hover:text-white group-hover:border-[#046D38] transition-colors"
                    style={{
                      backgroundColor: '#F7F8F5',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-primary)',
                    }}
                  >
                    {item.juz}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <h2
                        className="font-semibold text-sm sm:text-base truncate group-hover:text-[#046D38] transition-colors"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        Juz {item.juz} · {item.name}
                      </h2>
                    </div>
                    <p
                      className="text-[11px] sm:text-xs truncate mt-0.5"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Mulai: QS. {item.startSurahName} ({item.startSurahNomor}:{item.startAyat}) —{' '}
                      {item.endSurahName} ({item.endSurahNomor}:{item.endAyat})
                    </p>
                  </div>
                </div>

                <span className="w-8 h-8 rounded-full bg-[#F7F8F5] group-hover:bg-[#046D38] group-hover:text-white flex items-center justify-center text-[#046D38] shrink-0 transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </button>
            ))}
          </div>
        )
      ) : /* DIRECTORY MODE: 114 SURAH */
      isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-2xl border bg-white p-4 animate-pulse"
              style={{ borderColor: 'var(--color-border)' }}
            />
          ))}
        </div>
      ) : filteredSurahs.length === 0 ? (
        <div className="card-surface !p-8 text-center space-y-1.5">
          <p
            className="text-sm sm:text-base font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Surat &ldquo;{filterText}&rdquo; tidak ditemukan
          </p>
          <p className="text-fluid-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Gunakan kata kunci lain atau buka tab Cari untuk menelusuri terjemahan ayat.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
          {filteredSurahs.map((surah) => {
            const isPlayingThis =
              playback?.isPlaying &&
              playback?.mode === 'surah' &&
              playback?.surahNomor === surah.nomor;

            return (
              <div
                key={surah.nomor}
                className="rounded-2xl border bg-white p-3 sm:p-3.5 flex items-center justify-between gap-2.5 hover:border-[#046D38] transition-all min-w-0 group"
                style={{
                  borderColor: isPlayingThis ? 'var(--color-primary)' : 'var(--color-border)',
                  backgroundColor: isPlayingThis ? '#F6FBF8' : '#FFFFFF',
                }}
              >
                <button
                  type="button"
                  onClick={() => onSelectSurah(surah.nomor, 1)}
                  className="flex items-center gap-3 text-left min-w-0 flex-1 cursor-pointer"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-mono-num text-xs font-bold shrink-0 border group-hover:bg-[#046D38] group-hover:text-white group-hover:border-[#046D38] transition-colors"
                    style={{
                      backgroundColor: isPlayingThis ? 'var(--color-primary)' : '#F7F8F5',
                      borderColor: isPlayingThis ? 'var(--color-primary)' : 'var(--color-border)',
                      color: isPlayingThis ? '#FFFFFF' : 'var(--color-primary)',
                    }}
                  >
                    {surah.nomor}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <h2
                        className="font-semibold text-sm sm:text-base truncate group-hover:text-[#046D38] transition-colors"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {surah.namaLatin}
                      </h2>
                      <span
                        className="font-arabic-amiri text-xl sm:text-2xl font-bold shrink-0"
                        style={{ color: 'var(--color-header)' }}
                      >
                        {surah.nama}
                      </span>
                    </div>
                    <div
                      className="flex items-center gap-1.5 text-[11px] sm:text-xs truncate mt-0.5"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <span className="truncate">{surah.arti}</span>
                      <span aria-hidden="true">·</span>
                      <span className="shrink-0">{surah.tempatTurun}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums shrink-0">{surah.jumlahAyat} Ayat</span>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onPlayFullSurah(surah)}
                  className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                    isPlayingThis
                      ? 'bg-[#046D38] text-[#FBC647]'
                      : 'bg-[#F7F8F5] text-[#046D38] hover:bg-[#046D38] hover:text-white'
                  }`}
                  aria-label={
                    isPlayingThis
                      ? `Jeda murottal Surat ${surah.namaLatin}`
                      : `Putar murottal Surat ${surah.namaLatin}`
                  }
                  title={
                    isPlayingThis
                      ? `Jeda murottal Surat ${surah.namaLatin}`
                      : `Putar murottal Surat ${surah.namaLatin}`
                  }
                >
                  {isPlayingThis ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
