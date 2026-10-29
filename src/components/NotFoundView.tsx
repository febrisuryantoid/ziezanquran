import React from 'react';
import { Compass, Home } from 'lucide-react';
import { APP_CONFIG, BRAND_LOGO_PATH } from '../config/brand';

interface NotFoundViewProps {
  invalidPath?: string;
  onBackToHome: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({
  invalidPath,
  onBackToHome,
}) => {
  const displayedPath =
    invalidPath ||
    (typeof window !== 'undefined' ? window.location.pathname : '/404');

  return (
    <div className="container-app flex-1 flex items-center justify-center py-10 sm:py-16">
      <section
        aria-labelledby="not-found-heading"
        className="w-full max-w-lg rounded-3xl border border-[#E3E9E3] bg-white p-6 sm:p-10 text-center shadow-[0_8px_30px_rgba(3,83,40,0.06)] space-y-6"
      >
        <div className="mx-auto flex items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#035328] p-1.5 border border-[#FBC647]/50 flex items-center justify-center shadow-sm">
            <img
              src={BRAND_LOGO_PATH}
              alt={APP_CONFIG.appName}
              className="w-full h-full object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="w-14 h-14 rounded-2xl bg-[#EDF5F0] border border-[#E3E9E3] flex items-center justify-center text-[#046D38]">
            <Compass className="w-7 h-7" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-mono-num text-xs sm:text-sm font-bold tracking-widest uppercase text-[#046D38]">
            404 · Halaman Tidak Ditemukan
          </p>
          <h1
            id="not-found-heading"
            className="font-display text-2xl sm:text-3xl font-bold text-[#24352B] leading-tight"
          >
            Maaf, Tautan yang Anda Tuju Tidak Tersedia
          </h1>
          <p className="text-xs sm:text-sm text-[#68756C] leading-relaxed max-w-md mx-auto">
            Alamat URL{' '}
            <code className="font-mono-num px-1.5 py-0.5 rounded bg-[#F7F8F5] border border-[#E3E9E3] text-[#035328]">
              {displayedPath}
            </code>{' '}
            mungkin telah dipindahkan, salah ketik, atau tidak terdaftar di dalam{' '}
            {APP_CONFIG.appName}.
          </p>
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={onBackToHome}
            className="w-full sm:w-auto min-h-[46px] px-6 py-3 rounded-xl bg-[#046D38] hover:bg-[#035328] text-white text-sm font-bold inline-flex items-center justify-center gap-2.5 shadow-sm transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4 text-[#FBC647] shrink-0" />
            <span>Kembali ke Beranda</span>
          </button>
        </div>
      </section>
    </div>
  );
};
