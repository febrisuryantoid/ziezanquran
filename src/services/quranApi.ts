import { API_BASE_URL } from '../config/brand';
import {
  EQuranResponse,
  SearchMatch,
  SurahDetail,
  SurahSummary,
  TafsirDetail,
} from '../types/quran';
import { idbCacheService } from './storageService';

const REQUEST_TIMEOUT_MS = 12000;
const MAX_RETRIES = 3;

// In-memory fast cache
let memorySurahList: SurahSummary[] | null = null;
const memorySurahMap = new Map<number, SurahDetail>();
const memoryTafsirMap = new Map<number, TafsirDetail>();
let isHydratedFromIDB = false;
let hydrationPromise: Promise<void> | null = null;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry<T>(
  endpoint: string,
  retries = MAX_RETRIES,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Gagal memuat data dari server eQuran.id`);
      }

      const json = (await response.json()) as EQuranResponse<T>;
      if (!json || json.code !== 200 || !json.data) {
        throw new Error(json?.message || 'Respons API eQuran.id tidak valid');
      }

      return json.data;
    } catch (err) {
      clearTimeout(timer);
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      lastError = isAbort
        ? new Error('Waktu koneksi habis (timeout). Periksa jaringan internet Anda.')
        : err instanceof Error
          ? err
          : new Error('Gagal terhubung ke server eQuran.id');

      if (attempt < retries - 1) {
        await sleep(400 * Math.pow(2, attempt));
      }
    }
  }

  throw lastError || new Error('Gagal memuat data Al-Qur\'an.');
}

export async function hydrateMemoryCacheFromIDB(): Promise<void> {
  if (isHydratedFromIDB) return;
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    try {
      const [cachedList, cachedDetails] = await Promise.all([
        idbCacheService.getSurahList(),
        idbCacheService.getAllCachedSurahDetails(),
      ]);
      if (cachedList && cachedList.length > 0 && !memorySurahList) {
        memorySurahList = cachedList;
      }
      for (const detail of cachedDetails) {
        if (detail && detail.nomor) {
          memorySurahMap.set(detail.nomor, detail);
        }
      }
    } finally {
      isHydratedFromIDB = true;
    }
  })();

  return hydrationPromise;
}

export const quranApi = {
  async getSurahList(forceRefresh = false): Promise<SurahSummary[]> {
    await hydrateMemoryCacheFromIDB();

    if (!forceRefresh && memorySurahList && memorySurahList.length === 114) {
      return memorySurahList;
    }

    try {
      const data = await fetchWithRetry<SurahSummary[]>('/surat');
      memorySurahList = data;
      await idbCacheService.saveSurahList(data);
      return data;
    } catch (error) {
      if (memorySurahList && memorySurahList.length > 0) {
        return memorySurahList;
      }
      throw error;
    }
  },

  async getSurahDetail(nomor: number, forceRefresh = false): Promise<SurahDetail> {
    if (nomor < 1 || nomor > 114) {
      throw new Error('Nomor surat harus antara 1 hingga 114.');
    }

    await hydrateMemoryCacheFromIDB();

    if (!forceRefresh && memorySurahMap.has(nomor)) {
      return memorySurahMap.get(nomor)!;
    }

    if (!forceRefresh) {
      const idbCached = await idbCacheService.getSurahDetail(nomor);
      if (idbCached) {
        memorySurahMap.set(nomor, idbCached);
        return idbCached;
      }
    }

    try {
      const data = await fetchWithRetry<SurahDetail>(`/surat/${nomor}`);
      memorySurahMap.set(nomor, data);
      await idbCacheService.saveSurahDetail(data);
      return data;
    } catch (error) {
      const fallback = memorySurahMap.get(nomor) || (await idbCacheService.getSurahDetail(nomor));
      if (fallback) return fallback;
      throw error;
    }
  },

  async getTafsirDetail(nomor: number, forceRefresh = false): Promise<TafsirDetail> {
    if (nomor < 1 || nomor > 114) {
      throw new Error('Nomor surat harus antara 1 hingga 114.');
    }

    if (!forceRefresh && memoryTafsirMap.has(nomor)) {
      return memoryTafsirMap.get(nomor)!;
    }

    if (!forceRefresh) {
      const idbCached = await idbCacheService.getTafsirDetail(nomor);
      if (idbCached) {
        memoryTafsirMap.set(nomor, idbCached);
        return idbCached;
      }
    }

    try {
      const data = await fetchWithRetry<TafsirDetail>(`/tafsir/${nomor}`);
      memoryTafsirMap.set(nomor, data);
      await idbCacheService.saveTafsirDetail(data);
      return data;
    } catch (error) {
      const fallback = memoryTafsirMap.get(nomor) || (await idbCacheService.getTafsirDetail(nomor));
      if (fallback) return fallback;
      throw error;
    }
  },

  getCachedSurahCount(): number {
    return memorySurahMap.size;
  },

  async syncFullDataset(
    onProgress?: (cachedCount: number, total: number) => void,
    signal?: AbortSignal
  ): Promise<number> {
    await hydrateMemoryCacheFromIDB();
    const total = 114;
    onProgress?.(memorySurahMap.size, total);

    const missingNumbers: number[] = [];
    for (let i = 1; i <= 114; i++) {
      if (!memorySurahMap.has(i)) {
        missingNumbers.push(i);
      }
    }

    if (missingNumbers.length === 0) {
      onProgress?.(114, 114);
      return 114;
    }

    const CONCURRENCY = 6;
    let index = 0;

    const worker = async () => {
      while (index < missingNumbers.length) {
        if (signal?.aborted) return;
        const currentIdx = index++;
        const surahNo = missingNumbers[currentIdx];
        try {
          await this.getSurahDetail(surahNo);
          onProgress?.(memorySurahMap.size, total);
        } catch {
          // Continue indexing remaining surahs even if one fails temporarily
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(CONCURRENCY, missingNumbers.length) },
      () => worker()
    );
    await Promise.all(workers);

    return memorySurahMap.size;
  },

  async searchDataset(
    rawQuery: string,
    surahList: SurahSummary[],
    options?: {
      filterSurahNomor?: number | null;
      onPartialResults?: (results: SearchMatch[], indexedCount: number) => void;
      signal?: AbortSignal;
    }
  ): Promise<{ results: SearchMatch[]; indexedCount: number }> {
    await hydrateMemoryCacheFromIDB();
    const query = rawQuery.trim();
    if (!query) {
      return { results: [], indexedCount: memorySurahMap.size };
    }

    const qLower = query.toLowerCase();
    const normalizedQuery = qLower.replace(/[^a-z0-9\s:]/g, '');

    const collectMatchesFromMemory = (): SearchMatch[] => {
      const results: SearchMatch[] = [];

      // 1. Check direct Surah:Ayat pattern e.g. "2:255" or "36:1" or "al-baqarah 255"
      const colonMatch = query.match(/^(\d{1,3})\s*[:/.,-]\s*(\d{1,3})$/);
      if (colonMatch) {
        const sNo = parseInt(colonMatch[1], 10);
        const aNo = parseInt(colonMatch[2], 10);
        const detail = memorySurahMap.get(sNo);
        if (detail) {
          const ayatObj = detail.ayat.find((a) => a.nomorAyat === aNo);
          if (ayatObj) {
            results.push({
              type: 'ayat',
              surahNomor: detail.nomor,
              surahNamaLatin: detail.namaLatin,
              surahNamaArab: detail.nama,
              surahArti: detail.arti,
              tempatTurun: detail.tempatTurun,
              jumlahAyat: detail.jumlahAyat,
              ayatNomor: ayatObj.nomorAyat,
              teksArab: ayatObj.teksArab,
              teksLatin: ayatObj.teksLatin,
              teksIndonesia: ayatObj.teksIndonesia,
              matchedField: 'nomor',
            });
          }
        }
      }

      // Check "NamaSurat NomorAyat" e.g. "yasin 12" or "al kahf 10"
      const nameAndAyatMatch = query.match(/^([a-zA-Z\s'-]+)\s+(\d{1,3})$/);
      if (nameAndAyatMatch) {
        const namePart = nameAndAyatMatch[1].trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const ayatNum = parseInt(nameAndAyatMatch[2], 10);
        const matchedSurah = surahList.find((s) =>
          s.namaLatin.toLowerCase().replace(/[^a-z0-9]/g, '').includes(namePart)
        );
        if (matchedSurah) {
          const detail = memorySurahMap.get(matchedSurah.nomor);
          const ayatObj = detail?.ayat.find((a) => a.nomorAyat === ayatNum);
          if (detail && ayatObj) {
            results.push({
              type: 'ayat',
              surahNomor: detail.nomor,
              surahNamaLatin: detail.namaLatin,
              surahNamaArab: detail.nama,
              surahArti: detail.arti,
              tempatTurun: detail.tempatTurun,
              jumlahAyat: detail.jumlahAyat,
              ayatNomor: ayatObj.nomorAyat,
              teksArab: ayatObj.teksArab,
              teksLatin: ayatObj.teksLatin,
              teksIndonesia: ayatObj.teksIndonesia,
              matchedField: 'nomor',
            });
          }
        }
      }

      // 2. Match Surah Metadata (if no specific surah filter or matches filter)
      for (const surah of surahList) {
        if (options?.filterSurahNomor && surah.nomor !== options.filterSurahNomor) {
          continue;
        }
        const latinNorm = surah.namaLatin.toLowerCase().replace(/[^a-z0-9\s]/g, '');
        const artiLower = surah.arti.toLowerCase();
        const isNumberMatch = String(surah.nomor) === query;

        if (
          isNumberMatch ||
          surah.namaLatin.toLowerCase().includes(qLower) ||
          latinNorm.includes(normalizedQuery) ||
          artiLower.includes(qLower) ||
          surah.nama.includes(query)
        ) {
          results.push({
            type: 'surah',
            surahNomor: surah.nomor,
            surahNamaLatin: surah.namaLatin,
            surahNamaArab: surah.nama,
            surahArti: surah.arti,
            tempatTurun: surah.namaLatin,
            jumlahAyat: surah.jumlahAyat,
            matchedField: isNumberMatch
              ? 'nomor'
              : artiLower.includes(qLower)
                ? 'arti'
                : 'nama',
          });
        }
      }

      // 3. Match Ayat Translation, Transliteration, or Ayat Number across all cached surahs
      const terms = qLower
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2);

      const sortedSurahNumbers = Array.from(memorySurahMap.keys()).sort((a, b) => a - b);

      for (const sNo of sortedSurahNumbers) {
        if (options?.filterSurahNomor && sNo !== options.filterSurahNomor) {
          continue;
        }
        const detail = memorySurahMap.get(sNo);
        if (!detail || !detail.ayat) continue;

        for (const ayat of detail.ayat) {
          // Avoid duplicating exact colon match already pushed
          if (
            results.some(
              (r) =>
                r.type === 'ayat' &&
                r.surahNomor === detail.nomor &&
                r.ayatNomor === ayat.nomorAyat
            )
          ) {
            continue;
          }

          const indoLower = ayat.teksIndonesia.toLowerCase();
          const latinLower = ayat.teksLatin.toLowerCase();
          const isExactAyatNum =
            options?.filterSurahNomor && String(ayat.nomorAyat) === query;

          const matchesPhrase = indoLower.includes(qLower) || latinLower.includes(qLower);
          const matchesAllTerms =
            terms.length > 1 && terms.every((term) => indoLower.includes(term));

          if (isExactAyatNum || matchesPhrase || matchesAllTerms || ayat.teksArab.includes(query)) {
            results.push({
              type: 'ayat',
              surahNomor: detail.nomor,
              surahNamaLatin: detail.namaLatin,
              surahNamaArab: detail.nama,
              surahArti: detail.arti,
              tempatTurun: detail.tempatTurun,
              jumlahAyat: detail.jumlahAyat,
              ayatNomor: ayat.nomorAyat,
              teksArab: ayat.teksArab,
              teksLatin: ayat.teksLatin,
              teksIndonesia: ayat.teksIndonesia,
              matchedField: isExactAyatNum
                ? 'nomor'
                : indoLower.includes(qLower) || matchesAllTerms
                  ? 'terjemahan'
                  : 'latin',
            });

            if (results.length >= 250) {
              return results;
            }
          }
        }
      }

      return results;
    };

    // If direct surah:ayat or specific surah filter is requested and not yet in memory, fetch it first!
    const colonMatch = query.match(/^(\d{1,3})\s*[:/.,-]\s*(\d{1,3})$/);
    if (colonMatch) {
      const targetSurah = parseInt(colonMatch[1], 10);
      if (targetSurah >= 1 && targetSurah <= 114 && !memorySurahMap.has(targetSurah)) {
        try {
          await this.getSurahDetail(targetSurah);
        } catch {
          // Ignore
        }
      }
    }

    const nameAndAyatMatch = query.match(/^([a-zA-Z\s'-]+)\s+(\d{1,3})$/);
    if (nameAndAyatMatch) {
      const namePart = nameAndAyatMatch[1].trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchedSurah = surahList.find((s) =>
        s.namaLatin.toLowerCase().replace(/[^a-z0-9]/g, '').includes(namePart)
      );
      if (matchedSurah && !memorySurahMap.has(matchedSurah.nomor)) {
        try {
          await this.getSurahDetail(matchedSurah.nomor);
        } catch {
          // Ignore
        }
      }
    }

    if (options?.filterSurahNomor && !memorySurahMap.has(options.filterSurahNomor)) {
      try {
        await this.getSurahDetail(options.filterSurahNomor);
      } catch {
        // Ignore
      }
    }

    // Emit immediate results from already-cached surahs
    let currentResults = collectMatchesFromMemory();
    options?.onPartialResults?.(currentResults, memorySurahMap.size);

    // If not all 114 surahs are cached yet and no single-surah filter is active, progressively index remaining surahs
    if (memorySurahMap.size < 114 && !options?.filterSurahNomor && !colonMatch) {
      await this.syncFullDataset((cachedCount) => {
        if (cachedCount % 12 === 0 || cachedCount === 114) {
          currentResults = collectMatchesFromMemory();
          options?.onPartialResults?.(currentResults, cachedCount);
        }
      }, options?.signal);
      currentResults = collectMatchesFromMemory();
    }

    return {
      results: currentResults,
      indexedCount: memorySurahMap.size,
    };
  },
};
