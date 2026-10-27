// ============================================================================
// 1. KIBLAT (House Muslim API: https://api.housemuslim.org/api/v1/prayer/qibla)
// ============================================================================

export interface HouseMuslimPlace {
  lat: number;
  lng: number;
  city: string;
  region: string;
  country: string;
  country_code: string;
  nearest_city_km?: number;
}

export interface HouseMuslimTimezone {
  id: string;
  offset_min: number;
}

export interface QiblaData {
  origin: {
    lat: number;
    lng: number;
  };
  kaaba: {
    lat: number;
    lng: number;
    name: string;
  };
  bearing_deg: number;
  final_bearing_deg: number;
  compass: string;
  compass_en: string;
  compass_id: string;
  cardinal8: string;
  distance_km: number;
  distance_km_vincenty: number;
  distance_mi: number;
  distance_nmi: number;
  place?: HouseMuslimPlace;
  timezone?: HouseMuslimTimezone;
  source: 'housemuslim-api' | 'local-spherical-fallback';
}

export interface HouseMuslimEnvelope<T> {
  success: boolean;
  data?: T;
  meta?: {
    trace_id?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: Array<{ field: string; rule: string }>;
  };
}

export type CompassSensorStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'unsupported'
  | 'denied';

export interface PresetCityLocation {
  name: string;
  province: string;
  lat: number;
  lng: number;
}

export interface SavedQiblaPreference {
  label: string;
  coarseLat: number; // rounded to 2 decimal places for privacy
  coarseLng: number;
  consentGiven: boolean;
  updatedAt: number;
}

// ============================================================================
// 2. ADZAN & JADWAL SALAT (eQuran.id API v2: https://equran.id/api/v2/shalat)
// ============================================================================

export type PrayerTimeKey =
  | 'imsak'
  | 'subuh'
  | 'terbit'
  | 'dhuha'
  | 'dzuhur'
  | 'ashar'
  | 'maghrib'
  | 'isya';

export interface ShalatDailySchedule {
  tanggal: number;
  tanggal_lengkap: string; // YYYY-MM-DD
  hari: string;
  imsak: string;
  subuh: string;
  terbit: string;
  dhuha: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
}

export interface ShalatMonthlyData {
  provinsi: string;
  kabkota: string;
  bulan: number;
  tahun: number;
  bulan_nama: string;
  jadwal: ShalatDailySchedule[];
}

export interface ShalatLocationPreference {
  provinsi: string;
  kabkota: string;
  updatedAt: number;
}

export type AdhanSoundPreference =
  | 'adzan-auto'
  | 'adzan-chime'
  | 'shalat-reminder'
  | 'mute';

export type AdzanAudioCategory = 'subuh' | 'adzan' | 'imsak' | 'terbit';

export interface AdzanAudioStreamConfig {
  category: AdzanAudioCategory;
  label: string;
  shortLabel: string;
  description: string;
  url: string;
  fallbackLocalUrl: string;
  mappedPrayers: PrayerTimeKey[];
}

export interface ShalatReminderSettings {
  enabled: boolean;
  audioEnabled: boolean;
  sound: AdhanSoundPreference;
  volume: number; // 0.0 to 1.0
  leadMinutes: 0 | 5 | 10;
  prayers: Record<PrayerTimeKey, boolean>;
  lastNotifiedKey?: string;
  triggeredEvents?: Record<string, number>; // eventKey -> epoch ms
  schemaVersion?: number;
}

export interface ActiveAdzanPlaybackState {
  isPlaying: boolean;
  isLoading: boolean;
  autoplayBlocked: boolean;
  isTest: boolean;
  category: AdzanAudioCategory;
  prayerKey?: PrayerTimeKey;
  label: string;
  locationLabel?: string;
  scheduledTime?: string;
  audioUrl: string;
  usingOfflineFallback?: boolean;
  error?: string | null;
}

export interface NextPrayerInfo {
  key: PrayerTimeKey;
  label: string;
  timeStr: string; // HH:MM
  isTomorrow: boolean;
  remainingSeconds: number;
}

// ============================================================================
// 3. DOA & DZIKIR (eQuran.id Doa API: https://equran.id/api/doa)
// ============================================================================

export interface DoaItem {
  id: number;
  grup: string;
  nama: string;
  ar: string;
  tr: string;
  idn: string;
  tentang: string;
  tag: string[];
}

export interface DoaListResponse {
  status: string;
  total: number;
  data: DoaItem[];
}

export interface DoaDetailResponse {
  status: string;
  data: DoaItem;
}

// ============================================================================
// 4. KALENDER HIJRIAH (MABIMS.dev API: https://api.mabims.dev/api/v1)
// ============================================================================

export type MabimsSourceType = 'mabims' | 'mabims-computed' | string;

export interface MabimsDateOutput {
  date: string; // YYYY-MM-DD
  calendar: 'hijri' | 'gregorian';
  day: number;
  month: number;
  month_name: string;
  year: number;
  weekday: string;
}

export interface MabimsTodayResponse {
  input: {
    date: string;
    calendar: string;
    tz: string;
  };
  output: MabimsDateOutput;
  source: MabimsSourceType;
  warnings: string[];
}

export interface MabimsConvertResponse {
  input: {
    date: string;
    calendar: string;
    tz: string | null;
  };
  output: MabimsDateOutput;
  source: MabimsSourceType;
  warnings: string[];
}

export interface MabimsMonthItem {
  gregorian: string; // YYYY-MM-DD
  hijri: string; // YYYY-MM-DD
  weekday: string;
  source: MabimsSourceType;
}

export interface MabimsMonthResponse {
  input: {
    year: number;
    month: number;
    calendar: string;
  };
  count: number;
  items: MabimsMonthItem[];
}

export interface MabimsYearResponse {
  input: {
    year: number;
    calendar: string;
  };
  count: number;
  months: Record<string, MabimsMonthItem[]>;
}

export interface MabimsEventItem {
  event: string;
  name: string;
  hijri: string;
  gregorian: string;
  source: MabimsSourceType;
  date_range: { start: string; end: string } | null;
}

export interface MabimsEventsResponse {
  input: {
    year: number;
    calendar: string;
    include: string | null;
  };
  count: number;
  events: MabimsEventItem[];
}

// ============================================================================
// 5. TUGAS IBADAH HARIAN (Daily Tasks & Ibadah Tracker)
// ============================================================================

export interface DailyTaskItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  category: 'shalat' | 'quran' | 'dzikir' | 'doa';
}

export interface DailyTasksState {
  dateIso: string;
  tasks: DailyTaskItem[];
}

