export type QariKey = "01" | "02" | "03" | "04" | "05" | "06";

export interface QariOption {
  id: QariKey;
  name: string;
  style: string;
}

export interface SurahSummary {
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
  tempatTurun: string;
  arti: string;
  deskripsi: string;
  audioFull: Record<QariKey, string>;
}

export interface Ayat {
  nomorAyat: number;
  teksArab: string;
  teksLatin: string;
  teksIndonesia: string;
  audio: Record<QariKey, string>;
}

export interface SurahAdjacentRef {
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
}

export interface SurahDetail extends SurahSummary {
  ayat: Ayat[];
  suratSelanjutnya: SurahAdjacentRef | false;
  suratSebelumnya: SurahAdjacentRef | false;
}

export interface TafsirAyat {
  ayat: number;
  teks: string;
}

export interface TafsirDetail {
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
  tempatTurun: string;
  arti: string;
  deskripsi: string;
  tafsir: TafsirAyat[];
}

export interface EQuranResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface BookmarkItem {
  id: string; // `${surahNomor}:${ayatNomor}`
  surahNomor: number;
  surahNamaLatin: string;
  surahNamaArab: string;
  surahArti: string;
  ayatNomor: number;
  teksArab: string;
  teksLatin: string;
  teksIndonesia: string;
  createdAt: number;
}

export interface PersonalNote {
  id: string; // `${surahNomor}:${ayatNomor}`
  surahNomor: number;
  surahNamaLatin: string;
  surahNamaArab: string;
  ayatNomor: number;
  teksArab: string;
  teksIndonesia: string;
  noteText: string;
  updatedAt: number;
}

export interface ReadingProgress {
  surahNomor: number;
  surahNamaLatin: string;
  surahNamaArab: string;
  surahArti: string;
  ayatNomor: number;
  jumlahAyat: number;
  updatedAt: number;
}

export interface ReadingHistoryItem {
  surahNomor: number;
  surahNamaLatin: string;
  surahNamaArab: string;
  surahArti: string;
  ayatNomor: number;
  jumlahAyat: number;
  timestamp: number;
}

export type ArabicFontFamily = "amiri" | "scheherazade" | "naskh";

export interface ReadingPreferences {
  arabicFontFamily: ArabicFontFamily;
  arabicFontSize: number;
  translationFontSize: number;
  showLatin: boolean;
  showTranslation: boolean;
  showTajweed: boolean;
  selectedQari: QariKey;
  autoScrollSpeed: number;
  autoPlayNextAyat: boolean;
}

export interface SearchMatch {
  type: "surah" | "ayat";
  surahNomor: number;
  surahNamaLatin: string;
  surahNamaArab: string;
  surahArti: string;
  tempatTurun: string;
  jumlahAyat: number;
  ayatNomor?: number;
  teksArab?: string;
  teksLatin?: string;
  teksIndonesia?: string;
  matchedField?: "nama" | "arti" | "terjemahan" | "latin" | "nomor";
}

export interface AudioPlaybackState {
  isPlaying: boolean;
  mode: "ayat" | "surah";
  surahNomor: number;
  surahNamaLatin: string;
  surahNamaArab: string;
  ayatNomor?: number;
  jumlahAyat?: number;
  audioUrl: string;
  qari: QariKey;
}

export type ActiveTab =
  | "home"
  | "surah-list"
  | "reader"
  | "shalat"
  | "qibla"
  | "doa"
  | "hijri"
  | "search"
  | "bookmarks"
  | "settings"
  | "more"
  | "about"
  | "not-found";



