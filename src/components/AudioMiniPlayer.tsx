import React, { useState } from 'react';
import {
  CheckCircle2,
  Mic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  SkipBack,
  SkipForward,
  Volume2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { QARI_OPTIONS } from '../config/brand';
import { AudioPlaybackState, QariKey } from '../types/quran';

interface AudioMiniPlayerProps {
  playback: AudioPlaybackState | null;
  currentTime: number;
  duration: number;
  isLoadingAudio: boolean;
  audioError: string | null;
  autoPlayNext: boolean;
  repeatOneAyat?: boolean;
  playbackSpeed?: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onPrevAyat: () => void;
  onNextAyat: () => void;
  onChangeQari: (qari: QariKey) => void;
  onToggleAutoPlayNext: () => void;
  onToggleRepeatOne?: () => void;
  onCycleSpeed?: () => void;
  onClose: () => void;
  onNavigateToCurrent: () => void;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const AudioMiniPlayer: React.FC<AudioMiniPlayerProps> = ({
  playback,
  currentTime,
  duration,
  isLoadingAudio,
  audioError,
  autoPlayNext,
  repeatOneAyat = false,
  playbackSpeed = 1,
  onTogglePlay,
  onSeek,
  onPrevAyat,
  onNextAyat,
  onChangeQari,
  onToggleAutoPlayNext,
  onToggleRepeatOne,
  onCycleSpeed,
  onClose,
  onNavigateToCurrent,
}) => {
  const [showQariSheet, setShowQariSheet] = useState(false);

  const canPrev = playback?.mode === 'ayat' && (playback.ayatNomor || 1) > 1;
  const canNext =
    playback?.mode === 'ayat' &&
    playback.jumlahAyat !== undefined &&
    (playback.ayatNomor || 1) < playback.jumlahAyat;

  const handleCyclePlayMode = () => {
    // Cycle: Sambung Ayat (autoPlayNext=true, repeatOne=false) -> Ulangi 1 Ayat Tahfidz (repeatOne=true) -> Mati (both false)
    if (repeatOneAyat) {
      onToggleRepeatOne?.();
      if (autoPlayNext) onToggleAutoPlayNext();
    } else if (autoPlayNext) {
      onToggleRepeatOne?.();
    } else {
      onToggleAutoPlayNext();
    }
  };

  const playModeTitle = repeatOneAyat
    ? 'Mode Tahfidz: Ulangi 1 Ayat terus-menerus'
    : autoPlayNext
      ? 'Sambung Ayat Otomatis: Aktif'
      : 'Putar 1 Kali (Berhenti setelah ayat selesai)';

  return (
    <>
      <AnimatePresence>
        {playback && (
          <motion.div
            key="audio-mini-player"
            layout
            initial={{ y: 56, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 56, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-6xl pointer-events-auto"
            role="region"
            aria-label="Pemutar Audio Murottal"
          >
            <div
              className="mobile-landscape-mini-player bg-white/98 backdrop-blur-xl border shadow-[0_10px_32px_rgba(3,83,40,0.15)] px-3.5 sm:px-5 pt-2.5 pb-2.5 sm:py-3 flex flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-x-3.5 sm:gap-y-1.5"
              style={{
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--radius-card)',
              }}
            >
              {/* Subtle Drag Handle Indicator */}
              <div className="mobile-landscape-hide-handle flex justify-center -mt-0.5 pb-0.5 sm:col-span-2">
                <span className="w-9 h-1 rounded-full bg-[#E3E9E3]" />
              </div>

              {/* TOP ROW (Left on Mobile Landscape, Tablet & Desktop): Nama Surat, Posisi Ayat, Nama Qari & Icon-Only Controls */}
              <div className="flex items-center justify-between gap-2 min-w-0 sm:order-1">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: 'var(--color-header)',
                      color: 'var(--color-gold)',
                    }}
                  >
                    <Volume2 className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={onNavigateToCurrent}
                      className="text-left block w-full truncate text-xs sm:text-sm font-bold hover:underline cursor-pointer"
                      style={{ color: 'var(--color-text-primary)' }}
                      title="Buka posisi surat yang sedang diputar"
                    >
                      QS. {playback.surahNamaLatin}{' '}
                      {playback.mode === 'ayat'
                        ? `· Ayat ${playback.ayatNomor}/${playback.jumlahAyat || ''}`
                        : '· Surat Penuh'}
                    </button>

                    <div
                      className="flex items-center gap-1.5 text-[11px] sm:text-xs truncate mt-0.5"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <span className="truncate font-medium">
                        {QARI_OPTIONS[playback.qari].name}
                      </span>
                      {repeatOneAyat && (
                        <span className="text-[#046D38] font-semibold shrink-0">
                          · Tahfidz 1x
                        </span>
                      )}
                      {audioError && (
                        <span className="text-red-600 font-semibold shrink-0">
                          · {audioError}
                        </span>
                      )}
                      {isLoadingAudio && !audioError && (
                        <span className="text-[#046D38] font-semibold shrink-0">
                          · Memuat...
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Speed Toggle + Intuitive Icon-Only Qari Selector Trigger */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {onCycleSpeed && (
                    <button
                      type="button"
                      onClick={onCycleSpeed}
                      aria-label={`Kecepatan putar audio ${playbackSpeed}x`}
                      title="Ubah kecepatan murottal (0.85x / 1x / 1.25x)"
                      className="min-w-[38px] min-h-[38px] px-2 rounded-xl border bg-[#F7F8F5] hover:bg-[#EDF5F0] text-[11px] font-mono-num font-bold flex items-center justify-center transition-colors cursor-pointer"
                      style={{
                        borderColor: 'var(--color-border)',
                        color: playbackSpeed !== 1 ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      }}
                    >
                      {playbackSpeed}x
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowQariSheet(true)}
                    aria-label={`Ubah Qari Murottal (Saat ini: ${QARI_OPTIONS[playback.qari].name})`}
                    title={`Ubah Qari Murottal (${QARI_OPTIONS[playback.qari].name})`}
                    className="min-w-[38px] min-h-[38px] rounded-xl border bg-[#F7F8F5] hover:bg-[#EDF5F0] hover:border-[#046D38]/40 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                    style={{
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-primary)',
                    }}
                  >
                    <Mic className="w-[17px] h-[17px]" />
                  </button>
                </div>
              </div>

              {/* MIDDLE ROW: Progress Scrubber */}
              <div className="flex items-center gap-2.5 min-w-0 sm:col-span-2 sm:order-3">
                <span className="text-[10px] sm:text-[11px] font-mono-num text-[#68756C] w-8 sm:w-9 text-right shrink-0">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration > 0 ? duration : 100}
                  step={0.5}
                  value={duration > 0 ? currentTime : 0}
                  onChange={(e) => onSeek(Number(e.target.value))}
                  aria-label="Posisi waktu murottal"
                  className="w-full min-w-0 h-1.5 rounded-lg appearance-none cursor-pointer accent-[#046D38] bg-[#E3E9E3]"
                />
                <span className="text-[10px] sm:text-[11px] font-mono-num text-[#68756C] w-8 sm:w-9 shrink-0">
                  {formatTime(duration)}
                </span>
              </div>

              {/* BOTTOM ROW (Aligned on Same Single Row on Mobile Landscape, Tablet & Desktop): Ergonomic Controls */}
              <div
                className="pt-1 border-t flex items-center justify-between gap-2 sm:order-2 sm:pt-0 sm:border-t-0 sm:border-l sm:pl-3.5 sm:justify-end sm:gap-2"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {/* Left Control: Auto-Next / Repeat-1-Ayat Tahfidz Mode Toggle */}
                <div className="flex items-center">
                  {playback.mode === 'ayat' ? (
                    <button
                      type="button"
                      onClick={handleCyclePlayMode}
                      aria-label={playModeTitle}
                      title={playModeTitle}
                      className={`min-w-[42px] min-h-[42px] md:min-w-[38px] md:min-h-[38px] rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                        repeatOneAyat
                          ? 'bg-[#FDF6E2] text-[#035328] border border-[#FBC647]'
                          : autoPlayNext
                            ? 'bg-[#EDF5F0] text-[#046D38]'
                            : 'text-[#68756C] hover:bg-[#F7F8F5]'
                      }`}
                    >
                      {repeatOneAyat ? (
                        <Repeat1 className="w-[18px] h-[18px] shrink-0" />
                      ) : (
                        <Repeat className="w-[18px] h-[18px] shrink-0" />
                      )}
                    </button>
                  ) : (
                    <div className="w-[42px] h-[42px] md:hidden" />
                  )}
                </div>

                {/* Center Primary Transport Controls (Prev, Play/Pause, Next) */}
                <div className="flex items-center justify-center gap-3 sm:gap-4 md:gap-2">
                  <button
                    type="button"
                    onClick={onPrevAyat}
                    disabled={playback.mode !== 'ayat' || !canPrev}
                    className="min-w-[42px] min-h-[42px] md:min-w-[38px] md:min-h-[38px] rounded-xl flex items-center justify-center border bg-[#F7F8F5] hover:bg-[#EDF2EE] disabled:opacity-35 transition-colors cursor-pointer"
                    style={{
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                    aria-label="Ayat sebelumnya"
                    title="Ayat sebelumnya"
                  >
                    <SkipBack className="w-[18px] h-[18px]" />
                  </button>

                  <button
                    type="button"
                    onClick={onTogglePlay}
                    className="min-w-[46px] min-h-[46px] md:min-w-[40px] md:min-h-[40px] rounded-2xl md:rounded-xl flex items-center justify-center text-white shadow-sm transition-transform active:scale-95 cursor-pointer"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                    aria-label={playback.isPlaying ? 'Jeda audio' : 'Putar audio'}
                    title={playback.isPlaying ? 'Jeda audio' : 'Putar audio'}
                  >
                    {playback.isPlaying ? (
                      <Pause className="w-5 h-5 md:w-[18px] md:h-[18px] fill-current text-[#FBC647]" />
                    ) : (
                      <Play className="w-5 h-5 md:w-[18px] md:h-[18px] fill-current text-[#FBC647] ml-0.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={onNextAyat}
                    disabled={playback.mode !== 'ayat' || !canNext}
                    className="min-w-[42px] min-h-[42px] md:min-w-[38px] md:min-h-[38px] rounded-xl flex items-center justify-center border bg-[#F7F8F5] hover:bg-[#EDF2EE] disabled:opacity-35 transition-colors cursor-pointer"
                    style={{
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                    aria-label="Ayat selanjutnya"
                    title="Ayat selanjutnya"
                  >
                    <SkipForward className="w-[18px] h-[18px]" />
                  </button>
                </div>

                {/* Right Control: Close Player */}
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowQariSheet(false);
                      onClose();
                    }}
                    className="min-w-[42px] min-h-[42px] md:min-w-[38px] md:min-h-[38px] rounded-xl flex items-center justify-center hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                    style={{ color: 'var(--color-text-secondary)' }}
                    aria-label="Tutup pemutar audio"
                    title="Tutup pemutar audio"
                  >
                    <X className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom-to-Top Pop-up Sheet: Pilih Qari Murottal */}
      <AnimatePresence>
        {showQariSheet && playback && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:px-4 pointer-events-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Pilih Qari Murottal"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24 }}
              onClick={() => setShowQariSheet(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-md max-h-[88dvh] bg-white border-t border-x shadow-2xl flex flex-col overflow-hidden"
              style={{
                borderColor: 'var(--color-border)',
                borderTopLeftRadius: 'var(--radius-card)',
                borderTopRightRadius: 'var(--radius-card)',
                paddingBottom: 'calc(1rem + var(--safe-bottom))',
              }}
            >
              <div
                className="pt-2.5 pb-1 flex justify-center shrink-0"
                style={{ backgroundColor: 'var(--color-header)' }}
              >
                <span className="w-10 h-1 rounded-full bg-white/30" />
              </div>

              <div
                className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 border-b shrink-0"
                style={{
                  backgroundColor: 'var(--color-header)',
                  borderColor: 'rgba(255,255,255,0.12)',
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-gold)' }}
                  >
                    <Mic className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-base sm:text-lg font-bold text-white truncate">
                      Pilih Qari Murottal
                    </h3>
                    <p className="text-[11px] text-white/75 truncate">
                      Suara lantunan Al-Qur&apos;an pilihan
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowQariSheet(false)}
                  className="min-w-[40px] min-h-[40px] -mr-1 rounded-xl flex items-center justify-center text-white/85 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Tutup pilihan qari"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 sm:p-4 space-y-2 max-h-[65dvh] overflow-y-auto">
                {Object.values(QARI_OPTIONS).map((qari) => {
                  const isSelected = playback.qari === qari.id;
                  return (
                    <button
                      key={qari.id}
                      type="button"
                      onClick={() => {
                        onChangeQari(qari.id as QariKey);
                        setShowQariSheet(false);
                      }}
                      className={`w-full p-3 rounded-2xl border flex items-center justify-between gap-3 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#046D38] bg-[#FAFDFB] ring-1 ring-[#046D38]'
                          : 'border-[#E3E9E3] bg-white hover:bg-[#F7F8F5]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-8 h-8 rounded-xl font-mono-num text-xs font-bold flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-[#046D38] text-[#FBC647]'
                              : 'bg-[#F7F8F5] text-[#046D38]'
                          }`}
                        >
                          {qari.id}
                        </span>
                        <div className="min-w-0">
                          <p
                            className="text-xs sm:text-sm font-semibold truncate"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {qari.name}
                          </p>
                          <p
                            className="text-[11px] truncate"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            {qari.style}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-[#046D38] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
