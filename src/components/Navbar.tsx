import React, { useState } from 'react';
import {
  BookHeart,
  BookOpen,
  Calendar,
  Clock,
  Compass,
  Download,
  Home,
  LayoutGrid,
  Mic,
  Share,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { APP_CONFIG, BRAND_LOGO_PATH } from '../config/brand';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { ActiveTab, ReadingProgress } from '../types/quran';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  lastRead: ReadingProgress | null;
  onContinueReading: () => void;
  onOpenMicrophone?: () => void;
}

interface FloatingBottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  bookmarksCount?: number;
}

/**
 * 5 Menu Utama untuk Bottom Navigation Bar (Mobile & Tablet < 1024px):
 * 1. Beranda
 * 2. Qur'an
 * 3. Doa
 * 4. Kiblat
 * 5. Lainnya
 */
const MOBILE_BOTTOM_NAV_ITEMS: {
  id: ActiveTab;
  label: string;
  ariaLabel: string;
  isActiveMatch: (tab: ActiveTab) => boolean;
  icon: React.ReactNode;
}[] = [
  {
    id: 'home',
    label: 'Beranda',
    ariaLabel: 'Beranda Ziezan Quran',
    isActiveMatch: (tab) => tab === 'home',
    icon: <Home className="w-[22px] h-[22px]" strokeWidth={2} />,
  },
  {
    id: 'surah-list',
    label: "Qur'an",
    ariaLabel: "Al-Qur'an Digital 114 Surah",
    isActiveMatch: (tab) => tab === 'surah-list' || tab === 'reader',
    icon: <BookOpen className="w-[22px] h-[22px]" strokeWidth={2} />,
  },
  {
    id: 'doa',
    label: 'Doa',
    ariaLabel: 'Kumpulan Doa dan Dzikir Harian',
    isActiveMatch: (tab) => tab === 'doa',
    icon: <BookHeart className="w-[22px] h-[22px]" strokeWidth={2} />,
  },
  {
    id: 'qibla',
    label: 'Kiblat',
    ariaLabel: "Arah Kiblat dan Kompas Ka'bah",
    isActiveMatch: (tab) => tab === 'qibla',
    icon: <Compass className="w-[22px] h-[22px]" strokeWidth={2} />,
  },
  {
    id: 'more',
    label: 'Lainnya',
    ariaLabel: 'Menu Lainnya (Jadwal Salat, Kalender Hijriah, Penanda, Pengaturan, Tentang)',
    isActiveMatch: (tab) =>
      tab === 'more' ||
      tab === 'shalat' ||
      tab === 'hijri' ||
      tab === 'bookmarks' ||
      tab === 'settings' ||
      tab === 'about' ||
      tab === 'search',
    icon: <LayoutGrid className="w-[22px] h-[22px]" strokeWidth={2} />,
  },
];

/**
 * 5 Menu Utama untuk Top Navigation Bar Desktop (≥ 1024px):
 * 1. Beranda
 * 2. Qur'an
 * 3. Doa
 * 4. Kiblat
 * 5. Lainnya (Akses Jadwal Salat, Kalender Hijriah, Pengaturan, dll.)
 */
const DESKTOP_TOP_NAV_ITEMS: {
  id: ActiveTab;
  label: string;
  isActiveMatch: (tab: ActiveTab) => boolean;
  icon: React.ReactNode;
}[] = [
  {
    id: 'home',
    label: 'Beranda',
    isActiveMatch: (tab) => tab === 'home',
    icon: <Home className="w-4 h-4 shrink-0" strokeWidth={2} />,
  },
  {
    id: 'surah-list',
    label: "Qur'an",
    isActiveMatch: (tab) => tab === 'surah-list' || tab === 'reader',
    icon: <BookOpen className="w-4 h-4 shrink-0" strokeWidth={2} />,
  },
  {
    id: 'doa',
    label: 'Doa',
    isActiveMatch: (tab) => tab === 'doa',
    icon: <BookHeart className="w-4 h-4 shrink-0" strokeWidth={2} />,
  },
  {
    id: 'qibla',
    label: 'Kiblat',
    isActiveMatch: (tab) => tab === 'qibla',
    icon: <Compass className="w-4 h-4 shrink-0" strokeWidth={2} />,
  },
  {
    id: 'more',
    label: 'Lainnya',
    isActiveMatch: (tab) =>
      tab === 'more' ||
      tab === 'shalat' ||
      tab === 'hijri' ||
      tab === 'bookmarks' ||
      tab === 'settings' ||
      tab === 'about' ||
      tab === 'search',
    icon: <LayoutGrid className="w-4 h-4 shrink-0" strokeWidth={2} />,
  },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  lastRead,
  onContinueReading,
  onOpenMicrophone,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [logoError, setLogoError] = useState(false);

  if (activeTab === 'reader') {
    return null;
  }

  const continueLabelFull = lastRead
    ? `Lanjut: ${lastRead.surahNamaLatin} : ${lastRead.ayatNomor}`
    : 'Mulai Membaca';
  const continueLabelShort = lastRead
    ? `${lastRead.surahNamaLatin}:${lastRead.ayatNomor}`
    : 'Mulai Baca';

  return (
    <>
      {/* Top Brand Header Bar (On mobile, HomeView uses its own Hero Header over the mosque backdrop) */}
      <header
        className={`sticky top-0 z-40 border-b transition-colors ${
          activeTab === 'home' ? 'hidden lg:block' : 'block'
        }`}
        style={{
          backgroundColor: 'var(--color-header)',
          borderColor: 'rgba(255, 255, 255, 0.10)',
          paddingTop: 'var(--safe-top)',
        }}
      >
        <div className="container-app mobile-landscape-compact-header h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-4 min-w-0">
          {/* Left: Brand Logo & Title */}
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            className="min-h-[44px] flex items-center gap-1.5 sm:gap-2.5 text-left whitespace-nowrap shrink-0 focus:outline-none cursor-pointer group"
          >
            {!logoError ? (
              <img
                src={BRAND_LOGO_PATH}
                alt={APP_CONFIG.appName}
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-contain shrink-0 ring-1 ring-[#FBC647]/65 group-hover:scale-105 transition-transform"
              />
            ) : (
              <span
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 font-display font-bold text-sm"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-gold)' }}
              >
                Z
              </span>
            )}
            <span className="font-display text-[15px] min-[360px]:text-lg sm:text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0">
              {APP_CONFIG.appName}
            </span>
          </button>

          {/* Center (Desktop ≥ 1024px Only): Primary Horizontal Navigation */}
          <nav
            aria-label="Navigasi Utama Desktop"
            className="hidden lg:flex items-center gap-1"
          >
            {DESKTOP_TOP_NAV_ITEMS.map((item) => {
              const isActive = item.isActiveMatch(activeTab);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#FBC647] text-[#24352B]'
                      : 'text-white/90 hover:bg-[#046D38] hover:text-white'
                  }`}
                >
                  <span className={isActive ? 'text-[#24352B]' : 'text-[#FBC647]'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Primary Contextual Actions (Microphone + Continue Reading + Optional PWA Install) */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0 min-w-0">
            {onOpenMicrophone && (
              <button
                type="button"
                onClick={onOpenMicrophone}
                aria-label="Fitur Microphone (Pencarian Suara & Rekam Tilawah)"
                title="Fitur Microphone (Pencarian Suara & Rekam Tilawah)"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer border border-[#FBC647]/45 text-[#FBC647] hover:bg-white/10"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onContinueReading}
              aria-label={continueLabelFull}
              title={continueLabelFull}
              className="min-h-[34px] sm:min-h-[38px] px-2.5 min-[360px]:px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] min-[360px]:text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border border-[#FBC647]/40 text-white hover:bg-white/10 max-w-[125px] min-[360px]:max-w-[165px] sm:max-w-[220px]"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <BookOpen className="w-3 h-3 min-[360px]:w-3.5 min-[360px]:h-3.5 shrink-0 text-[#FBC647]" />
              <span className="truncate hidden sm:inline">{continueLabelFull}</span>
              <span className="truncate sm:hidden">{continueLabelShort}</span>
            </button>

            {!isInstalled && isInstallable && (
              <button
                type="button"
                onClick={install}
                aria-label="Instal Aplikasi Ziezan Quran"
                title="Instal Aplikasi Ziezan Quran"
                className="min-h-[34px] sm:min-h-[38px] px-2.5 min-[360px]:px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] min-[360px]:text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-transform active:scale-95 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
                style={{
                  backgroundColor: 'var(--color-gold)',
                  color: '#1D2B22',
                }}
              >
                <Download className="w-3 h-3 min-[360px]:w-3.5 min-[360px]:h-3.5 shrink-0 text-[#1D2B22]" />
                <span>Instal App</span>
              </button>
            )}

            {!isInstalled && !isInstallable && isIOS && (
              <button
                type="button"
                onClick={() => setShowIOSModal(true)}
                aria-label="Panduan Instal Aplikasi di iOS"
                title="Panduan Instal Aplikasi di iOS"
                className="min-h-[34px] sm:min-h-[38px] px-2.5 min-[360px]:px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] min-[360px]:text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-transform active:scale-95 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
                style={{
                  backgroundColor: 'var(--color-gold)',
                  color: '#1D2B22',
                }}
              >
                <Download className="w-3 h-3 min-[360px]:w-3.5 min-[360px]:h-3.5 shrink-0 text-[#1D2B22]" />
                <span>Instal App</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* iOS Safari Guided PWA Installation Modal */}
      <AnimatePresence>
        {showIOSModal && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setShowIOSModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full sm:max-w-md max-h-[88dvh] overflow-y-auto bg-white p-5 sm:p-6 shadow-2xl border-t border-x"
              style={{
                borderColor: 'var(--color-border)',
                borderTopLeftRadius: 'var(--radius-card)',
                borderTopRightRadius: 'var(--radius-card)',
                paddingBottom: 'calc(1.25rem + var(--safe-bottom))',
              }}
            >
              <div className="flex justify-center -mt-2 pb-2">
                <span className="w-10 h-1 rounded-full bg-[#E3E9E3]" />
              </div>
              <div
                className="flex items-center justify-between pb-3 border-b"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <h3
                  id="ios-install-title"
                  className="text-base font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Instal {APP_CONFIG.appName} di iOS
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSModal(false)}
                  className="min-w-[44px] min-h-[44px] -mr-2 rounded-lg flex items-center justify-center hover:bg-stone-100 cursor-pointer"
                  aria-label="Tutup panduan instalasi"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div
                className="mt-4 space-y-3 text-xs sm:text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <p>
                  Pasang <strong>{APP_CONFIG.appName}</strong> di layar utama iPhone atau iPad Anda:
                </p>
                <ol
                  className="space-y-2 text-xs sm:text-sm"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  <li className="flex items-center gap-1.5 flex-wrap">
                    <span>
                      1. Ketuk ikon <strong>Bagikan (Share)</strong>
                    </span>
                    <Share className="w-4 h-4 inline text-[#046D38] shrink-0" />
                    <span>di bilah Safari.</span>
                  </li>
                  <li>
                    2. Pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.
                  </li>
                  <li>
                    3. Ketuk <strong>Tambah</strong> di pojok kanan atas.
                  </li>
                </ol>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl text-sm font-semibold text-white transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Mengerti
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

/**
 * Native-Style Fixed Bottom Navigation Bar (Mobile & Tablet < 1024px)
 * - Tepat 5 item: Beranda, Al-Qur'an, Adzan, Doa, Lainnya
 * - Latar putih solid (#FFFFFF), pemisah tipis (#E3E9E3), bayangan sangat ringan
 * - Safe-area inset bottom support
 * - Target sentuh minimal 44x44 px
 * - Disembunyikan pada layar desktop (lg:hidden) agar tidak bertabrakan dengan top nav
 */
export const FloatingBottomNav: React.FC<FloatingBottomNavProps> = ({
  activeTab,
  onSelectTab,
}) => {
  if (activeTab === 'reader') {
    return null;
  }

  return (
    <nav
      aria-label="Navigasi Utama Mobile"
      className="mobile-landscape-bottom-nav fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-[#E3E9E3] shadow-[0_-2px_10px_rgba(3,83,40,0.04)] pointer-events-auto"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="w-full grid grid-cols-5 items-stretch px-1 sm:px-4 md:px-8">
        {MOBILE_BOTTOM_NAV_ITEMS.map((item) => {
          const isActive = item.isActiveMatch(activeTab);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-label={item.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
              className={`mobile-landscape-nav-item relative min-h-[52px] min-[360px]:min-h-[56px] min-w-[40px] py-1 min-[360px]:py-1.5 px-0.5 flex flex-col items-center justify-center gap-0.5 min-[360px]:gap-1 transition-colors focus:outline-none cursor-pointer ${
                isActive
                  ? 'text-[#046D38]'
                  : 'text-[#68756C] hover:text-[#24352B]'
              }`}
            >
              {/* Indikator aktif yang halus di bagian atas item */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 min-[360px]:w-8 h-[3px] rounded-b-full bg-[#046D38]"
                  aria-hidden="true"
                />
              )}

              <span
                className={`flex items-center justify-center px-2 min-[360px]:px-3 py-0.5 rounded-xl transition-colors ${
                  isActive ? 'bg-[#EDF5F0] text-[#046D38]' : 'text-[#68756C]'
                }`}
              >
                <span className="scale-90 min-[360px]:scale-100 transition-transform">
                  {item.icon}
                </span>
              </span>

              <span
                className={`mobile-landscape-nav-label text-[9.5px] min-[360px]:text-[11px] leading-tight tracking-tight whitespace-nowrap truncate max-w-[56px] min-[360px]:max-w-[64px] text-center ${
                  isActive ? 'font-bold text-[#046D38]' : 'font-medium text-[#68756C]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
