import React, { useEffect, useState } from 'react';
import { Maximize2, Monitor, RotateCcw } from 'lucide-react';
import { APP_CONFIG, BRAND_LOGO_PATH } from '../config/brand';

type InvalidOrientationType = 'desktop-portrait' | null;

/**
 * Reusable Full-Viewport Orientation Overlay (Ziezan Quran)
 *
 * Aturan Orientasi Perangkat:
 * 1. Mobile (Portrait & Landscape, misal 375×812 maupun 812×375):
 *    - Mendukung Portrait dan Landscape penuh dengan tata letak ergonomis adaptif.
 * 2. Tablet (Portrait 640–1023px seperti 768×1024, 820×1180 & Landscape seperti 1024×768, 1366×1024):
 *    - Mendukung Portrait dan Landscape penuh tanpa peringatan.
 * 3. Desktop & Laptop (Lebar >= 1024px):
 *    - Dioptimalkan untuk Landscape.
 *    - Jika Desktop Portrait (misal 1080×1920), tampilkan layar pemberitahuan orientasi.
 */
const DESKTOP_PORTRAIT_QUERY = '(orientation: portrait) and (min-width: 1024px)';

export const OrientationGuard: React.FC = () => {
  const [violation, setViolation] = useState<InvalidOrientationType>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return null;
    if (window.matchMedia(DESKTOP_PORTRAIT_QUERY).matches) return 'desktop-portrait';
    return null;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const desktopPortraitMql = window.matchMedia(DESKTOP_PORTRAIT_QUERY);

    const evaluateOrientation = () => {
      if (desktopPortraitMql.matches) {
        setViolation('desktop-portrait');
      } else {
        setViolation(null);
      }
    };

    evaluateOrientation();

    if (typeof desktopPortraitMql.addEventListener === 'function') {
      desktopPortraitMql.addEventListener('change', evaluateOrientation);
      return () => {
        desktopPortraitMql.removeEventListener('change', evaluateOrientation);
      };
    } else {
      desktopPortraitMql.addListener(evaluateOrientation);
      return () => {
        desktopPortraitMql.removeListener(evaluateOrientation);
      };
    }
  }, []);

  return (
    <div
      className="orientation-overlay fixed inset-0 z-[100] w-full h-[100dvh] overflow-hidden select-none items-center justify-center px-5 py-4"
      style={{
        background: 'linear-gradient(145deg, #035328 0%, #02381B 60%, #012612 100%)',
        color: '#FFFFFF',
      }}
      role="dialog"
      aria-modal="true"
      aria-hidden={violation === null}
      aria-labelledby="orientation-guard-title"
      aria-describedby="orientation-guard-desc"
    >
      {/* Subtle Islamic Radial Gold Glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 25%, rgba(251, 198, 71, 0.16) 0%, transparent 65%)',
        }}
      />

      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-[#FBC647]/30 bg-white/10 backdrop-blur-md p-5 sm:p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)] flex flex-col items-center justify-center gap-3 sm:gap-4 max-h-[92dvh]">
        {/* Brand Identity + Icon Illustration */}
        <div className="flex items-center gap-3">
          <img
            src={BRAND_LOGO_PATH}
            alt={APP_CONFIG.appName}
            referrerPolicy="no-referrer"
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-contain ring-2 ring-[#FBC647] bg-[#035328] p-0.5 shrink-0"
          />
          <div className="text-left">
            <p className="font-display text-lg sm:text-xl font-bold text-white leading-none">
              {APP_CONFIG.appName}
            </p>
            <p className="text-[11px] sm:text-xs text-[#FBC647] font-medium mt-0.5">
              Mode Desktop · Hanya Landscape
            </p>
          </div>
        </div>

        {/* Visual Orientation Illustration */}
        <div className="my-1 flex items-center justify-center gap-3">
          <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#046D38] border border-[#FBC647]/40 text-[#FBC647] shadow-inner">
            <Monitor className="w-8 h-8 sm:w-10 sm:h-10 text-[#FBC647]" />
            <Maximize2 className="w-4 h-4 text-white absolute -top-1.5 -right-1.5 bg-[#035328] rounded-full p-0.5 border border-[#FBC647]" />
          </div>
        </div>

        {/* Informative Message */}
        <div className="space-y-1.5 max-w-md">
          <h2
            id="orientation-guard-title"
            className="font-display text-xl sm:text-2xl font-bold text-white leading-snug"
          >
            Silakan Gunakan Orientasi Landscape atau Perlebar Jendela
          </h2>
          <p
            id="orientation-guard-desc"
            className="text-xs sm:text-sm text-white/85 leading-relaxed"
          >
            Tampilan desktop Ziezan Quran menggunakan desain layar penuh (Full-Viewport Landscape). Silakan putar layar ke landscape atau perlebar jendela browser Anda.
          </p>
        </div>

        {/* Status Pill */}
        <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-[#035328]/90 border border-[#FBC647]/35 px-3.5 py-1.5 text-[11px] sm:text-xs font-semibold text-[#FBC647]">
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          <span>Tampilan akan pulih otomatis tanpa memuat ulang halaman</span>
        </div>
      </div>
    </div>
  );
};
