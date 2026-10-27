import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookHeart,
  Check,
  Copy,
  Filter,
  Heart,
  RefreshCw,
  Search,
  Share2,
  Tag,
  X,
} from 'lucide-react';
import { equranDoaApi } from '../services/islamicApi';
import { storageService } from '../services/storageService';
import { DoaItem } from '../types/islamic';
import { ArabicFontFamily } from '../types/quran';

interface DoaViewProps {
  arabicFontFamily: ArabicFontFamily;
  arabicFontSize: number;
  onShowToast: (msg: string) => void;
}

const FONT_CLASS_MAP: Record<ArabicFontFamily, string> = {
  amiri: 'font-arabic-amiri',
  scheherazade: 'font-arabic-scheherazade',
  naskh: 'font-arabic-naskh',
};

export const DoaView: React.FC<DoaViewProps> = ({
  arabicFontFamily,
  arabicFontSize,
  onShowToast,
}) => {
  const [allDoas, setAllDoas] = useState<DoaItem[]>([]);
  const [filteredByApiDoas, setFilteredByApiDoas] = useState<DoaItem[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFilteringApi, setIsFilteringApi] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGrup, setSelectedGrup] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);

  const [favoriteIds, setFavoriteIds] = useState<number[]>(() =>
    storageService.getFavoriteDoaIds()
  );
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [activeDetailDoa, setActiveDetailDoa] = useState<DoaItem | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  const loadFullDoaCatalog = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await equranDoaApi.getDoaList(undefined, forceRefresh);
      setAllDoas(list);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat kumpulan doa dan dzikir dari eQuran.id.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFullDoaCatalog(false);
  }, [loadFullDoaCatalog]);

  // Query API with ?grup=...&tag=... when grup or tag filter is selected, per API documentation
  useEffect(() => {
    if (!selectedGrup && !selectedTag) {
      setFilteredByApiDoas(null);
      return;
    }

    let cancelled = false;
    const fetchFiltered = async () => {
      setIsFilteringApi(true);
      try {
        const res = await equranDoaApi.getDoaList({
          grup: selectedGrup || undefined,
          tag: selectedTag || undefined,
        });
        if (!cancelled) {
          setFilteredByApiDoas(res);
        }
      } catch {
        // Fallback to client-side filter over allDoas if offline
        if (!cancelled) {
          setFilteredByApiDoas(null);
        }
      } finally {
        if (!cancelled) setIsFilteringApi(false);
      }
    };

    fetchFiltered();
    return () => {
      cancelled = true;
    };
  }, [selectedGrup, selectedTag]);

  // Extract unique Grup and Tag lists from the authentic catalog
  const availableGrups = useMemo(() => {
    const set = new Set<string>();
    for (const d of allDoas) {
      if (d.grup && d.grup.trim()) set.add(d.grup.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [allDoas]);

  const availableTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of allDoas) {
      if (Array.isArray(d.tag)) {
        for (const t of d.tag) {
          const clean = t.trim();
          if (clean) counts.set(clean, (counts.get(clean) || 0) + 1);
        }
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }, [allDoas]);

  const displayedDoas = useMemo(() => {
    const baseList = filteredByApiDoas ?? allDoas;
    const q = searchQuery.trim().toLowerCase();

    return baseList.filter((doa) => {
      if (onlyFavorites && !favoriteIds.includes(doa.id)) {
        return false;
      }
      if (selectedGrup && doa.grup !== selectedGrup) {
        return false;
      }
      if (selectedTag && (!Array.isArray(doa.tag) || !doa.tag.includes(selectedTag))) {
        return false;
      }
      if (!q) return true;

      return (
        doa.nama.toLowerCase().includes(q) ||
        doa.grup.toLowerCase().includes(q) ||
        doa.idn.toLowerCase().includes(q) ||
        doa.tr.toLowerCase().includes(q) ||
        doa.tentang.toLowerCase().includes(q) ||
        doa.ar.includes(searchQuery.trim()) ||
        (Array.isArray(doa.tag) && doa.tag.some((t) => t.toLowerCase().includes(q)))
      );
    });
  }, [
    allDoas,
    filteredByApiDoas,
    searchQuery,
    selectedGrup,
    selectedTag,
    onlyFavorites,
    favoriteIds,
  ]);

  const handleToggleFavorite = (id: number) => {
    const { favoriteIds: nextIds, added } = storageService.toggleFavoriteDoa(id);
    setFavoriteIds(nextIds);
    onShowToast(
      added ? 'Doa disimpan ke daftar Favorit.' : 'Doa dihapus dari daftar Favorit.'
    );
  };

  // Fetch single detail via GET /api/doa/{id} when user opens detail modal
  const handleOpenDetailModal = async (doa: DoaItem) => {
    setActiveDetailDoa(doa);
    setIsLoadingDetail(true);
    try {
      const freshDetail = await equranDoaApi.getDoaDetail(doa.id);
      setActiveDetailDoa(freshDetail);
    } catch {
      // Keep existing doa object if offline
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const formatDoaShareText = (doa: DoaItem): string => {
    const parts = [
      `${doa.nama} (${doa.grup})`,
      '',
      doa.ar,
      '',
      doa.tr,
      '',
      `Artinya: "${doa.idn}"`,
    ];
    if (doa.tentang) {
      parts.push('', `Sumber/Keterangan:\n${doa.tentang}`);
    }
    parts.push('', '— Dibagikan melalui Ziezan Quran (https://quran.ziezan.id)');
    return parts.join('\n');
  };

  const handleCopyDoa = async (doa: DoaItem) => {
    try {
      await navigator.clipboard.writeText(formatDoaShareText(doa));
      setCopiedId(doa.id);
      onShowToast(`Teks "${doa.nama}" berhasil disalin.`);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      onShowToast('Gagal menyalin teks doa.');
    }
  };

  const handleShareDoa = async (doa: DoaItem) => {
    const shareText = formatDoaShareText(doa);
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${doa.nama} — Ziezan Quran`,
          text: shareText,
          url: 'https://quran.ziezan.id/doa/',
        });
        return;
      } catch {
        // Fallback to copy if share sheet dismissed or fails
      }
    }
    await handleCopyDoa(doa);
  };

  const arabicFontClass = FONT_CLASS_MAP[arabicFontFamily] || 'font-arabic-amiri';

  return (
    <div className="container-app py-4 sm:py-6">
      {/* Header Editorial */}
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-[#E3E9E3] pb-5 md:flex-row md:items-end">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-[#24352B] sm:text-3xl">
            Doa &amp; Dzikir
          </h1>
          <p className="mt-1 text-sm text-[#68756C]">
            Kumpulan doa harian, dzikir, dan wirid sunnah.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyFavorites((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
              onlyFavorites
                ? 'border-[#035328] bg-[#035328] text-white'
                : 'border-[#E3E9E3] bg-white text-[#24352B] hover:border-[#046D38]'
            }`}
          >
            <Heart
              className={`h-3.5 w-3.5 ${
                onlyFavorites ? 'fill-[#FBC647] text-[#FBC647]' : 'text-[#046D38]'
              }`}
            />
            <span>Favorit ({favoriteIds.length})</span>
          </button>

          <button
            type="button"
            onClick={() => loadFullDoaCatalog(true)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E3E9E3] bg-white px-3.5 py-2 text-xs font-semibold text-[#24352B] hover:border-[#046D38] hover:text-[#035328] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Search & Category / Tag Filter Controls */}
      <section className="mb-6 rounded-2xl border border-[#E3E9E3] bg-white p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-12">
          {/* Search Input */}
          <div className="relative md:col-span-7">
            <label htmlFor="doa-search-input" className="sr-only">
              Cari Doa atau Dzikir
            </label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#68756C]" />
            <input
              id="doa-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama doa, arti, kata kunci, atau riwayat hadis..."
              className="w-full rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] py-2.5 pl-10 pr-9 text-sm text-[#24352B] placeholder:text-[#68756C] focus:border-[#046D38] focus:bg-white focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Hapus pencarian"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#68756C] hover:text-[#24352B]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Grup (Kategori) Select */}
          <div className="md:col-span-5">
            <label htmlFor="doa-grup-select" className="sr-only">
              Filter Kategori Grup Doa
            </label>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#046D38]" />
              <select
                id="doa-grup-select"
                value={selectedGrup}
                onChange={(e) => setSelectedGrup(e.target.value)}
                className="w-full rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] py-2.5 pl-10 pr-4 text-sm font-medium text-[#24352B] focus:border-[#046D38] focus:bg-white focus:outline-none"
              >
                <option value="">Semua Kategori Doa ({allDoas.length})</option>
                {availableGrups.map((grup) => (
                  <option key={grup} value={grup}>
                    {grup}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Popular Tags Filter Row */}
        {availableTags.length > 0 && (
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#68756C]">
              <Tag className="h-3.5 w-3.5 text-[#046D38]" />
              <span>Tag:</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedTag('')}
              className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                selectedTag === ''
                  ? 'border-[#035328] bg-[#035328] text-white'
                  : 'border-[#E3E9E3] bg-[#F7F8F5] text-[#68756C] hover:border-[#046D38]'
              }`}
            >
              Semua Tag
            </button>
            {availableTags.slice(0, 18).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setSelectedTag((prev) => (prev === tag ? '' : tag))
                }
                className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                  selectedTag === tag
                    ? 'border-[#035328] bg-[#035328] text-white'
                    : 'border-[#E3E9E3] bg-[#F7F8F5] text-[#24352B] hover:border-[#046D38]'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Active Filter Summary */}
        {(selectedGrup || selectedTag || onlyFavorites || searchQuery) && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E3E9E3] pt-3 text-xs text-[#68756C]">
            <span>
              Menampilkan <strong className="text-[#24352B]">{displayedDoas.length}</strong> doa
              {isFilteringApi ? ' (Memuat filter API...)' : ''}
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedGrup('');
                setSelectedTag('');
                setOnlyFavorites(false);
              }}
              className="font-semibold text-[#035328] hover:underline"
            >
              Reset Semua Filter
            </button>
          </div>
        )}
      </section>

      {/* Error State */}
      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-white p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <h3 className="text-sm font-bold text-[#24352B]">
                Gagal Memuat Data Doa & Dzikir
              </h3>
              <p className="mt-1 text-xs text-[#68756C]">{error}</p>
              <button
                type="button"
                onClick={() => loadFullDoaCatalog(true)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#035328] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#046D38]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Coba Lagi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && allDoas.length === 0 && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-2xl border border-[#E3E9E3] bg-white p-6"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && displayedDoas.length === 0 && (
        <div className="rounded-2xl border border-[#E3E9E3] bg-white p-10 text-center">
          <BookHeart className="mx-auto h-10 w-10 text-[#68756C]" />
          <h3 className="mt-3 font-serif text-lg font-bold text-[#24352B]">
            Tidak Ada Doa yang Ditemukan
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-[#68756C]">
            {onlyFavorites
              ? 'Anda belum menambahkan doa ke daftar favorit, atau filter pencarian tidak cocok.'
              : 'Coba gunakan kata kunci pencarian lain atau pilih kategori grup doa yang berbeda.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedGrup('');
              setSelectedTag('');
              setOnlyFavorites(false);
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#035328] px-4 py-2 text-xs font-bold text-white hover:bg-[#046D38]"
          >
            Tampilkan Semua Doa
          </button>
        </div>
      )}

      {/* Doa Cards List */}
      <div className="space-y-4">
        {displayedDoas.map((doa) => {
          const isFav = favoriteIds.includes(doa.id);
          const isCopied = copiedId === doa.id;

          return (
            <article
              key={doa.id}
              className="rounded-2xl border border-[#E3E9E3] bg-white p-5 transition-colors hover:border-[#046D38]/50 sm:p-6"
            >
              {/* Card Top Bar */}
              <div className="flex flex-wrap items-start justify-between gap-2.5 border-b border-[#E3E9E3] pb-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 min-[360px]:gap-2">
                    <span className="inline-flex h-5.5 sm:h-6 min-w-[26px] items-center justify-center rounded-lg bg-[#035328] px-1.5 sm:px-2 font-mono text-[11px] sm:text-xs font-bold text-[#FBC647]">
                      #{doa.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedGrup(doa.grup)}
                      className="rounded-lg border border-[#E3E9E3] bg-[#F7F8F5] px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-[#035328] hover:border-[#046D38] truncate max-w-[170px]"
                    >
                      {doa.grup}
                    </button>
                  </div>
                  <h2 className="mt-1.5 font-serif text-base min-[360px]:text-lg sm:text-xl font-bold text-[#24352B]">
                    {doa.nama}
                  </h2>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(doa.id)}
                    aria-label={isFav ? 'Hapus dari favorit' : 'Simpan ke favorit'}
                    title={isFav ? 'Hapus dari favorit' : 'Simpan ke favorit'}
                    className={`inline-flex items-center gap-1 rounded-xl border px-2 min-[360px]:px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer ${
                      isFav
                        ? 'border-[#035328] bg-[#035328] text-white'
                        : 'border-[#E3E9E3] bg-[#F7F8F5] text-[#24352B] hover:border-[#046D38]'
                    }`}
                  >
                    <Heart
                      className={`h-3.5 w-3.5 ${
                        isFav ? 'fill-[#FBC647] text-[#FBC647]' : 'text-[#68756C]'
                      }`}
                    />
                    <span className="hidden sm:inline">Favorit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyDoa(doa)}
                    aria-label="Salin teks doa"
                    className="inline-flex items-center gap-1 rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] px-2 min-[360px]:px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-[#24352B] hover:border-[#046D38] cursor-pointer"
                  >
                    {isCopied ? (
                      <Check className="h-3.5 w-3.5 text-[#046D38]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-[#68756C]" />
                    )}
                    <span className="hidden sm:inline">
                      {isCopied ? 'Tersalin' : 'Salin'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShareDoa(doa)}
                    aria-label="Bagikan doa"
                    className="inline-flex items-center gap-1 rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] px-2 min-[360px]:px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-[#24352B] hover:border-[#046D38] cursor-pointer"
                  >
                    <Share2 className="h-3.5 w-3.5 text-[#68756C]" />
                    <span className="hidden sm:inline">Bagikan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenDetailModal(doa)}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#035328] bg-white px-2.5 min-[360px]:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold text-[#035328] hover:bg-[#035328] hover:text-white cursor-pointer"
                  >
                    <span>Detail</span>
                  </button>
                </div>
              </div>

              {/* Authentic Arabic Text */}
              {doa.ar && (
                <div
                  dir="rtl"
                  lang="ar"
                  style={{ fontSize: `${Math.max(24, arabicFontSize)}px` }}
                  className={`mt-5 text-right leading-[2.15] text-[#24352B] ${arabicFontClass}`}
                >
                  {doa.ar}
                </div>
              )}

              {/* Authentic Latin Transliteration */}
              {doa.tr && (
                <p className="mt-4 text-sm italic leading-relaxed text-[#046D38]">
                  {doa.tr}
                </p>
              )}

              {/* Authentic Indonesian Translation */}
              {doa.idn && (
                <div className="mt-3 rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] p-3.5 text-sm leading-relaxed text-[#24352B]">
                  <span className="font-semibold text-[#035328]">Artinya: </span>
                  {doa.idn}
                </div>
              )}

              {/* Reference / Hadis & Tags Footer */}
              <div className="mt-4 flex flex-col justify-between gap-3 border-t border-[#E3E9E3] pt-3.5 sm:flex-row sm:items-center">
                {doa.tentang ? (
                  <p className="line-clamp-2 whitespace-pre-line text-xs text-[#68756C]">
                    <strong className="font-semibold text-[#24352B]">Riwayat/Sumber: </strong>
                    {doa.tentang}
                  </p>
                ) : (
                  <span />
                )}

                {Array.isArray(doa.tag) && doa.tag.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {doa.tag.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTag(t)}
                        className="rounded-md border border-[#E3E9E3] bg-[#F7F8F5] px-2 py-0.5 text-[11px] font-medium text-[#68756C] hover:border-[#046D38] hover:text-[#035328]"
                      >
                        #{t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Single Doa Detail Modal (GET /api/doa/{id}) */}
      {activeDetailDoa && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="doa-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#E3E9E3] bg-white p-6">
            <div className="flex items-start justify-between gap-3 border-b border-[#E3E9E3] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-[#035328] px-2 py-0.5 font-mono text-xs font-bold text-[#FBC647]">
                    Doa #{activeDetailDoa.id}
                  </span>
                  <span className="text-xs font-semibold text-[#046D38]">
                    {activeDetailDoa.grup}
                  </span>
                  {isLoadingDetail && (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#68756C]" />
                  )}
                </div>
                <h3
                  id="doa-modal-title"
                  className="mt-1.5 font-serif text-xl font-bold text-[#24352B]"
                >
                  {activeDetailDoa.nama}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setActiveDetailDoa(null)}
                aria-label="Tutup detail doa"
                className="rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] p-2 text-[#24352B] hover:border-[#035328]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {activeDetailDoa.ar && (
              <div
                dir="rtl"
                lang="ar"
                style={{ fontSize: `${Math.max(26, arabicFontSize + 2)}px` }}
                className={`mt-5 text-right leading-[2.2] text-[#24352B] ${arabicFontClass}`}
              >
                {activeDetailDoa.ar}
              </div>
            )}

            {activeDetailDoa.tr && (
              <div className="mt-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#68756C]">
                  Transliterasi Latin
                </div>
                <p className="mt-1 text-sm italic leading-relaxed text-[#046D38]">
                  {activeDetailDoa.tr}
                </p>
              </div>
            )}

            {activeDetailDoa.idn && (
              <div className="mt-4 rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#035328]">
                  Terjemahan
                </div>
                <p className="mt-1 text-sm leading-relaxed text-[#24352B]">
                  {activeDetailDoa.idn}
                </p>
              </div>
            )}

            {activeDetailDoa.tentang && (
              <div className="mt-4 rounded-xl border border-[#E3E9E3] bg-white p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#68756C]">
                  Referensi &amp; Riwayat
                </div>
                <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-[#24352B]">
                  {activeDetailDoa.tentang}
                </p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-[#E3E9E3] pt-4">
              <button
                type="button"
                onClick={() => handleCopyDoa(activeDetailDoa)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] px-4 py-2 text-xs font-bold text-[#24352B] hover:border-[#046D38] cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Salin</span>
              </button>
              <button
                type="button"
                onClick={() => handleShareDoa(activeDetailDoa)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#035328] px-4 py-2 text-xs font-bold text-white hover:bg-[#046D38] cursor-pointer"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Bagikan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
