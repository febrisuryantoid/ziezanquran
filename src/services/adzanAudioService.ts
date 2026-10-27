import {
  ActiveAdzanPlaybackState,
  AdhanSoundPreference,
  AdzanAudioCategory,
  AdzanAudioStreamConfig,
  PrayerTimeKey,
  ShalatDailySchedule,
  ShalatReminderSettings,
} from '../types/islamic';
import { PRAYER_LABELS, PRAYER_ORDER } from './islamicApi';

// ============================================================================
// OFFICIAL AUDIO URL MAPPING (VERCEL BLOB STORAGE)
// ============================================================================

export const ADZAN_AUDIO_URLS: Record<AdzanAudioCategory, string> = {
  subuh: 'https://wflq2j4mi1smqyku.public.blob.vercel-storage.com/adzan_subuh.mp3',
  adzan: 'https://wflq2j4mi1smqyku.public.blob.vercel-storage.com/adzan.mp3',
  imsak: 'https://wflq2j4mi1smqyku.public.blob.vercel-storage.com/imsak.mp3',
  terbit: 'https://wflq2j4mi1smqyku.public.blob.vercel-storage.com/ayam.mp3',
};

export const ADZAN_AUDIO_STREAMS: Record<AdzanAudioCategory, AdzanAudioStreamConfig> = {
  subuh: {
    category: 'subuh',
    label: 'Adzan Subuh',
    shortLabel: 'Subuh',
    description:
      'Kumandang Adzan Subuh lengkap dengan kalimat Ash-shalaatu khairum minan-nauum.',
    url: ADZAN_AUDIO_URLS.subuh,
    fallbackLocalUrl: '/audio/adzan-chime.wav',
    mappedPrayers: ['subuh'],
  },
  adzan: {
    category: 'adzan',
    label: 'Adzan Zuhur, Asar, Magrib & Isya',
    shortLabel: 'Zuhur / Asar / Magrib / Isya',
    description:
      'Kumandang Adzan reguler untuk waktu salat wajib Zuhur, Asar, Magrib, dan Isya.',
    url: ADZAN_AUDIO_URLS.adzan,
    fallbackLocalUrl: '/audio/adzan-chime.wav',
    mappedPrayers: ['dzuhur', 'ashar', 'maghrib', 'isya'],
  },
  imsak: {
    category: 'imsak',
    label: 'Penanda Waktu Imsak',
    shortLabel: 'Imsak',
    description: 'Peringatan audio khusus saat memasuki waktu Imsak.',
    url: ADZAN_AUDIO_URLS.imsak,
    fallbackLocalUrl: '/audio/shalat-reminder.wav',
    mappedPrayers: ['imsak'],
  },
  terbit: {
    category: 'terbit',
    label: 'Penanda Waktu Terbit (Syuruq)',
    shortLabel: 'Terbit',
    description: 'Audio suasana fajar (kokok ayam) penanda waktu matahari terbit.',
    url: ADZAN_AUDIO_URLS.terbit,
    fallbackLocalUrl: '/audio/shalat-reminder.wav',
    mappedPrayers: ['terbit'],
  },
};

export const ADZAN_STREAM_LIST: AdzanAudioStreamConfig[] = [
  ADZAN_AUDIO_STREAMS.subuh,
  ADZAN_AUDIO_STREAMS.adzan,
  ADZAN_AUDIO_STREAMS.imsak,
  ADZAN_AUDIO_STREAMS.terbit,
];

/**
 * Maps each PrayerTimeKey from the eQuran.id schedule to its corresponding audio category.
 */
export function getPrayerAudioCategory(prayerKey: PrayerTimeKey): AdzanAudioCategory {
  switch (prayerKey) {
    case 'subuh':
      return 'subuh';
    case 'imsak':
      return 'imsak';
    case 'terbit':
      return 'terbit';
    case 'dzuhur':
    case 'ashar':
    case 'maghrib':
    case 'isya':
    case 'dhuha':
    default:
      return 'adzan';
  }
}

/**
 * Resolves the exact audio URL and fallback URL for a given prayer time and user preference.
 */
export function resolvePrayerAudioSource(
  prayerKey: PrayerTimeKey,
  soundPref: AdhanSoundPreference
): {
  category: AdzanAudioCategory;
  primaryUrl: string | null;
  fallbackUrl: string;
  label: string;
} {
  const category = getPrayerAudioCategory(prayerKey);
  const stream = ADZAN_AUDIO_STREAMS[category];
  const prayerLabel = PRAYER_LABELS[prayerKey]?.label || prayerKey;

  if (soundPref === 'mute') {
    return {
      category,
      primaryUrl: null,
      fallbackUrl: stream.fallbackLocalUrl,
      label: `Pengingat Waktu ${prayerLabel}`,
    };
  }

  if (soundPref === 'adzan-chime') {
    return {
      category,
      primaryUrl: '/audio/adzan-chime.wav',
      fallbackUrl: '/audio/adzan-chime.wav',
      label: `Nada Harmoni Adzan (${prayerLabel})`,
    };
  }

  if (soundPref === 'shalat-reminder') {
    return {
      category,
      primaryUrl: '/audio/shalat-reminder.wav',
      fallbackUrl: '/audio/shalat-reminder.wav',
      label: `Nada Pengingat Waktu ${prayerLabel}`,
    };
  }

  // Default: 'adzan-auto' -> uses the 4 mapped MP3 URLs (or gentle reminder for dhuha)
  if (prayerKey === 'dhuha') {
    return {
      category: 'adzan',
      primaryUrl: '/audio/shalat-reminder.wav',
      fallbackUrl: '/audio/shalat-reminder.wav',
      label: 'Pengingat Waktu Duha',
    };
  }

  return {
    category,
    primaryUrl: stream.url,
    fallbackUrl: stream.fallbackLocalUrl,
    label:
      category === 'subuh'
        ? 'Adzan Subuh'
        : category === 'imsak'
          ? 'Waktu Imsak'
          : category === 'terbit'
            ? 'Waktu Terbit (Syuruq)'
            : `Adzan ${prayerLabel}`,
  };
}

/**
 * Clamps volume safely between 0 and 1.
 */
export function clampVolume(vol: unknown, fallback = 0.85): number {
  if (typeof vol !== 'number' || !Number.isFinite(vol)) return fallback;
  return Math.max(0, Math.min(1, Math.round(vol * 100) / 100));
}

/**
 * Formats a Date into YYYY-MM-DD in the user's local timezone.
 */
export function getLocalDateIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns the user's current IANA timezone identifier.
 */
export function getLocalTimezoneId(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
  } catch {
    return 'Asia/Jakarta';
  }
}

export interface TriggerKeyParams {
  dateIso: string;
  timezone: string;
  provinsi: string;
  kabkota: string;
  prayerKey: PrayerTimeKey;
  scheduledTime: string;
  leadMinutes: number;
}

/**
 * Builds deterministic deduplication keys so a scheduled prayer time triggers at most once.
 * Includes both an exact schedule key (incorporating timezone, location, and HH:MM)
 * and a daily slot key (date + location + prayerKey + leadMinutes) to prevent duplicate playback
 * if the schedule is reloaded within the same minute.
 */
export function buildPrayerTriggerKeys(params: TriggerKeyParams): {
  exactKey: string;
  slotKey: string;
} {
  const normProv = params.provinsi.trim().toLowerCase();
  const normKab = params.kabkota.trim().toLowerCase();
  const normTz = params.timezone.trim();
  const exactKey = `${params.dateIso}|${normTz}|${normProv}|${normKab}|${params.prayerKey}|${params.scheduledTime}|lead:${params.leadMinutes}`;
  const slotKey = `${params.dateIso}|${normProv}|${normKab}|${params.prayerKey}|lead:${params.leadMinutes}`;
  return { exactKey, slotKey };
}

/**
 * Prunes triggered event history older than 72 hours to keep storage compact.
 */
export function pruneTriggeredEvents(
  events: Record<string, number> | undefined,
  nowMs: number = Date.now()
): Record<string, number> {
  if (!events || typeof events !== 'object') return {};
  const maxAgeMs = 72 * 60 * 60 * 1000; // 72 hours
  const cleaned: Record<string, number> = {};
  for (const [key, ts] of Object.entries(events)) {
    if (typeof ts === 'number' && Number.isFinite(ts) && nowMs - ts <= maxAgeMs) {
      cleaned[key] = ts;
    }
  }
  return cleaned;
}

export interface ScheduleTriggerEvaluation {
  prayerKey: PrayerTimeKey;
  prayerLabel: string;
  scheduledTime: string;
  leadMinutes: 0 | 5 | 10;
  exactKey: string;
  slotKey: string;
  category: AdzanAudioCategory;
  primaryUrl: string | null;
  fallbackUrl: string;
  audioLabel: string;
  message: string;
}

/**
 * Pure, deterministic evaluator that checks whether any prayer reminder should fire right now.
 * Guarantees at-most-once execution by checking both in-memory Set and persisted history.
 */
export function evaluateScheduleForTrigger(params: {
  todayRow: ShalatDailySchedule | null | undefined;
  settings: ShalatReminderSettings;
  provinsi: string;
  kabkota: string;
  now: Date;
  timezone?: string;
  inMemoryTriggered: ReadonlySet<string>;
}): ScheduleTriggerEvaluation | null {
  const { todayRow, settings, provinsi, kabkota, now, inMemoryTriggered } = params;
  if (!settings.enabled || !todayRow) return null;

  const dateIso = getLocalDateIso(now);
  // Ensure the schedule row matches the user's current local date (prevents stale row triggers across midnight rollover)
  if (todayRow.tanggal_lengkap !== dateIso) {
    return null;
  }

  const timezone = params.timezone || getLocalTimezoneId();
  const nowTotalMins = now.getHours() * 60 + now.getMinutes();
  const persisted = settings.triggeredEvents || {};

  for (const key of PRAYER_ORDER) {
    if (!settings.prayers[key]) continue;
    const timeStr = todayRow[key];
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) continue;

    const [hh, mm] = timeStr.split(':').map(Number);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) continue;

    const prayerMins = hh * 60 + mm;
    const triggerMins = (prayerMins - settings.leadMinutes + 1440) % 1440;

    if (nowTotalMins !== triggerMins) continue;

    const { exactKey, slotKey } = buildPrayerTriggerKeys({
      dateIso,
      timezone,
      provinsi,
      kabkota,
      prayerKey: key,
      scheduledTime: timeStr,
      leadMinutes: settings.leadMinutes,
    });

    // Check in-memory lock, persisted history map, and legacy lastNotifiedKey
    if (
      inMemoryTriggered.has(exactKey) ||
      inMemoryTriggered.has(slotKey) ||
      Boolean(persisted[exactKey]) ||
      Boolean(persisted[slotKey]) ||
      settings.lastNotifiedKey === exactKey ||
      settings.lastNotifiedKey === slotKey
    ) {
      continue;
    }

    const effectiveSound: AdhanSoundPreference =
      settings.audioEnabled === false ? 'mute' : settings.sound;
    const resolved = resolvePrayerAudioSource(key, effectiveSound);
    const prayerLabel = PRAYER_LABELS[key].label;

    const message =
      settings.leadMinutes === 0
        ? `Waktu ${prayerLabel} (${timeStr}) telah tiba untuk wilayah ${kabkota}.`
        : `${settings.leadMinutes} menit menuju waktu ${prayerLabel} (${timeStr}) untuk wilayah ${kabkota}.`;

    return {
      prayerKey: key,
      prayerLabel,
      scheduledTime: timeStr,
      leadMinutes: settings.leadMinutes,
      exactKey,
      slotKey,
      category: resolved.category,
      primaryUrl: resolved.primaryUrl,
      fallbackUrl: resolved.fallbackUrl,
      audioLabel: resolved.label,
      message,
    };
  }

  return null;
}
