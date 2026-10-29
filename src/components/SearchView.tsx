import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Mic,
  MicOff,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import {
  ARABIC_FONT_OPTIONS,
  QUICK_VERSES,
  SUGGESTED_SEARCH_TOPICS,
} from '../config/brand';
import { useUniversalVoiceSearch } from '../hooks/useUniversalVoiceSearch';
import { quranApi } from '../services/quranApi';
import {
  ReadingPreferences,
  SearchMatch,
  SurahSummary,
} from '../types/quran';

interface SearchViewProps {
  surahs: SurahSummary[];
  initialQuery: string;
  preferences: ReadingPreferences;
  cachedSurahCount: number;
  onUpdateCachedCount: (count: number) => void;
  onOpenSurah: (surahNomor: number, ayatNomor?: number) => void;
  onOpenMicrophone?: () => void;
}

type ResultTab = 'ALL' | 'SURAH' | 'AYAT';

function highlightText(text: string, query: string): React.ReactNode {
  const cleanQ = query.trim();
  if (!cleanQ || cleanQ.length < 2) return text;

  const escaped = cleanQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  if (parts.length <= 1) return text;

  return parts.map((part, idx) =>
    part.toLowerCase() === cleanQ.toLowerCase() ? (
      <mark
        key={idx}
        className="rounded px-1 py-0.5 font-semibold"
        style={{ backgroundColor: 'var(--color-gold)', color: '#1D2B22' }}
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export const SearchView: React.FC<SearchViewProps> = ({
  surahs,
  initialQuery,
  preferences,
  cachedSurahCount,
  onUpdateCachedCount,
  onOpenSurah,
  onOpenMicrophone,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedSurahFilter, setSelectedSurahFilter] = useState<number | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<ResultTab>('ALL');
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [indexedCount, setIndexedCount] = useState(cachedSurahCount);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { isListening, toggleVoiceSearch } = useUniversalVoiceSearch({
    surahs,
    onTranscriptChange: (text) => setQuery(text),
    onFinalIntent: (intent) => {
      if (intent.cleanedQuery) {
        setQuery(intent.cleanedQuery);
      }
    },
    onOpenFallbackModal: () => {
      onOpenMicrophone?.();
    },
  });

  const arabicFontClass = useMemo(() => {
    const found = ARABIC_FONT_OPTIONS.find((f) => f.id === preferences.arabicFontFamily);
    return found ? found.className : 'font-arabic-amiri';
  }, [preferences.arabicFontFamily]);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    setIndexedCount(cachedSurahCount);
  }, [cachedSurahCount]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      abortControllerRef.current?.abort();
      setResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsSearching(true);
      try {
        const res = await quranApi.searchDataset(trimmed, surahs, {
          filterSurahNomor: selectedSurahFilter,
          signal: controller.signal,
          onPartialResults: (partial, count) => {
            if (!controller.signal.aborted) {
              setResults(partial);
              setIndexedCount(count);
              onUpdateCachedCount(count);
            }
          },
        });
        if (!controller.signal.aborted) {
          setResults(res.results);
          setIndexedCount(res.indexedCount);
          onUpdateCachedCount(res.indexedCount);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 220);

    return () => {
      clearTimeout(timer);
    };
  }, [query, selectedSurahFilter, surahs, onUpdateCachedCount]);

  const surahMatches = useMemo(
    () => results.filter((r) => r.type === 'surah'),
    [results]
  );
  const ayatMatches = useMemo(
    () => results.filter((r) => r.type === 'ayat'),
    [results]
  );

  const displayedResults = useMemo(() => {
    if (activeResultTab === 'SURAH') return surahMatches;
    if (activeResultTab === 'AYAT') return ayatMatches;
    return results;
  }, [results, surahMatches, ayatMatches, activeResultTab]);

  return (
    <div className="container-app py-3.5 sm:py-6 space-y-3.5 sm:space-y-5">
      {/* Concise Search Header Card */}
      <div className="card-surface space-y-3">
        <div className="min-w-0">
          <h1
            className="font-display text-fluid-xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Pencarian Ayat &amp; Makna
          </h1>
          <p className="text-fluid-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            Telusuri nama surat, nomor ayat (<code className="font-mono-num">2:255</code>), atau kata kunci terjemahan di 114 surat.
          </p>
        </div>

        {/* Search Input & Surah Scope Filter */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          <div className="md:col-span-8 relative min-w-0">
            <Search
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ketik atau ucapkan kata (sabar, syukur), surat, atau 2:255..."
              aria-label="Kata kunci pencarian Al-Qur'an"
              className="w-full min-h-[42px] pl-10 pr-20 py-2 rounded-full border text-xs sm:text-sm bg-[#F7F8F5] focus:bg-white focus:outline-none transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-stone-200/60 cursor-pointer"
                  aria-label="Hapus kata kunci"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => toggleVoiceSearch('id-ID')}
                aria-label={isListening ? 'Hentikan perekaman suara' : 'Pencarian dengan suara mikrofon'}
                title="Cari Ayat dengan Suara (Microphone)"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  isListening
                    ? 'bg-[#E53935] text-white animate-pulse'
                    : 'bg-[#046D38] hover:bg-[#035328] text-white'
                }`}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="md:col-span-4 min-w-0">
            <select
              value={selectedSurahFilter || ''}
              onChange={(e) =>
                setSelectedSurahFilter(e.target.value ? Number(e.target.value) : null)
              }
              aria-label="Batasi pencarian pada surat tertentu"
              className="w-full min-h-[42px] px-3.5 py-2 rounded-full border text-xs sm:text-sm font-medium bg-[#F7F8F5] truncate focus:outline-none cursor-pointer"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              <option value="">Seluruh Al-Qur&apos;an (114 Surat)</option>
              {surahs.map((s) => (
                <option key={s.nomor} value={s.nomor}>
                  QS. {s.nomor}. {s.namaLatin} ({s.jumlahAyat})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Suggested Meaning Topics */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="text-fluid-xs flex items-center gap-1 mr-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FBC647] shrink-0" />
            <span>Topik:</span>
          </span>
          {SUGGESTED_SEARCH_TOPICS.map((topic) => (
            <button
              key={topic.query}
              type="button"
              onClick={() => setQuery(topic.query)}
              className={`min-h-[30px] px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                query.toLowerCase() === topic.query.toLowerCase()
                  ? 'bg-[#046D38] text-white border-[#046D38]'
                  : 'bg-[#F7F8F5] hover:bg-[#F0F3EE] text-[#24352B] border-[#E3E9E3]'
              }`}
            >
              {topic.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Area */}
      {query.trim() ? (
        <div className="space-y-3.5">
          {/* Result Filter Tabs & Status */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div
              className="flex items-center gap-1 p-1 rounded-full bg-white border w-full sm:w-auto min-w-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <button
                type="button"
                onClick={() => setActiveResultTab('ALL')}
                className={`flex-1 sm:flex-initial min-h-[34px] px-3 py-1 rounded-full text-xs font-semibold transition-colors truncate cursor-pointer ${
                  activeResultTab === 'ALL'
                    ? 'bg-[#046D38] text-white'
                    : 'text-[#68756C] hover:text-[#24352B]'
                }`}
              >
                Semua ({results.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveResultTab('SURAH')}
                className={`flex-1 sm:flex-initial min-h-[34px] px-3 py-1 rounded-full text-xs font-semibold transition-colors truncate cursor-pointer ${
                  activeResultTab === 'SURAH'
                    ? 'bg-[#046D38] text-white'
                    : 'text-[#68756C] hover:text-[#24352B]'
                }`}
              >
                Surat ({surahMatches.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveResultTab('AYAT')}
                className={`flex-1 sm:flex-initial min-h-[34px] px-3 py-1 rounded-full text-xs font-semibold transition-colors truncate cursor-pointer ${
                  activeResultTab === 'AYAT'
                    ? 'bg-[#046D38] text-white'
                    : 'text-[#68756C] hover:text-[#24352B]'
                }`}
              >
                Ayat ({ayatMatches.length})
              </button>
            </div>

            {isSearching && (
              <div
                className="flex items-center gap-2 text-xs font-medium"
                style={{ color: 'var(--color-primary)' }}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin shrink-0"
                  style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
                />
                <span>Menelusuri ({indexedCount}/114)...</span>
              </div>
            )}
          </div>

          {displayedResults.length === 0 && !isSearching ? (
            <div className="card-surface !p-8 text-center space-y-1.5">
              <p className="text-sm sm:text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Tidak ditemukan hasil untuk &ldquo;{query}&rdquo;
              </p>
              <p className="text-fluid-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Gunakan kata dasar (misal: &ldquo;sabar&rdquo;, &ldquo;ampun&rdquo;) atau nomor surat:ayat seperti <code className="font-mono-num">2:255</code>.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5 items-start">
              {displayedResults.map((match, idx) =>
                match.type === 'surah' ? (
                  <div
                    key={`surah-${match.surahNomor}-${idx}`}
                    className="card-surface !p-3.5 sm:!p-4 flex items-center justify-between gap-3 hover:border-[#046D38] transition-colors min-w-0 group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-mono-num text-xs font-bold shrink-0 border border-[#E3E9E3] bg-[#F7F8F5] text-[#046D38] group-hover:bg-[#046D38] group-hover:text-white group-hover:border-[#046D38] transition-colors"
                      >
                        {match.surahNomor}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3
                            className="font-semibold text-sm sm:text-base truncate"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            Surat {highlightText(match.surahNamaLatin, query)}
                          </h3>
                          <span
                            className="font-arabic-amiri text-lg sm:text-xl font-bold shrink-0"
                            style={{ color: 'var(--color-header)' }}
                          >
                            {match.surahNamaArab}
                          </span>
                        </div>
                        <p
                          className="text-xs mt-0.5 truncate"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {highlightText(match.surahArti, query)} · {match.jumlahAyat} Ayat
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenSurah(match.surahNomor, 1)}
                      aria-label={`Buka Surat ${match.surahNamaLatin}`}
                      title={`Buka Surat ${match.surahNamaLatin}`}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-semibold text-white flex items-center gap-1.5 shrink-0 cursor-pointer"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      <span>Buka</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>
                ) : (
                  <article
                    key={`ayat-${match.surahNomor}-${match.ayatNomor}-${idx}`}
                    className="card-surface space-y-3 hover:border-[#046D38] transition-colors"
                  >
                    <div
                      className="flex items-center justify-between gap-2 pb-2.5 border-b min-w-0"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <span
                          className="text-xs font-mono-num font-bold px-2.5 py-1 rounded-lg bg-[#F7F8F5] border whitespace-nowrap shrink-0"
                          style={{
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-primary)',
                          }}
                        >
                          QS. {match.surahNamaLatin} ({match.surahNomor}:{match.ayatNomor})
                        </span>
                        <span
                          className="text-xs truncate hidden sm:inline"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {match.surahArti}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenSurah(match.surahNomor, match.ayatNomor)}
                        aria-label={`Buka QS. ${match.surahNamaLatin} Ayat ${match.ayatNomor}`}
                        className="min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold text-white flex items-center gap-1.5 shrink-0 cursor-pointer"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                      >
                        <BookOpen className="w-3.5 h-3.5 text-[#FBC647] shrink-0" />
                        <span>Buka Ayat</span>
                      </button>
                    </div>

                    {match.teksArab && (
                      <p
                        className={`${arabicFontClass} text-right text-2xl sm:text-3xl`}
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {match.teksArab}
                      </p>
                    )}

                    {match.teksLatin && (
                      <p
                        className="text-fluid-xs italic break-words"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        {highlightText(match.teksLatin, query)}
                      </p>
                    )}

                    {match.teksIndonesia && (
                      <p
                        className="text-fluid-base leading-relaxed break-words"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {highlightText(match.teksIndonesia, query)}
                      </p>
                    )}
                  </article>
                )
              )}
            </div>
          )}
        </div>
      ) : (
        /* Interactive Quick Verses Grid */
        <div className="space-y-3">
          <h2
            className="font-display text-fluid-lg font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Ayat &amp; Doa Pilihan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
            {QUICK_VERSES.map((item) => (
              <button
                key={`${item.surahNomor}-${item.ayatNomor}`}
                type="button"
                onClick={() => onOpenSurah(item.surahNomor, item.ayatNomor)}
                className="p-3.5 sm:p-4 rounded-2xl border bg-white hover:border-[#046D38] transition-all flex items-center justify-between gap-3 text-left group cursor-pointer min-w-0"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span
                    className="w-9 h-9 rounded-xl bg-[#F7F8F5] flex items-center justify-center text-xs font-mono-num font-bold shrink-0"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {item.surahNomor}:{item.ayatNomor}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="font-semibold text-xs sm:text-sm group-hover:text-[#046D38] transition-colors truncate"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {item.title}
                    </p>
                    <p
                      className="text-[11px] mt-0.5 truncate"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {item.subtitle}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 shrink-0 text-[#046D38]" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
