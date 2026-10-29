import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Info,
  LayoutGrid,
  Mail,
  MapPin,
  Mic,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  APP_CONFIG,
  APP_INFO,
  BRAND_LOGO_PATH,
  PARTNER_LOGOS,
  SITE_URL,
  YAYASAN_KPM_INFO,
} from '../config/brand';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { mabimsHijriApi } from '../services/islamicApi';
import { storageService } from '../services/storageService';
import { ActiveTab } from '../types/quran';

export interface MoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: ActiveTab) => void;
  bookmarksCount: number;
  notesCount: number;
  cachedSurahCount: number;
  onOpenOfflineModal?: () => void;
  onOpenMicrophoneModal?: () => void;
}

export const MoreModal: React.FC<MoreModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  bookmarksCount,
  notesCount,
  cachedSurahCount,
  onOpenOfflineModal,
  onOpenMicrophoneModal,
}) => {
  const [hijriLabel, setHijriLabel] = useState<string>('Kalender MABIMS Kemenag RI & Hari Besar');
  const [isMobileFull, setIsMobileFull] = useState<boolean>(false);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);

  const savedLocation = storageService.getShalatLocation();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const touchStartYRef = useRef<number | null>(null);
  const pointerStartYRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    mabimsHijriApi
      .getToday('Asia/Jakarta')
      .then((res) => {
        if (mounted && res?.output) {
          setHijriLabel(
            `Hari ini: ${res.output.day} ${res.output.month_name} ${res.output.year} H`
          );
        }
      })
      .catch(() => {
        // Keep default description
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Reset mobile full-screen state when modal re-opens & lock background scroll
  useEffect(() => {
    if (!isOpen) {
      setIsMobileFull(false);
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleNavigateTab = (tab: ActiveTab) => {
    onClose();
    onSelectTab(tab);
  };

  // Touch gesture handlers on header/handle to pull up -> auto full-screen on mobile, pull down -> collapse/close
  const handleHeaderTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleHeaderTouchMove = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null || e.touches.length === 0) return;
    const deltaY = e.touches[0].clientY - touchStartYRef.current;
    // Pulling upward -> immediately expand to full screen on mobile
    if (deltaY < -20 && !isMobileFull) {
      setIsMobileFull(true);
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleHeaderTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null || e.changedTouches.length === 0) return;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartYRef.current = null;

    if (deltaY < -18) {
      setIsMobileFull(true);
    } else if (deltaY > 95) {
      onClose();
    } else if (deltaY > 32 && isMobileFull) {
      setIsMobileFull(false);
    }
  };

  // Pointer drag support for mobile emulators / touchscreens
  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    pointerStartYRef.current = e.clientY;
  };

  const handleHeaderPointerUp = (e: React.PointerEvent) => {
    if (pointerStartYRef.current === null) return;
    const deltaY = e.clientY - pointerStartYRef.current;
    pointerStartYRef.current = null;

    if (deltaY < -18) {
      setIsMobileFull(true);
    } else if (deltaY > 95) {
      onClose();
    } else if (deltaY > 32 && isMobileFull) {
      setIsMobileFull(false);
    }
  };

  // Also auto-expand to full screen on mobile when user scrolls/pulls upward inside the content body
  const handleContentScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!isMobileFull && el.scrollTop > 18 && window.innerWidth < 640) {
      setIsMobileFull(true);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="more-modal-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/55 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Bottom-to-Top Sheet on Mobile (Auto Full Screen on Pull Up) & Proportional Centered Modal on Tablet/Desktop */}
          <motion.div
            initial={{ y: '100%', opacity: 0.96 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.96 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className={`relative z-10 flex flex-col bg-[#F7F8F5] shadow-[0_-12px_42px_rgba(3,83,40,0.22)] sm:shadow-[0_24px_60px_rgba(3,83,40,0.26)] border border-[#E3E9E3] overflow-hidden transition-[height,max-height,border-radius] duration-300 ease-out w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl sm:h-auto sm:max-h-[86dvh] sm:rounded-[28px] ${
              isMobileFull
                ? 'h-screen h-[100dvh] max-h-[100dvh] rounded-none'
                : 'h-[78dvh] max-h-[84dvh] rounded-t-[28px]'
            }`}
          >
            {/* Interactive Pull Handle & Sticky Header */}
            <div
              onTouchStart={handleHeaderTouchStart}
              onTouchMove={handleHeaderTouchMove}
              onTouchEnd={handleHeaderTouchEnd}
              onPointerDown={handleHeaderPointerDown}
              onPointerUp={handleHeaderPointerUp}
              className="shrink-0 bg-white border-b border-[#E3E9E3] px-4 sm:px-6 pt-2.5 pb-3.5 select-none touch-none sm:touch-auto"
              style={{
                paddingTop: isMobileFull
                  ? 'calc(0.65rem + env(safe-area-inset-top, 0px))'
                  : undefined,
              }}
            >
              {/* Mobile Pull Handle Indicator */}
              <div className="flex flex-col items-center justify-center pb-2 sm:hidden">
                <button
                  type="button"
                  onClick={() => setIsMobileFull((prev) => !prev)}
                  aria-label={
                    isMobileFull
                      ? 'Kembalikan ukuran panel'
                      : 'Tarik ke atas untuk layar penuh'
                  }
                  className="group flex flex-col items-center gap-1 py-0.5 cursor-pointer"
                >
                  <span className="w-11 h-1.5 rounded-full bg-[#C9D4CA] group-hover:bg-[#046D38] transition-colors" />
                  <span className="text-[10px] font-medium text-[#68756C]">
                    {isMobileFull
                      ? 'Layar penuh aktif · Tarik ke bawah untuk mengecilkan'
                      : 'Tarik ke atas untuk layar penuh'}
                  </span>
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#035328] text-[#FBC647] flex items-center justify-center shrink-0 shadow-xs">
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2
                        id="more-modal-title"
                        className="font-display text-lg sm:text-xl font-bold text-[#14261C] truncate"
                      >
                        Menu Lainnya
                      </h2>
                      <span className="text-xs font-mono-num font-semibold text-[#046D38]">
                        v{APP_INFO.version}
                      </span>
                    </div>
                    <p className="text-xs text-[#68756C] truncate">
                      Fitur ibadah, pengaturan mushaf, dan informasi aplikasi
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Mobile Fullscreen Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setIsMobileFull((prev) => !prev)}
                    aria-label={isMobileFull ? 'Perkecil tampilan' : 'Layar penuh'}
                    title={isMobileFull ? 'Perkecil tampilan' : 'Perbesar layar penuh'}
                    className="sm:hidden w-9 h-9 rounded-full bg-[#F4F6F3] hover:bg-[#EDF5F0] text-[#24352B] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    {isMobileFull ? (
                      <ChevronDown className="w-4 h-4 text-[#046D38]" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-[#046D38]" />
                    )}
                  </button>

                  {/* Close Modal Button */}
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Tutup Menu Lainnya"
                    className="w-9 h-9 rounded-full bg-[#F4F6F3] hover:bg-stone-200 text-[#14261C] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Modal Content */}
            <div
              ref={scrollContainerRef}
              onScroll={handleContentScroll}
              className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-5"
              style={{
                paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
              }}
            >
              {/* Kelompok 1: Waktu Salat & Kalender */}
              <section aria-labelledby="more-group-ibadah" className="space-y-2">
                <h3
                  id="more-group-ibadah"
                  className="text-xs font-bold uppercase tracking-wider text-[#035328] px-1"
                >
                  Ibadah &amp; Waktu
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 1. Adzan & Jadwal Salat */}
                  <button
                    type="button"
                    onClick={() => handleNavigateTab('shalat')}
                    className="p-3.5 sm:p-4 rounded-2xl border border-[#E3E9E3] bg-white hover:border-[#046D38] transition-colors flex items-center justify-between gap-3 text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3] group-hover:bg-[#046D38] group-hover:border-[#046D38] flex items-center justify-center shrink-0 transition-colors">
                        <Clock className="w-5 h-5 text-[#046D38] group-hover:text-[#FBC647]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#24352B] group-hover:text-[#046D38] transition-colors truncate">
                          Adzan &amp; Jadwal Salat
                        </p>
                        <p className="text-xs text-[#68756C] truncate mt-0.5">
                          {savedLocation.kabkota} · Pengingat suara adzan
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#68756C] group-hover:text-[#046D38] shrink-0" />
                  </button>

                  {/* 2. Kalender Hijriah */}
                  <button
                    type="button"
                    onClick={() => handleNavigateTab('hijri')}
                    className="p-3.5 sm:p-4 rounded-2xl border border-[#E3E9E3] bg-white hover:border-[#046D38] transition-colors flex items-center justify-between gap-3 text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3] group-hover:bg-[#046D38] group-hover:border-[#046D38] flex items-center justify-center shrink-0 transition-colors">
                        <Calendar className="w-5 h-5 text-[#046D38] group-hover:text-[#FBC647]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#24352B] group-hover:text-[#046D38] transition-colors truncate">
                          Kalender Hijriah
                        </p>
                        <p className="text-xs text-[#68756C] truncate mt-0.5">
                          {hijriLabel}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#68756C] group-hover:text-[#046D38] shrink-0" />
                  </button>
                </div>
              </section>

              {/* Kelompok 2: Al-Qur'an & Tadabbur */}
              <section aria-labelledby="more-group-quran" className="space-y-2">
                <h3
                  id="more-group-quran"
                  className="text-xs font-bold uppercase tracking-wider text-[#035328] px-1"
                >
                  Al-Qur&apos;an &amp; Catatan
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Penanda & Catatan */}
                  <button
                    type="button"
                    onClick={() => handleNavigateTab('bookmarks')}
                    className="p-3.5 sm:p-4 rounded-2xl border border-[#E3E9E3] bg-white hover:border-[#046D38] transition-colors flex items-center justify-between gap-3 text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-10 h-10 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3] group-hover:bg-[#046D38] group-hover:border-[#046D38] flex items-center justify-center shrink-0 transition-colors">
                        <Bookmark className="w-5 h-5 text-[#046D38] group-hover:text-[#FBC647]" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#24352B] group-hover:text-[#046D38] transition-colors truncate">
                          Penanda &amp; Catatan
                        </p>
                        <p className="text-xs text-[#68756C] truncate mt-0.5">
                          {bookmarksCount} penanda · {notesCount} catatan
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#68756C] group-hover:text-[#046D38] shrink-0" />
                  </button>

                  {/* Pencarian Ayat */}
                  <button
                    type="button"
                    onClick={() => handleNavigateTab('search')}
                    className="p-3.5 sm:p-4 rounded-2xl border border-[#E3E9E3] bg-white hover:border-[#046D38] transition-colors flex items-center justify-between gap-3 text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-10 h-10 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3] group-hover:bg-[#046D38] group-hover:border-[#046D38] flex items-center justify-center shrink-0 transition-colors">
                        <Search className="w-5 h-5 text-[#046D38] group-hover:text-[#FBC647]" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#24352B] group-hover:text-[#046D38] transition-colors truncate">
                          Pencarian Ayat
                        </p>
                        <p className="text-xs text-[#68756C] truncate mt-0.5">
                          Telusuri kata kunci di 114 surat
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#68756C] group-hover:text-[#046D38] shrink-0" />
                  </button>

                  {/* Fitur Microphone Universal */}
                  {onOpenMicrophoneModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenMicrophoneModal();
                      }}
                      className="sm:col-span-2 p-3.5 sm:p-4 rounded-2xl border border-[#E3E9E3] bg-white hover:border-[#046D38] transition-colors flex items-center justify-between gap-3 text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-10 h-10 rounded-xl bg-[#EDF5F0] border border-[#046D38]/25 group-hover:bg-[#046D38] group-hover:border-[#046D38] flex items-center justify-center shrink-0 transition-colors">
                          <Mic className="w-5 h-5 text-[#046D38] group-hover:text-[#FBC647]" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#24352B] group-hover:text-[#046D38] transition-colors truncate">
                            Fitur Microphone (Suara &amp; Tilawah)
                          </p>
                          <p className="text-xs text-[#68756C] truncate mt-0.5">
                            Pencarian suara pintar &amp; perekam evaluasi tilawah mandiri
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#68756C] group-hover:text-[#046D38] shrink-0" />
                    </button>
                  )}
                </div>
              </section>

              {/* Kelompok 3: Pengaturan & Aplikasi */}
              <section aria-labelledby="more-group-aplikasi" className="space-y-2">
                <h3
                  id="more-group-aplikasi"
                  className="text-xs font-bold uppercase tracking-wider text-[#035328] px-1"
                >
                  Pengaturan &amp; Info
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Pengaturan */}
                  <button
                    type="button"
                    onClick={() => handleNavigateTab('settings')}
                    className="p-3.5 sm:p-4 rounded-2xl border border-[#E3E9E3] bg-white hover:border-[#046D38] transition-colors flex items-center justify-between gap-3 text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3] group-hover:bg-[#046D38] group-hover:border-[#046D38] flex items-center justify-center shrink-0 transition-colors">
                        <Settings className="w-5 h-5 text-[#046D38] group-hover:text-[#FBC647]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#24352B] group-hover:text-[#046D38] transition-colors truncate">
                          Pengaturan Tampilan
                        </p>
                        <p className="text-xs text-[#68756C] truncate mt-0.5">
                          Tipografi mushaf &amp; qari ({cachedSurahCount}/114 offline)
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#68756C] group-hover:text-[#046D38] shrink-0" />
                  </button>

                  {/* Tentang Aplikasi */}
                  <button
                    type="button"
                    onClick={() => handleNavigateTab('about')}
                    className="p-3.5 sm:p-4 rounded-2xl border border-[#E3E9E3] bg-white hover:border-[#046D38] transition-colors flex items-center justify-between gap-3 text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3] group-hover:bg-[#046D38] group-hover:border-[#046D38] flex items-center justify-center shrink-0 transition-colors">
                        <Info className="w-5 h-5 text-[#046D38] group-hover:text-[#FBC647]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#24352B] group-hover:text-[#046D38] transition-colors truncate">
                          Tentang Aplikasi
                        </p>
                        <p className="text-xs text-[#68756C] truncate mt-0.5">
                          Alamat {YAYASAN_KPM_INFO.name} &amp; info
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#68756C] group-hover:text-[#046D38] shrink-0" />
                  </button>

                  {/* Pusat Kesiapan Offline-First & Cache */}
                  {onOpenOfflineModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenOfflineModal();
                      }}
                      className="sm:col-span-2 p-3.5 sm:p-4 rounded-2xl border border-[#E3E9E3] bg-white hover:border-[#046D38] transition-colors flex items-center justify-between gap-3 text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-[#EDF7F1] border border-[#046D38]/25 group-hover:bg-[#046D38] group-hover:border-[#046D38] flex items-center justify-center shrink-0 transition-colors">
                          <ShieldCheck className="w-5 h-5 text-[#046D38] group-hover:text-[#FBC647]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[#24352B] group-hover:text-[#046D38] transition-colors truncate">
                            Arsitektur Offline-First &amp; Penyimpanan Lokal
                          </p>
                          <p className="text-xs text-[#68756C] truncate mt-0.5">
                            Verifikasi 135 resource wajib, kuota penyimpanan &amp; pembaruan PWA
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#68756C] group-hover:text-[#046D38] shrink-0" />
                    </button>
                  )}

                  {/* Standalone PWA App Install Item */}
                  {isInstalled ? (
                    <div className="sm:col-span-2 p-3.5 sm:p-4 rounded-2xl border border-[#046D38]/30 bg-[#EDF5F0] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-[#046D38] text-[#FBC647] flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[#035328] truncate">
                            Aplikasi Standalone Terinstal
                          </p>
                          <p className="text-xs text-[#046D38] truncate mt-0.5">
                            Berjalan penuh sebagai aplikasi native perangkat Anda
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : isInstallable ? (
                    <button
                      type="button"
                      onClick={install}
                      className="sm:col-span-2 p-3.5 sm:p-4 rounded-2xl border border-[#046D38]/35 bg-[#FAFDFB] hover:bg-[#EDF5F0] transition-colors flex items-center justify-between gap-3 text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-[#046D38] text-[#FBC647] flex items-center justify-center shrink-0 shadow-xs">
                          <Download className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[#035328] group-hover:underline truncate">
                            Instal Aplikasi Standalone
                          </p>
                          <p className="text-xs text-[#68756C] truncate mt-0.5">
                            Instal Ziezan Quran ke layar utama perangkat Anda
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#046D38] shrink-0" />
                    </button>
                  ) : isIOS ? (
                    <button
                      type="button"
                      onClick={() => setShowIOSModal(true)}
                      className="sm:col-span-2 p-3.5 sm:p-4 rounded-2xl border border-[#046D38]/35 bg-[#FAFDFB] hover:bg-[#EDF5F0] transition-colors flex items-center justify-between gap-3 text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-[#046D38] text-[#FBC647] flex items-center justify-center shrink-0 shadow-xs">
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[#035328] group-hover:underline truncate">
                            Instal di iPhone / iPad (iOS Safari)
                          </p>
                          <p className="text-xs text-[#68756C] truncate mt-0.5">
                            Panduan 2-langkah tambah ke Layar Utama
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#046D38] shrink-0" />
                    </button>
                  ) : null}
                </div>
              </section>
            </div>

            {/* iOS Modal Guide */}
            {showIOSModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
                role="dialog"
                aria-modal="true"
              >
                <div className="w-full max-w-sm rounded-2xl bg-white p-5 space-y-4 shadow-xl border border-[#035328]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#035328] text-[#FBC647] flex items-center justify-center shrink-0">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-[#24352B]">
                        Instal di iOS (iPhone / iPad)
                      </h3>
                      <p className="text-xs text-[#68756C]">Aplikasi Standalone Tanpa Browser</p>
                    </div>
                  </div>

                  <ol className="space-y-2.5 text-xs text-[#24352B] leading-relaxed">
                    <li className="p-2.5 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3] flex items-start gap-2">
                      <span className="font-bold text-[#046D38] bg-white w-5 h-5 rounded-full flex items-center justify-center border text-[11px] shrink-0">
                        1
                      </span>
                      <span>
                        Ketuk tombol <strong>Bagikan (Share)</strong> di bilah bawah Safari peramban Anda.
                      </span>
                    </li>
                    <li className="p-2.5 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3] flex items-start gap-2">
                      <span className="font-bold text-[#046D38] bg-white w-5 h-5 rounded-full flex items-center justify-center border text-[11px] shrink-0">
                        2
                      </span>
                      <span>
                        Pilih menu <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.
                      </span>
                    </li>
                  </ol>

                  <button
                    type="button"
                    onClick={() => setShowIOSModal(false)}
                    className="w-full min-h-[42px] py-2 px-4 rounded-xl bg-[#035328] text-white text-xs font-bold hover:bg-[#046D38] transition-colors cursor-pointer"
                  >
                    Mengerti
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

interface AboutViewProps {
  onBack?: () => void;
  focusSection?: 'top' | 'address';
}

export const AboutView: React.FC<AboutViewProps> = ({
  onBack,
  focusSection = 'top',
}) => {
  const [copiedAddress, setCopiedAddress] = useState(false);

  useEffect(() => {
    if (focusSection === 'address' && typeof document !== 'undefined') {
      const timer = window.setTimeout(() => {
        const el = document.getElementById('alamat-yayasan-kpm');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 120);
      return () => window.clearTimeout(timer);
    }
  }, [focusSection]);

  const handleCopyAddress = async () => {
    const fullText = `${YAYASAN_KPM_INFO.name} — ${YAYASAN_KPM_INFO.addressFull}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2500);
    } catch {
      // Fallback copy if clipboard permission is restricted
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2500);
    }
  };

  return (
    <div className="container-app py-4 sm:py-6 space-y-5">
      {/* Top Navigation Back Button */}
      {onBack && (
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E3E9E3] bg-white text-xs sm:text-sm font-semibold text-[#24352B] hover:border-[#046D38] hover:text-[#046D38] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#046D38]" />
            <span>Kembali ke Menu Lainnya</span>
          </button>
        </div>
      )}

      {/* Brand Identity Card */}
      <section className="rounded-2xl border border-[#E3E9E3] bg-white p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-4">
          <img
            src={BRAND_LOGO_PATH}
            alt={APP_CONFIG.appName}
            className="w-14 h-14 rounded-2xl object-contain border border-[#E3E9E3] bg-[#035328] p-1.5 shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-[#24352B]">
                Tentang Aplikasi — {APP_CONFIG.appName}
              </h1>
              <span className="text-xs font-mono-num font-semibold text-[#046D38]">
                v{APP_INFO.version}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#68756C] mt-1">
              {YAYASAN_KPM_INFO.identityTagline} ·{' '}
              <span className="font-medium text-[#046D38]">{SITE_URL}</span>
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm leading-relaxed text-[#24352B]">
          {APP_INFO.description}
        </p>
      </section>

      {/* Informasi & Alamat Yayasan Karya Pondok Mandiri */}
      <section
        id="alamat-yayasan-kpm"
        aria-labelledby="heading-yayasan-kpm"
        className="rounded-2xl border border-[#E3E9E3] bg-white p-5 sm:p-6 space-y-5 shadow-xs scroll-mt-20"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 border-b border-[#E3E9E3]">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-[#E3E9E3] bg-[#FAFDFB] p-2 flex items-center justify-center shrink-0">
            <img
              src={YAYASAN_KPM_INFO.logoPath}
              alt={`Logo ${YAYASAN_KPM_INFO.name}`}
              className="w-full h-full object-contain"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#046D38]">
              <Building2 className="w-3.5 h-3.5" />
              <span>Informasi Lembaga &amp; Alamat Yayasan</span>
            </div>
            <h2
              id="heading-yayasan-kpm"
              className="font-display text-lg sm:text-xl font-bold text-[#24352B]"
            >
              {YAYASAN_KPM_INFO.name}
            </h2>
            <p className="text-xs sm:text-sm font-medium text-[#035328]">
              {YAYASAN_KPM_INFO.tagline}
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm leading-relaxed text-[#24352B]">
          {YAYASAN_KPM_INFO.description}
        </p>

        {/* Box Alamat Yayasan Karya Pondok Mandiri */}
        <div className="rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] p-4 sm:p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#035328] text-[#FBC647] flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="text-xs font-semibold text-[#035328]">
                Alamat Yayasan Karya Pondok Mandiri
              </h3>
              <p className="text-sm sm:text-base font-bold text-[#24352B] leading-snug">
                {YAYASAN_KPM_INFO.addressFull}
              </p>
            </div>
          </div>

          {/* Detail Administratif Wilayah */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#E3E9E3] text-xs">
            <div className="p-2.5 rounded-lg bg-white border border-[#E3E9E3]">
              <span className="block text-[11px] text-[#68756C]">Desa / Kecamatan</span>
              <span className="font-bold text-[#24352B] mt-0.5 block">
                {YAYASAN_KPM_INFO.addressDetails.desaKelurahan}, {YAYASAN_KPM_INFO.addressDetails.kecamatan}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-[#E3E9E3]">
              <span className="block text-[11px] text-[#68756C]">Kabupaten / Kota</span>
              <span className="font-bold text-[#24352B] mt-0.5 block">
                {YAYASAN_KPM_INFO.addressDetails.kabupatenKota}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-[#E3E9E3]">
              <span className="block text-[11px] text-[#68756C]">Provinsi &amp; Kode Pos</span>
              <span className="font-bold text-[#24352B] mt-0.5 block">
                {YAYASAN_KPM_INFO.addressDetails.provinsi} - {YAYASAN_KPM_INFO.addressDetails.kodePos}
              </span>
            </div>
          </div>

          {/* Tombol Aksi Alamat */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCopyAddress}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#046D38] text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#035328] transition-colors cursor-pointer"
            >
              {copiedAddress ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#FBC647]" />
                  <span>Alamat Berhasil Disalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#FBC647]" />
                  <span>Salin Alamat Yayasan</span>
                </>
              )}
            </button>

            <a
              href="https://maps.app.goo.gl/32CHUMp517f2oeJFA"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] px-4 py-2 rounded-xl border border-[#E3E9E3] bg-white text-[#24352B] text-xs font-semibold inline-flex items-center gap-1.5 hover:border-[#046D38] hover:text-[#046D38] transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-[#046D38]" />
              <span>Buka di Google Maps</span>
              <ExternalLink className="w-3 h-3 text-[#68756C]" />
            </a>
          </div>
        </div>
      </section>

      {/* Kolaborasi & Mitra Kelembagaan */}
      <section className="rounded-2xl border border-[#E3E9E3] bg-white p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold text-[#24352B]">
            Sinergi &amp; Kolaborasi Lembaga
          </h2>
          <p className="text-xs text-[#68756C] mt-0.5">
            Didukung oleh ekosistem lembaga pendidikan, pelatihan vokasi, dan mitra teknologi:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {PARTNER_LOGOS.map((partner) => (
            <div
              key={partner.id}
              className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3] flex items-center gap-3.5"
            >
              <div className="h-14 w-16 rounded-xl bg-white border border-[#E3E9E3] p-1.5 flex items-center justify-center shrink-0">
                <img
                  src={partner.logoPath}
                  alt={partner.name}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-[#24352B] leading-snug">
                  {partner.name}
                </p>
                <p className="text-[11px] text-[#68756C] mt-0.5 leading-snug">
                  {partner.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sumber Data Resmi */}
      <section className="rounded-2xl border border-[#E3E9E3] bg-white p-5 sm:p-6 space-y-3">
        <h2 className="font-display text-base font-bold text-[#24352B]">
          Sumber Data Resmi
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3]">
            <p className="font-bold text-[#035328]">Al-Qur&apos;an &amp; Murottal</p>
            <p className="text-[#68756C] mt-0.5">eQuran.id · Kemenag RI &amp; 6 Qari</p>
          </div>
          <div className="p-3 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3]">
            <p className="font-bold text-[#035328]">Adzan &amp; Jadwal Salat</p>
            <p className="text-[#68756C] mt-0.5">eQuran.id Shalat API v2</p>
          </div>
          <div className="p-3 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3]">
            <p className="font-bold text-[#035328]">Arah Kiblat</p>
            <p className="text-[#68756C] mt-0.5">House Muslim API · Geodesik WGS-84</p>
          </div>
          <div className="p-3 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3]">
            <p className="font-bold text-[#035328]">Kalender Hijriah</p>
            <p className="text-[#68756C] mt-0.5">MABIMS.dev · Standar Imkanur Rukyat</p>
          </div>
        </div>
      </section>

      {/* Komitmen Privasi */}
      <section className="rounded-2xl border border-[#E3E9E3] bg-white p-5 sm:p-6 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-[#035328] shrink-0" />
        <p className="text-xs text-[#68756C] leading-relaxed">
          Semua catatan, penanda ayat, dan pengaturan lokasi tersimpan privat di perangkat Anda tanpa pelacakan pihak ketiga.
        </p>
      </section>

      {/* Profil Pengembang */}
      <section className="rounded-2xl border border-[#E3E9E3] bg-white p-5 sm:p-6 space-y-3">
        <h2 className="font-display text-base font-bold text-[#24352B]">
          Pengembang
        </h2>
        <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3] space-y-2 text-xs sm:text-sm">
          <p className="text-[#24352B]">
            <strong>{APP_INFO.developerName}</strong> · {APP_INFO.developerRole} ({APP_INFO.agencyName})
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-2.5">
            <a
              href={APP_INFO.developerMailtoUrl}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#046D38] text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#035328] transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-[#FBC647]" />
              <span>Hubungi: {APP_INFO.developerContact}</span>
            </a>
            <a
              href={SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#E3E9E3] bg-white text-[#24352B] text-xs font-semibold inline-flex items-center gap-1.5 hover:border-[#046D38] transition-colors"
            >
              <span>{APP_CONFIG.domain}</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#046D38]" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
