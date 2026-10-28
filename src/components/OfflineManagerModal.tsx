import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CloudDownload,
  Database,
  Download,
  HardDrive,
  Info,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { APP_CONFIG } from '../config/brand';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { ResourceCategoryKey } from '../services/offlineSyncService';

function formatBytesToMB(bytes: number): string {
  if (!bytes || bytes <= 0) return '0.0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.max(0.1, Math.round(mb * 10) / 10)} MB`;
  return `${mb.toFixed(1)} MB`;
}

interface OfflineStatusBannerProps {
  onOpenModal: () => void;
}

export const OfflineStatusBanner: React.FC<OfflineStatusBannerProps> = ({
  onOpenModal,
}) => {
  const isOnline = useOnlineStatus();
  const {
    syncState,
    retryFailedOnly,
    applyServiceWorkerUpdate,
  } = useOfflineSync();

  const [dismissedReadyBanner, setDismissedReadyBanner] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('ziezan_ready_banner_dismissed') === '1';
    } catch {
      return false;
    }
  });

  // Auto-hide the "100% Ready" celebration banner after 6 seconds when online so it never clutters the UI
  useEffect(() => {
    if (syncState.isVerifiedReady && isOnline && !dismissedReadyBanner) {
      const timer = setTimeout(() => {
        setDismissedReadyBanner(true);
        try {
          sessionStorage.setItem('ziezan_ready_banner_dismissed', '1');
        } catch {
          // Ignore
        }
      }, 6500);
      return () => clearTimeout(timer);
    }
  }, [syncState.isVerifiedReady, isOnline, dismissedReadyBanner]);

  // 1. Service Worker Update Available Banner
  if (syncState.swState.updateAvailable) {
    return (
      <div
        className="w-full px-3 sm:px-4 py-2 text-xs font-medium border-b flex items-center justify-between gap-2"
        style={{
          backgroundColor: '#035328',
          color: '#FFFFFF',
          borderColor: 'rgba(251, 198, 71, 0.35)',
        }}
        role="status"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-[#FBC647] shrink-0" />
          <span className="truncate">
            Versi baru <strong>{APP_CONFIG.appName}</strong> siap digunakan. Data lokal Anda tetap aman.
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => void applyServiceWorkerUpdate()}
            disabled={syncState.swState.updating}
            className="px-2.5 py-1 rounded-lg bg-[#FBC647] text-[#24352B] font-bold text-[11px] hover:brightness-105 transition cursor-pointer"
          >
            {syncState.swState.updating ? 'Memperbarui...' : 'Perbarui Aplikasi'}
          </button>
        </div>
      </div>
    );
  }

  // 2. Offline Connectivity Mode Banner
  if (!isOnline) {
    return (
      <div
        className="w-full px-3 sm:px-4 py-2 text-xs font-medium border-b flex items-center justify-between gap-2"
        style={{
          backgroundColor: syncState.isVerifiedReady ? '#035328' : '#7C2D12',
          color: '#FFFFFF',
          borderColor: 'rgba(251, 198, 71, 0.3)',
        }}
        role="status"
      >
        <div className="flex items-center gap-2 min-w-0">
          <WifiOff className="w-3.5 h-3.5 text-[#FBC647] shrink-0" />
          <span className="truncate">
            {syncState.isVerifiedReady
              ? 'Mode Offline Aktif — Seluruh 114 Surat & fitur inti berjalan penuh dari memori perangkat.'
              : `Mode Offline — Pengunduhan dijeda (${syncState.completedResources}/${syncState.totalResources} resource tersimpan).`}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenModal}
          className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-semibold text-[11px] shrink-0 transition cursor-pointer"
        >
          Status Offline
        </button>
      </div>
    );
  }

  // 3. Active Downloading / Verifying Progress Bar
  if (
    syncState.status === 'downloading' ||
    syncState.status === 'verifying' ||
    syncState.status === 'preparing'
  ) {
    return (
      <div
        className="w-full px-3 sm:px-4 py-2 text-xs border-b bg-[#F6FBF8]"
        style={{ borderColor: '#CBE3D4' }}
        role="status"
        aria-live="polite"
      >
        <div className="container-app flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Loader2 className="w-3.5 h-3.5 text-[#046D38] animate-spin shrink-0" />
            <span className="font-semibold text-[#035328] truncate">
              Persiapan Offline-First: {syncState.progressPercent}% ({syncState.completedResources}/
              {syncState.totalResources} resource)
            </span>
            <span className="hidden md:inline text-[#68756C] truncate">
              · {syncState.currentTaskLabel}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex-1 sm:w-28 h-1.5 rounded-full bg-[#DCE9E0] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#046D38] transition-all duration-300"
                style={{ width: `${syncState.progressPercent}%` }}
              />
            </div>
            <button
              type="button"
              onClick={onOpenModal}
              className="px-2.5 py-0.5 rounded-md bg-[#046D38] text-white font-semibold text-[11px] hover:bg-[#035328] transition cursor-pointer"
            >
              Rincian
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Partial Error or Paused State when Online
  if (
    !syncState.isVerifiedReady &&
    (syncState.status === 'partial_error' || syncState.failedResources.length > 0)
  ) {
    return (
      <div
        className="w-full px-3 sm:px-4 py-2 text-xs border-b bg-[#FFFBEB] text-[#92400E]"
        style={{ borderColor: '#FDE68A' }}
        role="alert"
      >
        <div className="container-app flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
            <span className="truncate">
              Persiapan offline belum lengkap ({syncState.completedResources}/
              {syncState.totalResources} tersimpan, {syncState.failedResources.length} gagal).
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void retryFailedOnly()}
              className="px-2.5 py-1 rounded-md bg-[#D97706] text-white font-bold text-[11px] hover:bg-[#B45309] transition cursor-pointer"
            >
              Coba Lagi
            </button>
            <button
              type="button"
              onClick={onOpenModal}
              className="px-2 py-1 rounded-md border border-[#F59E0B]/40 text-[#92400E] font-semibold text-[11px] hover:bg-[#FEF3C7] transition cursor-pointer"
            >
              Detail
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Verified 100% Ready Confirmation Banner (auto-dismisses after 6.5s)
  if (syncState.isVerifiedReady && !dismissedReadyBanner) {
    return (
      <div
        className="w-full px-3 sm:px-4 py-1.5 text-xs border-b bg-[#EDF7F1] text-[#035328]"
        style={{ borderColor: '#C3E2CE' }}
        role="status"
      >
        <div className="container-app flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#046D38] shrink-0" />
            <span className="truncate font-medium">
              <strong>Siap Offline 100% Terverifikasi</strong> — Seluruh 114 Surat ({syncState.completedResources}/
              {syncState.totalResources} resource) telah tersimpan di perangkat Anda.
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onOpenModal}
              className="px-2 py-0.5 rounded bg-[#046D38]/10 hover:bg-[#046D38]/20 text-[#035328] font-semibold text-[11px] cursor-pointer"
            >
              Detail
            </button>
            <button
              type="button"
              onClick={() => {
                setDismissedReadyBanner(true);
                try {
                  sessionStorage.setItem('ziezan_ready_banner_dismissed', '1');
                } catch {
                  // Ignore
                }
              }}
              aria-label="Tutup pemberitahuan"
              className="p-0.5 rounded hover:bg-[#046D38]/10 text-[#035328] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

interface OfflineManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

export const OfflineManagerModal: React.FC<OfflineManagerModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const {
    syncState,
    startOrResumeSync,
    retryFailedOnly,
    verifyIntegrityNow,
    downloadAllTafsirsOffline,
    requestPersistentStorage,
    applyServiceWorkerUpdate,
  } = useOfflineSync();

  const [isVerifyingManual, setIsVerifyingManual] = useState(false);

  const handleManualVerify = async () => {
    setIsVerifyingManual(true);
    try {
      const ok = await verifyIntegrityNow();
      onShowToast?.(
        ok
          ? 'Verifikasi selesai: Seluruh 135 resource wajib valid & siap digunakan offline.'
          : 'Ditemukan resource yang belum lengkap. Klik Lanjutkan Pengunduhan.'
      );
    } finally {
      setIsVerifyingManual(false);
    }
  };

  const handleRequestPersist = async () => {
    const granted = await requestPersistentStorage();
    onShowToast?.(
      granted
        ? 'Penyimpanan Persisten diaktifkan oleh browser.'
        : 'Browser mengelola kuota penyimpanan secara otomatis.'
    );
  };

  const categoryOrder: ResourceCategoryKey[] = [
    'app_shell',
    'quran_mushaf',
    'doa_dzikir',
    'shalat_schedule',
    'hijri_qibla',
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Pusat Kesiapan Offline-First & PWA Ziezan Quran"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/55 backdrop-blur-xs"
          />

          <motion.div
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-2xl max-h-[90dvh] bg-white sm:rounded-3xl rounded-t-3xl border shadow-2xl flex flex-col overflow-hidden"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {/* Header */}
            <div
              className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 border-b shrink-0"
              style={{
                backgroundColor: 'var(--color-header)',
                borderColor: 'rgba(255,255,255,0.12)',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-[#FBC647]/20 border border-[#FBC647]/40 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-[#FBC647]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base sm:text-lg font-bold text-white truncate">
                      Arsitektur Offline-First &amp; PWA
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isOnline
                          ? 'bg-[#046D38] text-[#FBC647] border border-[#FBC647]/30'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-xs text-white/75 truncate">
                    Manajemen Cache Storage, IndexedDB &amp; Instalasi Mandiri
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup panel offline"
                className="w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div
              className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5"
              style={{ paddingBottom: 'calc(1.5rem + var(--safe-bottom))' }}
            >
              {/* 1. Overall Readiness & Progress Card */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
                  syncState.isVerifiedReady
                    ? 'bg-[#F3FAF6] border-[#046D38]/30'
                    : 'bg-[#F7F8F5] border-[#E3E9E3]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {syncState.isVerifiedReady ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#046D38] text-white text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#FBC647]" />
                          <span>Siap Digunakan Offline 100%</span>
                        </span>
                      ) : syncState.status === 'downloading' ||
                        syncState.status === 'verifying' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#035328] text-[#FBC647] text-xs font-bold">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Sedang Mengunduh &amp; Memverifikasi...</span>
                        </span>
                      ) : syncState.status === 'paused_offline' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-600 text-white text-xs font-bold">
                          <WifiOff className="w-3.5 h-3.5" />
                          <span>Tertunda (Menunggu Internet)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                          <span>Persiapan Offline Belum Selesai</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#24352B] font-medium pt-0.5">
                      {syncState.currentTaskLabel}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono-num text-xl sm:text-2xl font-bold text-[#035328]">
                      {syncState.progressPercent}%
                    </span>
                    <p className="text-[11px] font-mono-num text-[#68756C]">
                      {syncState.completedResources} / {syncState.totalResources} Resource Wajib
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2.5 rounded-full bg-[#E3E9E3] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${syncState.progressPercent}%`,
                      backgroundColor: syncState.isVerifiedReady
                        ? '#046D38'
                        : '#035328',
                    }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#68756C]">
                  <span>
                    Estimasi ukuran resource inti: <strong>~{syncState.estimatedTotalSizeMB} MB</strong>
                  </span>
                  {syncState.lastVerifiedAt && (
                    <span>
                      Terverifikasi:{' '}
                      {new Date(syncState.lastVerifiedAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>

                {/* Primary Controls */}
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  {!syncState.isVerifiedReady && (
                    <button
                      type="button"
                      disabled={
                        !isOnline ||
                        syncState.status === 'downloading' ||
                        syncState.status === 'verifying'
                      }
                      onClick={() => void startOrResumeSync(false)}
                      className="min-h-[38px] px-4 py-2 rounded-xl bg-[#046D38] hover:bg-[#035328] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <CloudDownload className="w-4 h-4 text-[#FBC647]" />
                      <span>
                        {syncState.status === 'downloading'
                          ? 'Sedang Mengunduh...'
                          : 'Lanjutkan Pengunduhan Offline'}
                      </span>
                    </button>
                  )}

                  {syncState.failedResources.length > 0 && (
                    <button
                      type="button"
                      disabled={!isOnline || syncState.status === 'downloading'}
                      onClick={() => void retryFailedOnly()}
                      className="min-h-[38px] px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>
                        Ulangi {syncState.failedResources.length} Resource Gagal
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isVerifyingManual || syncState.status === 'downloading'}
                    onClick={() => void handleManualVerify()}
                    className="min-h-[38px] px-3.5 py-2 rounded-xl border border-[#046D38]/30 bg-white hover:bg-[#F7F8F5] text-[#035328] text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#046D38]" />
                    <span>
                      {isVerifyingManual ? 'Memverifikasi...' : 'Verifikasi Integritas'}
                    </span>
                  </button>

                  {syncState.isVerifiedReady && isOnline && (
                    <button
                      type="button"
                      disabled={syncState.status === 'downloading'}
                      onClick={() => void startOrResumeSync(true)}
                      className="min-h-[38px] px-3 py-2 rounded-xl border border-[#E3E9E3] bg-white hover:bg-[#F7F8F5] text-[#68756C] text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Perbarui Cache Lokal</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Failed Resources Alert List (If any) */}
              {syncState.failedResources.length > 0 && (
                <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50/70 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Daftar Resource yang Gagal Diunduh ({syncState.failedResources.length})
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={!isOnline}
                      onClick={() => void retryFailedOnly()}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
                    >
                      Retry Hanya yang Gagal
                    </button>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                    {syncState.failedResources.slice(0, 15).map((item) => (
                      <div
                        key={item.id}
                        className="p-2 rounded-lg bg-white border border-amber-200 flex items-center justify-between gap-2 text-[11px]"
                      >
                        <span className="font-semibold text-[#24352B] truncate">
                          {item.label}
                        </span>
                        <span className="text-red-600 truncate max-w-[50%]">
                          {item.error}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Granular Breakdown by 5 Core Categories */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#035328]">
                  Rincian 5 Komponen Inti Offline-First
                </h3>
                <div className="space-y-2">
                  {categoryOrder.map((catKey) => {
                    const cat = syncState.categories[catKey];
                    const isDone = cat.completed >= cat.total && cat.status === 'verified';
                    return (
                      <div
                        key={cat.key}
                        className="p-3.5 rounded-2xl border border-[#E3E9E3] bg-white flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-[#24352B]">
                              {cat.label}
                            </span>
                            {isDone ? (
                              <span className="px-2 py-0.5 rounded-full bg-[#EDF7F1] text-[#046D38] text-[10px] font-bold">
                                Terverifikasi
                              </span>
                            ) : cat.status === 'error' ? (
                              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold">
                                Perlu Retry
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-[#F7F8F5] text-[#68756C] text-[10px] font-semibold">
                                Menyiapkan
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#68756C] leading-snug">
                            {cat.description}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono-num text-xs sm:text-sm font-bold text-[#046D38]">
                            {cat.completed}/{cat.total}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Optional Expansion: Full 114 Surah Tafsir Kemenag RI Offline */}
              <div className="p-4 rounded-2xl border border-[#E3E9E3] bg-[#FAFDFB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#046D38] shrink-0" />
                    <h4 className="text-xs sm:text-sm font-bold text-[#24352B]">
                      Paket Tambahan: Tafsir Kemenag RI (114 Surat)
                    </h4>
                    <span className="px-2 py-0.5 rounded bg-[#EDF5F0] text-[#046D38] font-mono-num text-[11px] font-bold">
                      {syncState.cachedTafsirCount}/114
                    </span>
                  </div>
                  <p className="text-[11px] text-[#68756C]">
                    Simpan seluruh teks Tafsir Tahlili 114 Surat ke IndexedDB agar modal Tafsir per-ayat dapat dibuka 100% tanpa internet.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={
                    !isOnline ||
                    syncState.isSyncingTafsir ||
                    syncState.cachedTafsirCount >= 114
                  }
                  onClick={() => void downloadAllTafsirsOffline()}
                  className="min-h-[38px] px-3.5 py-2 rounded-xl bg-[#035328] hover:bg-[#046D38] disabled:opacity-50 text-white text-xs font-bold shrink-0 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#FBC647]" />
                  <span>
                    {syncState.cachedTafsirCount >= 114
                      ? '114 Tafsir Tersimpan'
                      : syncState.isSyncingTafsir
                        ? `Mengunduh (${syncState.cachedTafsirCount}/114)...`
                        : 'Unduh 114 Tafsir'}
                  </span>
                </button>
              </div>

              {/* 5. Device Storage Quota & Persistent Storage Status */}
              <div className="p-4 rounded-2xl border border-[#E3E9E3] bg-white space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-[#046D38]" />
                    <h3 className="text-xs sm:text-sm font-bold text-[#24352B]">
                      Penyimpanan Lokal Perangkat (IndexedDB &amp; Cache Storage)
                    </h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      syncState.storageInfo.isPersistent
                        ? 'bg-[#EDF7F1] text-[#046D38]'
                        : 'bg-[#F7F8F5] text-[#68756C]'
                    }`}
                  >
                    {syncState.storageInfo.isPersistent
                      ? 'Persistent Storage Aktif'
                      : 'Standar Browser'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3]">
                    <p className="text-[11px] text-[#68756C]">Terpakai</p>
                    <p className="font-mono-num font-bold text-[#24352B] mt-0.5">
                      {formatBytesToMB(syncState.storageInfo.usageBytes)}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3]">
                    <p className="text-[11px] text-[#68756C]">Kuota Tersedia</p>
                    <p className="font-mono-num font-bold text-[#24352B] mt-0.5">
                      {syncState.storageInfo.quotaBytes > 0
                        ? formatBytesToMB(syncState.storageInfo.quotaBytes)
                        : 'Tidak Dibatasi'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3] col-span-2 sm:col-span-1">
                    <p className="text-[11px] text-[#68756C]">Status Engine</p>
                    <p className="font-bold text-[#046D38] mt-0.5">
                      {syncState.storageInfo.idbHealthy ? 'IndexedDB v3 Aktif' : 'Mode Fallback'}
                    </p>
                  </div>
                </div>

                {!syncState.storageInfo.isPersistent && syncState.storageInfo.supported && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <p className="text-[11px] text-[#68756C]">
                      Lindungi data mushaf offline agar tidak dihapus otomatis oleh sistem operasi saat memori penuh.
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleRequestPersist()}
                      className="px-3 py-1.5 rounded-lg border border-[#046D38] text-[#046D38] hover:bg-[#EDF7F1] text-[11px] font-bold shrink-0 cursor-pointer"
                    >
                      Aktifkan Proteksi
                    </button>
                  </div>
                )}
              </div>

              {/* 6. PWA Installation vs Offline Preparation Guide */}
              <div className="p-4 rounded-2xl border border-[#E3E9E3] bg-white space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#046D38]" />
                    <h3 className="text-xs sm:text-sm font-bold text-[#24352B]">
                      Instalasi PWA Standalone &amp; Kesiapan Offline
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#EDF5F0] text-[#046D38] text-[10px] font-bold">
                    {isInstalled ? 'Terinstal (Standalone)' : 'Mode Browser'}
                  </span>
                </div>

                <p className="text-[11px] text-[#68756C] leading-relaxed">
                  <strong>Penting:</strong> Menginstal ikon PWA ke layar utama dan mengunduh resource offline adalah dua tahap yang saling melengkapi. Pastikan indikator di atas menunjukkan <strong>100% Terverifikasi</strong> sebelum menutup koneksi internet pertama kali.
                </p>

                {!isInstalled && (
                  <div>
                    {isInstallable ? (
                      <button
                        type="button"
                        onClick={() => void install()}
                        className="w-full min-h-[40px] px-4 py-2 rounded-xl bg-[#035328] hover:bg-[#046D38] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-[#FBC647]" />
                        <span>Instal Aplikasi Ziezan Quran ke Perangkat</span>
                      </button>
                    ) : isIOS ? (
                      <div className="p-3 rounded-xl bg-[#F7F8F5] border border-[#E3E9E3] text-xs text-[#24352B]">
                        <strong>Panduan iOS Safari:</strong> Ketuk tombol{' '}
                        <strong>Bagikan (Share)</strong> di bilah bawah Safari, lalu pilih{' '}
                        <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* 7. Transparency Matrix: Offline vs Online Capabilities */}
              <div className="p-4 rounded-2xl border border-[#E3E9E3] bg-[#F7F8F5] space-y-2.5">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#035328]" />
                  <h3 className="text-xs font-bold text-[#035328] uppercase tracking-wider">
                    Transparansi Fitur Offline vs Online
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                  <div className="p-3 rounded-xl bg-white border border-[#E3E9E3] space-y-1">
                    <p className="font-bold text-[#046D38] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>100% Berfungsi Tanpa Internet</span>
                    </p>
                    <ul className="text-[#24352B] space-y-0.5 pl-4 list-disc">
                      <li>Mushaf 114 Surat &amp; 6.236 Ayat + Tajwid Berwarna</li>
                      <li>Pencarian Kata Kunci Lintas 114 Surat</li>
                      <li>Doa &amp; Dzikir Harian + Filter Kategori</li>
                      <li>Jadwal Salat, Hitung Mundur &amp; Nada Pengingat Lokal</li>
                      <li>Kompas Arah Kiblat Geodesik WGS-84</li>
                      <li>Kalender Hijriah, Konverter &amp; Hari Besar Islam</li>
                      <li>Penanda Ayat, Catatan Tadabbur &amp; Tugas Harian</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-[#E3E9E3] space-y-1">
                    <p className="font-bold text-amber-800 flex items-center gap-1.5">
                      <Wifi className="w-3.5 h-3.5 shrink-0" />
                      <span>Memerlukan Internet / Cache Tambahan</span>
                    </p>
                    <ul className="text-[#68756C] space-y-0.5 pl-4 list-disc">
                      <li>
                        <strong>Streaming Audio Murottal MP3 (6 Qari):</strong> File audio MP3 (~1.5 GB total) di-stream dari CDN saat online dan otomatis di-cache per surat/ayat yang pernah diputar.
                      </li>
                      <li>
                        <strong>Pencarian Suara (Speak-to-Text):</strong> Menggunakan mesin pengenalan suara browser yang umumnya memerlukan koneksi server.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
