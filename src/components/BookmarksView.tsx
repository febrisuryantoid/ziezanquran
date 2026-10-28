import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  Clock,
  Download,
  FileText,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { storageService } from '../services/storageService';
import {
  BookmarkItem,
  PersonalNote,
  ReadingHistoryItem,
} from '../types/quran';

interface BookmarksViewProps {
  bookmarks: BookmarkItem[];
  notes: PersonalNote[];
  history: ReadingHistoryItem[];
  onOpenSurah: (surahNomor: number, ayatNomor?: number) => void;
  onRemoveBookmark: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onClearHistory: () => void;
  onDataImported: () => void;
  onShowToast?: (msg: string) => void;
}

type SavedSection = 'BOOKMARKS' | 'NOTES' | 'HISTORY';

function formatDateID(ts: number): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return '';
  }
}

export const BookmarksView: React.FC<BookmarksViewProps> = ({
  bookmarks,
  notes,
  history,
  onOpenSurah,
  onRemoveBookmark,
  onDeleteNote,
  onClearHistory,
  onDataImported,
  onShowToast,
}) => {
  const [section, setSection] = useState<SavedSection>('BOOKMARKS');
  const [filterQuery, setFilterQuery] = useState('');

  const handleExport = () => {
    const json = storageService.exportUserData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ziezan-quran-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast?.('Berkas cadangan terenkripsi berhasil diunduh');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      const ok = storageService.importUserData(content);
      if (ok) {
        onDataImported();
        onShowToast?.('Data cadangan berhasil dipulihkan');
      } else {
        onShowToast?.('Format berkas cadangan tidak valid');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredBookmarks = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return bookmarks;
    return bookmarks.filter(
      (b) =>
        b.surahNamaLatin.toLowerCase().includes(q) ||
        `${b.surahNomor}:${b.ayatNomor}`.includes(q) ||
        b.teksIndonesia.toLowerCase().includes(q) ||
        b.teksArab.includes(q)
    );
  }, [bookmarks, filterQuery]);

  const filteredNotes = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.surahNamaLatin.toLowerCase().includes(q) ||
        `${n.surahNomor}:${n.ayatNomor}`.includes(q) ||
        n.noteText.toLowerCase().includes(q) ||
        n.teksIndonesia.toLowerCase().includes(q)
    );
  }, [notes, filterQuery]);

  const filteredHistory = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (h) =>
        h.surahNamaLatin.toLowerCase().includes(q) ||
        `${h.surahNomor}:${h.ayatNomor}`.includes(q) ||
        h.surahArti.toLowerCase().includes(q)
    );
  }, [history, filterQuery]);

  const showFilterBar = bookmarks.length > 2 || notes.length > 2 || history.length > 3;

  return (
    <div className="container-app py-4 sm:py-6 space-y-4 sm:space-y-5">
      {/* Header & Backup Actions */}
      <div className="card-surface space-y-3">
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <h1
              className="font-display text-fluid-xl font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Koleksi &amp; Riwayat
            </h1>
            <p className="text-fluid-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              Penanda ayat, catatan tadabbur, dan riwayat tilawah Anda.
            </p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExport}
              aria-label="Ekspor Data Cadangan (JSON)"
              title="Ekspor Data Cadangan"
              className="w-9 h-9 sm:w-auto sm:h-auto sm:px-3.5 sm:py-1.5 rounded-full border text-xs font-semibold flex items-center justify-center gap-1.5 bg-[#F7F8F5] hover:bg-[#F0F3EE] transition-colors cursor-pointer"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              <Download className="w-3.5 h-3.5 text-[#046D38] shrink-0" />
              <span className="hidden sm:inline">Ekspor</span>
            </button>

            <label
              aria-label="Impor Data Cadangan (JSON)"
              title="Impor Data Cadangan"
              className="w-9 h-9 sm:w-auto sm:h-auto sm:px-3.5 sm:py-1.5 rounded-full border text-xs font-semibold flex items-center justify-center gap-1.5 bg-[#F7F8F5] hover:bg-[#F0F3EE] transition-colors cursor-pointer"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              <Upload className="w-3.5 h-3.5 text-[#046D38] shrink-0" />
              <span className="hidden sm:inline">Impor</span>
              <input
                type="file"
                accept="application/json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Full-Rounded Section Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-full bg-[#F0F3EE]">
          <button
            type="button"
            onClick={() => setSection('BOOKMARKS')}
            className={`min-h-[36px] px-2 sm:px-3 py-1 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all truncate cursor-pointer ${
              section === 'BOOKMARKS'
                ? 'bg-[#046D38] text-white shadow-xs'
                : 'text-[#68756C] hover:text-[#24352B]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
            <span className="truncate">Penanda ({bookmarks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSection('NOTES')}
            className={`min-h-[36px] px-2 sm:px-3 py-1 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all truncate cursor-pointer ${
              section === 'NOTES'
                ? 'bg-[#046D38] text-white shadow-xs'
                : 'text-[#68756C] hover:text-[#24352B]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
            <span className="truncate">Catatan ({notes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSection('HISTORY')}
            className={`min-h-[36px] px-2 sm:px-3 py-1 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all truncate cursor-pointer ${
              section === 'HISTORY'
                ? 'bg-[#046D38] text-white shadow-xs'
                : 'text-[#68756C] hover:text-[#24352B]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
            <span className="truncate">Riwayat ({history.length})</span>
          </button>
        </div>

        {/* Instant Collection Filter Input */}
        {showFilterBar && (
          <div className="relative min-w-0">
            <Search
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Saring penanda, catatan tadabbur, atau riwayat..."
              aria-label="Saring koleksi"
              className="w-full min-h-[38px] pl-10 pr-9 py-1.5 rounded-full border text-xs sm:text-sm bg-[#F7F8F5] focus:bg-white focus:outline-none transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="w-6 h-6 rounded-full flex items-center justify-center absolute right-1.5 top-1/2 -translate-y-1/2 hover:bg-stone-200/60 cursor-pointer"
                aria-label="Bersihkan saringan"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bookmarks List */}
      {section === 'BOOKMARKS' && (
        <div className={filteredBookmarks.length > 0 ? 'grid grid-cols-1 xl:grid-cols-2 gap-3.5 items-start' : 'space-y-3'}>
          {filteredBookmarks.length === 0 ? (
            <div className="card-surface !p-8 text-center space-y-1.5">
              <p className="text-sm sm:text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {bookmarks.length === 0
                  ? 'Belum Ada Penanda Ayat'
                  : `Tidak ditemukan penanda dengan kata "${filterQuery}"`}
              </p>
              <p className="text-fluid-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {bookmarks.length === 0
                  ? 'Ketuk ikon Penanda saat membaca ayat untuk menyimpannya di sini.'
                  : 'Coba gunakan kata kunci pencarian lain.'}
              </p>
            </div>
          ) : (
            filteredBookmarks.map((bm) => (
              <article key={bm.id} className="card-surface space-y-3">
                <div
                  className="flex items-center justify-between gap-2 pb-2.5 border-b min-w-0"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="min-w-0 flex-1">
                    <span
                      className="text-xs font-mono-num font-bold px-2.5 py-1 rounded-lg bg-[#FDF6E2] border border-[#FBC647] inline-block"
                      style={{ color: '#1D2B22' }}
                    >
                      QS. {bm.surahNamaLatin} ({bm.surahNomor}:{bm.ayatNomor})
                    </span>
                    <span
                      className="text-[11px] sm:text-xs ml-2 hidden sm:inline"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {formatDateID(bm.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenSurah(bm.surahNomor, bm.ayatNomor)}
                      className="min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#FBC647] shrink-0" />
                      <span>Buka</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveBookmark(bm.id)}
                      className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-red-50 text-red-700 transition-colors cursor-pointer"
                      style={{ borderColor: 'var(--color-border)' }}
                      aria-label={`Hapus penanda QS. ${bm.surahNamaLatin} ayat ${bm.ayatNomor}`}
                      title="Hapus penanda"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p
                  className="font-arabic-amiri text-2xl sm:text-3xl text-right"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {bm.teksArab}
                </p>

                <p
                  className="text-fluid-base leading-relaxed break-words"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {bm.teksIndonesia}
                </p>
              </article>
            ))
          )}
        </div>
      )}

      {/* Personal Notes List */}
      {section === 'NOTES' && (
        <div className={filteredNotes.length > 0 ? 'grid grid-cols-1 xl:grid-cols-2 gap-3.5 items-start' : 'space-y-3'}>
          {filteredNotes.length === 0 ? (
            <div className="card-surface !p-8 text-center space-y-1.5">
              <p className="text-sm sm:text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {notes.length === 0
                  ? 'Belum Ada Catatan Pribadi'
                  : `Tidak ditemukan catatan dengan kata "${filterQuery}"`}
              </p>
              <p className="text-fluid-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {notes.length === 0
                  ? 'Tambahkan catatan tadabbur pada ayat saat membaca untuk melihatnya di sini.'
                  : 'Coba gunakan kata kunci pencarian lain.'}
              </p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <article key={note.id} className="card-surface space-y-3">
                <div
                  className="flex items-center justify-between gap-2 pb-2.5 border-b min-w-0"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="min-w-0 flex-1">
                    <span
                      className="text-xs font-mono-num font-bold px-2.5 py-1 rounded-lg bg-[#F7F8F5] border inline-block"
                      style={{
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      QS. {note.surahNamaLatin} ({note.surahNomor}:{note.ayatNomor})
                    </span>
                    <span
                      className="text-[11px] sm:text-xs ml-2 hidden sm:inline"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {formatDateID(note.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenSurah(note.surahNomor, note.ayatNomor)}
                      className="min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      <span>Buka</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteNote(note.id)}
                      className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-red-50 text-red-700 transition-colors cursor-pointer"
                      style={{ borderColor: 'var(--color-border)' }}
                      aria-label={`Hapus catatan QS. ${note.surahNamaLatin} ayat ${note.ayatNomor}`}
                      title="Hapus catatan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div
                  className="p-3.5 rounded-xl bg-[#F7F8F5] border space-y-1"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
                    Catatan Tadabbur
                  </p>
                  <p
                    className="text-fluid-sm whitespace-pre-line break-words"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {note.noteText}
                  </p>
                </div>

                <p
                  className="text-fluid-xs italic break-words"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  &ldquo;{note.teksIndonesia}&rdquo;
                </p>
              </article>
            ))
          )}
        </div>
      )}

      {/* Reading History List */}
      {section === 'HISTORY' && (
        <div className="space-y-3">
          {filteredHistory.length === 0 ? (
            <div className="card-surface !p-8 text-center space-y-1.5">
              <p className="text-sm sm:text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {history.length === 0
                  ? 'Riwayat Bacaan Kosong'
                  : `Tidak ditemukan riwayat dengan kata "${filterQuery}"`}
              </p>
              <p className="text-fluid-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Surat dan ayat yang Anda baca akan tercatat otomatis di sini.
              </p>
            </div>
          ) : (
            <div
              className="rounded-2xl border bg-white overflow-hidden"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div
                className="px-4 sm:px-5 py-2.5 border-b flex items-center justify-between gap-2 bg-[#F7F8F5]"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <span
                  className="text-xs font-semibold truncate"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {filteredHistory.length} Aktivitas Terakhir
                </span>
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="min-h-[34px] px-2 text-xs font-semibold text-red-700 hover:underline shrink-0 cursor-pointer"
                >
                  Bersihkan
                </button>
              </div>

              <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {filteredHistory.map((item, idx) => (
                  <div
                    key={`${item.surahNomor}-${item.ayatNomor}-${idx}`}
                    className="p-3.5 sm:px-5 flex items-center justify-between gap-3 hover:bg-[#F7F8F5] transition-colors min-w-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-semibold text-xs sm:text-sm truncate"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        QS. {item.surahNamaLatin} ({item.surahNomor}) · Ayat {item.ayatNomor}
                      </p>
                      <p
                        className="text-[11px] sm:text-xs mt-0.5 truncate"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {item.surahArti} · {formatDateID(item.timestamp)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenSurah(item.surahNomor, item.ayatNomor)}
                      aria-label={`Lanjut baca QS. ${item.surahNamaLatin} Ayat ${item.ayatNomor}`}
                      className="min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold text-white flex items-center gap-1.5 shrink-0 cursor-pointer"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      <span>Buka</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
