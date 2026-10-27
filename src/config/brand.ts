import { QariKey, QariOption, ReadingPreferences } from '../types/quran';

export const SITE_URL = "https://quran.ziezan.id";
export const SITE_DOMAIN = "quran.ziezan.id";

export const APP_CONFIG = {
  appName: "Ziezan Quran",
  siteUrl: SITE_URL,
  domain: SITE_DOMAIN,
  primaryColor: "#046D38",
  tagline: "Dekat dengan Al-Qur'an, Tenang dalam Kehidupan."
} as const;

export const APP_INFO = {
  version: "2.5.0",
  edition: "Super App PWA · Encrypted Edition",
  siteUrl: SITE_URL,
  domain: SITE_DOMAIN,
  description:
    "Ziezan Quran adalah aplikasi Mushaf Al-Qur'an digital modern berstandar internasional yang dirancang dengan estetika bersih, tenang, dan fokus pada kenyamanan tilawah. Menyajikan keseluruhan 114 surat (6.236 ayat) dengan teks Arab berharakat lengkap, transliterasi Latin, terjemahan Bahasa Indonesia, tafsir mendalam, pencarian makna lintas surat, serta audio murottal dari 6 qari terkemuka dunia.",
  developerName: "Febri Suryanto",
  developerRole: "CEO & Founder",
  agencyName: "Ziezan Solutions",
  agencyUrl: "https://ziezan.id",
  agencyTagline: "Professional Digital Agency, Web App Development, UI/UX Design & AI Engineering Studio",
  developerSkills: [
    "Web App Development",
    "UI/UX Product Designer",
    "AI Engineer",
    "Full-Stack Architect",
  ],
  developerBio:
    "Febri Suryanto adalah CEO sekaligus Founder dari Ziezan Solutions, sebuah agensi teknologi profesional yang berfokus pada pengembangan Web Application modern, desain UI/UX berstandar global, dan solusi kecerdasan buatan (AI Engineering).",
  developerContact: "hello[at]febrisuryanto.com",
  developerEmail: "hello@febrisuryanto.com",
  developerMailtoUrl: `mailto:hello@febrisuryanto.com?subject=${encodeURIComponent(
    "Halo Febri Suryanto — Kolaborasi / Pertanyaan Terkait Ziezan Quran"
  )}&body=${encodeURIComponent(
    "Assalamu'alaikum Wr. Wb. Mas Febri Suryanto (Ziezan Solutions),\n\nSaya pengguna aplikasi Ziezan Quran (https://quran.ziezan.id) dan ingin menghubungi Anda terkait:\n\n[Tuliskan pesan, masukan, atau diskusi proyek Web App / UI/UX / AI di sini]\n\nTerima kasih.\nWassalamu'alaikum Wr. Wb."
  )}`,
  dataSourceName: "eQuran.id API v2",
  dataSourceUrl: "https://equran.id/api/v2",
  dataSourceDetail: "Mushaf Standar Indonesia, Terjemahan Kemenag RI, Tafsir & Audio Murottal",
} as const;

export const BRAND_COLORS = {
  headerBrand: "#035328",
  primaryButton: "#046D38",
  activeNav: "#046D38",
  goldAccent: "#FBC647",
  pageBg: "#F7F8F5",
  cardSurface: "#FFFFFF",
  textPrimary: "#24352B",
  textSecondary: "#68756C",
  borderDivider: "#E3E9E3",
} as const;

export const BRAND_LOGO_PATH = "/icons/ziezan-quran.png";
export const BRAND_LOGO_FALLBACK_PATH = "/icons/ziezan-quran.png";

export const API_BASE_URL = "https://equran.id/api/v2";

export const QARI_OPTIONS: Record<QariKey, QariOption> = {
  "01": {
    id: "01",
    name: "Abdullah Al-Juhany",
    style: "Murattal Haramain",
  },
  "02": {
    id: "02",
    name: "Abdul Muhsin Al-Qasim",
    style: "Murattal Madinah",
  },
  "03": {
    id: "03",
    name: "Abdurrahman As-Sudais",
    style: "Imam Masjidil Haram",
  },
  "04": {
    id: "04",
    name: "Ibrahim Al-Dossari",
    style: "Murattal Tartil",
  },
  "05": {
    id: "05",
    name: "Misyari Rasyid Al-Afasi",
    style: "Murattal Merdu",
  },
  "06": {
    id: "06",
    name: "Yasser Al-Dosari",
    style: "Imam Masjidil Haram",
  },
};

export const ARABIC_FONT_OPTIONS = [
  {
    id: "amiri" as const,
    name: "Amiri Quran",
    className: "font-arabic-amiri",
    description: "Naskh klasik bergaya mushaf cetak",
  },
  {
    id: "scheherazade" as const,
    name: "Scheherazade New",
    className: "font-arabic-scheherazade",
    description: "Kaligrafi Naskh dengan spasi harakat lega",
  },
  {
    id: "naskh" as const,
    name: "Noto Naskh Arabic",
    className: "font-arabic-naskh",
    description: "Tipografi modern tajam di layar kecil",
  },
];

export const DEFAULT_PREFERENCES: ReadingPreferences = {
  arabicFontFamily: "amiri",
  arabicFontSize: 32,
  translationFontSize: 16,
  showLatin: true,
  showTranslation: true,
  selectedQari: "05",
  autoScrollSpeed: 1,
  autoPlayNextAyat: true,
};

export const FEATURED_SURAHS = [
  { nomor: 1, namaLatin: "Al-Fatihah", arti: "Pembukaan", ayatCount: 7 },
  { nomor: 18, namaLatin: "Al-Kahf", arti: "Penghuni Gua", ayatCount: 110 },
  { nomor: 36, namaLatin: "Yasin", arti: "Yasin", ayatCount: 83 },
  { nomor: 55, namaLatin: "Ar-Rahman", arti: "Maha Pengasih", ayatCount: 78 },
  { nomor: 56, namaLatin: "Al-Waqi'ah", arti: "Hari Kiamat", ayatCount: 96 },
  { nomor: 67, namaLatin: "Al-Mulk", arti: "Kerajaan", ayatCount: 30 },
];

export const QUICK_VERSES = [
  { surahNomor: 2, ayatNomor: 255, title: "Ayat Kursi", subtitle: "QS. Al-Baqarah : 255" },
  { surahNomor: 2, ayatNomor: 285, title: "Akhir Al-Baqarah", subtitle: "QS. Al-Baqarah : 285" },
  { surahNomor: 2, ayatNomor: 201, title: "Doa Kebaikan Dunia Akhirat", subtitle: "QS. Al-Baqarah : 201" },
  { surahNomor: 65, ayatNomor: 2, title: "Ayat Seribu Dinar", subtitle: "QS. At-Talaq : 2-3" },
  { surahNomor: 94, ayatNomor: 5, title: "Kemudahan Bersama Kesulitan", subtitle: "QS. Al-Insyirah : 5-6" },
  { surahNomor: 112, ayatNomor: 1, title: "Kemurnian Tauhid", subtitle: "QS. Al-Ikhlas : 1-4" },
];

export const SUGGESTED_SEARCH_TOPICS = [
  { label: "Sabar", query: "sabar" },
  { label: "Tenang", query: "tenang" },
  { label: "Syukur", query: "syukur" },
  { label: "Rezeki", query: "rezeki" },
  { label: "Ampunan", query: "ampun" },
  { label: "Orang Tua", query: "ibu bapak" },
  { label: "Doa", query: "berdoa" },
  { label: "Cahaya", query: "cahaya" },
];

export interface JuzItem {
  juz: number;
  name: string;
  startSurahNomor: number;
  startSurahName: string;
  startAyat: number;
  endSurahNomor: number;
  endSurahName: string;
  endAyat: number;
}

export const JUZ_LIST: JuzItem[] = [
  { juz: 1, name: "Alif Lam Mim", startSurahNomor: 1, startSurahName: "Al-Fatihah", startAyat: 1, endSurahNomor: 2, endSurahName: "Al-Baqarah", endAyat: 141 },
  { juz: 2, name: "Sayaqul", startSurahNomor: 2, startSurahName: "Al-Baqarah", startAyat: 142, endSurahNomor: 2, endSurahName: "Al-Baqarah", endAyat: 252 },
  { juz: 3, name: "Tilkar Rusul", startSurahNomor: 2, startSurahName: "Al-Baqarah", startAyat: 253, endSurahNomor: 3, endSurahName: "Ali 'Imran", endAyat: 92 },
  { juz: 4, name: "Lan Tanalul Birra", startSurahNomor: 3, startSurahName: "Ali 'Imran", startAyat: 93, endSurahNomor: 4, endSurahName: "An-Nisa'", endAyat: 23 },
  { juz: 5, name: "Wal Muhsanat", startSurahNomor: 4, startSurahName: "An-Nisa'", startAyat: 24, endSurahNomor: 4, endSurahName: "An-Nisa'", endAyat: 147 },
  { juz: 6, name: "La Yuhibbullah", startSurahNomor: 4, startSurahName: "An-Nisa'", startAyat: 148, endSurahNomor: 5, endSurahName: "Al-Ma'idah", endAyat: 81 },
  { juz: 7, name: "Wa Iza Sami'u", startSurahNomor: 5, startSurahName: "Al-Ma'idah", startAyat: 82, endSurahNomor: 6, endSurahName: "Al-An'am", endAyat: 110 },
  { juz: 8, name: "Wa Lau Annana", startSurahNomor: 6, startSurahName: "Al-An'am", startAyat: 111, endSurahNomor: 7, endSurahName: "Al-A'raf", endAyat: 87 },
  { juz: 9, name: "Qalal Mala'u", startSurahNomor: 7, startSurahName: "Al-A'raf", startAyat: 88, endSurahNomor: 8, endSurahName: "Al-Anfal", endAyat: 40 },
  { juz: 10, name: "Wa'lamu", startSurahNomor: 8, startSurahName: "Al-Anfal", startAyat: 41, endSurahNomor: 9, endSurahName: "At-Taubah", endAyat: 92 },
  { juz: 11, name: "Ya'taziruna", startSurahNomor: 9, startSurahName: "At-Taubah", startAyat: 93, endSurahNomor: 11, endSurahName: "Hud", endAyat: 5 },
  { juz: 12, name: "Wa Ma Min Dabbah", startSurahNomor: 11, startSurahName: "Hud", startAyat: 6, endSurahNomor: 12, endSurahName: "Yusuf", endAyat: 52 },
  { juz: 13, name: "Wa Ma Ubarri'u", startSurahNomor: 12, startSurahName: "Yusuf", startAyat: 53, endSurahNomor: 14, endSurahName: "Ibrahim", endAyat: 52 },
  { juz: 14, name: "Rubama", startSurahNomor: 15, startSurahName: "Al-Hijr", startAyat: 1, endSurahNomor: 16, endSurahName: "An-Nahl", endAyat: 128 },
  { juz: 15, name: "Subhanallazi", startSurahNomor: 17, startSurahName: "Al-Isra'", startAyat: 1, endSurahNomor: 18, endSurahName: "Al-Kahf", endAyat: 74 },
  { juz: 16, name: "Qala Alam", startSurahNomor: 18, startSurahName: "Al-Kahf", startAyat: 75, endSurahNomor: 20, endSurahName: "Taha", endAyat: 135 },
  { juz: 17, name: "Iqtaraba", startSurahNomor: 21, startSurahName: "Al-Anbiya'", startAyat: 1, endSurahNomor: 22, endSurahName: "Al-Hajj", endAyat: 78 },
  { juz: 18, name: "Qad Aflaha", startSurahNomor: 23, startSurahName: "Al-Mu'minun", startAyat: 1, endSurahNomor: 25, endSurahName: "Al-Furqan", endAyat: 20 },
  { juz: 19, name: "Wa Qalallazina", startSurahNomor: 25, startSurahName: "Al-Furqan", startAyat: 21, endSurahNomor: 27, endSurahName: "An-Naml", endAyat: 55 },
  { juz: 20, name: "Amman Khalaqa", startSurahNomor: 27, startSurahName: "An-Naml", startAyat: 56, endSurahNomor: 29, endSurahName: "Al-'Ankabut", endAyat: 45 },
  { juz: 21, name: "Utlu Ma Uhiya", startSurahNomor: 29, startSurahName: "Al-'Ankabut", startAyat: 46, endSurahNomor: 33, endSurahName: "Al-Ahzab", endAyat: 30 },
  { juz: 22, name: "Wa Man Yaqnut", startSurahNomor: 33, startSurahName: "Al-Ahzab", startAyat: 31, endSurahNomor: 36, endSurahName: "Yasin", endAyat: 27 },
  { juz: 23, name: "Wa Maliya", startSurahNomor: 36, startSurahName: "Yasin", startAyat: 28, endSurahNomor: 39, endSurahName: "Az-Zumar", endAyat: 31 },
  { juz: 24, name: "Faman Azlamu", startSurahNomor: 39, startSurahName: "Az-Zumar", startAyat: 32, endSurahNomor: 41, endSurahName: "Fussilat", endAyat: 46 },
  { juz: 25, name: "Ilaihi Yuraddu", startSurahNomor: 41, startSurahName: "Fussilat", startAyat: 47, endSurahNomor: 45, endSurahName: "Al-Jasiyah", endAyat: 37 },
  { juz: 26, name: "Ha Mim", startSurahNomor: 46, startSurahName: "Al-Ahqaf", startAyat: 1, endSurahNomor: 51, endSurahName: "Az-Zariyat", endAyat: 30 },
  { juz: 27, name: "Qala Fama Khatbukum", startSurahNomor: 51, startSurahName: "Az-Zariyat", startAyat: 31, endSurahNomor: 57, endSurahName: "Al-Hadid", endAyat: 29 },
  { juz: 28, name: "Qad Sami'allahu", startSurahNomor: 58, startSurahName: "Al-Mujadalah", startAyat: 1, endSurahNomor: 66, endSurahName: "At-Tahrim", endAyat: 12 },
  { juz: 29, name: "Tabarakallazi", startSurahNomor: 67, startSurahName: "Al-Mulk", startAyat: 1, endSurahNomor: 77, endSurahName: "Al-Mursalat", endAyat: 50 },
  { juz: 30, name: "Juz 'Amma", startSurahNomor: 78, startSurahName: "An-Naba'", startAyat: 1, endSurahNomor: 114, endSurahName: "An-Nas", endAyat: 6 },
];

export const DAILY_TADABBUR_VERSES = [
  {
    surahNomor: 94,
    surahNamaLatin: "Al-Insyirah",
    ayatNomor: 5,
    teksArab: "فَاِنَّ مَعَ الْعُسْرِ يُسْرًاۙ",
    teksIndonesia: "Maka sesungguhnya bersama kesulitan ada kemudahan.",
    theme: "Harapan & Ketabahan",
  },
  {
    surahNomor: 13,
    surahNamaLatin: "Ar-Ra'd",
    ayatNomor: 28,
    teksArab: "اَلَا بِذِكْرِ اللّٰهِ تَطْمَىِٕنُّ الْقُلُوْبُۗ",
    teksIndonesia: "Ingatlah, hanya dengan mengingat Allah hati menjadi tenteram.",
    theme: "Ketenangan Jiwa",
  },
  {
    surahNomor: 2,
    surahNamaLatin: "Al-Baqarah",
    ayatNomor: 286,
    teksArab: "لَا يُكَلِّفُ اللّٰهُ نَفْسًا اِلَّا وُسْعَهَاۗ",
    teksIndonesia: "Allah tidak membebani seseorang melainkan sesuai dengan kesanggupannya.",
    theme: "Keyakinan & Kekuatan",
  },
  {
    surahNomor: 65,
    surahNamaLatin: "At-Talaq",
    ayatNomor: 3,
    teksArab: "وَمَنْ يَّتَوَكَّلْ عَلَى اللّٰهِ فَهُوَ حَسْبُهٗۗ",
    teksIndonesia: "Dan barangsiapa bertawakal kepada Allah, niscaya Allah akan mencukupkan (keperluan)nya.",
    theme: "Tawakal & Rezeki",
  },
  {
    surahNomor: 14,
    surahNamaLatin: "Ibrahim",
    ayatNomor: 7,
    teksArab: "لَىِٕنْ شَكَرْتُمْ لَاَزِيْدَنَّكُمْ",
    teksIndonesia: "Sesungguhnya jika kamu bersyukur, niscaya Aku akan menambah (nikmat) kepadamu.",
    theme: "Keutamaan Syukur",
  },
  {
    surahNomor: 39,
    surahNamaLatin: "Az-Zumar",
    ayatNomor: 53,
    teksArab: "لَا تَقْنَطُوْا مِنْ رَّحْمَةِ اللّٰهِۗ",
    teksIndonesia: "Janganlah kamu berputus asa dari rahmat Allah. Sesungguhnya Allah mengampuni dosa-dosa semuanya.",
    theme: "Rahmat & Ampunan",
  },
  {
    surahNomor: 2,
    surahNamaLatin: "Al-Baqarah",
    ayatNomor: 152,
    teksArab: "فَاذْكُرُوْنِيْٓ اَذْكُرْكُمْ وَاشْكُرُوْا لِيْ وَلَا تَكْفُرُوْنِ",
    teksIndonesia: "Maka ingatlah kepada-Ku, Aku pun akan ingat kepadamu. Bersyukurlah kepada-Ku, dan janganlah kamu ingkar kepada-Ku.",
    theme: "Dzikir & Syukur",
  },
] as const;

