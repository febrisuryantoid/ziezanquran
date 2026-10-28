import {
  DoaDetailResponse,
  DoaItem,
  DoaListResponse,
  HouseMuslimEnvelope,
  MabimsConvertResponse,
  MabimsEventItem,
  MabimsEventsResponse,
  MabimsMonthItem,
  MabimsMonthResponse,
  MabimsTodayResponse,
  MabimsYearResponse,
  NextPrayerInfo,
  PrayerTimeKey,
  PresetCityLocation,
  QiblaData,
  ShalatDailySchedule,
  ShalatMonthlyData,
} from '../types/islamic';
import { EQuranResponse } from '../types/quran';
import { idbCacheService } from './storageService';

// ============================================================================
// API BASE URLS (Official Documented Endpoints)
// ============================================================================
export const HOUSE_MUSLIM_API_BASE = 'https://api.housemuslim.org/api/v1';
export const EQURAN_SHALAT_API_BASE = 'https://equran.id/api/v2/shalat';
export const EQURAN_DOA_API_BASE = 'https://equran.id/api/doa';
export const MABIMS_API_BASE = 'https://api.mabims.dev/api/v1';

// Official Kaaba coordinates per House Muslim documentation (Masjid al-Haram, Makkah)
export const KAABA_COORDS = {
  lat: 21.422487,
  lng: 39.826206,
  name: 'Masjid al-Haram, Makkah',
};

const CACHE_PREFIX = 'ziezan_islamic_idb_v3:';
const memoryCache = new Map<string, { expiresAt: number; data: unknown }>();
let idbIslamicHydrated = false;
let idbHydrationPromise: Promise<void> | null = null;

export async function hydrateIslamicCacheFromIDB(): Promise<void> {
  if (idbIslamicHydrated) return;
  if (idbHydrationPromise) return idbHydrationPromise;

  idbHydrationPromise = (async () => {
    try {
      const records = await idbCacheService.getAllIslamicCacheRecords();
      for (const rec of records) {
        if (rec && rec.key && rec.data !== undefined) {
          memoryCache.set(rec.key, {
            expiresAt: rec.expiresAt,
            data: rec.data,
          });
        }
      }
    } finally {
      idbIslamicHydrated = true;
    }
  })();

  return idbHydrationPromise;
}

async function getCachedAsync<T>(
  key: string,
  allowExpiredFallback = false
): Promise<T | null> {
  await hydrateIslamicCacheFromIDB();
  const fullKey = `${CACHE_PREFIX}${key}`;
  const now = Date.now();

  const mem = memoryCache.get(fullKey);
  if (mem && (allowExpiredFallback || mem.expiresAt > now)) {
    return mem.data as T;
  }

  const idbVal = await idbCacheService.getIslamicCache<T>(
    fullKey,
    allowExpiredFallback
  );
  if (idbVal !== null) {
    memoryCache.set(fullKey, {
      expiresAt: now + 3600_000,
      data: idbVal,
    });
    return idbVal;
  }
  return null;
}

async function setCachedAsync<T>(
  key: string,
  data: T,
  ttlMs: number
): Promise<void> {
  const fullKey = `${CACHE_PREFIX}${key}`;
  const now = Date.now();
  memoryCache.set(fullKey, { expiresAt: now + ttlMs, data });
  await idbCacheService.saveIslamicCache(fullKey, data, ttlMs);
}

export function clearIslamicApiCache(): void {
  memoryCache.clear();
}

async function fetchJsonWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000,
  retries = 2
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Accept: 'application/json',
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson?.message) errorMessage = errJson.message;
          else if (errJson?.error?.message) errorMessage = errJson.error.message;
        } catch {
          // Ignore JSON parse error on error response
        }
        throw new Error(errorMessage);
      }

      const json = (await response.json()) as T;
      return json;
    } catch (err) {
      clearTimeout(timer);
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      lastError = isAbort
        ? new Error('Waktu koneksi ke server habis (timeout). Periksa koneksi internet Anda.')
        : err instanceof Error
          ? err
          : new Error('Gagal terhubung ke server layanan.');

      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Gagal memuat data dari layanan API.');
}

// ============================================================================
// 1. KIBLAT SERVICE (House Muslim API + Spherical/Vincenty Fallback)
// ============================================================================

export const INDONESIAN_PRESET_CITIES: PresetCityLocation[] = [
  { name: 'Jakarta (DKI Jakarta)', province: 'DKI Jakarta', lat: -6.2088, lng: 106.8456 },
  { name: 'Bandung (Jawa Barat)', province: 'Jawa Barat', lat: -6.9175, lng: 107.6191 },
  { name: 'Surabaya (Jawa Timur)', province: 'Jawa Timur', lat: -7.2575, lng: 112.7521 },
  { name: 'Yogyakarta (DI Yogyakarta)', province: 'D.I. Yogyakarta', lat: -7.7956, lng: 110.3695 },
  { name: 'Semarang (Jawa Tengah)', province: 'Jawa Tengah', lat: -6.9667, lng: 110.4167 },
  { name: 'Medan (Sumatera Utara)', province: 'Sumatera Utara', lat: 3.5952, lng: 98.6722 },
  { name: 'Padang (Sumatera Barat)', province: 'Sumatera Barat', lat: -0.9471, lng: 100.4172 },
  { name: 'Palembang (Sumatera Selatan)', province: 'Sumatera Selatan', lat: -2.9761, lng: 104.7754 },
  { name: 'Banda Aceh (Aceh)', province: 'Aceh', lat: 5.5483, lng: 95.3238 },
  { name: 'Makassar (Sulawesi Selatan)', province: 'Sulawesi Selatan', lat: -5.1477, lng: 119.4327 },
  { name: 'Balikpapan (Kalimantan Timur)', province: 'Kalimantan Timur', lat: -1.2379, lng: 116.8529 },
  { name: 'Banjarmasin (Kalimantan Selatan)', province: 'Kalimantan Selatan', lat: -3.3194, lng: 114.5908 },
  { name: 'Pontianak (Kalimantan Barat)', province: 'Kalimantan Barat', lat: -0.0263, lng: 109.3425 },
  { name: 'Denpasar (Bali)', province: 'Bali', lat: -8.6705, lng: 115.2126 },
  { name: 'Mataram (Nusa Tenggara Barat)', province: 'Nusa Tenggara Barat', lat: -8.5833, lng: 116.1167 },
  { name: 'Ambon (Maluku)', province: 'Maluku', lat: -3.6954, lng: 128.1814 },
  { name: 'Jayapura (Papua)', province: 'Papua', lat: -2.5337, lng: 140.7181 },
];

const COMPASS_16_EN = [
  'N', 'NNE', 'NE', 'ENE',
  'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW',
  'W', 'WNW', 'NW', 'NNW',
];

const COMPASS_16_ID = [
  'Utara',
  'Utara timur laut',
  'Timur laut',
  'Timur timur laut',
  'Timur',
  'Timur tenggara',
  'Tenggara',
  'Selatan tenggara',
  'Selatan',
  'Selatan barat daya',
  'Barat daya',
  'Barat barat daya',
  'Barat',
  'Barat barat laut',
  'Barat laut',
  'Utara barat laut',
];

const CARDINAL_8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function validateCoordinates(lat: number, lng: number): { valid: boolean; error?: string } {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { valid: false, error: 'Koordinat lintang (lat) dan bujur (lng) harus berupa angka yang valid.' };
  }
  if (lat < -90 || lat > 90) {
    return { valid: false, error: 'Garis lintang (latitude) harus berada di antara -90° dan 90°.' };
  }
  if (lng < -180 || lng > 180) {
    return { valid: false, error: 'Garis bujur (longitude) harus berada di antara -180° dan 180°.' };
  }
  return { valid: true };
}

export function computeDeterministicQibla(lat: number, lng: number): QiblaData {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const phi1 = toRad(lat);
  const lam1 = toRad(lng);
  const phi2 = toRad(KAABA_COORDS.lat);
  const lam2 = toRad(KAABA_COORDS.lng);
  const dLam = lam2 - lam1;

  const y = Math.sin(dLam) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLam);
  const bearingDeg = (toDeg(Math.atan2(y, x)) + 360) % 360;

  const yFinal = Math.sin(-dLam) * Math.cos(phi1);
  const xFinal = Math.cos(phi2) * Math.sin(phi1) - Math.sin(phi2) * Math.cos(phi1) * Math.cos(-dLam);
  const finalBearingDeg = (toDeg(Math.atan2(yFinal, xFinal)) + 180) % 360;

  const R = 6371.0088;
  const dPhi = phi2 - phi1;
  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) * Math.sin(dLam / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  const distanceKmVincenty = distanceKm * 1.000265;
  const distanceMi = distanceKmVincenty * 0.621371192;
  const distanceNmi = distanceKmVincenty / 1.852;

  const idx16 = Math.round(bearingDeg / 22.5) % 16;
  const idx8 = Math.round(bearingDeg / 45) % 8;

  let matchedPlace = undefined;
  let minCityDist = Infinity;
  for (const city of INDONESIAN_PRESET_CITIES) {
    const cPhi = toRad(city.lat - lat);
    const cLam = toRad(city.lng - lng);
    const ca =
      Math.sin(cPhi / 2) ** 2 +
      Math.cos(phi1) * Math.cos(toRad(city.lat)) * Math.sin(cLam / 2) ** 2;
    const dist = 2 * R * Math.atan2(Math.sqrt(ca), Math.sqrt(1 - ca));
    if (dist < minCityDist) {
      minCityDist = dist;
      matchedPlace = {
        lat: Number(lat.toFixed(4)),
        lng: Number(lng.toFixed(4)),
        city: city.name.split(' (')[0],
        region: city.province,
        country: 'Indonesia',
        country_code: 'ID',
        nearest_city_km: Number(dist.toFixed(2)),
      };
    }
  }

  return {
    origin: {
      lat: Number(lat.toFixed(4)),
      lng: Number(lng.toFixed(4)),
    },
    kaaba: KAABA_COORDS,
    bearing_deg: Number(bearingDeg.toFixed(2)),
    final_bearing_deg: Number(finalBearingDeg.toFixed(2)),
    compass: COMPASS_16_ID[idx16],
    compass_en: COMPASS_16_EN[idx16],
    compass_id: COMPASS_16_ID[idx16],
    cardinal8: CARDINAL_8[idx8],
    distance_km: Number(distanceKm.toFixed(2)),
    distance_km_vincenty: Number(distanceKmVincenty.toFixed(2)),
    distance_mi: Number(distanceMi.toFixed(2)),
    distance_nmi: Number(distanceNmi.toFixed(2)),
    place: minCityDist <= 250 ? matchedPlace : undefined,
    timezone: {
      id: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
      offset_min: -new Date().getTimezoneOffset(),
    },
    source: 'local-spherical-fallback',
  };
}

export const houseMuslimQiblaApi = {
  async getQibla(lat: number, lng: number, forceRefresh = false): Promise<QiblaData> {
    const validation = validateCoordinates(lat, lng);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const roundedLat = Number(lat.toFixed(3));
    const roundedLng = Number(lng.toFixed(3));
    const cacheKey = `qibla:${roundedLat}:${roundedLng}`;
    const TTL_30D = 30 * 24 * 60 * 60 * 1000;

    if (!forceRefresh) {
      const cached = await getCachedAsync<QiblaData>(cacheKey);
      if (cached) return cached;
    }

    try {
      const url = `${HOUSE_MUSLIM_API_BASE}/prayer/qibla?lat=${encodeURIComponent(
        roundedLat
      )}&lng=${encodeURIComponent(roundedLng)}`;

      const envelope = await fetchJsonWithTimeout<HouseMuslimEnvelope<Omit<QiblaData, 'source'>>>(
        url,
        { method: 'GET' },
        5500,
        1
      );

      if (!envelope || !envelope.success || !envelope.data || typeof envelope.data.bearing_deg !== 'number') {
        throw new Error(envelope?.error?.message || 'Respons API Kiblat House Muslim tidak valid.');
      }

      const result: QiblaData = {
        ...envelope.data,
        source: 'housemuslim-api',
      };
      await setCachedAsync(cacheKey, result, TTL_30D);
      return result;
    } catch {
      const stale = await getCachedAsync<QiblaData>(cacheKey, true);
      if (stale) return stale;

      const computed = computeDeterministicQibla(roundedLat, roundedLng);
      await setCachedAsync(cacheKey, computed, TTL_30D);
      return computed;
    }
  },
};

// ============================================================================
// 2. ADZAN & JADWAL SALAT SERVICE (eQuran.id v2 Shalat API + Offline Fallback)
// ============================================================================

export const PRAYER_LABELS: Record<PrayerTimeKey, { label: string; arabic: string; isMainPrayer: boolean }> = {
  imsak: { label: 'Imsak', arabic: 'الإمساك', isMainPrayer: false },
  subuh: { label: 'Subuh', arabic: 'الصبح', isMainPrayer: true },
  terbit: { label: 'Terbit', arabic: 'الشروق', isMainPrayer: false },
  dhuha: { label: 'Duha', arabic: 'الضحى', isMainPrayer: false },
  dzuhur: { label: 'Zuhur', arabic: 'الظهر', isMainPrayer: true },
  ashar: { label: 'Asar', arabic: 'العصر', isMainPrayer: true },
  maghrib: { label: 'Magrib', arabic: 'المغرب', isMainPrayer: true },
  isya: { label: 'Isya', arabic: 'العشاء', isMainPrayer: true },
};

export const PRAYER_ORDER: PrayerTimeKey[] = [
  'imsak',
  'subuh',
  'terbit',
  'dhuha',
  'dzuhur',
  'ashar',
  'maghrib',
  'isya',
];

const OFFLINE_PROVINCE_LIST: string[] = [
  'Aceh',
  'Bali',
  'Banten',
  'Bengkulu',
  'DI Yogyakarta',
  'DKI Jakarta',
  'Gorontalo',
  'Jambi',
  'Jawa Barat',
  'Jawa Tengah',
  'Jawa Timur',
  'Kalimantan Barat',
  'Kalimantan Selatan',
  'Kalimantan Tengah',
  'Kalimantan Timur',
  'Kalimantan Utara',
  'Kepulauan Bangka Belitung',
  'Kepulauan Riau',
  'Lampung',
  'Maluku',
  'Maluku Utara',
  'Nusa Tenggara Barat',
  'Nusa Tenggara Timur',
  'Papua',
  'Papua Barat',
  'Riau',
  'Sulawesi Barat',
  'Sulawesi Selatan',
  'Sulawesi Tengah',
  'Sulawesi Tenggara',
  'Sulawesi Utara',
  'Sumatera Barat',
  'Sumatera Selatan',
  'Sumatera Utara',
];

const OFFLINE_KABKOTA_MAP: Record<string, string[]> = {
  'DKI Jakarta': ['Kota Jakarta', 'Kab. Kepulauan Seribu'],
  'Jawa Barat': ['Kota Bandung', 'Kota Bogor', 'Kota Bekasi', 'Kota Depok', 'Kota Cimahi', 'Kota Cirebon', 'Kota Sukabumi', 'Kota Tasikmalaya', 'Kab. Bandung', 'Kab. Bogor', 'Kab. Bekasi', 'Kab. Garut', 'Kab. Cianjur'],
  'Banten': ['Kota Tangerang', 'Kota Tangerang Selatan', 'Kota Serang', 'Kota Cilegon', 'Kab. Serang', 'Kab. Tangerang', 'Kab. Pandeglang', 'Kab. Lebak'],
  'Jawa Tengah': ['Kota Semarang', 'Kota Surakarta', 'Kota Magelang', 'Kota Pekalongan', 'Kota Salatiga', 'Kota Tegal', 'Kab. Banyumas', 'Kab. Cilacap', 'Kab. Klaten', 'Kab. Kudus'],
  'DI Yogyakarta': ['Kota Yogyakarta', 'Kab. Sleman', 'Kab. Bantul', 'Kab. Kulon Progo', 'Kab. Gunungkidul'],
  'Jawa Timur': ['Kota Surabaya', 'Kota Malang', 'Kota Kediri', 'Kota Madiun', 'Kota Mojokerto', 'Kota Pasuruan', 'Kota Probolinggo', 'Kota Batu', 'Kab. Sidoarjo', 'Kab. Gresik', 'Kab. Jember', 'Kab. Banyuwangi'],
};

const INDONESIAN_DAYS_NAME = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDONESIAN_MONTHS_NAME = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function computeOfflineMonthlyShalatSchedule(
  provinsi: string,
  kabkota: string,
  bulan: number,
  tahun: number
): ShalatMonthlyData {
  const daysInMonth = new Date(tahun, bulan, 0).getDate();
  // Approximate solar equation of time offset by month (in minutes)
  const monthlyOffsets = [4, 12, 8, -1, -4, 0, 5, 3, -6, -14, -15, -6];
  const eqOffset = monthlyOffsets[(bulan - 1) % 12] || 0;

  // Regional longitude adjustment within Indonesian timezones
  let lonShift = 0;
  const provLower = provinsi.toLowerCase();
  if (provLower.includes('jawa timur') || provLower.includes('surabaya')) lonShift = -16;
  else if (provLower.includes('jawa tengah') || provLower.includes('yogyakarta')) lonShift = -8;
  else if (provLower.includes('aceh') || provLower.includes('sumatera utara')) lonShift = 32;
  else if (provLower.includes('sumatera barat') || provLower.includes('riau')) lonShift = 20;

  const addMinutes = (baseHH: number, baseMM: number, delta: number): string => {
    const total = (baseHH * 60 + baseMM + delta + 1440) % 1440;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const jadwal: ShalatDailySchedule[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(tahun, bulan - 1, d);
    const totalShift = eqOffset + lonShift + Math.round((d - 15) * 0.15);
    const yyyy = String(tahun);
    const mm = String(bulan).padStart(2, '0');
    const dd = String(d).padStart(2, '0');

    jadwal.push({
      tanggal: d,
      tanggal_lengkap: `${yyyy}-${mm}-${dd}`,
      hari: INDONESIAN_DAYS_NAME[dt.getDay()],
      imsak: addMinutes(4, 24, totalShift),
      subuh: addMinutes(4, 34, totalShift),
      terbit: addMinutes(5, 51, totalShift),
      dhuha: addMinutes(6, 19, totalShift),
      dzuhur: addMinutes(11, 56, totalShift),
      ashar: addMinutes(15, 14, totalShift),
      maghrib: addMinutes(17, 58, totalShift),
      isya: addMinutes(19, 8, totalShift),
    });
  }

  return {
    provinsi,
    kabkota,
    bulan,
    tahun,
    bulan_nama: INDONESIAN_MONTHS_NAME[(bulan - 1) % 12] || 'Bulan',
    jadwal,
  };
}

export const equranShalatApi = {
  async getProvinsiList(forceRefresh = false): Promise<string[]> {
    const cacheKey = 'shalat:provinsi';
    const TTL_30D = 30 * 24 * 60 * 60 * 1000;

    if (!forceRefresh) {
      const cached = await getCachedAsync<string[]>(cacheKey);
      if (cached && cached.length > 0) return cached;
    }

    try {
      const res = await fetchJsonWithTimeout<EQuranResponse<string[]>>(
        `${EQURAN_SHALAT_API_BASE}/provinsi`,
        { method: 'GET' }
      );
      if (res.code !== 200 || !Array.isArray(res.data)) {
        throw new Error(res.message || 'Gagal memuat daftar provinsi.');
      }
      await setCachedAsync(cacheKey, res.data, TTL_30D);
      return res.data;
    } catch {
      const fallback = await getCachedAsync<string[]>(cacheKey, true);
      if (fallback && fallback.length > 0) return fallback;
      return OFFLINE_PROVINCE_LIST;
    }
  },

  async getKabKotaList(provinsi: string, forceRefresh = false): Promise<string[]> {
    const cleanProv = provinsi.trim();
    if (!cleanProv) throw new Error('Nama provinsi wajib diisi.');

    const cacheKey = `shalat:kabkota:${cleanProv}`;
    const TTL_30D = 30 * 24 * 60 * 60 * 1000;

    if (!forceRefresh) {
      const cached = await getCachedAsync<string[]>(cacheKey);
      if (cached && cached.length > 0) return cached;
    }

    try {
      const res = await fetchJsonWithTimeout<EQuranResponse<string[]>>(
        `${EQURAN_SHALAT_API_BASE}/kabkota`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provinsi: cleanProv }),
        }
      );
      if (res.code !== 200 || !Array.isArray(res.data)) {
        throw new Error(res.message || 'Gagal memuat daftar kabupaten/kota.');
      }
      await setCachedAsync(cacheKey, res.data, TTL_30D);
      return res.data;
    } catch {
      const fallback = await getCachedAsync<string[]>(cacheKey, true);
      if (fallback && fallback.length > 0) return fallback;
      return OFFLINE_KABKOTA_MAP[cleanProv] || [`Kota ${cleanProv}`, `Kab. ${cleanProv}`];
    }
  },

  async getMonthlySchedule(
    provinsi: string,
    kabkota: string,
    bulan: number,
    tahun: number,
    forceRefresh = false
  ): Promise<ShalatMonthlyData> {
    const cleanProv = provinsi.trim();
    const cleanKab = kabkota.trim();
    if (!cleanProv || !cleanKab) {
      throw new Error('Provinsi dan Kabupaten/Kota harus dipilih terlebih dahulu.');
    }
    if (bulan < 1 || bulan > 12) {
      throw new Error('Bulan harus antara 1 hingga 12.');
    }

    const cacheKey = `shalat:schedule:${cleanProv}:${cleanKab}:${tahun}-${bulan}`;
    const TTL_30D = 30 * 24 * 60 * 60 * 1000;

    if (!forceRefresh) {
      const cached = await getCachedAsync<ShalatMonthlyData>(cacheKey);
      if (cached && Array.isArray(cached.jadwal)) return cached;
    }

    try {
      const res = await fetchJsonWithTimeout<EQuranResponse<ShalatMonthlyData>>(
        EQURAN_SHALAT_API_BASE,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provinsi: cleanProv,
            kabkota: cleanKab,
            bulan,
            tahun,
          }),
        }
      );
      if (res.code !== 200 || !res.data || !Array.isArray(res.data.jadwal)) {
        throw new Error(res.message || 'Jadwal salat tidak ditemukan untuk wilayah tersebut.');
      }
      await setCachedAsync(cacheKey, res.data, TTL_30D);
      return res.data;
    } catch {
      const fallback = await getCachedAsync<ShalatMonthlyData>(cacheKey, true);
      if (fallback && Array.isArray(fallback.jadwal)) return fallback;
      // Offline solar approximation fallback so user is never blocked when offline
      return computeOfflineMonthlyShalatSchedule(cleanProv, cleanKab, bulan, tahun);
    }
  },
};

export function computeNextPrayer(
  todaySchedule: ShalatDailySchedule | null,
  tomorrowSchedule: ShalatDailySchedule | null,
  now: Date = new Date()
): NextPrayerInfo | null {
  if (!todaySchedule) return null;

  const currentSeconds =
    now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  for (const key of PRAYER_ORDER) {
    const timeStr = todaySchedule[key];
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) continue;
    const [hh, mm] = timeStr.split(':').map(Number);
    const targetSeconds = hh * 3600 + mm * 60;
    if (targetSeconds > currentSeconds) {
      return {
        key,
        label: PRAYER_LABELS[key].label,
        timeStr,
        isTomorrow: false,
        remainingSeconds: targetSeconds - currentSeconds,
      };
    }
  }

  const nextSchedule = tomorrowSchedule || todaySchedule;
  const firstKey: PrayerTimeKey = 'imsak';
  const timeStr = nextSchedule[firstKey] || nextSchedule.subuh;
  const [hh, mm] = timeStr.split(':').map(Number);
  const secondsUntilMidnight = 24 * 3600 - currentSeconds;
  const targetSeconds = hh * 3600 + mm * 60;

  return {
    key: firstKey,
    label: PRAYER_LABELS[firstKey].label,
    timeStr,
    isTomorrow: true,
    remainingSeconds: secondsUntilMidnight + targetSeconds,
  };
}

export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ============================================================================
// 3. DOA & DZIKIR SERVICE (eQuran.id Doa API + IndexedDB + Built-in Fallback)
// ============================================================================

export const OFFLINE_FALLBACK_DOAS: DoaItem[] = [
  {
    id: 1,
    grup: 'Doa Harian',
    nama: 'Doa Sebelum Tidur',
    ar: 'بِاسْمِكَ اللّٰهُمَّ أَحْيَا وَبِاسْمِكَ أَمُوْتُ',
    tr: "Bismikallāhumma aḥyā wa bismika amūt.",
    idn: 'Dengan menyebut nama-Mu, ya Allah, aku hidup dan dengan menyebut nama-Mu aku mati.',
    tentang: 'HR. Bukhari no. 6324 dan Muslim no. 2714',
    tag: ['tidur', 'malam', 'harian'],
  },
  {
    id: 2,
    grup: 'Doa Harian',
    nama: 'Doa Bangun Tidur',
    ar: 'اَلْحَمْدُ لِلّٰهِ الَّذِيْ أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُوْرُ',
    tr: "Alḥamdu lillāhil-ladzī aḥyānā ba'da mā amātanā wa ilaihin-nusyūr.",
    idn: 'Segala puji bagi Allah yang telah menghidupkan kami setelah mematikan kami, dan kepada-Nya lah tempat kebangkitan.',
    tentang: 'HR. Bukhari no. 6312 dan Muslim no. 2711',
    tag: ['tidur', 'pagi', 'syukur'],
  },
  {
    id: 3,
    grup: 'Doa Dalam Al-Quran',
    nama: 'Doa Sapu Jagat (Kebaikan Dunia & Akhirat)',
    ar: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    tr: "Rabbanā ātinā fid-dunyā ḥasanataw wa fil-ākhirati ḥasanataw wa qinā 'adzāban-nār.",
    idn: 'Ya Tuhan kami, berilah kami kebaikan di dunia dan kebaikan di akhirat, dan lindungilah kami dari azab neraka.',
    tentang: 'QS. Al-Baqarah: 201',
    tag: ['quran', 'kebaikan', 'perlindungan'],
  },
  {
    id: 4,
    grup: 'Doa Dalam Al-Quran',
    nama: 'Doa Memohon Keteguhan Hati (Sabar & Iman)',
    ar: 'رَبَّنَا لَا تُزِغْ قُلُوْبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لَّدُنْكَ رَحْمَةً ۚ إِنَّكَ أَنْتَ الْوَهَّابُ',
    tr: "Rabbanā lā tuzigh qulūbanā ba'da idz hadaitanā wa hab lanā mil ladunka raḥmah, innaka antal-wahhāb.",
    idn: 'Ya Tuhan kami, janganlah Engkau condongkan hati kami kepada kesesatan setelah Engkau berikan petunjuk kepada kami, dan karuniakanlah kepada kami rahmat dari sisi-Mu. Sesungguhnya Engkau Maha Pemberi.',
    tentang: 'QS. Ali Imran: 8',
    tag: ['quran', 'iman', 'tenang', 'hidayah'],
  },
  {
    id: 5,
    grup: 'Dzikir & Doa Sesudah Salat',
    nama: 'Doa Memohon Ilmu, Rezeki & Amal yang Diterima',
    ar: 'اَللّٰهُمَّ إِنِّيْ أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا',
    tr: "Allāhumma innī as'aluka 'ilman nāfi'an, wa rizqan ṭayyiban, wa 'amalan mutaqabbalan.",
    idn: 'Ya Allah, sesungguhnya aku memohon kepada-Mu ilmu yang bermanfaat, rezeki yang baik (halal), dan amal yang diterima.',
    tentang: 'HR. Ibnu Majah no. 925',
    tag: ['rezeki', 'ilmu', 'salat', 'pagi'],
  },
  {
    id: 6,
    grup: 'Doa Harian',
    nama: 'Sayyidul Istighfar (Penghulu Permohonan Ampunan)',
    ar: 'اَللّٰهُمَّ أَنْتَ رَبِّيْ لَا إِلٰهَ إِلَّا أَنْتَ خَلَقْتَنِيْ وَأَنَا عَبْدُكَ وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ أَعُوْذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ أَبُوْءُ لَكَ بِنِعْمَتِكَ عَلَيَّ وَأَبُوْءُ بِذَنْبِيْ فَاغْفِرْ لِيْ فَإِنَّهُ لَا يَغْفِرُ الذُّنُوْبَ إِلَّا أَنْتَ',
    tr: "Allāhumma anta rabbī lā ilāha illā anta khalaqtanī wa anā 'abduka wa anā 'alā 'ahdika wa wa'dika mastatha'tu, a'ūdzu bika min syarri mā shana'tu, abū'u laka bini'matika 'alayya wa abū'u bidzanbī faghfir lī fa innahū lā yaghfirudz-dzunūba illā anta.",
    idn: 'Ya Allah, Engkau adalah Tuhanku, tidak ada Tuhan yang berhak disembah kecuali Engkau. Engkaulah yang menciptakanku dan aku adalah hamba-Mu. Aku mengakui nikmat-Mu kepadaku dan aku mengakui dosaku, maka ampunilah aku, karena sesungguhnya tidak ada yang mengampuni dosa-dosa kecuali Engkau.',
    tentang: 'HR. Bukhari no. 6306',
    tag: ['ampunan', 'taubat', 'pagi', 'petang'],
  },
];

export const equranDoaApi = {
  async getDoaList(
    params?: { grup?: string; tag?: string },
    forceRefresh = false
  ): Promise<DoaItem[]> {
    const grup = params?.grup?.trim() || '';
    const tag = params?.tag?.trim() || '';
    const cacheKey = `doa:list:${grup || 'all'}:${tag || 'all'}`;
    const TTL_30D = 30 * 24 * 60 * 60 * 1000;

    if (!forceRefresh) {
      const cached = await getCachedAsync<DoaItem[]>(cacheKey);
      if (cached && cached.length > 0) return cached;
    }

    try {
      const searchParams = new URLSearchParams();
      if (grup) searchParams.set('grup', grup);
      if (tag) searchParams.set('tag', tag);
      const queryString = searchParams.toString();
      const url = queryString ? `${EQURAN_DOA_API_BASE}?${queryString}` : EQURAN_DOA_API_BASE;

      const res = await fetchJsonWithTimeout<DoaListResponse>(url, { method: 'GET' });
      if (res.status !== 'success' || !Array.isArray(res.data)) {
        throw new Error('Gagal memuat daftar doa dan dzikir dari eQuran.id.');
      }

      await setCachedAsync(cacheKey, res.data, TTL_30D);
      return res.data;
    } catch {
      const fallback = await getCachedAsync<DoaItem[]>(cacheKey, true);
      if (fallback && fallback.length > 0) return fallback;

      // If filtering by grup/tag while offline, filter from full cached catalog
      const allCached =
        (await getCachedAsync<DoaItem[]>('doa:list:all:all', true)) ||
        OFFLINE_FALLBACK_DOAS;
      return allCached.filter((item) => {
        if (grup && item.grup?.toLowerCase() !== grup.toLowerCase()) return false;
        if (
          tag &&
          !item.tag?.some((t) => t.toLowerCase() === tag.toLowerCase())
        ) {
          return false;
        }
        return true;
      });
    }
  },

  async getDoaDetail(id: number, forceRefresh = false): Promise<DoaItem> {
    if (!Number.isInteger(id) || id < 1) {
      throw new Error('ID doa tidak valid.');
    }

    const cacheKey = `doa:detail:${id}`;
    const TTL_30D = 30 * 24 * 60 * 60 * 1000;

    if (!forceRefresh) {
      const cached = await getCachedAsync<DoaItem>(cacheKey);
      if (cached) return cached;
    }

    try {
      const res = await fetchJsonWithTimeout<DoaDetailResponse>(
        `${EQURAN_DOA_API_BASE}/${id}`,
        { method: 'GET' }
      );
      if (res.status !== 'success' || !res.data) {
        throw new Error('Detail doa tidak ditemukan.');
      }
      await setCachedAsync(cacheKey, res.data, TTL_30D);
      return res.data;
    } catch {
      const fallback = await getCachedAsync<DoaItem>(cacheKey, true);
      if (fallback) return fallback;

      const allCached =
        (await getCachedAsync<DoaItem[]>('doa:list:all:all', true)) ||
        OFFLINE_FALLBACK_DOAS;
      const found = allCached.find((d) => d.id === id);
      if (found) return found;
      throw new Error('Detail doa belum tersedia secara offline.');
    }
  },
};

// ============================================================================
// 4. KALENDER HIJRIAH SERVICE (MABIMS.dev API v1 + Offline Astronomical Fallback)
// ============================================================================

export const HIJRI_MONTH_NAMES: Record<number, { latin: string; arabic: string }> = {
  1: { latin: 'Muharram', arabic: 'محرّم' },
  2: { latin: 'Safar', arabic: 'صفر' },
  3: { latin: 'Rabiul Awal', arabic: 'ربيع الأوّل' },
  4: { latin: 'Rabiul Akhir', arabic: 'ربيع الآخر' },
  5: { latin: 'Jumadil Awal', arabic: 'جمادى الأولى' },
  6: { latin: 'Jumadil Akhir', arabic: 'جمادى الآخرة' },
  7: { latin: 'Rajab', arabic: 'رجب' },
  8: { latin: "Sya'ban", arabic: 'شعبان' },
  9: { latin: 'Ramadhan', arabic: 'رمضان' },
  10: { latin: 'Syawal', arabic: 'شوّال' },
  11: { latin: "Dzulqa'dah", arabic: 'ذو القعدة' },
  12: { latin: 'Dzulhijjah', arabic: 'ذو الحجّة' },
};

const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function gregorianToHijriOffline(gDateStr: string): {
  year: number;
  month: number;
  day: number;
  weekday: string;
} {
  const [y, m, d] = gDateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const weekday = WEEKDAYS_EN[dt.getUTCDay()];

  try {
    const parts = new Intl.DateTimeFormat('en-TN-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).formatToParts(dt);
    const hy = Number(parts.find((p) => p.type === 'year')?.value || 1448);
    const hm = Number(parts.find((p) => p.type === 'month')?.value || 5);
    const hd = Number(parts.find((p) => p.type === 'day')?.value || 16);
    return {
      year: hy,
      month: Math.min(12, Math.max(1, hm)),
      day: Math.min(30, Math.max(1, hd)),
      weekday,
    };
  } catch {
    // Tabular Islamic calendar fallback
    const jd =
      Math.floor((1461 * (y + 4800 + Math.floor((m - 14) / 12))) / 4) +
      Math.floor((367 * (m - 2 - 12 * Math.floor((m - 14) / 12))) / 12) -
      Math.floor((3 * Math.floor((y + 4900 + Math.floor((m - 14) / 12)) / 100)) / 4) +
      d -
      32075;
    const l = jd - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    const l2 = l - 10631 * n + 354;
    const j =
      Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
      Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
    const l3 =
      l2 -
      Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
      Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
      29;
    const hm = Math.floor((24 * l3) / 709);
    const hd = l3 - Math.floor((709 * hm) / 24);
    const hy = 30 * n + j - 30;
    return { year: hy, month: hm, day: hd, weekday };
  }
}

function hijriToGregorianOffline(hYear: number, hMonth: number, hDay: number): {
  dateStr: string;
  year: number;
  month: number;
  day: number;
  weekday: string;
} {
  const jd =
    Math.floor((11 * hYear + 3) / 30) +
    354 * hYear +
    30 * hMonth -
    Math.floor((hMonth - 1) / 2) +
    hDay +
    1948440 -
    385;
  let l = jd + 68569;
  const n = Math.floor((4 * l) / 146097);
  l = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l + 1)) / 1461001);
  l = l - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l) / 2447);
  const d = l - Math.floor((2447 * j) / 80);
  l = Math.floor(j / 11);
  const m = j + 2 - 12 * l;
  const y = 100 * (n - 49) + i + l;
  const dateStr = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return {
    dateStr,
    year: y,
    month: m,
    day: d,
    weekday: WEEKDAYS_EN[dt.getUTCDay()],
  };
}

function computeOfflineHijriMonth(year: number, month: number): MabimsMonthResponse {
  const length = month % 2 === 1 || month === 12 ? 30 : 29;
  const items: MabimsMonthItem[] = [];
  for (let d = 1; d <= length; d++) {
    const g = hijriToGregorianOffline(year, month, d);
    items.push({
      hijri: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      gregorian: g.dateStr,
      weekday: g.weekday,
      source: 'mabims-computed',
    });
  }
  return {
    input: {
      year,
      month,
      calendar: 'hijri',
    },
    count: items.length,
    items,
  };
}

function computeOfflineHijriEvents(year: number): MabimsEventsResponse {
  const specs: Array<{ event: string; m: number; d: number; name: string }> = [
    { event: 'islamic_new_year', m: 1, d: 1, name: 'Tahun Baru Islam 1 Muharram' },
    { event: 'ashura', m: 1, d: 10, name: 'Hari Asyura (Puasa Sunnah 10 Muharram)' },
    { event: 'mawlid', m: 3, d: 12, name: 'Maulid Nabi Muhammad SAW' },
    { event: 'isra_miraj', m: 7, d: 27, name: "Isra Mi'raj Nabi Muhammad SAW" },
    { event: 'nisfu_shaban', m: 8, d: 15, name: "Malam Nisfu Sya'ban" },
    { event: 'ramadan_start', m: 9, d: 1, name: 'Awal Puasa Ramadhan' },
    { event: 'nuzulul_quran', m: 9, d: 17, name: "Nuzulul Qur'an" },
    { event: 'eid_al_fitr', m: 10, d: 1, name: 'Hari Raya Idul Fitri 1 Syawal' },
    { event: 'arafah', m: 12, d: 9, name: 'Hari Arafah (Puasa Sunnah Arafah)' },
    { event: 'eid_al_adha', m: 12, d: 10, name: 'Hari Raya Idul Adha 10 Dzulhijjah' },
  ];

  const events: MabimsEventItem[] = specs.map((s) => {
    const g = hijriToGregorianOffline(year, s.m, s.d);
    return {
      event: s.event,
      name: s.name,
      hijri: `${String(year).padStart(4, '0')}-${String(s.m).padStart(2, '0')}-${String(s.d).padStart(2, '0')}`,
      gregorian: g.dateStr,
      source: 'mabims-computed',
      date_range: null,
    };
  });

  return {
    input: {
      year,
      calendar: 'hijri',
      include: null,
    },
    count: events.length,
    events,
  };
}

export const mabimsHijriApi = {
  async getToday(tz = 'Asia/Jakarta', forceRefresh = false): Promise<MabimsTodayResponse> {
    const localDateKey = new Date().toISOString().slice(0, 10);
    const cacheKey = `mabims:today:${tz}:${localDateKey}`;
    const TTL_7D = 7 * 24 * 60 * 60 * 1000;

    if (!forceRefresh) {
      const cached = await getCachedAsync<MabimsTodayResponse>(cacheKey);
      if (cached) return cached;
    }

    try {
      const url = `${MABIMS_API_BASE}/today?tz=${encodeURIComponent(tz)}`;
      const res = await fetchJsonWithTimeout<MabimsTodayResponse>(url, { method: 'GET' });
      if (!res || !res.output || !res.output.date) {
        throw new Error('Respons tanggal Hijriah hari ini tidak valid.');
      }
      await setCachedAsync(cacheKey, res, TTL_7D);
      return res;
    } catch {
      const fallback = await getCachedAsync<MabimsTodayResponse>(cacheKey, true);
      if (fallback) return fallback;

      const h = gregorianToHijriOffline(localDateKey);
      const mInfo = HIJRI_MONTH_NAMES[h.month] || HIJRI_MONTH_NAMES[1];
      return {
        input: {
          calendar: 'gregorian',
          date: localDateKey,
          tz,
        },
        output: {
          calendar: 'hijri',
          date: `${String(h.year).padStart(4, '0')}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`,
          year: h.year,
          month: h.month,
          day: h.day,
          month_name: mInfo.latin,
          weekday: h.weekday,
        },
        source: 'mabims-computed',
        warnings: [],
      };
    }
  },

  async convertDate(
    date: string,
    calendar: 'gregorian' | 'hijri' = 'gregorian'
  ): Promise<MabimsConvertResponse> {
    const cleanDate = date.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      throw new Error('Format tanggal harus YYYY-MM-DD (contoh: 2026-04-19 atau 1447-09-01).');
    }

    const cacheKey = `mabims:convert:${calendar}:${cleanDate}`;
    const TTL_30D = 30 * 24 * 60 * 60 * 1000;

    const cached = await getCachedAsync<MabimsConvertResponse>(cacheKey);
    if (cached) return cached;

    try {
      const searchParams = new URLSearchParams({
        date: cleanDate,
        calendar,
      });
      const url = `${MABIMS_API_BASE}/convert?${searchParams.toString()}`;
      const res = await fetchJsonWithTimeout<MabimsConvertResponse>(url, { method: 'GET' });
      if (!res || !res.output || !res.output.date) {
        throw new Error('Konversi tanggal gagal atau tanggal di luar cakupan.');
      }
      await setCachedAsync(cacheKey, res, TTL_30D);
      return res;
    } catch {
      const [y, m, d] = cleanDate.split('-').map(Number);
      if (calendar === 'gregorian') {
        const h = gregorianToHijriOffline(cleanDate);
        const mInfo = HIJRI_MONTH_NAMES[h.month] || HIJRI_MONTH_NAMES[1];
        return {
          input: {
            calendar: 'gregorian',
            date: cleanDate,
            tz: null,
          },
          output: {
            calendar: 'hijri',
            date: `${String(h.year).padStart(4, '0')}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`,
            year: h.year,
            month: h.month,
            day: h.day,
            month_name: mInfo.latin,
            weekday: h.weekday,
          },
          source: 'mabims-computed',
          warnings: [],
        };
      } else {
        const g = hijriToGregorianOffline(y, m, d);
        return {
          input: {
            calendar: 'hijri',
            date: cleanDate,
            tz: null,
          },
          output: {
            calendar: 'gregorian',
            date: g.dateStr,
            year: g.year,
            month: g.month,
            day: g.day,
            month_name: INDONESIAN_MONTHS_NAME[(g.month - 1) % 12] || 'Bulan',
            weekday: g.weekday,
          },
          source: 'mabims-computed',
          warnings: [],
        };
      }
    }
  },

  async getMonthCalendar(
    year: number,
    month: number,
    forceRefresh = false
  ): Promise<MabimsMonthResponse> {
    if (month < 1 || month > 12) {
      throw new Error('Bulan Hijriah harus antara 1 sampai 12.');
    }

    const cacheKey = `mabims:month:${year}-${month}`;
    const TTL_30D = 30 * 24 * 60 * 60 * 1000;

    if (!forceRefresh) {
      const cached = await getCachedAsync<MabimsMonthResponse>(cacheKey);
      if (cached && Array.isArray(cached.items)) return cached;
    }

    try {
      const url = `${MABIMS_API_BASE}/month?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`;
      const res = await fetchJsonWithTimeout<MabimsMonthResponse>(url, { method: 'GET' });
      if (!res || !Array.isArray(res.items)) {
        throw new Error('Data kalender bulanan Hijriah tidak valid.');
      }
      await setCachedAsync(cacheKey, res, TTL_30D);
      return res;
    } catch {
      const fallback = await getCachedAsync<MabimsMonthResponse>(cacheKey, true);
      if (fallback) return fallback;
      return computeOfflineHijriMonth(year, month);
    }
  },

  async getYearCalendar(year: number, forceRefresh = false): Promise<MabimsYearResponse> {
    const cacheKey = `mabims:year:${year}`;
    const TTL_30D = 30 * 24 * 60 * 60 * 1000;

    if (!forceRefresh) {
      const cached = await getCachedAsync<MabimsYearResponse>(cacheKey);
      if (cached && cached.months) return cached;
    }

    try {
      const url = `${MABIMS_API_BASE}/year?year=${encodeURIComponent(year)}`;
      const res = await fetchJsonWithTimeout<MabimsYearResponse>(url, { method: 'GET' });
      if (!res || !res.months) {
        throw new Error('Data kalender tahunan Hijriah tidak valid.');
      }
      await setCachedAsync(cacheKey, res, TTL_30D);
      return res;
    } catch {
      const fallback = await getCachedAsync<MabimsYearResponse>(cacheKey, true);
      if (fallback) return fallback;

      const months: Record<string, MabimsMonthItem[]> = {};
      let totalCount = 0;
      for (let m = 1; m <= 12; m++) {
        const mData = computeOfflineHijriMonth(year, m);
        months[String(m)] = mData.items;
        totalCount += mData.items.length;
      }
      return {
        input: {
          year,
          calendar: 'hijri',
        },
        count: totalCount,
        months,
      };
    }
  },

  async getEvents(year: number, forceRefresh = false): Promise<MabimsEventsResponse> {
    const cacheKey = `mabims:events:${year}`;
    const TTL_30D = 30 * 24 * 60 * 60 * 1000;

    if (!forceRefresh) {
      const cached = await getCachedAsync<MabimsEventsResponse>(cacheKey);
      if (cached && Array.isArray(cached.events)) return cached;
    }

    try {
      const url = `${MABIMS_API_BASE}/events?year=${encodeURIComponent(year)}`;
      const res = await fetchJsonWithTimeout<MabimsEventsResponse>(url, { method: 'GET' });
      if (!res || !Array.isArray(res.events)) {
        throw new Error('Data hari besar Islam tidak valid.');
      }
      await setCachedAsync(cacheKey, res, TTL_30D);
      return res;
    } catch {
      const fallback = await getCachedAsync<MabimsEventsResponse>(cacheKey, true);
      if (fallback) return fallback;
      return computeOfflineHijriEvents(year);
    }
  },
};
