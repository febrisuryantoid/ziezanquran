import React, { useEffect, useRef } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, RefreshCw, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Ayat, TafsirDetail } from '../types/quran';

interface TafsirModalProps {
  isOpen: boolean;
  surahNomor: number;
  surahNamaLatin: string;
  surahNamaArab: string;
  ayatNomor: number;
  ayatData?: Ayat;
  tafsirDetail: TafsirDetail | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onChangeAyat: (newAyatNomor: number) => void;
  onClose: () => void;
}

export const TafsirModal: React.FC<TafsirModalProps> = ({
  isOpen,
  surahNomor,
  surahNamaLatin,
  surahNamaArab,
  ayatNomor,
  ayatData,
  tafsirDetail,
  isLoading,
  error,
  onRetry,
  onChangeAyat,
  onClose,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const tafsirEntry = tafsirDetail?.tafsir.find((t) => t.ayat === ayatNomor);
  const totalAyat = tafsirDetail?.jumlahAyat || 0;
  const hasPrev = ayatNomor > 1;
  const hasNext = totalAyat > 0 && ayatNomor < totalAyat;

  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [ayatNomor, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tafsir-modal-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          />

          {/* Bottom-to-Top Pop-up Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-3xl h-[90dvh] sm:h-[85dvh] bg-white border-t border-x shadow-2xl flex flex-col overflow-hidden"
            style={{
              borderColor: 'var(--color-border)',
              borderTopLeftRadius: 'var(--radius-card)',
              borderTopRightRadius: 'var(--radius-card)',
            }}
          >
            {/* Bottom-Sheet Handle */}
            <div
              className="pt-2.5 pb-1 flex justify-center shrink-0"
              style={{ backgroundColor: 'var(--color-header)' }}
            >
              <span className="w-10 h-1 rounded-full bg-white/30" />
            </div>

            {/* Modal Header */}
            <div
              className="px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-3 border-b shrink-0 min-w-0"
              style={{
                backgroundColor: 'var(--color-header)',
                borderColor: 'rgba(255,255,255,0.12)',
              }}
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-gold)' }}
                >
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2
                    id="tafsir-modal-title"
                    className="font-display text-base sm:text-xl font-bold text-white truncate"
                  >
                    Tafsir QS. {surahNamaLatin} ({surahNomor}:{ayatNomor})
                  </h2>
                  <p className="text-[11px] sm:text-xs text-white/75 truncate">
                    Tafsir Al-Qur&apos;an Kemenag RI
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="font-arabic-amiri text-xl text-[#FBC647] hidden sm:inline">
                  {surahNamaArab}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-w-[44px] min-h-[44px] -mr-1 rounded-xl flex items-center justify-center text-white/85 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Tutup Tafsir"
                  title="Tutup Tafsir"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div
              ref={scrollContainerRef}
              className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 min-w-0"
            >
              {/* Ayat Reference Box */}
              {ayatData && (
                <div
                  className="p-4 sm:p-5 border bg-[#F7F8F5] space-y-3"
                  style={{
                    borderColor: 'var(--color-border)',
                    borderRadius: 'var(--radius-card)',
                  }}
                >
                  <p
                    className="font-arabic-amiri text-2xl sm:text-3xl text-right leading-loose"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {ayatData.teksArab}
                  </p>
                  <p
                    className="text-xs sm:text-sm italic leading-relaxed"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {ayatData.teksLatin}
                  </p>
                  <p
                    className="text-xs sm:text-base leading-relaxed pt-2 border-t"
                    style={{
                      color: 'var(--color-text-primary)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    &ldquo;{ayatData.teksIndonesia}&rdquo;
                  </p>
                </div>
              )}

              {/* Tafsir Body */}
              {isLoading ? (
                <div className="py-12 text-center space-y-3">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto"
                    style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
                  />
                  <p className="text-xs sm:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Memuat tafsir ayat ke-{ayatNomor}...
                  </p>
                </div>
              ) : error ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-xs sm:text-sm text-red-700 font-medium">{error}</p>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-white inline-flex items-center gap-2 cursor-pointer"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Coba Lagi</span>
                  </button>
                </div>
              ) : tafsirEntry ? (
                <div className="space-y-3.5">
                  <div
                    className="flex items-center justify-between border-b pb-2"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      Uraian Tafsir Ayat {ayatNomor}
                    </span>
                    <span
                      className="text-xs font-mono-num"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      QS. {surahNomor}:{ayatNomor}
                    </span>
                  </div>
                  <div
                    className="space-y-4 text-fluid-base leading-relaxed whitespace-pre-line"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {tafsirEntry.teks}
                  </div>
                </div>
              ) : (
                <p className="text-sm py-6 text-center" style={{ color: 'var(--color-text-secondary)' }}>
                  Tafsir untuk ayat ini tidak ditemukan.
                </p>
              )}
            </div>

            {/* Modal Footer: Prev / Next Ayat Navigation */}
            <div
              className="px-4 sm:px-6 py-3 border-t bg-[#F7F8F5] flex items-center justify-between gap-2 shrink-0"
              style={{
                borderColor: 'var(--color-border)',
                paddingBottom: 'calc(0.75rem + var(--safe-bottom))',
              }}
            >
              <button
                type="button"
                disabled={!hasPrev}
                onClick={() => hasPrev && onChangeAyat(ayatNomor - 1)}
                aria-label={hasPrev ? `Tafsir Ayat sebelumnya (${ayatNomor - 1})` : 'Ayat pertama'}
                className="min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl border bg-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40 hover:border-[#046D38] transition-colors cursor-pointer"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <ChevronLeft className="w-4 h-4 shrink-0" />
                <span>Ayat {hasPrev ? ayatNomor - 1 : ''}</span>
              </button>

              <span className="text-xs font-mono-num font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                Ayat {ayatNomor} {totalAyat ? `/ ${totalAyat}` : ''}
              </span>

              <button
                type="button"
                disabled={!hasNext}
                onClick={() => hasNext && onChangeAyat(ayatNomor + 1)}
                aria-label={hasNext ? `Tafsir Ayat selanjutnya (${ayatNomor + 1})` : 'Ayat terakhir'}
                className="min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl border bg-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40 hover:border-[#046D38] transition-colors cursor-pointer"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <span>Ayat {hasNext ? ayatNomor + 1 : ''}</span>
                <ChevronRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
