import { DEFAULT_PREFERENCES } from '../config/brand';
import {
  SavedQiblaPreference,
  ShalatLocationPreference,
  ShalatReminderSettings,
} from '../types/islamic';
import {
  BookmarkItem,
  PersonalNote,
  ReadingHistoryItem,
  ReadingPreferences,
  ReadingProgress,
  SurahDetail,
  SurahSummary,
  TafsirDetail,
} from '../types/quran';
import { securityService } from './securityService';

const STORAGE_KEYS = {
  BOOKMARKS: 'ziezan_quran_bookmarks_v1',
  NOTES: 'ziezan_quran_notes_v1',
  LAST_READ: 'ziezan_quran_last_read_v1',
  HISTORY: 'ziezan_quran_history_v1',
  PREFERENCES: 'ziezan_quran_preferences_v1',
  READ_AYATS: 'ziezan_quran_read_ayats_v1',
  SHALAT_LOCATION: 'ziezan_quran_shalat_location_v1',
  SHALAT_REMINDERS: 'ziezan_quran_shalat_reminders_v1',
  FAVORITE_DOAS: 'ziezan_quran_favorite_doas_v1',
  QIBLA_PREFERENCE: 'ziezan_quran_qibla_pref_v1',
};

export const DEFAULT_SHALAT_LOCATION: ShalatLocationPreference = {
  provinsi: 'DKI Jakarta',
  kabkota: 'Kota Jakarta',
  updatedAt: 0,
};

export const DEFAULT_SHALAT_REMINDERS: ShalatReminderSettings = {
  enabled: false,
  audioEnabled: true,
  sound: 'adzan-auto',
  volume: 0.85,
  leadMinutes: 0,
  prayers: {
    imsak: true,
    subuh: true,
    terbit: true,
    dhuha: false,
    dzuhur: true,
    ashar: true,
    maghrib: true,
    isya: true,
  },
  triggeredEvents: {},
  schemaVersion: 2,
};

const IDB_NAME = 'ziezan_quran_idb_v2';
const IDB_VERSION = 1;
const STORE_META = 'meta_store';
const STORE_SURAHS = 'surah_details';
const STORE_TAFSIRS = 'tafsir_details';

function safeEncryptedRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    const decrypted = securityService.decryptStoragePayload(raw);
    if (!decrypted) return fallback;
    const parsed = securityService.sanitizeJsonObject<T>(decrypted);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function safeEncryptedWrite(key: string, data: unknown): void {
  try {
    const plainJson = JSON.stringify(data);
    const encrypted = securityService.encryptStoragePayload(plainJson);
    localStorage.setItem(key, encrypted);
  } catch {
    // Ignore storage quota errors
  }
}

export const storageService = {
  getPreferences(): ReadingPreferences {
    const saved = safeEncryptedRead<Partial<ReadingPreferences>>(
      STORAGE_KEYS.PREFERENCES,
      {}
    );
    return { ...DEFAULT_PREFERENCES, ...saved };
  },

  savePreferences(prefs: ReadingPreferences): void {
    safeEncryptedWrite(STORAGE_KEYS.PREFERENCES, prefs);
  },

  getShalatLocation(): ShalatLocationPreference {
    const saved = safeEncryptedRead<Partial<ShalatLocationPreference>>(
      STORAGE_KEYS.SHALAT_LOCATION,
      {}
    );
    if (
      saved &&
      typeof saved.provinsi === 'string' &&
      saved.provinsi.trim() &&
      typeof saved.kabkota === 'string' &&
      saved.kabkota.trim()
    ) {
      return {
        provinsi: securityService.sanitizePlainText(saved.provinsi, 80),
        kabkota: securityService.sanitizePlainText(saved.kabkota, 100),
        updatedAt: typeof saved.updatedAt === 'number' ? saved.updatedAt : Date.now(),
      };
    }
    return DEFAULT_SHALAT_LOCATION;
  },

  saveShalatLocation(provinsi: string, kabkota: string): ShalatLocationPreference {
    const next: ShalatLocationPreference = {
      provinsi: securityService.sanitizePlainText(provinsi, 80),
      kabkota: securityService.sanitizePlainText(kabkota, 100),
      updatedAt: Date.now(),
    };
    safeEncryptedWrite(STORAGE_KEYS.SHALAT_LOCATION, next);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ziezan:shalat-settings-updated'));
    }
    return next;
  },

  getShalatReminders(): ShalatReminderSettings {
    const saved = safeEncryptedRead<Partial<ShalatReminderSettings>>(
      STORAGE_KEYS.SHALAT_REMINDERS,
      {}
    );
    const isV2 = saved.schemaVersion === 2;
    const rawSound = saved.sound;
    const validSound =
      rawSound === 'adzan-auto' ||
      rawSound === 'adzan-chime' ||
      rawSound === 'shalat-reminder' ||
      rawSound === 'mute'
        ? rawSound
        : 'adzan-auto';

    // Migrate v1 default 'adzan-chime' to 'adzan-auto' so mapped MP3 streams are active by default
    const resolvedSound =
      !isV2 && validSound === 'adzan-chime' ? 'adzan-auto' : validSound;

    const resolvedVolume =
      typeof saved.volume === 'number' && Number.isFinite(saved.volume)
        ? Math.max(0, Math.min(1, Math.round(saved.volume * 100) / 100))
        : DEFAULT_SHALAT_REMINDERS.volume;

    const resolvedAudioEnabled =
      typeof saved.audioEnabled === 'boolean'
        ? saved.audioEnabled
        : resolvedSound !== 'mute';

    return {
      ...DEFAULT_SHALAT_REMINDERS,
      ...saved,
      audioEnabled: resolvedAudioEnabled,
      sound: resolvedSound,
      volume: resolvedVolume,
      leadMinutes:
        saved.leadMinutes === 0 || saved.leadMinutes === 5 || saved.leadMinutes === 10
          ? saved.leadMinutes
          : 0,
      prayers: {
        ...DEFAULT_SHALAT_REMINDERS.prayers,
        ...(saved.prayers || {}),
        // Ensure imsak & terbit default to true on v1 -> v2 migration unless already v2
        ...(!isV2
          ? {
              imsak: true,
              terbit: true,
            }
          : {}),
      },
      triggeredEvents:
        saved.triggeredEvents && typeof saved.triggeredEvents === 'object'
          ? saved.triggeredEvents
          : {},
      schemaVersion: 2,
    };
  },

  saveShalatReminders(settings: ShalatReminderSettings): void {
    const normalized: ShalatReminderSettings = {
      ...settings,
      volume:
        typeof settings.volume === 'number' && Number.isFinite(settings.volume)
          ? Math.max(0, Math.min(1, Math.round(settings.volume * 100) / 100))
          : 0.85,
      schemaVersion: 2,
    };
    safeEncryptedWrite(STORAGE_KEYS.SHALAT_REMINDERS, normalized);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ziezan:shalat-settings-updated'));
    }
  },

  getFavoriteDoaIds(): number[] {
    const ids = safeEncryptedRead<number[]>(STORAGE_KEYS.FAVORITE_DOAS, []);
    return Array.isArray(ids)
      ? ids.filter((id) => typeof id === 'number' && Number.isInteger(id) && id > 0)
      : [];
  },

  toggleFavoriteDoa(id: number): { favoriteIds: number[]; added: boolean } {
    const current = this.getFavoriteDoaIds();
    const exists = current.includes(id);
    const updated = exists ? current.filter((item) => item !== id) : [id, ...current];
    safeEncryptedWrite(STORAGE_KEYS.FAVORITE_DOAS, updated);
    return { favoriteIds: updated, added: !exists };
  },

  getQiblaPreference(): SavedQiblaPreference | null {
    const saved = safeEncryptedRead<SavedQiblaPreference | null>(
      STORAGE_KEYS.QIBLA_PREFERENCE,
      null
    );
    if (
      saved &&
      saved.consentGiven === true &&
      typeof saved.coarseLat === 'number' &&
      typeof saved.coarseLng === 'number' &&
      saved.coarseLat >= -90 &&
      saved.coarseLat <= 90 &&
      saved.coarseLng >= -180 &&
      saved.coarseLng <= 180
    ) {
      return saved;
    }
    return null;
  },

  saveQiblaPreference(pref: {
    label: string;
    lat: number;
    lng: number;
    consentGiven: boolean;
  }): SavedQiblaPreference | null {
    if (!pref.consentGiven) {
      localStorage.removeItem(STORAGE_KEYS.QIBLA_PREFERENCE);
      return null;
    }
    // Round coordinates to 2 decimal places (~1.1 km) to avoid storing high-precision GPS tracks
    const sanitized: SavedQiblaPreference = {
      label: securityService.sanitizePlainText(pref.label, 80) || 'Lokasi Tersimpan',
      coarseLat: Math.round(pref.lat * 100) / 100,
      coarseLng: Math.round(pref.lng * 100) / 100,
      consentGiven: true,
      updatedAt: Date.now(),
    };
    safeEncryptedWrite(STORAGE_KEYS.QIBLA_PREFERENCE, sanitized);
    return sanitized;
  },

  clearQiblaPreference(): void {
    localStorage.removeItem(STORAGE_KEYS.QIBLA_PREFERENCE);
  },

  getBookmarks(): BookmarkItem[] {
    return safeEncryptedRead<BookmarkItem[]>(STORAGE_KEYS.BOOKMARKS, []);
  },

  toggleBookmark(item: Omit<BookmarkItem, 'id' | 'createdAt'>): {
    bookmarks: BookmarkItem[];
    added: boolean;
  } {
    const current = this.getBookmarks();
    const id = `${item.surahNomor}:${item.ayatNomor}`;
    const exists = current.some((b) => b.id === id);
    let updated: BookmarkItem[];
    if (exists) {
      updated = current.filter((b) => b.id !== id);
    } else {
      const newItem: BookmarkItem = {
        ...item,
        id,
        createdAt: Date.now(),
      };
      updated = [newItem, ...current];
    }
    safeEncryptedWrite(STORAGE_KEYS.BOOKMARKS, updated);
    return { bookmarks: updated, added: !exists };
  },

  removeBookmark(id: string): BookmarkItem[] {
    const updated = this.getBookmarks().filter((b) => b.id !== id);
    safeEncryptedWrite(STORAGE_KEYS.BOOKMARKS, updated);
    return updated;
  },

  getNotes(): PersonalNote[] {
    return safeEncryptedRead<PersonalNote[]>(STORAGE_KEYS.NOTES, []);
  },

  saveNote(item: Omit<PersonalNote, 'id' | 'updatedAt'>): PersonalNote[] {
    const current = this.getNotes();
    const id = `${item.surahNomor}:${item.ayatNomor}`;
    const sanitizedText = securityService.sanitizePlainText(item.noteText, 2000);
    let updated: PersonalNote[];

    if (!sanitizedText) {
      updated = current.filter((n) => n.id !== id);
    } else {
      const existingIndex = current.findIndex((n) => n.id === id);
      const nextNote: PersonalNote = {
        ...item,
        noteText: sanitizedText,
        id,
        updatedAt: Date.now(),
      };
      if (existingIndex >= 0) {
        updated = [...current];
        updated[existingIndex] = nextNote;
      } else {
        updated = [nextNote, ...current];
      }
    }

    safeEncryptedWrite(STORAGE_KEYS.NOTES, updated);
    return updated;
  },

  deleteNote(id: string): PersonalNote[] {
    const updated = this.getNotes().filter((n) => n.id !== id);
    safeEncryptedWrite(STORAGE_KEYS.NOTES, updated);
    return updated;
  },

  getLastRead(): ReadingProgress | null {
    return safeEncryptedRead<ReadingProgress | null>(STORAGE_KEYS.LAST_READ, null);
  },

  saveLastRead(progress: Omit<ReadingProgress, 'updatedAt'>): ReadingProgress {
    const full: ReadingProgress = {
      ...progress,
      updatedAt: Date.now(),
    };
    safeEncryptedWrite(STORAGE_KEYS.LAST_READ, full);
    this.addReadingHistory({
      surahNomor: progress.surahNomor,
      surahNamaLatin: progress.surahNamaLatin,
      surahNamaArab: progress.surahNamaArab,
      surahArti: progress.surahArti,
      ayatNomor: progress.ayatNomor,
      jumlahAyat: progress.jumlahAyat,
    });
    this.markAyatRead(progress.surahNomor, progress.ayatNomor);
    return full;
  },

  getReadingHistory(): ReadingHistoryItem[] {
    return safeEncryptedRead<ReadingHistoryItem[]>(STORAGE_KEYS.HISTORY, []);
  },

  addReadingHistory(item: Omit<ReadingHistoryItem, 'timestamp'>): ReadingHistoryItem[] {
    const current = this.getReadingHistory();
    const filtered = current.filter(
      (h) => !(h.surahNomor === item.surahNomor && h.ayatNomor === item.ayatNomor)
    );
    const updated: ReadingHistoryItem[] = [
      { ...item, timestamp: Date.now() },
      ...filtered,
    ].slice(0, 40);
    safeEncryptedWrite(STORAGE_KEYS.HISTORY, updated);
    return updated;
  },

  clearReadingHistory(): void {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  },

  getReadAyatKeys(): string[] {
    return safeEncryptedRead<string[]>(STORAGE_KEYS.READ_AYATS, []);
  },

  markAyatRead(surahNomor: number, ayatNomor: number): string[] {
    const current = new Set(this.getReadAyatKeys());
    current.add(`${surahNomor}:${ayatNomor}`);
    const arr = Array.from(current);
    safeEncryptedWrite(STORAGE_KEYS.READ_AYATS, arr);
    return arr;
  },

  exportUserData(): string {
    const dataPayload = {
      app: 'Ziezan Quran',
      agency: 'Ziezan Solutions',
      exportedAt: new Date().toISOString(),
      preferences: this.getPreferences(),
      lastRead: this.getLastRead(),
      bookmarks: this.getBookmarks(),
      notes: this.getNotes(),
      history: this.getReadingHistory(),
      readAyats: this.getReadAyatKeys(),
      shalatLocation: this.getShalatLocation(),
      shalatReminders: this.getShalatReminders(),
      favoriteDoas: this.getFavoriteDoaIds(),
    };
    const signature = securityService.createBackupSignature(JSON.stringify(dataPayload));
    return JSON.stringify(
      {
        ...dataPayload,
        integritySignature: signature,
      },
      null,
      2
    );
  },


  importUserData(jsonString: string): boolean {
    const parsed = securityService.sanitizeJsonObject<Record<string, unknown>>(jsonString);
    if (!parsed || typeof parsed !== 'object') return false;

    try {
      if (Array.isArray(parsed.bookmarks)) {
        const cleanBookmarks = parsed.bookmarks
          .filter(
            (b): b is BookmarkItem =>
              Boolean(b) &&
              typeof b === 'object' &&
              typeof b.surahNomor === 'number' &&
              b.surahNomor >= 1 &&
              b.surahNomor <= 114 &&
              typeof b.ayatNomor === 'number' &&
              b.ayatNomor >= 1
          )
          .slice(0, 500)
          .map((b) => ({
            ...b,
            id: `${b.surahNomor}:${b.ayatNomor}`,
            surahNamaLatin: securityService.sanitizePlainText(b.surahNamaLatin, 80),
            surahNamaArab: securityService.sanitizePlainText(b.surahNamaArab, 80),
            surahArti: securityService.sanitizePlainText(b.surahArti, 120),
            teksArab: securityService.sanitizePlainText(b.teksArab, 5000),
            teksLatin: securityService.sanitizePlainText(b.teksLatin, 5000),
            teksIndonesia: securityService.sanitizePlainText(b.teksIndonesia, 5000),
            createdAt: typeof b.createdAt === 'number' ? b.createdAt : Date.now(),
          }));
        safeEncryptedWrite(STORAGE_KEYS.BOOKMARKS, cleanBookmarks);
      }

      if (Array.isArray(parsed.notes)) {
        const cleanNotes = parsed.notes
          .filter(
            (n): n is PersonalNote =>
              Boolean(n) &&
              typeof n === 'object' &&
              typeof n.surahNomor === 'number' &&
              n.surahNomor >= 1 &&
              n.surahNomor <= 114 &&
              typeof n.ayatNomor === 'number' &&
              n.ayatNomor >= 1
          )
          .slice(0, 500)
          .map((n) => ({
            ...n,
            id: `${n.surahNomor}:${n.ayatNomor}`,
            surahNamaLatin: securityService.sanitizePlainText(n.surahNamaLatin, 80),
            surahNamaArab: securityService.sanitizePlainText(n.surahNamaArab, 80),
            teksArab: securityService.sanitizePlainText(n.teksArab, 5000),
            teksIndonesia: securityService.sanitizePlainText(n.teksIndonesia, 5000),
            noteText: securityService.sanitizePlainText(n.noteText, 2000),
            updatedAt: typeof n.updatedAt === 'number' ? n.updatedAt : Date.now(),
          }));
        safeEncryptedWrite(STORAGE_KEYS.NOTES, cleanNotes);
      }

      if (parsed.lastRead && typeof parsed.lastRead === 'object') {
        const lr = parsed.lastRead as ReadingProgress;
        if (
          typeof lr.surahNomor === 'number' &&
          lr.surahNomor >= 1 &&
          lr.surahNomor <= 114 &&
          typeof lr.ayatNomor === 'number' &&
          lr.ayatNomor >= 1
        ) {
          safeEncryptedWrite(STORAGE_KEYS.LAST_READ, {
            surahNomor: lr.surahNomor,
            surahNamaLatin: securityService.sanitizePlainText(lr.surahNamaLatin, 80),
            surahNamaArab: securityService.sanitizePlainText(lr.surahNamaArab, 80),
            surahArti: securityService.sanitizePlainText(lr.surahArti, 120),
            ayatNomor: lr.ayatNomor,
            jumlahAyat: typeof lr.jumlahAyat === 'number' ? lr.jumlahAyat : 1,
            updatedAt: typeof lr.updatedAt === 'number' ? lr.updatedAt : Date.now(),
          });
        }
      }

      if (Array.isArray(parsed.history)) {
        safeEncryptedWrite(STORAGE_KEYS.HISTORY, parsed.history.slice(0, 40));
      }

      if (Array.isArray(parsed.readAyats)) {
        const cleanRead = parsed.readAyats
          .filter((k): k is string => typeof k === 'string' && /^\d{1,3}:\d{1,3}$/.test(k))
          .slice(0, 6236);
        safeEncryptedWrite(STORAGE_KEYS.READ_AYATS, cleanRead);
      }

      if (parsed.preferences && typeof parsed.preferences === 'object') {
        this.savePreferences({
          ...DEFAULT_PREFERENCES,
          ...(parsed.preferences as Partial<ReadingPreferences>),
        });
      }

      return true;
    } catch {
      return false;
    }
  },
};

// IndexedDB helper for caching full 114 surah details & tafsir offline
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openQuranIDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META);
        }
        if (!db.objectStoreNames.contains(STORE_SURAHS)) {
          db.createObjectStore(STORE_SURAHS, { keyPath: 'nomor' });
        }
        if (!db.objectStoreNames.contains(STORE_TAFSIRS)) {
          db.createObjectStore(STORE_TAFSIRS, { keyPath: 'nomor' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

export const idbCacheService = {
  async getSurahList(): Promise<SurahSummary[] | null> {
    const db = await openQuranIDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_META, 'readonly');
        const req = tx.objectStore(STORE_META).get('surah_list');
        req.onsuccess = () => resolve((req.result as SurahSummary[]) || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  },

  async saveSurahList(list: SurahSummary[]): Promise<void> {
    const db = await openQuranIDB();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_META, 'readwrite');
        tx.objectStore(STORE_META).put(list, 'surah_list');
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  },

  async getSurahDetail(nomor: number): Promise<SurahDetail | null> {
    const db = await openQuranIDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_SURAHS, 'readonly');
        const req = tx.objectStore(STORE_SURAHS).get(nomor);
        req.onsuccess = () => resolve((req.result as SurahDetail) || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  },

  async saveSurahDetail(detail: SurahDetail): Promise<void> {
    const db = await openQuranIDB();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_SURAHS, 'readwrite');
        tx.objectStore(STORE_SURAHS).put(detail);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  },

  async getAllCachedSurahDetails(): Promise<SurahDetail[]> {
    const db = await openQuranIDB();
    if (!db) return [];
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_SURAHS, 'readonly');
        const req = tx.objectStore(STORE_SURAHS).getAll();
        req.onsuccess = () => resolve((req.result as SurahDetail[]) || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  },

  async getCachedSurahNumbers(): Promise<number[]> {
    const db = await openQuranIDB();
    if (!db) return [];
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_SURAHS, 'readonly');
        const req = tx.objectStore(STORE_SURAHS).getAllKeys();
        req.onsuccess = () =>
          resolve(((req.result as IDBValidKey[]) || []).map((k) => Number(k)));
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  },

  async getTafsirDetail(nomor: number): Promise<TafsirDetail | null> {
    const db = await openQuranIDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_TAFSIRS, 'readonly');
        const req = tx.objectStore(STORE_TAFSIRS).get(nomor);
        req.onsuccess = () => resolve((req.result as TafsirDetail) || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  },

  async saveTafsirDetail(detail: TafsirDetail): Promise<void> {
    const db = await openQuranIDB();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_TAFSIRS, 'readwrite');
        tx.objectStore(STORE_TAFSIRS).put(detail);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  },
};
