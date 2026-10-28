import React from 'react';

export interface TajweedRuleInfo {
  key: string;
  label: string;
  color: string;
  bgColor: string;
  description: string;
  example: string;
}

export const TAJWEED_RULES_LIST: TajweedRuleInfo[] = [
  {
    key: 'ghunnah',
    label: 'Ghunnah',
    color: '#1B8A4B', // Hijau
    bgColor: '#E8F5E9',
    description: 'Dengung sempurna pada huruf Nun (ن) atau Mim (م) bertasydid (2 harakat).',
    example: 'إِنَّ · ثُمَّ',
  },
  {
    key: 'idgham_bighunnah',
    label: 'Idgham Bighunnah',
    color: '#1B8A4B', // Hijau
    bgColor: '#E8F5E9',
    description: 'Nun sukun atau Tanwin lebur disertai dengung jika bertemu huruf Ya (ي), Nun (ن), Mim (م), Wau (و).',
    example: 'مَنْ يَقُولُ',
  },
  {
    key: 'idgham_bilaghunnah',
    label: 'Idgham Bilaghunnah',
    color: '#1976D2', // Biru
    bgColor: '#E3F2FD',
    description: 'Nun sukun atau Tanwin lebur tanpa dengung jika bertemu huruf Lam (ل) atau Ra (ر).',
    example: 'مِنْ رَبِّهِمْ',
  },
  {
    key: 'ikhfa',
    label: 'Ikhfa Haqiqi',
    color: '#E65100', // Oranye
    bgColor: '#FFF3E0',
    description: 'Samar-samar disertai dengung jika Nun sukun/Tanwin bertemu 15 huruf ikhfa (ت ث ج د ذ ز س ش ص ض ط ظ ف ق ك).',
    example: 'مِنْ قَبْلِ',
  },
  {
    key: 'iqlab',
    label: 'Iqlab',
    color: '#C2185B', // Magenta / Pink
    bgColor: '#FCE4EC',
    description: 'Menukar bunyi Nun sukun/Tanwin menjadi suara Mim halus saat bertemu huruf Ba (ب). Ditandai Mim kecil (ۨ).',
    example: 'مِنْ بَعْدِ',
  },
  {
    key: 'izhar',
    label: 'Izhar Halqi',
    color: '#546E7A', // Abu-abu / Netral Khusus
    bgColor: '#ECEFF1',
    description: 'Suara Nun sukun atau Tanwin dibaca jelas tanpa dengung saat bertemu 6 huruf Halqi (ء هـ ع ح غ خ).',
    example: 'مَنْ آمَنَ',
  },
  {
    key: 'mad_wajib_jaiz',
    label: 'Mad Wajib / Jaiz',
    color: '#7B1FA2', // Ungu
    bgColor: '#F3E5F5',
    description: 'Panjang bacaan Mad (4-5 atau 6 harakat) yang ditandai dengan tanda gelombang Maddah (ٓ).',
    example: 'جَاءَ · يَا أَيُّهَا',
  },
  {
    key: 'qalqalah',
    label: 'Qalqalah',
    color: '#D32F2F', // Merah
    bgColor: '#FFEBEE',
    description: 'Pantulan suara membal pada 5 huruf Qalqalah (ق ط ب ج د) saat sukun asli atau waqaf.',
    example: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
  },
];

const COLOR_MAP: Record<string, { color: string; label: string }> = {
  ghunnah: { color: '#1B8A4B', label: 'Ghunnah' },
  idgham_bighunnah: { color: '#1B8A4B', label: 'Idgham Bighunnah' },
  idgham_bilaghunnah: { color: '#1976D2', label: 'Idgham Bilaghunnah' },
  ikhfa: { color: '#E65100', label: 'Ikhfa Haqiqi' },
  iqlab: { color: '#C2185B', label: 'Iqlab' },
  izhar: { color: '#546E7A', label: 'Izhar Halqi' },
  mad_wajib_jaiz: { color: '#7B1FA2', label: 'Mad Wajib / Jaiz' },
  qalqalah: { color: '#D32F2F', label: 'Qalqalah' },
};

/**
  Regex Patterns for Standard Rasm Utsmani Arabic Text
 */
const PATTERNS = [
  // 1. Mad Wajib Muttasil & Mad Jaiz Munfasil (Maddah ~ \u0653)
  {
    type: 'mad_wajib_jaiz',
    regex: /([\u0621-\u064A\u0670-\u0673][\u064B-\u0652]?\u0653)/gu,
  },
  // 2. Ghunnah (Nun or Mim with Shaddah/Tasydid \u0651)
  {
    type: 'ghunnah',
    regex: /([\u0646\u0645]\u0651[\u064E-\u0650]?)/gu,
  },
  // 3. Iqlab (Nun sukun or Tanwin followed by Ba \u0628, or containing Small High Meem \u06E2)
  {
    type: 'iqlab',
    regex: /((\u0646\u0652?|[\u064B\u064C\u064D])\u06E2?\s*[\u0628])/gu,
  },
  // 4. Idgham Bighunnah (Nun sukun or Tanwin followed by Ya, Nun, Mim, Wau)
  {
    type: 'idgham_bighunnah',
    regex: /((\u0646\u0652?|[\u064B\u064C\u064D])\s*[\u064A\u0646\u0645\u0648])/gu,
  },
  // 5. Idgham Bilaghunnah (Nun sukun or Tanwin followed by Lam or Ra)
  {
    type: 'idgham_bilaghunnah',
    regex: /((\u0646\u0652?|[\u064B\u064C\u064D])\s*[\u0644\u0631])/gu,
  },
  // 6. Izhar Halqi (Nun sukun or Tanwin followed by Hamzah, Ha, Kha, 'Ain, Ghain, Ha')
  {
    type: 'izhar',
    regex: /((\u0646\u0652|[\u064B\u064C\u064D])\s*[\u0621\u0623\u0625\u0626\u0647\u062D\u062E\u0639\u063A])/gu,
  },
  // 7. Ikhfa Haqiqi (Nun sukun or Tanwin followed by 15 Ikhfa letters)
  {
    type: 'ikhfa',
    regex: /((\u0646\u0652?|[\u064B\u064C\u064D])\s*[\u062A\u062B\u062C\u062F\u0630\u0632\u0633\u0634\u0635\u0636\u0637\u0638\u0641\u0642\u0643])/gu,
  },
  // 8. Qalqalah (Qaf, Tho, Ba, Jim, Dal with Sukun \u0652 or word-final)
  {
    type: 'qalqalah',
    regex: /([\u0642\u0637\u0628\u062C\u062F]\u0652)/gu,
  },
];

interface Segment {
  start: number;
  end: number;
  type: string;
  text: string;
}

/**
 * Parses standard Arabic Utsmani text and returns formatted React Elements
 * with validated Tajweed color spans without modifying or corrupting the text.
 */
export function renderTajweedText(text: string, enabled = true): React.ReactNode {
  if (!enabled || !text) {
    return text;
  }

  const segments: Segment[] = [];

  // Find all matches across rules
  for (const p of PATTERNS) {
    let match: RegExpExecArray | null;
    const re = new RegExp(p.regex);
    while ((match = re.exec(text)) !== null) {
      const start = match.index;
      const matchText = match[0];
      const end = start + matchText.length;

      // Avoid overlapping segment conflicts by prioritizing earlier rule matches
      const overlaps = segments.some(
        (s) => (start >= s.start && start < s.end) || (end > s.start && end <= s.end)
      );

      if (!overlaps) {
        segments.push({
          start,
          end,
          type: p.type,
          text: matchText,
        });
      }
    }
  }

  if (segments.length === 0) {
    return text;
  }

  // Sort segments in order of appearance
  segments.sort((a, b) => a.start - b.start);

  const nodes: React.ReactNode[] = [];
  let currentIndex = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    // Uncolored text before match
    if (seg.start > currentIndex) {
      nodes.push(text.slice(currentIndex, seg.start));
    }

    const rule = COLOR_MAP[seg.type];
    if (rule) {
      nodes.push(
        <span
          key={`tajweed-${seg.start}-${i}`}
          style={{
            color: rule.color,
            fontWeight: 'inherit',
          }}
          title={rule.label}
          className="transition-colors hover:brightness-110"
        >
          {seg.text}
        </span>
      );
    } else {
      nodes.push(seg.text);
    }

    currentIndex = seg.end;
  }

  // Remaining uncolored text
  if (currentIndex < text.length) {
    nodes.push(text.slice(currentIndex));
  }

  return <>{nodes}</>;
}
