import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Bookmark,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Copy,
  Download,
  ExternalLink,
  Info,
  Mail,
  MapPin,
  Mic,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Volume2,
} from 'lucide-react';
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

interface MoreViewProps {
  onSelectTab: (tab: ActiveTab) => void;
  bookmarksCount: number;
  notesCount: number;
  cachedSurahCount: number;
  onOpenOfflineModal?: () => void;
  onOpenMicrophoneModal?: () => void;
}

export const MoreView: React.FC<MoreViewProps> = ({
  onSelectTab,
  bookmarksCount,
  notesCount,
  cachedSurahCount,
  onOpenOfflineModal,
  onOpenMicrophoneModal,
}) => {
  const [hijriLabel, setHijriLabel] = useState<string>('Kalender MABIMS Kemenag RI & Hari Besar');
  const savedLocation = storageService.getShalatLocation();
  const shalatReminders = storageService.getShalatReminders();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

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

          {/* Fitur Microphone Universal */}
          {onOpenMicrophoneModal && (
            <button
              type="button"
              onClick={onOpenMicrophoneModal}
              className="sm:col-span-2 p-4 rounded-2xl border border-[#E3E9E3] bg-white hover:border-[#046D38] transition-colors flex items-center justify-between gap-3 text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="w-10 h-10 rounded-xl bg-[#EDF5F0] border border-[#046D38]/25 group-hover:bg-[#046D38] group-hover:border-[#046D38] flex items-center justify-center shrink-0 transition-colors">
                  <Mic className="w-5 h-5 text-[#046D38] group-hover:text-[#FBC647]" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm sm:text-base font-bold text-[#24352B] group-hover:text-[#046D38] transition-colors">
                      Fitur Microphone (Suara &amp; Tilawah)
                    </p>
                    <span className="px-2 py-0.5 rounded-md bg-[#046D38] text-white text-[10px] font-bold">
                      Semua Perangkat &amp; Browser
                    </span>
                  </div>
                  <p className="text-xs text-[#68756C] truncate mt-0.5">
                    Pencarian perintah suara pintar, dikte lintas OS &amp; perekam evaluasi tilawah mandiri
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#68756C] group-hover:text-[#046D38] shrink-0" />
            </button>
          )}
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

          {/* Pusat Kesiapan Offline-First & Cache */}
          {onOpenOfflineModal && (
            <button
              type="button"
              onClick={onOpenOfflineModal}
              className="w-full min-h-[64px] p-4 flex items-center justify-between gap-3.5 text-left hover:bg-[#F7F8F5] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-[#EDF7F1] border border-[#046D38]/25 group-hover:bg-[#046D38] group-hover:border-[#046D38] flex items-center justify-center shrink-0 transition-colors">
                  <ShieldCheck className="w-5 h-5 text-[#046D38] group-hover:text-[#FBC647]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm sm:text-base font-bold text-[#24352B] group-hover:text-[#046D38] transition-colors">
                      Arsitektur Offline-First &amp; Penyimpanan Lokal
                    </p>
                    <span className="px-2 py-0.5 rounded-md bg-[#046D38] text-white text-[10px] font-bold">
                      IndexedDB &amp; Cache
                    </span>
                  </div>
                  <p className="text-xs text-[#68756C] truncate mt-0.5">
                    Verifikasi 135 resource wajib, kuota penyimpanan &amp; pembaruan PWA
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#68756C] group-hover:text-[#046D38] shrink-0" />
            </button>
          )}

          {/* Standalone PWA App Install Item */}
          {isInstalled ? (
            <div className="w-full min-h-[64px] p-4 flex items-center justify-between gap-3.5 bg-[#EDF5F0]">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-[#046D38] text-[#FBC647] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm sm:text-base font-bold text-[#035328]">
                      Aplikasi Standalone Terinstal
                    </p>
                    <span className="px-2 py-0.5 rounded bg-[#035328] text-white text-[10px] font-bold">
                      PWA
                    </span>
                  </div>
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
              className="w-full min-h-[64px] p-4 flex items-center justify-between gap-3.5 text-left bg-[#FAFDFB] hover:bg-[#EDF5F0] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-[#046D38] text-[#FBC647] flex items-center justify-center shrink-0 shadow-xs">
                  <Download className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm sm:text-base font-bold text-[#035328] group-hover:underline">
                      Instal Aplikasi Standalone
                    </p>
                    <span className="px-2 py-0.5 rounded bg-[#FBC647] text-[#24352B] text-[10px] font-bold">
                      Rekomendasi
                    </span>
                  </div>
                  <p className="text-xs text-[#68756C] truncate mt-0.5">
                    Instal Ziezan Quran ke layar utama &amp; nikmati aplikasi terpisah dari browser
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#046D38] shrink-0" />
            </button>
          ) : isIOS ? (
            <button
              type="button"
              onClick={() => setShowIOSModal(true)}
              className="w-full min-h-[64px] p-4 flex items-center justify-between gap-3.5 text-left bg-[#FAFDFB] hover:bg-[#EDF5F0] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-[#046D38] text-[#FBC647] flex items-center justify-center shrink-0 shadow-xs">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm sm:text-base font-bold text-[#035328] group-hover:underline">
                      Instal di iPhone / iPad
                    </p>
                    <span className="px-2 py-0.5 rounded bg-[#FBC647] text-[#24352B] text-[10px] font-bold">
                      iOS Safari
                    </span>
                  </div>
                  <p className="text-xs text-[#68756C] truncate mt-0.5">
                    Panduan 2-langkah tambah ke Layar Utama
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#046D38] shrink-0" />
            </button>
          ) : null}

          {/* Tentang Aplikasi (Ziezan Quran & Yayasan Karya Pondok Mandiri) */}
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
                  Tentang Aplikasi
                </p>
                <p className="text-xs text-[#68756C] truncate mt-0.5">
                  Alamat {YAYASAN_KPM_INFO.name}, sumber data &amp; pengembang
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#68756C] group-hover:text-[#046D38] shrink-0" />
          </button>
        </div>
      </section>

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
    </div>
  );
};

interface AboutViewProps {
  onBack?: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onBack }) => {
  const [copiedAddress, setCopiedAddress] = useState(false);

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
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-[#24352B]">
                Tentang Aplikasi — {APP_CONFIG.appName}
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
          {APP_INFO.description}
        </p>
      </section>

      {/* Informasi & Alamat Yayasan Karya Pondok Mandiri */}
      <section
        id="alamat-yayasan-kpm"
        aria-labelledby="heading-yayasan-kpm"
        className="rounded-2xl border-2 border-[#046D38]/25 bg-white p-5 sm:p-6 space-y-5 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 border-b border-[#E3E9E3]">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-[#E3E9E3] bg-[#FAFDFB] p-2 flex items-center justify-center shrink-0 shadow-2xs">
            <img
              src={YAYASAN_KPM_INFO.logoPath}
              alt={`Logo ${YAYASAN_KPM_INFO.name}`}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#046D38]">
              <Building2 className="w-3.5 h-3.5" />
              <span>Informasi Lembaga &amp; Alamat Resmi</span>
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

        {/* Box Alamat Lengkap Yayasan Karya Pondok Mandiri */}
        <div className="rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] p-4 sm:p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#035328] text-[#FBC647] flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#035328]">
                Alamat Yayasan Karya Pondok Mandiri
              </h3>
              <p className="text-sm sm:text-base font-bold text-[#24352B] leading-snug">
                {YAYASAN_KPM_INFO.addressFull}
              </p>
            </div>
          </div>

          {/* Detail Administratif Wilayah */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-[#E3E9E3] text-xs">
            <div className="p-2.5 rounded-lg bg-white border border-[#E3E9E3]">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#68756C]">
                Desa / Kelurahan
              </span>
              <span className="font-bold text-[#24352B] mt-0.5 block">
                {YAYASAN_KPM_INFO.addressDetails.desaKelurahan}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-[#E3E9E3]">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#68756C]">
                Kecamatan
              </span>
              <span className="font-bold text-[#24352B] mt-0.5 block">
                {YAYASAN_KPM_INFO.addressDetails.kecamatan}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-[#E3E9E3]">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#68756C]">
                Kabupaten / Kota
              </span>
              <span className="font-bold text-[#24352B] mt-0.5 block">
                {YAYASAN_KPM_INFO.addressDetails.kabupatenKota}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-[#E3E9E3]">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#68756C]">
                Provinsi &amp; Kode Pos
              </span>
              <span className="font-bold text-[#24352B] mt-0.5 block">
                {YAYASAN_KPM_INFO.addressDetails.provinsi} ({YAYASAN_KPM_INFO.addressDetails.kodePos})
              </span>
            </div>
          </div>

          {/* Tombol Aksi Alamat */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCopyAddress}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#046D38] text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#035328] transition-colors cursor-pointer"
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
              href={YAYASAN_KPM_INFO.mapsQueryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#E3E9E3] bg-white text-[#24352B] text-xs font-semibold inline-flex items-center gap-1.5 hover:border-[#046D38] hover:text-[#046D38] transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-[#046D38]" />
              <span>Buka Lokasi di Google Maps</span>
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
