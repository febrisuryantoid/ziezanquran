import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Code2,
  Database,
  Download,
  Globe,
  Info,
  Mail,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Volume2,
} from 'lucide-react';
import {
  APP_CONFIG,
  APP_INFO,
  ARABIC_FONT_OPTIONS,
  BRAND_LOGO_PATH,
  DEFAULT_PREFERENCES,
  QARI_OPTIONS,
} from '../config/brand';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { quranApi } from '../services/quranApi';
import {
  ArabicFontFamily,
  QariKey,
  ReadingPreferences,
} from '../types/quran';

interface SettingsViewProps {
  preferences: ReadingPreferences;
  cachedSurahCount: number;
  onUpdatePreferences: (next: ReadingPreferences) => void;
  onUpdateCachedCount: (count: number) => void;
  onShowToast?: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  preferences,
  cachedSurahCount,
  onUpdatePreferences,
  onUpdateCachedCount,
  onShowToast,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const selectedFontObj =
    ARABIC_FONT_OPTIONS.find((f) => f.id === preferences.arabicFontFamily) ||
    ARABIC_FONT_OPTIONS[0];

  const handleSyncOfflineData = async () => {
    if (isSyncingOffline) return;
    setIsSyncingOffline(true);
    try {
      const count = await quranApi.syncFullDataset((c) => {
        onUpdateCachedCount(c);
      });
      onUpdateCachedCount(count);
      if (count >= 114) {
        onShowToast?.('Seluruh 114 surat berhasil disimpan untuk akses offline');
      }
    } finally {
      setIsSyncingOffline(false);
    }
  };

  return (
    <div className="container-app py-4 sm:py-6 space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="card-surface flex items-center justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <h1
            className="font-display text-fluid-xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Tampilan & Pengaturan
          </h1>
          <p className="text-fluid-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            Sesuaikan tipografi mushaf, qari murottal, dan informasi aplikasi.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            onUpdatePreferences(DEFAULT_PREFERENCES);
            onShowToast?.('Pengaturan tampilan dikembalikan ke awal');
          }}
          aria-label="Reset pengaturan ke default"
          title="Reset ke Default"
          className="w-9 h-9 sm:w-auto sm:h-auto sm:px-3.5 sm:py-2 rounded-full border text-xs font-semibold flex items-center justify-center gap-1.5 bg-[#F7F8F5] hover:bg-[#F0F3EE] transition-colors shrink-0 cursor-pointer"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        >
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Reset Default</span>
        </button>
      </div>

      {/* Live Preview Ayat Box */}
      <div className="card-surface space-y-3">
        <div
          className="flex items-center justify-between gap-2 border-b pb-2.5 min-w-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span
            className="text-fluid-xs font-semibold uppercase tracking-wider truncate"
            style={{ color: 'var(--color-primary)' }}
          >
            Pratinjau Tampilan Ayat
          </span>
          <span
            className="text-fluid-xs font-mono-num shrink-0"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {selectedFontObj.name} · {preferences.arabicFontSize}px
          </span>
        </div>

        <p
          className={`${selectedFontObj.className} text-right`}
          style={{
            fontSize: `clamp(22px, 4.5vw, ${preferences.arabicFontSize}px)`,
            color: 'var(--color-text-primary)',
          }}
        >
          بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ ۝١ الْحَمْدُ لِلّٰهِ رَبِّ الْعٰلَمِيْنَ ۝٢
        </p>

        {preferences.showLatin && (
          <p className="text-fluid-sm italic break-words" style={{ color: 'var(--color-primary)' }}>
            Bismillāhir-raḥmānir-raḥīm(i). Al-ḥamdu lillāhi rabbil-‘ālamīn(a).
          </p>
        )}

        {preferences.showTranslation && (
          <p
            className="leading-relaxed break-words"
            style={{
              fontSize: `clamp(13px, 2.5vw, ${preferences.translationFontSize}px)`,
              color: 'var(--color-text-primary)',
            }}
          >
            Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang. Segala puji bagi Allah, Tuhan semesta alam.
          </p>
        )}
      </div>

      {/* 1. Typography & Reading Controls */}
      <div className="card-surface space-y-4">
        <h2 className="font-display text-fluid-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Tipografi & Tampilan Bacaan
        </h2>

        {/* Arabic Font Family Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {ARABIC_FONT_OPTIONS.map((font) => {
            const active = preferences.arabicFontFamily === font.id;
            return (
              <button
                key={font.id}
                type="button"
                onClick={() =>
                  onUpdatePreferences({
                    ...preferences,
                    arabicFontFamily: font.id as ArabicFontFamily,
                  })
                }
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  active
                    ? 'border-[#046D38] bg-[#FAFDFB] ring-1 ring-[#046D38]'
                    : 'border-[#E3E9E3] bg-white hover:border-[#046D38]/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="font-semibold text-xs sm:text-sm"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {font.name}
                  </span>
                  {active && <CheckCircle2 className="w-4 h-4 text-[#046D38] shrink-0" />}
                </div>
                <p
                  className="text-fluid-xs mt-1"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {font.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Sliders for Arabic & Translation Size */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="arabic-size-range" className="text-xs sm:text-sm font-semibold">
                Ukuran Huruf Arab
              </label>
              <span
                className="text-xs font-mono-num font-bold"
                style={{ color: 'var(--color-primary)' }}
              >
                {preferences.arabicFontSize} px
              </span>
            </div>
            <input
              id="arabic-size-range"
              type="range"
              min={24}
              max={48}
              step={2}
              value={preferences.arabicFontSize}
              onChange={(e) =>
                onUpdatePreferences({
                  ...preferences,
                  arabicFontSize: Number(e.target.value),
                })
              }
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#046D38] bg-[#E3E9E3]"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="translation-size-range" className="text-xs sm:text-sm font-semibold">
                Ukuran Terjemahan
              </label>
              <span
                className="text-xs font-mono-num font-bold"
                style={{ color: 'var(--color-primary)' }}
              >
                {preferences.translationFontSize} px
              </span>
            </div>
            <input
              id="translation-size-range"
              type="range"
              min={13}
              max={22}
              step={1}
              value={preferences.translationFontSize}
              onChange={(e) =>
                onUpdatePreferences({
                  ...preferences,
                  translationFontSize: Number(e.target.value),
                })
              }
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#046D38] bg-[#E3E9E3]"
            />
          </div>
        </div>

        {/* Tactile Switch Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() =>
              onUpdatePreferences({ ...preferences, showLatin: !preferences.showLatin })
            }
            className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-left cursor-pointer min-w-0 hover:border-[#046D38]/40 transition-colors"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Transliterasi Latin
              </p>
              <p className="text-fluid-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Tampilkan bacaan Latin
              </p>
            </div>
            <span
              className={`w-11 h-6 rounded-full p-0.5 flex items-center transition-colors shrink-0 ${
                preferences.showLatin ? 'bg-[#046D38] justify-end' : 'bg-[#D5DFD6] justify-start'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              onUpdatePreferences({
                ...preferences,
                showTranslation: !preferences.showTranslation,
              })
            }
            className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-left cursor-pointer min-w-0 hover:border-[#046D38]/40 transition-colors"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Terjemahan Indonesia
              </p>
              <p className="text-fluid-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Tampilkan arti Bahasa Indonesia
              </p>
            </div>
            <span
              className={`w-11 h-6 rounded-full p-0.5 flex items-center transition-colors shrink-0 ${
                preferences.showTranslation ? 'bg-[#046D38] justify-end' : 'bg-[#D5DFD6] justify-start'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
            </span>
          </button>
        </div>
      </div>

      {/* 2. Audio & Qari Preferences */}
      <div className="card-surface space-y-3.5">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-[#046D38] shrink-0" />
          <h2 className="font-display text-fluid-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Audio Murottal & Qari
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {Object.values(QARI_OPTIONS).map((qari) => {
            const active = preferences.selectedQari === qari.id;
            return (
              <button
                key={qari.id}
                type="button"
                onClick={() =>
                  onUpdatePreferences({
                    ...preferences,
                    selectedQari: qari.id as QariKey,
                  })
                }
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  active
                    ? 'border-[#046D38] bg-[#FAFDFB] ring-1 ring-[#046D38]'
                    : 'border-[#E3E9E3] bg-white hover:border-[#046D38]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-mono-num font-bold"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    Qari {qari.id}
                  </span>
                  {active && <CheckCircle2 className="w-4 h-4 text-[#046D38]" />}
                </div>
                <p
                  className="font-semibold text-xs sm:text-sm mt-1 truncate"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {qari.name}
                </p>
                <p className="text-fluid-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                  {qari.style}
                </p>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() =>
            onUpdatePreferences({
              ...preferences,
              autoPlayNextAyat: !preferences.autoPlayNextAyat,
            })
          }
          className="w-full p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-left cursor-pointer min-w-0 hover:border-[#046D38]/40 transition-colors"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Putar Otomatis Ayat Berikutnya
            </p>
            <p className="text-fluid-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Lanjutkan audio dan gulir otomatis dari ayat ke ayat
            </p>
          </div>
          <span
            className={`w-11 h-6 rounded-full p-0.5 flex items-center transition-colors shrink-0 ${
              preferences.autoPlayNextAyat ? 'bg-[#046D38] justify-end' : 'bg-[#D5DFD6] justify-start'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
          </span>
        </button>
      </div>

      {/* 3. Offline Cache & PWA Install Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
        <div className="card-surface space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#046D38] shrink-0" />
              <h3 className="font-semibold text-sm sm:text-base" style={{ color: 'var(--color-text-primary)' }}>
                Data Offline (114 Surat)
              </h3>
            </div>
            <p className="text-fluid-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Simpan seluruh mushaf dan terjemahan ke memori perangkat untuk akses tanpa internet.
            </p>
          </div>

          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--color-text-secondary)' }}>Tersimpan</span>
              <span className="font-mono-num font-bold" style={{ color: 'var(--color-primary)' }}>
                {cachedSurahCount} / 114 ({Math.round((cachedSurahCount / 114) * 100)}%)
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#F0F3EE] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, Math.round((cachedSurahCount / 114) * 100))}%`,
                  backgroundColor: 'var(--color-primary)',
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleSyncOfflineData}
              disabled={isSyncingOffline || cachedSurahCount >= 114}
              className="w-full min-h-[40px] px-4 py-2 rounded-full text-xs font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-55 cursor-pointer"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Download className="w-4 h-4 text-[#FBC647] shrink-0" />
              <span className="truncate">
                {cachedSurahCount >= 114
                  ? '114 Surat Tersimpan Offline'
                  : isSyncingOffline
                    ? `Mengunduh (${cachedSurahCount}/114)...`
                    : 'Unduh 114 Surat Offline'}
              </span>
            </button>
          </div>
        </div>

        <div className="card-surface space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#046D38] shrink-0" />
              <h3 className="font-semibold text-sm sm:text-base" style={{ color: 'var(--color-text-primary)' }}>
                Instalasi Aplikasi (PWA)
              </h3>
            </div>
            <p className="text-fluid-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Pasang <strong>{APP_CONFIG.appName}</strong> di layar utama perangkat Anda.
            </p>
          </div>

          <div className="pt-1">
            {isInstalled ? (
              <div
                className="p-3 rounded-xl bg-[#F0F3EE] text-xs font-semibold flex items-center gap-2"
                style={{ color: 'var(--color-primary)' }}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Aplikasi telah terpasang di perangkat ini.</span>
              </div>
            ) : isInstallable ? (
              <button
                type="button"
                onClick={install}
                className="w-full min-h-[40px] px-4 py-2 rounded-full text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Download className="w-4 h-4 text-[#FBC647] shrink-0" />
                <span>Instal {APP_CONFIG.appName}</span>
              </button>
            ) : isIOS ? (
              <div
                className="p-3 rounded-xl bg-[#F7F8F5] border text-xs"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                Ketuk tombol <strong>Bagikan (Share)</strong> di Safari lalu pilih{' '}
                <strong>Tambah ke Layar Utama</strong>.
              </div>
            ) : (
              <div
                className="p-3 rounded-xl bg-[#F7F8F5] border text-xs"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Gunakan menu browser (<strong>Instal Aplikasi</strong> / <strong>Tambahkan ke Layar Utama</strong>).
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Dedicated Section: Informasi Aplikasi, Keamanan & Profil Pengembang (Febri Suryanto / Ziezan Solutions) */}
      <section
        className="card-surface space-y-4"
        itemScope
        itemType="https://schema.org/SoftwareApplication"
      >
        <div
          className="flex items-center justify-between gap-3 pb-3 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Info className="w-4 h-4 text-[#046D38] shrink-0" />
            <h2
              className="font-display text-fluid-lg font-bold truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Informasi Aplikasi & Pengembang
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#046D38] bg-[#EDF5F0] px-2.5 py-0.5 rounded-lg"
              title="Data lokal terenkripsi dengan integritas MAC"
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Terenkripsi</span>
            </span>
            <span
              itemProp="softwareVersion"
              className="text-xs font-mono-num font-semibold shrink-0"
              style={{ color: 'var(--color-primary)' }}
            >
              v{APP_INFO.version}
            </span>
          </div>
        </div>

        {/* Brand Identity & Full App Description */}
        <div className="flex flex-col sm:flex-row items-start gap-3.5 sm:gap-4">
          {!logoError && (
            <img
              src={BRAND_LOGO_PATH}
              alt={APP_CONFIG.appName}
              referrerPolicy="no-referrer"
              onError={() => setLogoError(true)}
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl object-contain shrink-0 ring-1 ring-[#E3E9E3] bg-[#F7F8F5] p-1"
            />
          )}
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                itemProp="name"
                className="font-display text-base sm:text-lg font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {APP_CONFIG.appName}
              </h3>
              <span className="text-xs text-[#68756C]">·</span>
              <span className="text-xs font-medium text-[#046D38]">{APP_INFO.edition}</span>
              <span className="text-xs text-[#68756C]">·</span>
              <a
                itemProp="url"
                href={APP_INFO.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono-num font-semibold text-[#046D38] hover:underline"
              >
                {APP_INFO.domain}
              </a>
            </div>
            <p
              className="text-xs sm:text-sm font-medium italic"
              style={{ color: 'var(--color-primary)' }}
            >
              &ldquo;{APP_CONFIG.tagline}&rdquo;
            </p>
            <p
              itemProp="description"
              className="text-fluid-xs leading-relaxed pt-0.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {APP_INFO.description}
            </p>
          </div>
        </div>

        {/* Developer Profile Card */}
        <div
          itemProp="author"
          itemScope
          itemType="https://schema.org/Person"
          className="rounded-2xl p-4 sm:p-5 border space-y-3 bg-[#FAFDFB]"
          style={{
            borderColor: 'rgba(4, 109, 56, 0.22)',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
                <Code2 className="w-3.5 h-3.5 shrink-0" />
                <span>Kreator & Pengembang Utama</span>
              </div>
              <h4
                itemProp="name"
                className="font-display text-lg sm:text-xl font-bold tracking-tight"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {APP_INFO.developerName}
              </h4>
              <p
                className="text-xs sm:text-[13px] font-semibold flex flex-wrap items-center gap-x-1.5 gap-y-0.5"
                style={{ color: 'var(--color-primary)' }}
              >
                <span itemProp="jobTitle">{APP_INFO.developerRole}</span>
                <span aria-hidden="true">·</span>
                <span
                  itemProp="worksFor"
                  itemScope
                  itemType="https://schema.org/Organization"
                  className="inline-flex items-center gap-1 font-bold text-[#035328]"
                >
                  <Building2 className="w-3.5 h-3.5 text-[#046D38] shrink-0" />
                  <span itemProp="name">{APP_INFO.agencyName}</span>
                </span>
              </p>
            </div>

            <a
              href={APP_INFO.developerMailtoUrl}
              title={`Kirim email ke ${APP_INFO.developerName} (${APP_INFO.developerEmail})`}
              aria-label={`Kirim email ke ${APP_INFO.developerName} di ${APP_INFO.developerEmail}`}
              className="group flex items-center gap-1.5 text-xs font-medium bg-white hover:bg-[#046D38]/[0.06] px-3 py-1.5 rounded-xl border transition-all self-start sm:self-center shrink-0 active:scale-[0.98]"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <Mail className="w-3.5 h-3.5 text-[#046D38] shrink-0 transition-transform group-hover:scale-110" />
              <span
                itemProp="email"
                content={APP_INFO.developerEmail}
                className="truncate group-hover:text-[#046D38] transition-colors"
              >
                {APP_INFO.developerContact}
              </span>
            </a>
          </div>

          <p
            itemProp="description"
            className="text-fluid-xs leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {APP_INFO.developerBio}
          </p>

          {/* Core Expertise & Agency Specializations */}
          <div className="pt-0.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
            {APP_INFO.developerSkills.map((skill) => (
              <span
                key={skill}
                itemProp="knowsAbout"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border text-[11px] sm:text-xs font-semibold"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <Sparkles className="w-3 h-3 text-[#FBC647] fill-[#FBC647] shrink-0" />
                <span>{skill}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Agency & Data Source Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Agency Profile */}
          <div
            itemProp="publisher"
            itemScope
            itemType="https://schema.org/Organization"
            className="p-3.5 rounded-2xl bg-[#F7F8F5] space-y-1 min-w-0"
          >
            <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span>Agensi Digital & Teknologi</span>
            </div>
            <p
              itemProp="name"
              className="text-xs sm:text-sm font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {APP_INFO.agencyName}
            </p>
            <p
              itemProp="description"
              className="text-fluid-xs leading-snug"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {APP_INFO.agencyTagline} — Dipimpin oleh <strong>{APP_INFO.developerName}</strong>.
            </p>
          </div>

          {/* API & Mushaf Source Info */}
          <div className="p-3.5 rounded-2xl bg-[#F7F8F5] space-y-1 min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span>Sumber Data Mushaf & API</span>
            </div>
            <p className="text-xs sm:text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {APP_INFO.dataSourceName}
            </p>
            <p className="text-fluid-xs leading-snug" style={{ color: 'var(--color-text-secondary)' }}>
              {APP_INFO.dataSourceDetail}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

