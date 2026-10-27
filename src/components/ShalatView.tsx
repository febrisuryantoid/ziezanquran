import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  BellOff,
  Calendar,
  Check,
  Clock,
  Info,
  MapPin,
  Play,
  RefreshCw,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  ADZAN_STREAM_LIST,
  clampVolume,
  getLocalTimezoneId,
} from '../services/adzanAudioService';
import {
  computeNextPrayer,
  equranShalatApi,
  formatCountdown,
  PRAYER_LABELS,
  PRAYER_ORDER,
} from '../services/islamicApi';
import { storageService } from '../services/storageService';
import {
  ActiveAdzanPlaybackState,
  AdhanSoundPreference,
  AdzanAudioCategory,
  PrayerTimeKey,
  ShalatDailySchedule,
  ShalatMonthlyData,
  ShalatReminderSettings,
} from '../types/islamic';

interface ShalatViewProps {
  onShowToast: (msg: string) => void;
  adzanPlayback?: ActiveAdzanPlaybackState | null;
  onTestAdzanCategory?: (category: AdzanAudioCategory) => void;
  onStopAdzanAudio?: () => void;
  onVolumeChange?: (volume: number) => void;
}

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const SOUND_OPTIONS: Array<{
  id: AdhanSoundPreference;
  label: string;
  desc: string;
}> = [
  {
    id: 'adzan-auto',
    label: 'Audio Adzan, Imsak & Terbit Otomatis (Sesuai Waktu)',
    desc: 'Memutar Adzan Subuh, Adzan Reguler (Zuhur–Isya), Penanda Imsak, dan Penanda Terbit sesuai jadwal waktu.',
  },
  {
    id: 'adzan-chime',
    label: 'Nada Harmoni Adzan Singkat (Lokal Offline)',
    desc: 'Memutar nada singkat Maqam Hijaz lokal (/audio/adzan-chime.wav) untuk seluruh waktu.',
  },
  {
    id: 'shalat-reminder',
    label: 'Nada Pengingat Lembut (Lokal Offline)',
    desc: 'Memutar nada pengingat lembut lokal (/audio/shalat-reminder.wav) untuk seluruh waktu.',
  },
  {
    id: 'mute',
    label: 'Tanpa Suara (Hanya Notifikasi Visual)',
    desc: 'Hanya menampilkan pemberitahuan layar tanpa memutar suara.',
  },
];

// Koordinat referensi ibu kota provinsi Indonesia untuk pencocokan GPS ke wilayah eQuran.id
const INDONESIAN_PROVINCE_COORDS: Array<{
  provinsi: string;
  kabkota: string;
  lat: number;
  lng: number;
}> = [
  { provinsi: 'DKI Jakarta', kabkota: 'Kota Jakarta', lat: -6.2088, lng: 106.8456 },
  { provinsi: 'Jawa Barat', kabkota: 'Kota Bandung', lat: -6.9175, lng: 107.6191 },
  { provinsi: 'Banten', kabkota: 'Kota Tangerang', lat: -6.1783, lng: 106.6319 },
  { provinsi: 'Jawa Tengah', kabkota: 'Kota Semarang', lat: -6.9667, lng: 110.4167 },
  { provinsi: 'DI Yogyakarta', kabkota: 'Kota Yogyakarta', lat: -7.7956, lng: 110.3695 },
  { provinsi: 'Jawa Timur', kabkota: 'Kota Surabaya', lat: -7.2575, lng: 112.7521 },
  { provinsi: 'Aceh', kabkota: 'Kota Banda Aceh', lat: 5.5483, lng: 95.3238 },
  { provinsi: 'Sumatera Utara', kabkota: 'Kota Medan', lat: 3.5952, lng: 98.6722 },
  { provinsi: 'Sumatera Barat', kabkota: 'Kota Padang', lat: -0.9471, lng: 100.4172 },
  { provinsi: 'Riau', kabkota: 'Kota Pekanbaru', lat: 0.5071, lng: 101.4478 },
  { provinsi: 'Sumatera Selatan', kabkota: 'Kota Palembang', lat: -2.9761, lng: 104.7754 },
  { provinsi: 'Lampung', kabkota: 'Kota Bandar Lampung', lat: -5.4292, lng: 105.261 },
  { provinsi: 'Bali', kabkota: 'Kota Denpasar', lat: -8.6705, lng: 115.2126 },
  { provinsi: 'Nusa Tenggara Barat', kabkota: 'Kota Mataram', lat: -8.5833, lng: 116.1167 },
  { provinsi: 'Kalimantan Barat', kabkota: 'Kota Pontianak', lat: -0.0263, lng: 109.3425 },
  { provinsi: 'Kalimantan Selatan', kabkota: 'Kota Banjarmasin', lat: -3.3194, lng: 114.5908 },
  { provinsi: 'Kalimantan Timur', kabkota: 'Kota Balikpapan', lat: -1.2379, lng: 116.8529 },
  { provinsi: 'Sulawesi Selatan', kabkota: 'Kota Makassar', lat: -5.1477, lng: 119.4327 },
  { provinsi: 'Sulawesi Utara', kabkota: 'Kota Manado', lat: 1.4748, lng: 124.8421 },
];

export const ShalatView: React.FC<ShalatViewProps> = ({
  onShowToast,
  adzanPlayback = null,
  onTestAdzanCategory,
  onStopAdzanAudio,
  onVolumeChange,
}) => {
  const savedLoc = useMemo(() => storageService.getShalatLocation(), []);
  const [provinsiList, setProvinsiList] = useState<string[]>([]);
  const [kabKotaList, setKabKotaList] = useState<string[]>([]);

  const [selectedProvinsi, setSelectedProvinsi] = useState<string>(savedLoc.provinsi);
  const [selectedKabKota, setSelectedKabKota] = useState<string>(savedLoc.kabkota);
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [gpsStatusNote, setGpsStatusNote] = useState<string | null>(null);

  const nowInitial = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState<number>(nowInitial.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(nowInitial.getFullYear());

  const [scheduleData, setScheduleData] = useState<ShalatMonthlyData | null>(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState<boolean>(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [now, setNow] = useState<Date>(() => new Date());
  const [reminders, setReminders] = useState<ShalatReminderSettings>(() =>
    storageService.getShalatReminders()
  );
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const userTimezone = useMemo(() => getLocalTimezoneId(), []);

  // Live clock tick every 1 second for countdown & midnight rollover
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Keep reminders state synced if App.tsx records a triggered event in localStorage
  useEffect(() => {
    const syncFromStorage = () => {
      setReminders(storageService.getShalatReminders());
    };
    window.addEventListener('ziezan:shalat-settings-updated', syncFromStorage);
    return () =>
      window.removeEventListener('ziezan:shalat-settings-updated', syncFromStorage);
  }, []);

  // Load Provinsi list on mount
  useEffect(() => {
    let mounted = true;
    const loadProvs = async () => {
      setIsLoadingMeta(true);
      try {
        const list = await equranShalatApi.getProvinsiList();
        if (!mounted) return;
        setProvinsiList(list);
      } catch {
        // Fallback kept silent if schedule still loads
      } finally {
        if (mounted) setIsLoadingMeta(false);
      }
    };
    loadProvs();
    return () => {
      mounted = false;
    };
  }, []);

  // Load KabKota list when selectedProvinsi changes
  const fetchKabKotaForProvinsi = useCallback(
    async (prov: string, keepExistingKab: boolean) => {
      if (!prov) return;
      setIsLoadingMeta(true);
      try {
        const kabs = await equranShalatApi.getKabKotaList(prov);
        setKabKotaList(kabs);
        if (!keepExistingKab || !kabs.includes(selectedKabKota)) {
          const nextKab = kabs[0] || '';
          if (nextKab) {
            setSelectedKabKota(nextKab);
            storageService.saveShalatLocation(prov, nextKab);
          }
        }
      } catch (err) {
        onShowToast(
          err instanceof Error ? err.message : 'Gagal memuat daftar kabupaten/kota.'
        );
      } finally {
        setIsLoadingMeta(false);
      }
    },
    [selectedKabKota, onShowToast]
  );

  useEffect(() => {
    fetchKabKotaForProvinsi(selectedProvinsi, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load Monthly Schedule
  const loadSchedule = useCallback(
    async (forceRefresh = false) => {
      if (!selectedProvinsi || !selectedKabKota) return;
      setIsLoadingSchedule(true);
      setError(null);
      try {
        const data = await equranShalatApi.getMonthlySchedule(
          selectedProvinsi,
          selectedKabKota,
          selectedMonth,
          selectedYear,
          forceRefresh
        );
        setScheduleData(data);
        storageService.saveShalatLocation(selectedProvinsi, selectedKabKota);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Gagal memuat jadwal salat dari server eQuran.id.'
        );
      } finally {
        setIsLoadingSchedule(false);
      }
    },
    [selectedProvinsi, selectedKabKota, selectedMonth, selectedYear]
  );

  useEffect(() => {
    loadSchedule(false);
  }, [loadSchedule]);

  const handleProvinsiChange = async (newProv: string) => {
    setSelectedProvinsi(newProv);
    setIsLoadingMeta(true);
    try {
      const kabs = await equranShalatApi.getKabKotaList(newProv);
      setKabKotaList(kabs);
      const defaultKab = kabs[0] || '';
      setSelectedKabKota(defaultKab);
      if (defaultKab) {
        storageService.saveShalatLocation(newProv, defaultKab);
      }
    } catch (err) {
      onShowToast(
        err instanceof Error ? err.message : 'Gagal memuat daftar kabupaten/kota.'
      );
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const handleKabKotaChange = (newKab: string) => {
    setSelectedKabKota(newKab);
    storageService.saveShalatLocation(selectedProvinsi, newKab);
  };

  const todayIso = useMemo(() => {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [now]);

  const todaySchedule: ShalatDailySchedule | null = useMemo(() => {
    if (!scheduleData?.jadwal?.length) return null;
    const exact = scheduleData.jadwal.find((j) => j.tanggal_lengkap === todayIso);
    if (exact) return exact;
    const byDayNum = scheduleData.jadwal.find((j) => j.tanggal === now.getDate());
    return byDayNum || scheduleData.jadwal[0];
  }, [scheduleData, todayIso, now]);

  const tomorrowSchedule: ShalatDailySchedule | null = useMemo(() => {
    if (!scheduleData?.jadwal?.length || !todaySchedule) return null;
    const idx = scheduleData.jadwal.findIndex(
      (j) => j.tanggal_lengkap === todaySchedule.tanggal_lengkap
    );
    if (idx >= 0 && idx + 1 < scheduleData.jadwal.length) {
      return scheduleData.jadwal[idx + 1];
    }
    return todaySchedule;
  }, [scheduleData, todaySchedule]);

  const nextPrayer = useMemo(
    () => computeNextPrayer(todaySchedule, tomorrowSchedule, now),
    [todaySchedule, tomorrowSchedule, now]
  );

  const handleToggleRemindersEnabled = async () => {
    const nextEnabled = !reminders.enabled;
    if (nextEnabled && typeof Notification !== 'undefined') {
      if (Notification.permission === 'default') {
        try {
          const perm = await Notification.requestPermission();
          setNotifPermission(perm);
        } catch {
          // Ignore
        }
      } else {
        setNotifPermission(Notification.permission);
      }
    }
    const updated: ShalatReminderSettings = {
      ...reminders,
      enabled: nextEnabled,
    };
    setReminders(updated);
    storageService.saveShalatReminders(updated);
    onShowToast(
      nextEnabled
        ? 'Pengingat & jadwal audio otomatis diaktifkan.'
        : 'Pengingat waktu salat dinonaktifkan.'
    );
  };

  const handleToggleAudioEnabled = () => {
    const nextAudioEnabled = !reminders.audioEnabled;
    const nextSound: AdhanSoundPreference =
      nextAudioEnabled && reminders.sound === 'mute'
        ? 'adzan-auto'
        : !nextAudioEnabled
          ? 'mute'
          : reminders.sound;

    if (!nextAudioEnabled && onStopAdzanAudio) {
      onStopAdzanAudio();
    }

    const updated: ShalatReminderSettings = {
      ...reminders,
      audioEnabled: nextAudioEnabled,
      sound: nextSound,
    };
    setReminders(updated);
    storageService.saveShalatReminders(updated);
    onShowToast(
      nextAudioEnabled
        ? 'Suara Adzan & pengingat audio diaktifkan.'
        : 'Suara Adzan dinonaktifkan (Mode Tanpa Suara).'
    );
  };

  const handleToggleSinglePrayer = (key: PrayerTimeKey) => {
    const updated: ShalatReminderSettings = {
      ...reminders,
      prayers: {
        ...reminders.prayers,
        [key]: !reminders.prayers[key],
      },
    };
    setReminders(updated);
    storageService.saveShalatReminders(updated);
  };

  const handleSoundChange = (sound: AdhanSoundPreference) => {
    if (sound === 'mute' && onStopAdzanAudio) {
      onStopAdzanAudio();
    }
    const updated: ShalatReminderSettings = {
      ...reminders,
      sound,
      audioEnabled: sound !== 'mute',
    };
    setReminders(updated);
    storageService.saveShalatReminders(updated);
  };

  const handleVolumeSliderChange = (rawVolume: number) => {
    const vol = clampVolume(rawVolume);
    onVolumeChange?.(vol);
    const updated: ShalatReminderSettings = {
      ...reminders,
      volume: vol,
      audioEnabled: vol > 0 ? true : reminders.audioEnabled,
    };
    setReminders(updated);
    storageService.saveShalatReminders(updated);
  };

  const handleLeadMinutesChange = (leadMinutes: 0 | 5 | 10) => {
    const updated: ShalatReminderSettings = {
      ...reminders,
      leadMinutes,
    };
    setReminders(updated);
    storageService.saveShalatReminders(updated);
  };

  const handleRequestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      onShowToast('Browser perangkat ini tidak mendukung Web Notification API.');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        onShowToast('Izin notifikasi perangkat berhasil diaktifkan.');
      } else {
        onShowToast('Izin notifikasi belum diberikan pada pengaturan browser.');
      }
    } catch {
      onShowToast('Gagal meminta izin notifikasi.');
    }
  };

  const handleDetectGpsLocation = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGpsStatusNote(
        'Geolokasi tidak didukung oleh browser ini. Silakan pilih Provinsi dan Kabupaten/Kota secara manual di bawah.'
      );
      return;
    }

    setIsDetectingGps(true);
    setGpsStatusNote(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let closest = INDONESIAN_PROVINCE_COORDS[0];
        let minDist = Number.POSITIVE_INFINITY;

        for (const item of INDONESIAN_PROVINCE_COORDS) {
          const dLat = latitude - item.lat;
          const dLng = longitude - item.lng;
          const dist = dLat * dLat + dLng * dLng;
          if (dist < minDist) {
            minDist = dist;
            closest = item;
          }
        }

        try {
          setSelectedProvinsi(closest.provinsi);
          const kabs = await equranShalatApi.getKabKotaList(closest.provinsi);
          setKabKotaList(kabs);
          const matchedKab = kabs.includes(closest.kabkota)
            ? closest.kabkota
            : kabs[0] || closest.kabkota;
          setSelectedKabKota(matchedKab);
          storageService.saveShalatLocation(closest.provinsi, matchedKab);
          setGpsStatusNote(
            `Lokasi GPS dicocokkan ke wilayah terdekat: ${matchedKab}, ${closest.provinsi}. Anda juga dapat mengubahnya secara manual.`
          );
          onShowToast(`Lokasi diatur ke ${matchedKab}, ${closest.provinsi}`);
        } catch {
          setGpsStatusNote(
            'Koordinat diterima, silakan sesuaikan Kabupaten/Kota secara manual jika diperlukan.'
          );
        } finally {
          setIsDetectingGps(false);
        }
      },
      (err) => {
        setIsDetectingGps(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatusNote(
            'Izin lokasi (GPS) ditolak. Silakan gunakan pilihan Provinsi dan Kabupaten/Kota manual di bawah ini.'
          );
        } else {
          setGpsStatusNote(
            'Tidak dapat memperoleh sinyal GPS saat ini. Silakan pilih lokasi secara manual di bawah ini.'
          );
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  return (
    <div className="container-app py-4 sm:py-6">
      {/* Header Editorial */}
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-[#E3E9E3] pb-5 md:flex-row md:items-end">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-[#24352B] sm:text-3xl">
            Jadwal Salat &amp; Adzan
          </h1>
          <p className="mt-1 text-sm text-[#68756C]">
            Waktu salat dan pengingat adzan presisi seluruh Indonesia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDetectGpsLocation}
            disabled={isDetectingGps || isLoadingSchedule}
            className="inline-flex items-center gap-2 rounded-xl bg-[#046D38] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#035328] disabled:opacity-50 cursor-pointer"
          >
            <MapPin className="h-3.5 w-3.5 text-[#FBC647]" />
            <span>{isDetectingGps ? 'Mendeteksi GPS...' : 'Lokasi GPS'}</span>
          </button>

          <button
            type="button"
            onClick={() => loadSchedule(true)}
            disabled={isLoadingSchedule}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E3E9E3] bg-white px-3.5 py-2 text-xs font-semibold text-[#24352B] transition-colors hover:border-[#046D38] hover:text-[#035328] disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingSchedule ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Location & Period Selector */}
      <section className="mb-6 rounded-2xl border border-[#E3E9E3] bg-white p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3E9E3] pb-3">
          <h2 className="text-xs sm:text-sm font-bold text-[#24352B]">
            Wilayah &amp; Periode
          </h2>
        </div>

        {gpsStatusNote && (
          <div className="rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] px-3.5 py-2.5 text-xs text-[#24352B] flex items-center justify-between gap-2">
            <span>{gpsStatusNote}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Provinsi */}
          <div>
            <label
              htmlFor="shalat-provinsi"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#68756C]"
            >
              <MapPin className="h-3.5 w-3.5 text-[#046D38]" />
              <span>Provinsi</span>
            </label>

            <select
              id="shalat-provinsi"
              value={selectedProvinsi}
              onChange={(e) => handleProvinsiChange(e.target.value)}
              disabled={isLoadingMeta && provinsiList.length === 0}
              className="w-full rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] px-3 py-2.5 text-sm font-medium text-[#24352B] focus:border-[#046D38] focus:bg-white focus:outline-none"
            >
              {provinsiList.length === 0 ? (
                <option value={selectedProvinsi}>{selectedProvinsi}</option>
              ) : (
                provinsiList.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Kabupaten / Kota */}
          <div>
            <label
              htmlFor="shalat-kabkota"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#68756C]"
            >
              <MapPin className="h-3.5 w-3.5 text-[#046D38]" />
              <span>Kabupaten / Kota</span>
            </label>
            <select
              id="shalat-kabkota"
              value={selectedKabKota}
              onChange={(e) => handleKabKotaChange(e.target.value)}
              disabled={isLoadingMeta && kabKotaList.length === 0}
              className="w-full rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] px-3 py-2.5 text-sm font-medium text-[#24352B] focus:border-[#046D38] focus:bg-white focus:outline-none"
            >
              {kabKotaList.length === 0 ? (
                <option value={selectedKabKota}>{selectedKabKota}</option>
              ) : (
                kabKotaList.map((kab) => (
                  <option key={kab} value={kab}>
                    {kab}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Bulan */}
          <div>
            <label
              htmlFor="shalat-bulan"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#68756C]"
            >
              <Calendar className="h-3.5 w-3.5 text-[#046D38]" />
              <span>Bulan Masehi</span>
            </label>
            <select
              id="shalat-bulan"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] px-3 py-2.5 text-sm font-medium text-[#24352B] focus:border-[#046D38] focus:bg-white focus:outline-none"
            >
              {INDONESIAN_MONTHS.map((mName, idx) => (
                <option key={mName} value={idx + 1}>
                  {mName}
                </option>
              ))}
            </select>
          </div>

          {/* Tahun */}
          <div>
            <label
              htmlFor="shalat-tahun"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#68756C]"
            >
              <Calendar className="h-3.5 w-3.5 text-[#046D38]" />
              <span>Tahun</span>
            </label>
            <select
              id="shalat-tahun"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] px-3 py-2.5 text-sm font-medium text-[#24352B] focus:border-[#046D38] focus:bg-white focus:outline-none"
            >
              {[2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Error State */}
      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-white p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-[#24352B]">
                Gagal Memuat Jadwal Salat
              </h3>
              <p className="mt-1 text-xs text-[#68756C]">{error}</p>
              <button
                type="button"
                onClick={() => loadSchedule(true)}
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
      {isLoadingSchedule && !scheduleData && (
        <div className="mb-6 space-y-4">
          <div className="h-44 animate-pulse rounded-2xl border border-[#E3E9E3] bg-white p-6" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-[#E3E9E3] bg-white"
              />
            ))}
          </div>
        </div>
      )}

      {/* Hero Next Prayer & Today's 8 Times */}
      {scheduleData && todaySchedule && (
        <>
          <section className="mb-6 rounded-2xl border border-[#035328] bg-[#035328] p-5 text-white sm:p-6">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-lg bg-[#046D38] px-3 py-1 text-xs font-semibold text-[#FBC647]">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>
                    {scheduleData.kabkota}, {scheduleData.provinsi}
                  </span>
                </div>
                <h2 className="mt-3 font-serif text-2xl font-bold sm:text-3xl">
                  {todaySchedule.hari}, {todaySchedule.tanggal} {scheduleData.bulan_nama}{' '}
                  {scheduleData.tahun}
                </h2>
                <p className="mt-1 text-xs text-white/80">
                  Waktu Perangkat Saat Ini:{' '}
                  <span className="font-mono font-semibold text-white">
                    {now.toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </p>
              </div>

              {nextPrayer && (
                <div className="rounded-xl border border-white/15 bg-[#046D38] p-4 sm:min-w-[290px]">
                  <div className="flex items-center justify-between text-xs font-medium text-white/85">
                    <span>
                      Waktu Berikutnya {nextPrayer.isTomorrow ? '(Besok)' : '(Hari Ini)'}
                    </span>
                    <span className="rounded bg-[#FBC647] px-2 py-0.5 text-[11px] font-bold text-[#24352B]">
                      {nextPrayer.timeStr}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between gap-4">
                    <span className="font-serif text-2xl font-bold text-white">
                      {nextPrayer.label}
                    </span>
                    <span className="font-mono text-2xl font-bold tracking-wider text-[#FBC647]">
                      -{formatCountdown(nextPrayer.remainingSeconds)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-white/75">
                    Hitung mundur otomatis menuju waktu {nextPrayer.label}.
                  </p>
                </div>
              )}
            </div>

            {/* Today's 8 Prayer Cards */}
            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
              {PRAYER_ORDER.map((key) => {
                const info = PRAYER_LABELS[key];
                const timeValue = todaySchedule[key];
                const isNext = nextPrayer?.key === key && !nextPrayer.isTomorrow;
                const isReminderOn = reminders.enabled && reminders.prayers[key];

                return (
                  <div
                    key={key}
                    className={`rounded-xl border p-3 transition-colors ${
                      isNext
                        ? 'border-[#FBC647] bg-white text-[#24352B]'
                        : 'border-white/15 bg-[#046D38] text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider ${
                          isNext ? 'text-[#035328]' : 'text-white/85'
                        }`}
                      >
                        {info.label}
                      </span>
                      <span
                        className={`font-arabic text-sm ${
                          isNext ? 'text-[#046D38]' : 'text-[#FBC647]'
                        }`}
                      >
                        {info.arabic}
                      </span>
                    </div>
                    <div
                      className={`mt-2 font-mono text-xl font-bold ${
                        isNext ? 'text-[#24352B]' : 'text-white'
                      }`}
                    >
                      {timeValue || '-'}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span
                        className={`text-[10px] font-medium ${
                          isNext ? 'text-[#035328]' : 'text-white/70'
                        }`}
                      >
                        {isNext ? 'Berikutnya' : info.isMainPrayer ? 'Wajib' : 'Sunnah/Batas'}
                      </span>
                      {isReminderOn && (
                        <Bell
                          className={`h-3 w-3 ${
                            isNext ? 'text-[#035328]' : 'text-[#FBC647]'
                          }`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Pengaturan Pengingat, Audio Adzan Otomatis & Keterbatasan PWA */}
          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="rounded-2xl border border-[#E3E9E3] bg-white p-5 lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E9E3] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#24352B]">
                    Pengaturan Pengingat &amp; Audio Adzan Otomatis
                  </h3>
                  <p className="text-xs text-[#68756C]">
                    Sinkronisasi zona waktu lokal ({userTimezone}) dengan pemutaran maksimal 1 kali per jadwal.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleRemindersEnabled}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                      reminders.enabled
                        ? 'bg-[#035328] text-white hover:bg-[#046D38]'
                        : 'border border-[#E3E9E3] bg-[#F7F8F5] text-[#24352B] hover:border-[#046D38]'
                    }`}
                  >
                    {reminders.enabled ? (
                      <>
                        <Bell className="h-4 w-4 text-[#FBC647]" />
                        <span>Pengingat Aktif</span>
                      </>
                    ) : (
                      <>
                        <BellOff className="h-4 w-4 text-[#68756C]" />
                        <span>Aktifkan Pengingat</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleAudioEnabled}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                      reminders.audioEnabled && reminders.sound !== 'mute'
                        ? 'border-[#046D38] bg-[#F7F8F5] text-[#035328]'
                        : 'border-[#E3E9E3] bg-white text-[#68756C] hover:border-[#046D38]'
                    }`}
                  >
                    {reminders.audioEnabled && reminders.sound !== 'mute' ? (
                      <>
                        <Volume2 className="h-4 w-4 text-[#046D38]" />
                        <span>Audio Aktif</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="h-4 w-4 text-[#68756C]" />
                        <span>Audio Nonaktif</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Pilih Waktu yang Diingatkan */}
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#68756C]">
                  Pilih Waktu Jadwal yang Diaktifkan
                </p>
                <div className="flex flex-wrap gap-2">
                  {PRAYER_ORDER.map((key) => {
                    const active = reminders.prayers[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleToggleSinglePrayer(key)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                          active
                            ? 'border-[#035328] bg-[#035328] text-white'
                            : 'border-[#E3E9E3] bg-[#F7F8F5] text-[#68756C] hover:border-[#046D38]'
                        }`}
                      >
                        {active && <Check className="h-3.5 w-3.5 text-[#FBC647]" />}
                        <span>{PRAYER_LABELS[key].label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pilihan Jenis Pengingat, Waktu Peringatan & Volume */}
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="shalat-sound-select"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#68756C]"
                  >
                    Jenis Pengingat Audio
                  </label>
                  <select
                    id="shalat-sound-select"
                    value={reminders.audioEnabled ? reminders.sound : 'mute'}
                    onChange={(e) => handleSoundChange(e.target.value as AdhanSoundPreference)}
                    className="w-full rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] px-3 py-2.5 text-xs font-semibold text-[#24352B] focus:border-[#046D38] focus:bg-white focus:outline-none"
                  >
                    {SOUND_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="shalat-lead-select"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#68756C]"
                  >
                    Waktu Pemicu Pengingat
                  </label>
                  <select
                    id="shalat-lead-select"
                    value={reminders.leadMinutes}
                    onChange={(e) =>
                      handleLeadMinutesChange(Number(e.target.value) as 0 | 5 | 10)
                    }
                    className="w-full rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] px-3 py-2.5 text-xs font-semibold text-[#24352B] focus:border-[#046D38] focus:bg-white focus:outline-none"
                  >
                    <option value={0}>Tepat saat waktu masuk (0 menit)</option>
                    <option value={5}>5 menit sebelum waktu masuk</option>
                    <option value={10}>10 menit sebelum waktu masuk</option>
                  </select>
                </div>
              </div>

              {/* Pengaturan Volume Audio */}
              <div className="mt-4 rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] p-3.5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label
                    htmlFor="shalat-volume-range"
                    className="flex items-center gap-2 text-xs font-bold text-[#24352B]"
                  >
                    {reminders.volume === 0 || !reminders.audioEnabled ? (
                      <VolumeX className="h-4 w-4 text-[#68756C]" />
                    ) : (
                      <Volume2 className="h-4 w-4 text-[#046D38]" />
                    )}
                    <span>Volume Suara Adzan &amp; Pengingat</span>
                  </label>
                  <span className="rounded-md bg-white border border-[#E3E9E3] px-2 py-0.5 font-mono text-xs font-bold text-[#035328]">
                    {Math.round((reminders.volume ?? 0.85) * 100)}%
                  </span>
                </div>
                <input
                  id="shalat-volume-range"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round((reminders.volume ?? 0.85) * 100)}
                  onChange={(e) => handleVolumeSliderChange(Number(e.target.value) / 100)}
                  aria-label="Atur volume audio Adzan"
                  className="w-full accent-[#046D38] cursor-pointer"
                />
                <p className="mt-1.5 text-[11px] text-[#68756C]">
                  {
                    SOUND_OPTIONS.find(
                      (o) => o.id === (reminders.audioEnabled ? reminders.sound : 'mute')
                    )?.desc
                  }
                </p>
              </div>

              {/* Uji Audio Berdasarkan Jenis Waktu */}
              <div className="mt-5 border-t border-[#E3E9E3] pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#24352B]">
                      Uji Suara Pengingat
                    </h4>
                    <p className="text-[11px] text-[#68756C]">
                      Murottal akan dijeda otomatis saat pengingat bersuara.
                    </p>
                  </div>
                  {adzanPlayback &&
                    (adzanPlayback.isPlaying || adzanPlayback.isLoading) && (
                      <button
                        type="button"
                        onClick={() => onStopAdzanAudio?.()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#035328] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#046D38] cursor-pointer"
                      >
                        <Square className="h-3 w-3 fill-current text-[#FBC647]" />
                        <span>Hentikan Suara</span>
                      </button>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {ADZAN_STREAM_LIST.map((stream) => {
                    const isThisActive =
                      adzanPlayback?.category === stream.category &&
                      (adzanPlayback.isPlaying || adzanPlayback.isLoading);
                    const hasThisError =
                      adzanPlayback?.category === stream.category &&
                      Boolean(adzanPlayback.error);

                    return (
                      <div
                        key={stream.category}
                        className={`flex flex-col justify-between rounded-xl border p-3 transition-colors ${
                          isThisActive
                            ? 'border-[#035328] bg-[#F7F8F5]'
                            : 'border-[#E3E9E3] bg-white'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[#24352B]">
                              {stream.label}
                            </span>
                            <span className="rounded bg-[#F7F8F5] border border-[#E3E9E3] px-1.5 py-0.5 text-[10px] font-semibold text-[#035328]">
                              {stream.shortLabel}
                            </span>
                          </div>
                          {hasThisError && adzanPlayback?.error && (
                            <p className="mt-1 text-[11px] font-semibold text-red-600">
                              {adzanPlayback.error}
                            </p>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-[#E3E9E3]">
                          <span className="text-[10px] font-medium text-[#68756C]">
                            {isThisActive
                              ? adzanPlayback?.isLoading
                                ? 'Memuat audio...'
                                : 'Sedang diputar'
                              : 'Siap diuji'}
                          </span>

                          <button
                            type="button"
                            onClick={() => onTestAdzanCategory?.(stream.category)}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                              isThisActive
                                ? 'border-[#035328] bg-[#035328] text-white hover:bg-[#046D38]'
                                : 'border-[#035328] bg-white text-[#035328] hover:bg-[#035328] hover:text-white'
                            }`}
                          >
                            {isThisActive ? (
                              <>
                                <Square className="h-3 w-3 fill-current text-[#FBC647]" />
                                <span>Hentikan</span>
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 fill-current" />
                                <span>Uji Suara</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Status Notifikasi & Audio */}
            <div className="rounded-2xl border border-[#E3E9E3] bg-white p-5 lg:col-span-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-[#F7F8F5] p-2 text-[#035328]">
                    <Bell className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#24352B]">
                    Status Pengingat
                  </h3>
                </div>

                <div className="mt-3.5 space-y-2 text-xs text-[#68756C]">
                  <div className="flex items-center justify-between rounded-lg bg-[#F7F8F5] px-3 py-2">
                    <span>Izin Notifikasi</span>
                    <span className="font-semibold text-[#035328]">
                      {notifPermission === 'granted'
                        ? 'Aktif'
                        : notifPermission === 'denied'
                          ? 'Diblokir'
                          : 'Belum Aktif'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[#F7F8F5] px-3 py-2">
                    <span>Pemicu Audio</span>
                    <span className="font-medium text-[#24352B]">1x saat jadwal tiba</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[#F7F8F5] px-3 py-2">
                    <span>Murottal</span>
                    <span className="font-medium text-[#24352B]">Jeda otomatis saat adzan</span>
                  </div>
                </div>
              </div>

              {notifPermission !== 'granted' && (
                <div className="mt-4 pt-4 border-t border-[#E3E9E3]">
                  <button
                    type="button"
                    onClick={handleRequestNotificationPermission}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#046D38] px-3.5 py-2.5 text-xs font-bold text-white hover:bg-[#035328] transition-colors cursor-pointer"
                  >
                    <Bell className="h-3.5 w-3.5 text-[#FBC647]" />
                    <span>Aktifkan Notifikasi</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Tabel Jadwal Bulanan Lengkap */}
          <section className="overflow-hidden rounded-2xl border border-[#E3E9E3] bg-white">
            <div className="flex flex-col justify-between gap-2 border-b border-[#E3E9E3] px-5 py-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-base font-bold text-[#24352B]">
                  Jadwal Salat Bulanan — {scheduleData.bulan_nama} {scheduleData.tahun}
                </h3>
                <p className="text-xs text-[#68756C]">
                  Wilayah {scheduleData.kabkota}, {scheduleData.provinsi} ({scheduleData.jadwal.length} hari)
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E9E3] bg-[#F7F8F5] px-2.5 py-1 text-[11px] font-semibold text-[#035328]">
                Baris berwarna hijau menandakan hari ini
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E3E9E3] bg-[#F7F8F5] text-[11px] font-bold uppercase tracking-wider text-[#68756C]">
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-3 py-3">Hari</th>
                    <th className="px-3 py-3">Imsak</th>
                    <th className="px-3 py-3 text-[#035328]">Subuh</th>
                    <th className="px-3 py-3">Terbit</th>
                    <th className="px-3 py-3">Duha</th>
                    <th className="px-3 py-3 text-[#035328]">Zuhur</th>
                    <th className="px-3 py-3 text-[#035328]">Asar</th>
                    <th className="px-3 py-3 text-[#035328]">Magrib</th>
                    <th className="px-4 py-3 text-[#035328]">Isya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E9E3]">
                  {scheduleData.jadwal.map((row) => {
                    const isTodayRow = row.tanggal_lengkap === todayIso;
                    return (
                      <tr
                        key={row.tanggal_lengkap}
                        className={
                          isTodayRow
                            ? 'bg-[#035328] font-bold text-white'
                            : 'bg-white text-[#24352B] hover:bg-[#F7F8F5]'
                        }
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-mono">
                          {row.tanggal_lengkap}
                          {isTodayRow && (
                            <span className="ml-2 rounded bg-[#FBC647] px-1.5 py-0.5 font-sans text-[10px] font-bold text-[#24352B]">
                              Hari Ini
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">{row.hari}</td>
                        <td className="px-3 py-3 font-mono">{row.imsak}</td>
                        <td className="px-3 py-3 font-mono font-semibold">{row.subuh}</td>
                        <td className="px-3 py-3 font-mono">{row.terbit}</td>
                        <td className="px-3 py-3 font-mono">{row.dhuha}</td>
                        <td className="px-3 py-3 font-mono font-semibold">{row.dzuhur}</td>
                        <td className="px-3 py-3 font-mono font-semibold">{row.ashar}</td>
                        <td className="px-3 py-3 font-mono font-semibold">{row.maghrib}</td>
                        <td className="px-4 py-3 font-mono font-semibold">{row.isya}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
