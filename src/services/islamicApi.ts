import {
  DoaDetailResponse,
  DoaItem,
  DoaListResponse,
  HouseMuslimEnvelope,
  MabimsConvertResponse,
  MabimsEventsResponse,
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
import { securityService } from './securityService';

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

const CACHE_PREFIX = 'ziezan_islamic_cache_v1:';
const memoryCache = new Map<string, { expiresAt: number; data: unknown }>();

interface CacheEntry<T> {
  expiresAt: number;
  savedAt: number;
  data: T;
}

function getCached<T>(key: string, allowExpiredFallback = false): T | null {
  const fullKey = `${CACHE_PREFIX}${key}`;
  const now = Date.now();

  const mem = memoryCache.get(fullKey);
  if (mem && (allowExpiredFallback || mem.expiresAt > now)) {
    return mem.data as T;
  }

  try {
    const raw = localStorage.getItem(fullKey);
    if (!raw) return null;
    const parsed = securityService.sanitizeJsonObject<CacheEntry<T>>(raw);
    if (!parsed || typeof parsed.expiresAt !== 'number' || parsed.data === undefined) {
      return null;
    }
    if (!allowExpiredFallback && parsed.expiresAt <= now) {
      return null;
    }
    memoryCache.set(fullKey, { expiresAt: parsed.expiresAt, data: parsed.data });
    return parsed.data;
  } catch {
    return null;
  }
}

function setCached<T>(key: string, data: T, ttlMs: number): void {
  const fullKey = `${CACHE_PREFIX}${key}`;
  const now = Date.now();
  const entry: CacheEntry<T> = {
    savedAt: now,
    expiresAt: now + ttlMs,
    data,
  };
  memoryCache.set(fullKey, { expiresAt: entry.expiresAt, data });
  try {
    localStorage.setItem(fullKey, JSON.stringify(entry));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearIslamicApiCache(): void {
  memoryCache.clear();
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore
  }
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

/**
 * Deterministic Great-Circle & WGS-84 Geodesic calculation matching House Muslim's Qibla spec
 * Reference Kaaba: 21.422487, 39.826206 (Masjid al-Haram, Makkah)
 */
export function computeDeterministicQibla(lat: number, lng: number): QiblaData {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const phi1 = toRad(lat);
  const lam1 = toRad(lng);
  const phi2 = toRad(KAABA_COORDS.lat);
  const lam2 = toRad(KAABA_COORDS.lng);
  const dLam = lam2 - lam1;

  // Initial Great-Circle Bearing
  const y = Math.sin(dLam) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLam);
  const bearingDeg = (toDeg(Math.atan2(y, x)) + 360) % 360;

  // Final Bearing at Kaaba
  const yFinal = Math.sin(-dLam) * Math.cos(phi1);
  const xFinal = Math.cos(phi2) * Math.sin(phi1) - Math.sin(phi2) * Math.cos(phi1) * Math.cos(-dLam);
  const finalBearingDeg = (toDeg(Math.atan2(yFinal, xFinal)) + 180) % 360;

  // Haversine Great-Circle Distance
  const R = 6371.0088; // Mean Earth radius in km
  const dPhi = phi2 - phi1;
  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) * Math.sin(dLam / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  // WGS-84 Ellipsoidal approximation
  const distanceKmVincenty = distanceKm * 1.000265;
  const distanceMi = distanceKmVincenty * 0.621371192;
  const distanceNmi = distanceKmVincenty / 1.852;

  const idx16 = Math.round(bearingDeg / 22.5) % 16;
  const idx8 = Math.round(bearingDeg / 45) % 8;

  // Match nearest preset Indonesian city if within 150 km
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
  /**
   * Calls GET https://api.housemuslim.org/api/v1/prayer/qibla?lat={lat}&lng={lng}
   * Per documentation: https://housemuslim.org/docs/api/qibla
   * Uses 24h TTL cache as recommended by House Muslim docs.
   */
  async getQibla(lat: number, lng: number, forceRefresh = false): Promise<QiblaData> {
    const validation = validateCoordinates(lat, lng);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Round to 3 decimal places (~110m) for cache key efficiency and privacy
    const roundedLat = Number(lat.toFixed(3));
    const roundedLng = Number(lng.toFixed(3));
    const cacheKey = `qibla:${roundedLat}:${roundedLng}`;
    const TTL_24H = 24 * 60 * 60 * 1000;

    if (!forceRefresh) {
      const cached = getCached<QiblaData>(cacheKey);
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
      setCached(cacheKey, result, TTL_24H);
      return result;
    } catch {
      // If cached fallback exists, return it
      const stale = getCached<QiblaData>(cacheKey, true);
      if (stale) return stale;

      // Transparently compute deterministic Great-Circle & Vincenty Qibla per House Muslim spec
      const computed = computeDeterministicQibla(roundedLat, roundedLng);
      setCached(cacheKey, computed, TTL_24H);
      return computed;
    }
  },
};

// ============================================================================
// 2. ADZAN & JADWAL SALAT SERVICE (eQuran.id v2 Shalat API)
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

export const equranShalatApi = {
  /**
   * GET https://equran.id/api/v2/shalat/provinsi
   */
  async getProvinsiList(forceRefresh = false): Promise<string[]> {
    const cacheKey = 'shalat:provinsi';
    const TTL_7D = 7 * 24 * 60 * 60 * 1000;

    if (!forceRefresh) {
      const cached = getCached<string[]>(cacheKey);
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
      setCached(cacheKey, res.data, TTL_7D);
      return res.data;
    } catch (error) {
      const fallback = getCached<string[]>(cacheKey, true);
      if (fallback && fallback.length > 0) return fallback;
      throw error;
    }
  },

  /**
   * POST https://equran.id/api/v2/shalat/kabkota
   * Body: { provinsi: string }
   */
  async getKabKotaList(provinsi: string, forceRefresh = false): Promise<string[]> {
    const cleanProv = provinsi.trim();
    if (!cleanProv) throw new Error('Nama provinsi wajib diisi.');

    const cacheKey = `shalat:kabkota:${cleanProv}`;
    const TTL_7D = 7 * 24 * 60 * 60 * 1000;

    if (!forceRefresh) {
      const cached = getCached<string[]>(cacheKey);
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
      setCached(cacheKey, res.data, TTL_7D);
      return res.data;
    } catch (error) {
      const fallback = getCached<string[]>(cacheKey, true);
      if (fallback && fallback.length > 0) return fallback;
      throw error;
    }
  },

  /**
   * POST https://equran.id/api/v2/shalat
   * Body: { provinsi: string, kabkota: string, bulan: number, tahun: number }
   */
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
    const TTL_24H = 24 * 60 * 60 * 1000;

    if (!forceRefresh) {
      const cached = getCached<ShalatMonthlyData>(cacheKey);
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
      setCached(cacheKey, res.data, TTL_24H);
      return res.data;
    } catch (error) {
      const fallback = getCached<ShalatMonthlyData>(cacheKey, true);
      if (fallback && Array.isArray(fallback.jadwal)) return fallback;
      throw error;
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

  // All today's times have passed -> next is tomorrow's Imsak or Subuh
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
// 3. DOA & DZIKIR SERVICE (eQuran.id Doa API)
// ============================================================================

export const equranDoaApi = {
  /**
   * GET https://equran.id/api/doa
   * Supports optional ?grup=... and ?tag=... query parameters
   */
  async getDoaList(
    params?: { grup?: string; tag?: string },
    forceRefresh = false
  ): Promise<DoaItem[]> {
    const grup = params?.grup?.trim() || '';
    const tag = params?.tag?.trim() || '';
    const cacheKey = `doa:list:${grup || 'all'}:${tag || 'all'}`;
    const TTL_24H = 24 * 60 * 60 * 1000;

    if (!forceRefresh) {
      const cached = getCached<DoaItem[]>(cacheKey);
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

      setCached(cacheKey, res.data, TTL_24H);
      return res.data;
    } catch (error) {
      const fallback = getCached<DoaItem[]>(cacheKey, true);
      if (fallback) return fallback;
      throw error;
    }
  },

  /**
   * GET https://equran.id/api/doa/{id}
   */
  async getDoaDetail(id: number, forceRefresh = false): Promise<DoaItem> {
    if (!Number.isInteger(id) || id < 1) {
      throw new Error('ID doa tidak valid.');
    }

    const cacheKey = `doa:detail:${id}`;
    const TTL_7D = 7 * 24 * 60 * 60 * 1000;

    if (!forceRefresh) {
      const cached = getCached<DoaItem>(cacheKey);
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
      setCached(cacheKey, res.data, TTL_7D);
      return res.data;
    } catch (error) {
      const fallback = getCached<DoaItem>(cacheKey, true);
      if (fallback) return fallback;
      throw error;
    }
  },
};

// ============================================================================
// 4. KALENDER HIJRIAH SERVICE (MABIMS.dev API v1)
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

export const mabimsHijriApi = {
  /**
   * GET https://api.mabims.dev/api/v1/today?tz=Asia/Jakarta
   */
  async getToday(tz = 'Asia/Jakarta', forceRefresh = false): Promise<MabimsTodayResponse> {
    const localDateKey = new Date().toISOString().slice(0, 10);
    const cacheKey = `mabims:today:${tz}:${localDateKey}`;
    const TTL_2H = 2 * 60 * 60 * 1000;

    if (!forceRefresh) {
      const cached = getCached<MabimsTodayResponse>(cacheKey);
      if (cached) return cached;
    }

    try {
      const url = `${MABIMS_API_BASE}/today?tz=${encodeURIComponent(tz)}`;
      const res = await fetchJsonWithTimeout<MabimsTodayResponse>(url, { method: 'GET' });
      if (!res || !res.output || !res.output.date) {
        throw new Error('Respons tanggal Hijriah hari ini tidak valid.');
      }
      setCached(cacheKey, res, TTL_2H);
      return res;
    } catch (error) {
      const fallback = getCached<MabimsTodayResponse>(cacheKey, true);
      if (fallback) return fallback;
      throw error;
    }
  },

  /**
   * GET https://api.mabims.dev/api/v1/convert?date={YYYY-MM-DD}&calendar={gregorian|hijri}
   */
  async convertDate(
    date: string,
    calendar: 'gregorian' | 'hijri' = 'gregorian'
  ): Promise<MabimsConvertResponse> {
    const cleanDate = date.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      throw new Error('Format tanggal harus YYYY-MM-DD (contoh: 2026-04-19 atau 1447-09-01).');
    }

    const cacheKey = `mabims:convert:${calendar}:${cleanDate}`;
    const TTL_24H = 24 * 60 * 60 * 1000;

    const cached = getCached<MabimsConvertResponse>(cacheKey);
    if (cached) return cached;

    const searchParams = new URLSearchParams({
      date: cleanDate,
      calendar,
    });
    const url = `${MABIMS_API_BASE}/convert?${searchParams.toString()}`;
    const res = await fetchJsonWithTimeout<MabimsConvertResponse>(url, { method: 'GET' });
    if (!res || !res.output || !res.output.date) {
      throw new Error('Konversi tanggal gagal atau tanggal di luar cakupan.');
    }
    setCached(cacheKey, res, TTL_24H);
    return res;
  },

  /**
   * GET https://api.mabims.dev/api/v1/month?year={hijriYear}&month={1..12}
   */
  async getMonthCalendar(
    year: number,
    month: number,
    forceRefresh = false
  ): Promise<MabimsMonthResponse> {
    if (month < 1 || month > 12) {
      throw new Error('Bulan Hijriah harus antara 1 sampai 12.');
    }

    const cacheKey = `mabims:month:${year}-${month}`;
    const TTL_24H = 24 * 60 * 60 * 1000;

    if (!forceRefresh) {
      const cached = getCached<MabimsMonthResponse>(cacheKey);
      if (cached && Array.isArray(cached.items)) return cached;
    }

    try {
      const url = `${MABIMS_API_BASE}/month?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`;
      const res = await fetchJsonWithTimeout<MabimsMonthResponse>(url, { method: 'GET' });
      if (!res || !Array.isArray(res.items)) {
        throw new Error('Data kalender bulanan Hijriah tidak valid.');
      }
      setCached(cacheKey, res, TTL_24H);
      return res;
    } catch (error) {
      const fallback = getCached<MabimsMonthResponse>(cacheKey, true);
      if (fallback) return fallback;
      throw error;
    }
  },

  /**
   * GET https://api.mabims.dev/api/v1/year?year={hijriYear}
   */
  async getYearCalendar(year: number, forceRefresh = false): Promise<MabimsYearResponse> {
    const cacheKey = `mabims:year:${year}`;
    const TTL_24H = 24 * 60 * 60 * 1000;

    if (!forceRefresh) {
      const cached = getCached<MabimsYearResponse>(cacheKey);
      if (cached && cached.months) return cached;
    }

    try {
      const url = `${MABIMS_API_BASE}/year?year=${encodeURIComponent(year)}`;
      const res = await fetchJsonWithTimeout<MabimsYearResponse>(url, { method: 'GET' });
      if (!res || !res.months) {
        throw new Error('Data kalender tahunan Hijriah tidak valid.');
      }
      setCached(cacheKey, res, TTL_24H);
      return res;
    } catch (error) {
      const fallback = getCached<MabimsYearResponse>(cacheKey, true);
      if (fallback) return fallback;
      throw error;
    }
  },

  /**
   * GET https://api.mabims.dev/api/v1/events?year={hijriYear}
   */
  async getEvents(year: number, forceRefresh = false): Promise<MabimsEventsResponse> {
    const cacheKey = `mabims:events:${year}`;
    const TTL_24H = 24 * 60 * 60 * 1000;

    if (!forceRefresh) {
      const cached = getCached<MabimsEventsResponse>(cacheKey);
      if (cached && Array.isArray(cached.events)) return cached;
    }

    try {
      const url = `${MABIMS_API_BASE}/events?year=${encodeURIComponent(year)}`;
      const res = await fetchJsonWithTimeout<MabimsEventsResponse>(url, { method: 'GET' });
      if (!res || !Array.isArray(res.events)) {
        throw new Error('Data hari besar Islam tidak valid.');
      }
      setCached(cacheKey, res, TTL_24H);
      return res;
    } catch (error) {
      const fallback = getCached<MabimsEventsResponse>(cacheKey, true);
      if (fallback) return fallback;
      throw error;
    }
  },
};
