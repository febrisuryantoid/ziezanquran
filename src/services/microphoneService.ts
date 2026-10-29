import { JUZ_LIST } from '../config/brand';
import { ActiveTab, SurahSummary } from '../types/quran';

export interface DeviceMicCapabilities {
  osName: string;
  browserName: string;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSecureContext: boolean;
  hasGetUserMedia: boolean;
  hasSpeechRecognition: boolean;
  hasMediaRecorder: boolean;
  hasWebAudio: boolean;
  preferredMimeType: string;
}

export interface VoiceIntentResult {
  rawTranscript: string;
  cleanedQuery: string;
  matchedSurah: {
    surahNomor: number;
    surahNamaLatin: string;
    ayatNomor?: number;
  } | null;
  matchedJuz: {
    juz: number;
    startSurahNomor: number;
    startAyat: number;
  } | null;
  matchedTab: ActiveTab | null;
  doaQuery: string | null;
  summaryLabel: string;
}

const INDONESIAN_NUMBER_WORDS: Record<string, number> = {
  satu: 1,
  pertama: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
  sepuluh: 10,
  sebelas: 11,
  seratus: 100,
};

const PHONETIC_SURAH_ALIASES: Record<string, number> = {
  fatihah: 1,
  alfatihah: 1,
  alfatehah: 1,
  baqarah: 2,
  albaqarah: 2,
  albaqoroh: 2,
  baqoroh: 2,
  aliimran: 3,
  alimron: 3,
  aliimron: 3,
  annisa: 4,
  nisa: 4,
  almaidah: 5,
  maidah: 5,
  alanam: 6,
  alaraf: 7,
  alanfal: 8,
  attaubah: 9,
  taubah: 9,
  yunus: 10,
  hud: 11,
  yusuf: 12,
  arrad: 13,
  ibrahim: 14,
  alhijr: 15,
  annahl: 16,
  alisra: 17,
  isra: 17,
  alkahf: 18,
  alkahfi: 18,
  kahfi: 18,
  kahf: 18,
  maryam: 19,
  taha: 20,
  thaha: 20,
  alanbiya: 21,
  alhajj: 22,
  alhaji: 22,
  almuminun: 23,
  annur: 24,
  alfurqan: 25,
  asyuara: 26,
  annaml: 27,
  alqasas: 28,
  alankabut: 29,
  arrum: 30,
  luqman: 31,
  assajdah: 32,
  sajdah: 32,
  alahzab: 33,
  saba: 34,
  fatir: 35,
  yasin: 36,
  yaasiin: 36,
  yaasin: 36,
  yaseen: 36,
  assaffat: 37,
  sad: 38,
  azzumar: 39,
  ghafir: 40,
  fussilat: 41,
  asyura: 42,
  azzukhruf: 43,
  addukhan: 44,
  dukhan: 44,
  aljasiyah: 45,
  alahqaf: 46,
  muhammad: 47,
  alfath: 48,
  alhujurat: 49,
  hujurat: 49,
  qaf: 50,
  azzariyat: 51,
  attur: 52,
  annajm: 53,
  alqamar: 54,
  arrahman: 55,
  arrohman: 55,
  rahman: 55,
  rohman: 55,
  alwaqiah: 56,
  waqiah: 56,
  alwakiah: 56,
  wakiah: 56,
  alhadid: 57,
  almujadilah: 58,
  alhasyr: 59,
  almumtahanah: 60,
  assaff: 61,
  aljumuah: 62,
  jumuah: 62,
  jumat: 62,
  almunafiqun: 63,
  attagabun: 64,
  attalaq: 65,
  attahrim: 66,
  almulk: 67,
  mulk: 67,
  tabarak: 67,
  alqalam: 68,
  alhaqqah: 69,
  almaarij: 70,
  nuh: 71,
  aljin: 72,
  almuzzammil: 73,
  almuddassir: 74,
  alqiyamah: 75,
  alinsan: 76,
  almursalat: 77,
  annaba: 78,
  naba: 78,
  annaziat: 79,
  abasa: 80,
  attakwir: 81,
  alinfitar: 82,
  almutaffifin: 83,
  alinsyiqaq: 84,
  alburuj: 85,
  attariq: 86,
  alala: 87,
  alghasyiyah: 88,
  alfajr: 89,
  albalad: 90,
  asyams: 91,
  allail: 92,
  adduha: 93,
  dhuha: 93,
  duha: 93,
  alinsyirah: 94,
  alamnasyrah: 94,
  attin: 95,
  alalaq: 96,
  alqadr: 97,
  albayyinah: 98,
  alzalzalah: 99,
  aladiyat: 100,
  alqariah: 101,
  attakasur: 102,
  alasr: 103,
  alhumazah: 104,
  alfil: 105,
  quraisy: 106,
  almaun: 107,
  alkausar: 108,
  alkautsar: 108,
  alkafirun: 109,
  kafirun: 109,
  annasr: 110,
  allab: 111,
  allahab: 111,
  alikhlas: 112,
  ikhlas: 112,
  alfalaq: 113,
  falaq: 113,
  annas: 114,
};

/**
 * Replaces simple Indonesian number words in spoken phrases with digits
 * e.g. "ayat dua ratus lima puluh lima" -> "ayat 255", "surat tiga puluh enam" -> "surat 36"
 */
export function convertSpokenIndonesianNumbers(input: string): string {
  let text = input.toLowerCase();

  // Common specific Quran verse numbers
  text = text.replace(/\bdua\s+ratus\s+lima\s+puluh\s+lima\b/g, '255');
  text = text.replace(/\bseratus\s+empat\s+belas\b/g, '114');

  // Tens + units: e.g. "tiga puluh enam" -> 36
  text = text.replace(
    /\b(dua|tiga|empat|lima|enam|tujuh|delapan|sembilan)\s+puluh(?:\s+(satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan))?\b/g,
    (_, tensWord: string, unitWord?: string) => {
      const tens = (INDONESIAN_NUMBER_WORDS[tensWord] || 0) * 10;
      const units = unitWord ? INDONESIAN_NUMBER_WORDS[unitWord] || 0 : 0;
      return String(tens + units);
    }
  );

  // Teens: e.g. "delapan belas" -> 18
  text = text.replace(
    /\b(dua|tiga|empat|lima|enam|tujuh|delapan|sembilan)\s+belas\b/g,
    (_, unitWord: string) => {
      const units = INDONESIAN_NUMBER_WORDS[unitWord] || 0;
      return String(10 + units);
    }
  );

  // Single number words after keywords (surat, surah, ayat, juz, nomor)
  text = text.replace(
    /\b(surat|surah|ayat|juz|nomor)\s+(satu|pertama|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|seratus)\b/g,
    (_, prefix: string, word: string) => {
      const val = INDONESIAN_NUMBER_WORDS[word];
      return val ? `${prefix} ${val}` : `${prefix} ${word}`;
    }
  );

  return text;
}

/**
 * Detects OS, Browser, and Audio/Speech API support across all devices
 */
export function detectMicrophoneCapabilities(): DeviceMicCapabilities {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      osName: 'Unknown OS',
      browserName: 'Unknown Browser',
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      isSecureContext: true,
      hasGetUserMedia: false,
      hasSpeechRecognition: false,
      hasMediaRecorder: false,
      hasWebAudio: false,
      preferredMimeType: '',
    };
  }

  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobile = isAndroid || isIOS || /Mobile|Tablet/i.test(ua);

  let osName = 'Perangkat Desktop';
  if (isAndroid) osName = 'Android';
  else if (isIOS) osName = 'iOS / iPadOS';
  else if (/Win/i.test(ua)) osName = 'Windows';
  else if (/Mac/i.test(ua)) osName = 'macOS';
  else if (/CrOS/i.test(ua)) osName = 'ChromeOS';
  else if (/Linux/i.test(ua)) osName = 'Linux';

  let browserName = 'Browser Modern';
  const isBrave = Boolean((navigator as unknown as { brave?: unknown }).brave);
  if (isBrave) browserName = 'Brave Browser';
  else if (/SamsungBrowser/i.test(ua)) browserName = 'Samsung Internet';
  else if (/EdgA|EdgiOS|Edg\//i.test(ua)) browserName = 'Microsoft Edge';
  else if (/OPR\/|Opera/i.test(ua)) browserName = 'Opera';
  else if (/FxiOS|Firefox/i.test(ua)) browserName = 'Mozilla Firefox';
  else if (/CriOS/i.test(ua)) browserName = 'Chrome (iOS)';
  else if (/WV|FBAN|FBAV|Instagram|Line|WhatsApp/i.test(ua)) browserName = 'In-App WebView';
  else if (/Chrome/i.test(ua)) browserName = 'Google Chrome';
  else if (/Safari/i.test(ua)) browserName = 'Apple Safari';

  const navAny = navigator as unknown as {
    mediaDevices?: { getUserMedia?: unknown };
    getUserMedia?: unknown;
    webkitGetUserMedia?: unknown;
    mozGetUserMedia?: unknown;
    msGetUserMedia?: unknown;
  };

  const hasGetUserMedia = Boolean(
    navAny.mediaDevices?.getUserMedia ||
      navAny.getUserMedia ||
      navAny.webkitGetUserMedia ||
      navAny.mozGetUserMedia ||
      navAny.msGetUserMedia
  );

  const winAny = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
    AudioContext?: unknown;
    webkitAudioContext?: unknown;
  };

  const hasSpeechRecognition = Boolean(
    winAny.SpeechRecognition || winAny.webkitSpeechRecognition
  );
  const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
  const hasWebAudio = Boolean(winAny.AudioContext || winAny.webkitAudioContext);

  let preferredMimeType = '';
  if (hasMediaRecorder && typeof MediaRecorder.isTypeSupported === 'function') {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/ogg;codecs=opus',
      'audio/wav',
    ];
    for (const mime of candidates) {
      try {
        if (MediaRecorder.isTypeSupported(mime)) {
          preferredMimeType = mime;
          break;
        }
      } catch {
        // Ignore
      }
    }
  }

  const isSecureContext =
    Boolean(window.isSecureContext) ||
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  return {
    osName,
    browserName,
    isMobile,
    isIOS,
    isAndroid,
    isSecureContext,
    hasGetUserMedia,
    hasSpeechRecognition,
    hasMediaRecorder,
    hasWebAudio,
    preferredMimeType,
  };
}

/**
 * Universal getUserMedia wrapper supporting modern and legacy browser implementations
 * with progressive constraint fallback so no device rejects audio constraints.
 */
export async function requestUniversalMicrophoneStream(): Promise<MediaStream> {
  if (typeof navigator === 'undefined') {
    throw new Error('Peramban tidak mendukung perangkat audio.');
  }

  const navAny = navigator as unknown as {
    mediaDevices?: {
      getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
    };
    getUserMedia?: (
      constraints: MediaStreamConstraints,
      onSuccess: (stream: MediaStream) => void,
      onError: (err: unknown) => void
    ) => void;
    webkitGetUserMedia?: (
      constraints: MediaStreamConstraints,
      onSuccess: (stream: MediaStream) => void,
      onError: (err: unknown) => void
    ) => void;
    mozGetUserMedia?: (
      constraints: MediaStreamConstraints,
      onSuccess: (stream: MediaStream) => void,
      onError: (err: unknown) => void
    ) => void;
    msGetUserMedia?: (
      constraints: MediaStreamConstraints,
      onSuccess: (stream: MediaStream) => void,
      onError: (err: unknown) => void
    ) => void;
  };

  if (navAny.mediaDevices && typeof navAny.mediaDevices.getUserMedia === 'function') {
    try {
      // First attempt with voice-optimized audio constraints
      return await navAny.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
    } catch (firstErr: unknown) {
      const errName =
        firstErr && typeof firstErr === 'object' && 'name' in firstErr
          ? String((firstErr as { name?: string }).name)
          : '';
      // If permission was explicitly denied, rethrow immediately
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        throw firstErr;
      }
      // Otherwise fallback to bare { audio: true } for strict mobile/older browsers
      return await navAny.mediaDevices.getUserMedia({ audio: true, video: false });
    }
  }

  // Legacy getUserMedia fallback for older WebViews / browsers
  const legacyGetUserMedia =
    navAny.getUserMedia ||
    navAny.webkitGetUserMedia ||
    navAny.mozGetUserMedia ||
    navAny.msGetUserMedia;

  if (typeof legacyGetUserMedia === 'function') {
    return new Promise<MediaStream>((resolve, reject) => {
      legacyGetUserMedia.call(navigator, { audio: true, video: false }, resolve, reject);
    });
  }

  throw new Error('API mikrofon tidak tersedia di peramban ini.');
}

/**
 * Returns the Web Speech API constructor if supported by the current browser
 */
export function getSpeechRecognitionCtor(): (new () => any) | null {
  if (typeof window === 'undefined') return null;
  const winAny = window as unknown as {
    SpeechRecognition?: new () => any;
    webkitSpeechRecognition?: new () => any;
  };
  return winAny.SpeechRecognition || winAny.webkitSpeechRecognition || null;
}

/**
 * Encodes raw Float32 PCM audio samples into a universal 16-bit mono WAV Blob.
 * Guarantees 100% cross-browser voice recording even on browsers without MediaRecorder.
 */
export function encodeWavFromPcm(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format = 1
  view.setUint16(22, 1, true); // Mono = 1 channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // 16-bit
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Parses a spoken voice transcript in Indonesian / Arabic / English into structured
 * Quran Surah/Ayat/Juz/Doa/Tab navigation & search intents.
 */
export function parseVoiceQuranIntent(
  rawTranscript: string,
  surahs: SurahSummary[]
): VoiceIntentResult {
  const trimmedRaw = rawTranscript.trim();
  if (!trimmedRaw) {
    return {
      rawTranscript: '',
      cleanedQuery: '',
      matchedSurah: null,
      matchedJuz: null,
      matchedTab: null,
      doaQuery: null,
      summaryLabel: '',
    };
  }

  const normalizedNumbers = convertSpokenIndonesianNumbers(trimmedRaw);
  const lower = normalizedNumbers
    .toLowerCase()
    .replace(/[.,?!;:"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Special famous verses: Ayat Kursi
  if (/\bayat\s+kursi\b|\bayatul\s+kursi\b/i.test(lower)) {
    return {
      rawTranscript: trimmedRaw,
      cleanedQuery: '2:255',
      matchedSurah: {
        surahNomor: 2,
        surahNamaLatin: 'Al-Baqarah',
        ayatNomor: 255,
      },
      matchedJuz: null,
      matchedTab: 'reader',
      doaQuery: null,
      summaryLabel: 'Buka Ayat Kursi (QS. Al-Baqarah 2:255)',
    };
  }

  // 2. Check for Juz Amma or Juz 1..30
  if (/\bjuz\s+amma\b|\bjuz\s+30\b/i.test(lower)) {
    const juz30 = JUZ_LIST.find((j) => j.juz === 30);
    return {
      rawTranscript: trimmedRaw,
      cleanedQuery: 'Juz 30',
      matchedSurah: {
        surahNomor: juz30?.startSurahNomor || 78,
        surahNamaLatin: juz30?.startSurahName || "An-Naba'",
        ayatNomor: juz30?.startAyat || 1,
      },
      matchedJuz: {
        juz: 30,
        startSurahNomor: juz30?.startSurahNomor || 78,
        startAyat: juz30?.startAyat || 1,
      },
      matchedTab: 'reader',
      doaQuery: null,
      summaryLabel: "Buka Juz 30 — Juz 'Amma (QS. An-Naba')",
    };
  }

  const juzMatch = lower.match(/\bjuz\s+(\d{1,2})\b/);
  if (juzMatch) {
    const juzNum = Number(juzMatch[1]);
    const foundJuz = JUZ_LIST.find((j) => j.juz === juzNum);
    if (foundJuz) {
      return {
        rawTranscript: trimmedRaw,
        cleanedQuery: `Juz ${juzNum}`,
        matchedSurah: {
          surahNomor: foundJuz.startSurahNomor,
          surahNamaLatin: foundJuz.startSurahName,
          ayatNomor: foundJuz.startAyat,
        },
        matchedJuz: {
          juz: foundJuz.juz,
          startSurahNomor: foundJuz.startSurahNomor,
          startAyat: foundJuz.startAyat,
        },
        matchedTab: 'reader',
        doaQuery: null,
        summaryLabel: `Buka Juz ${foundJuz.juz} (Mulai QS. ${foundJuz.startSurahName} ${foundJuz.startSurahNomor}:${foundJuz.startAyat})`,
      };
    }
  }

  // 3. Direct colon notation e.g. "2:255" or "36 1" or "surat 36 ayat 10"
  const colonMatch = lower.match(/\b(\d{1,3})\s*:\s*(\d{1,3})\b/);
  if (colonMatch) {
    const sNo = Number(colonMatch[1]);
    const aNo = Number(colonMatch[2]);
    if (sNo >= 1 && sNo <= 114) {
      const found = surahs.find((s) => s.nomor === sNo);
      const sName = found?.namaLatin || `Surat ${sNo}`;
      return {
        rawTranscript: trimmedRaw,
        cleanedQuery: `${sNo}:${aNo}`,
        matchedSurah: {
          surahNomor: sNo,
          surahNamaLatin: sName,
          ayatNomor: aNo,
        },
        matchedJuz: null,
        matchedTab: 'reader',
        doaQuery: null,
        summaryLabel: `Buka QS. ${sName} (${sNo}:${aNo})`,
      };
    }
  }

  // Extract trailing "ayat <number>" if present
  let extractedAyat: number | undefined;
  const ayatMatch = lower.match(/\bayat(?:\s+ke)?\s+(\d{1,3})\b/);
  if (ayatMatch) {
    const parsedAyat = Number(ayatMatch[1]);
    if (parsedAyat >= 1 && parsedAyat <= 286) {
      extractedAyat = parsedAyat;
    }
  }

  // Check "surat nomor <N>" or "surat ke <N>"
  const surahNumMatch = lower.match(/\b(?:surat|surah)(?:\s+nomor|\s+ke)?\s+(\d{1,3})\b/);
  if (surahNumMatch) {
    const sNo = Number(surahNumMatch[1]);
    if (sNo >= 1 && sNo <= 114) {
      const found = surahs.find((s) => s.nomor === sNo);
      const sName = found?.namaLatin || `Surat ${sNo}`;
      return {
        rawTranscript: trimmedRaw,
        cleanedQuery: extractedAyat ? `${sNo}:${extractedAyat}` : sName,
        matchedSurah: {
          surahNomor: sNo,
          surahNamaLatin: sName,
          ayatNomor: extractedAyat || 1,
        },
        matchedJuz: null,
        matchedTab: 'reader',
        doaQuery: null,
        summaryLabel: extractedAyat
          ? `Buka QS. ${sName} Ayat ${extractedAyat}`
          : `Buka QS. ${sName} (Surat ke-${sNo})`,
      };
    }
  }

  // Strip conversational command prefixes
  const withoutCommands = lower
    .replace(
      /^(tolong\s+|coba\s+)?(buka|bukakan|cari|carikan|putar|putarkan|bacakan|baca|menuju|tampilkan)\s+/i,
      ''
    )
    .replace(/\bayat(?:\s+ke)?\s+\d{1,3}\b/g, '')
    .replace(/^(surat|surah|qs)\s+/i, '')
    .trim();

  const alphaOnly = withoutCommands.replace(/[^a-z0-9]/g, '');

  // 4. Match against phonetic Surah aliases or 114 Surahs list
  let matchedSurahNomor: number | null = null;
  if (alphaOnly && PHONETIC_SURAH_ALIASES[alphaOnly]) {
    matchedSurahNomor = PHONETIC_SURAH_ALIASES[alphaOnly];
  } else {
    // Check if any alias is contained as a whole word
    for (const [alias, sNo] of Object.entries(PHONETIC_SURAH_ALIASES)) {
      if (alphaOnly === alias || withoutCommands.split(' ').join('') === alias) {
        matchedSurahNomor = sNo;
        break;
      }
    }
  }

  if (!matchedSurahNomor && surahs.length > 0 && withoutCommands.length >= 3) {
    for (const s of surahs) {
      const sClean = s.namaLatin.toLowerCase().replace(/[^a-z0-9]/g, '');
      const sWithoutAl = sClean.replace(/^al|^an|^as|^at|^ar|^ad/, '');
      if (
        sClean === alphaOnly ||
        (sWithoutAl.length >= 3 && sWithoutAl === alphaOnly) ||
        s.namaLatin.toLowerCase() === withoutCommands
      ) {
        matchedSurahNomor = s.nomor;
        break;
      }
    }
  }

  if (matchedSurahNomor) {
    const found = surahs.find((s) => s.nomor === matchedSurahNomor);
    const sName = found?.namaLatin || `Surat ${matchedSurahNomor}`;
    return {
      rawTranscript: trimmedRaw,
      cleanedQuery: extractedAyat ? `${matchedSurahNomor}:${extractedAyat}` : sName,
      matchedSurah: {
        surahNomor: matchedSurahNomor,
        surahNamaLatin: sName,
        ayatNomor: extractedAyat || 1,
      },
      matchedJuz: null,
      matchedTab: 'reader',
      doaQuery: null,
      summaryLabel: extractedAyat
        ? `Buka QS. ${sName} Ayat ${extractedAyat}`
        : `Buka QS. ${sName}`,
    };
  }

  // 5. Check feature navigation intents (Jadwal Shalat, Kiblat, Kalender Hijriah, Doa)
  if (/\b(jadwal\s+shalat|jadwal\s+salat|waktu\s+shalat|waktu\s+salat|jadwal\s+adzan)\b/i.test(lower)) {
    return {
      rawTranscript: trimmedRaw,
      cleanedQuery: withoutCommands || trimmedRaw,
      matchedSurah: null,
      matchedJuz: null,
      matchedTab: 'shalat',
      doaQuery: null,
      summaryLabel: 'Buka Jadwal Salat & Pengingat Adzan',
    };
  }

  if (/\b(arah\s+kiblat|kompas\s+kiblat|cari\s+kiblat|kiblat)\b/i.test(lower)) {
    return {
      rawTranscript: trimmedRaw,
      cleanedQuery: withoutCommands || trimmedRaw,
      matchedSurah: null,
      matchedJuz: null,
      matchedTab: 'qibla',
      doaQuery: null,
      summaryLabel: "Buka Kompas Arah Kiblat Ka'bah",
    };
  }

  if (/\b(kalender\s+hijriah|tanggal\s+hijriah|hari\s+besar\s+islam)\b/i.test(lower)) {
    return {
      rawTranscript: trimmedRaw,
      cleanedQuery: withoutCommands || trimmedRaw,
      matchedSurah: null,
      matchedJuz: null,
      matchedTab: 'hijri',
      doaQuery: null,
      summaryLabel: 'Buka Kalender Hijriah MABIMS',
    };
  }

  if (/^doa\b|\bdoa\s+harian\b|\bdzikir\b/i.test(withoutCommands)) {
    const cleanedDoa = withoutCommands.replace(/^doa\s+/i, '').trim() || withoutCommands;
    return {
      rawTranscript: trimmedRaw,
      cleanedQuery: withoutCommands,
      matchedSurah: null,
      matchedJuz: null,
      matchedTab: 'doa',
      doaQuery: cleanedDoa,
      summaryLabel: `Cari Doa & Dzikir: "${withoutCommands}"`,
    };
  }

  const finalQuery = withoutCommands || trimmedRaw;
  return {
    rawTranscript: trimmedRaw,
    cleanedQuery: finalQuery,
    matchedSurah: null,
    matchedJuz: null,
    matchedTab: null,
    doaQuery: null,
    summaryLabel: `Cari di Al-Qur'an: "${finalQuery}"`,
  };
}
