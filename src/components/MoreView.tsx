import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Bookmark,
  Calendar,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  Info,
  Mail,
  MapPin,
  Search,
  Settings,
  ShieldCheck,
  Volume2,
} from 'lucide-react';
import { APP_CONFIG, APP_INFO, BRAND_LOGO_PATH, SITE_URL } from '../config/brand';
import { mabimsHijriApi } from '../services/islamicApi';
import { storageService } from '../services/storageService';
import { ActiveTab } from '../types/quran';

interface MoreViewProps {
  onSelectTab: (tab: ActiveTab) => void;
  bookmarksCount: number;
  notesCount: number;
  cachedSurahCount: number;
}

export const MoreView: React.FC<MoreViewProps> = ({
  onSelectTab,
  bookmarksCount,
  notesCount,
  cachedSurahCount,
}) => {
  const [hijriLabel, setHijriLabel] = useState<string>('Kalender MABIMS Kemenag RI & Hari Besar');
  const savedLocation = storageService.getShalatLocation();
  const shalatReminders = storageService.getShalatReminders();

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

  return (
    <div className="container-app py-4 sm:py-6 space-y-5">
      {/* Editorial Header */}
      <div className="card-surface space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-fluid-xl font-bold text-[#24352B]">
              Lainnya
            </h1>
            <p className="text-xs sm:text-sm text-[#68756C] mt-0.5">
              Fitur tambahan, pengaturan mushaf, dan informasi aplikasi.
            </p>
          </div>
          <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-[#EDF5F0] text-xs font-bold text-[#046D38] border border-[#E3E9E3]">
            v{APP_INFO.version}
          </span>
        </div>
      </div>

      {/* Kelompok 1: Waktu Salat & Kalender */}
      <section aria-labelledby="more-group-ibadah" className="space-y-2">
        <h2
          id="more-group-ibadah"
          className="text-xs font-bold uppercase tracking-wider text-[#035328] px-1"
        >
          Ibadah &amp; Waktu
        </h2>

        <div className="rounded-2xl border border-[#E3E9E3] bg-white divide-y divide-[#E3E9E3] overflow-hidden">
          {/* 1. Adzan & Jadwal Salat */}
          <button
            type="button"
            onClick={() => onSelectTab('shalat')}
            className="w-full min-h-[64px] p-4 flex items-center justify-between gap-3.5 text-left hover:bg-[#F7F8F5] transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3] group-hover:bg-[#046D38] group-hover:border-[#046D38] flex items-center justify-center shrink-0 transition-colors">
                <Clock className="w-5 h-5 text-[#046D38] group-hover:text-[#FBC647]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm sm:text-base font-bold text-[#24352B] group-hover:text-[#046D38] transition-colors">
                    Adzan &amp; Jadwal Salat
                  </p>
                  <span className="px-2 py-0.5 rounded-md bg-[#EDF5F0] text-[11px] font-semibold text-[#046D38]">
                    {savedLocation.kabkota}
                  </span>
                </div>
                <p className="text-xs text-[#68756C] truncate mt-0.5">
                  Waktu salat, hitung mundur &amp; suara adzan
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#68756C] group-hover:text-[#046D38] shrink-0" />
          </button>

          {/* 2. Kalender Hijriah */}
          <button
            type="button"
            onClick={() => onSelectTab('hijri')}
            className="w-full min-h-[64px] p-4 flex items-center justify-between gap-3.5 text-left hover:bg-[#F7F8F5] transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3] group-hover:bg-[#046D38] group-hover:border-[#046D38] flex items-center justify-center shrink-0 transition-colors">
                <Calendar className="w-5 h-5 text-[#046D38] group-hover:text-[#FBC647]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm sm:text-base font-bold text-[#24352B] group-hover:text-[#046D38] transition-colors">
                    Kalender Hijriah
                  </p>
                  <span className="px-2 py-0.5 rounded-md bg-[#F7F8F5] border border-[#E3E9E3] text-[11px] font-medium text-[#24352B]">
                    MABIMS
                  </span>
                </div>
                <p className="text-xs text-[#68756C] truncate mt-0.5">
                  {hijriLabel} · Hari besar Islam
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#68756C] group-hover:text-[#046D38] shrink-0" />
          </button>
        </div>
      </section>

      {/* Kelompok 2: Al-Qur'an & Tadabbur */}
      <section aria-labelledby="more-group-quran" className="space-y-2">
        <h2
          id="more-group-quran"
          className="text-xs font-bold uppercase tracking-wider text-[#035328] px-1"
        >
          Al-Qur&apos;an &amp; Catatan
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Penanda & Catatan */}
          <button
            type="button"
            onClick={() => onSelectTab('bookmarks')}
            className="p-4 rounded-2xl border border-[#E3E9E3] bg-white hover:border-[#046D38] transition-colors flex items-center justify-between gap-3 text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="w-10 h-10 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3] group-hover:bg-[#046D38] group-hover:border-[#046D38] flex items-center justify-center shrink-0 transition-colors">
                <Bookmark className="w-5 h-5 text-[#046D38] group-hover:text-[#FBC647]" />
              </span>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-bold text-[#24352B] group-hover:text-[#046D38] transition-colors">
                  Penanda &amp; Catatan
                </p>
                <p className="text-xs text-[#68756C] truncate mt-0.5">
                  {bookmarksCount} penanda · {notesCount} catatan
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#68756C] group-hover:text-[#046D38] shrink-0" />
          </button>

          {/* Pencarian Ayat */}
          <button
            type="button"
            onClick={() => onSelectTab('search')}
            className="p-4 rounded-2xl border border-[#E3E9E3] bg-white hover:border-[#046D38] transition-colors flex items-center justify-between gap-3 text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="w-10 h-10 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3] group-hover:bg-[#046D38] group-hover:border-[#046D38] flex items-center justify-center shrink-0 transition-colors">
                <Search className="w-5 h-5 text-[#046D38] group-hover:text-[#FBC647]" />
              </span>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-bold text-[#24352B] group-hover:text-[#046D38] transition-colors">
                  Pencarian Ayat
                </p>
                <p className="text-xs text-[#68756C] truncate mt-0.5">
                  Telusuri kata kunci di 114 surat
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#68756C] group-hover:text-[#046D38] shrink-0" />
          </button>
        </div>
      </section>

      {/* Kelompok 3: Pengaturan & Aplikasi */}
      <section aria-labelledby="more-group-aplikasi" className="space-y-2">
        <h2
          id="more-group-aplikasi"
          className="text-xs font-bold uppercase tracking-wider text-[#035328] px-1"
        >
          Pengaturan &amp; Info
        </h2>

        <div className="rounded-2xl border border-[#E3E9E3] bg-white divide-y divide-[#E3E9E3] overflow-hidden">
          {/* Pengaturan */}
          <button
            type="button"
            onClick={() => onSelectTab('settings')}
            className="w-full min-h-[64px] p-4 flex items-center justify-between gap-3.5 text-left hover:bg-[#F7F8F5] transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3] group-hover:bg-[#046D38] group-hover:border-[#046D38] flex items-center justify-center shrink-0 transition-colors">
                <Settings className="w-5 h-5 text-[#046D38] group-hover:text-[#FBC647]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm sm:text-base font-bold text-[#24352B] group-hover:text-[#046D38] transition-colors">
                    Pengaturan Tampilan
                  </p>
                  <span className="px-2 py-0.5 rounded-md bg-[#F7F8F5] border border-[#E3E9E3] text-[11px] font-mono-num font-semibold text-[#046D38]">
                    {cachedSurahCount}/114 Offline
                  </span>
                </div>
                <p className="text-xs text-[#68756C] truncate mt-0.5">
                  Tipografi mushaf, ukuran font &amp; qari murottal
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#68756C] group-hover:text-[#046D38] shrink-0" />
          </button>

          {/* Tentang Ziezan Quran */}
          <button
            type="button"
            onClick={() => onSelectTab('about')}
            className="w-full min-h-[64px] p-4 flex items-center justify-between gap-3.5 text-left hover:bg-[#F7F8F5] transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3] group-hover:bg-[#046D38] group-hover:border-[#046D38] flex items-center justify-center shrink-0 transition-colors">
                <Info className="w-5 h-5 text-[#046D38] group-hover:text-[#FBC647]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-base font-bold text-[#24352B] group-hover:text-[#046D38] transition-colors">
                  Tentang Ziezan Quran
                </p>
                <p className="text-xs text-[#68756C] truncate mt-0.5">
                  Sumber data resmi dan kontak pengembang
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#68756C] group-hover:text-[#046D38] shrink-0" />
          </button>
        </div>
      </section>
    </div>
  );
};

interface AboutViewProps {
  onBack?: () => void;
}

export const AboutView: React.FC<AboutViewProps> = () => {
  return (
    <div className="container-app py-4 sm:py-6 space-y-5">
      {/* Brand Identity Card */}
      <section className="rounded-2xl border border-[#E3E9E3] bg-white p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-4">
          <img
            src={BRAND_LOGO_PATH}
            alt={APP_CONFIG.appName}
            className="w-14 h-14 rounded-2xl object-contain border border-[#E3E9E3] bg-[#035328] p-1.5 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-[#24352B]">
                {APP_CONFIG.appName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-md bg-[#F7F8F5] border border-[#E3E9E3] text-[11px] font-mono-num font-semibold text-[#046D38]">
                v{APP_INFO.version}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#68756C] mt-1">
              {APP_CONFIG.tagline} · <span className="font-medium text-[#046D38]">{SITE_URL}</span>
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm leading-relaxed text-[#24352B]">
          Aplikasi Al-Qur&apos;an Digital dan panduan ibadah harian berstandar resmi, bebas iklan, dan berfokus pada kemudahan membaca.
        </p>
      </section>

      {/* Sumber Data Resmi */}
      <section className="rounded-2xl border border-[#E3E9E3] bg-white p-5 sm:p-6 space-y-3">
        <h2 className="font-display text-base font-bold text-[#24352B]">
          Sumber Data Resmi
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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
