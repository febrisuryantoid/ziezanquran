import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Download,
  Keyboard,
  Mic,
  MicOff,
  Pause,
  Play,
  Search,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import {
  detectMicrophoneCapabilities,
  encodeWavFromPcm,
  getSpeechRecognitionCtor,
  parseVoiceQuranIntent,
  requestUniversalMicrophoneStream,
  VoiceIntentResult,
} from '../services/microphoneService';
import { ActiveTab, SurahSummary } from '../types/quran';

export interface MicrophoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  surahs: SurahSummary[];
  contextLabel?: string;
  initialMode?: 'VOICE_SEARCH' | 'VOICE_RECORDER';
  onApplyQuery: (query: string) => void;
  onOpenSurah: (surahNomor: number, ayatNomor?: number) => void;
  onSelectTab: (tab: ActiveTab) => void;
  onPauseBackgroundAudio?: () => void;
  onShowToast?: (msg: string) => void;
}

type MicTabMode = 'VOICE_SEARCH' | 'VOICE_RECORDER';
type SpeechLangOption = 'id-ID' | 'ar-SA' | 'en-US';

interface RecordedClip {
  id: string;
  url: string;
  blob: Blob;
  durationSec: number;
  createdAt: string;
  mimeType: string;
}

const VOICE_PRESET_COMMANDS = [
  { label: 'Surat Yasin', transcript: 'Buka Surat Yasin' },
  { label: 'Ayat Kursi (2:255)', transcript: 'Buka Ayat Kursi' },
  { label: 'Surat Al-Kahf', transcript: 'Buka Surat Al-Kahf' },
  { label: 'Surat Al-Mulk', transcript: 'Buka Surat Al-Mulk' },
  { label: 'Surat Ar-Rahman', transcript: 'Buka Surat Ar-Rahman' },
  { label: "Surat Al-Waqi'ah", transcript: 'Buka Surat Al-Waqiah' },
  { label: "Juz 30 (Juz 'Amma)", transcript: 'Buka Juz Amma' },
  { label: 'Ayat tentang Sabar', transcript: 'Sabar' },
  { label: 'Ayat tentang Rezeki', transcript: 'Rezeki' },
  { label: 'Jadwal Salat', transcript: 'Buka Jadwal Salat' },
  { label: 'Arah Kiblat', transcript: 'Buka Arah Kiblat' },
];

export const MicrophoneModal: React.FC<MicrophoneModalProps> = ({
  isOpen,
  onClose,
  surahs,
  contextLabel = 'Pencarian Suara & Mikrofon Universal',
  initialMode = 'VOICE_SEARCH',
  onApplyQuery,
  onOpenSurah,
  onSelectTab,
  onPauseBackgroundAudio,
  onShowToast,
}) => {
  const capabilities = useMemo(() => detectMicrophoneCapabilities(), []);

  const [activeMode, setActiveMode] = useState<MicTabMode>(initialMode);
  const [speechLang, setSpeechLang] = useState<SpeechLangOption>('id-ID');

  // Voice Search & Recognition State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>(
    'Ketuk tombol Mikrofon untuk mulai berbicara atau mendikte kata kunci.'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [usingHardwareFallback, setUsingHardwareFallback] = useState<boolean>(false);

  // Live Audio Level & 16-Bar Frequency Spectrum
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [freqBars, setFreqBars] = useState<number[]>(() => Array(16).fill(8));

  // Universal Voice Recorder State (Tilawah / Hafalan / Mic Test)
  const [isRecordingClip, setIsRecordingClip] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordedClips, setRecordedClips] = useState<RecordedClip[]>([]);
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);

  // Refs for clean hardware resource management
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const clipAudioRef = useRef<HTMLAudioElement | null>(null);
  const dictationInputRef = useRef<HTMLInputElement | null>(null);

  // Parse current transcript into actionable Quran/Islamic intent
  const activeText = (transcript || interimTranscript).trim();
  const parsedIntent: VoiceIntentResult = useMemo(
    () => parseVoiceQuranIntent(activeText, surahs),
    [activeText, surahs]
  );

  // Stop all hardware streams, analysers, and timers cleanly
  const stopHardwareAudio = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch {
        // Ignore
      }
      scriptProcessorRef.current = null;
    }
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {
        // Ignore
      }
      analyserRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        void audioCtxRef.current.close();
      } catch {
        // Ignore
      }
      audioCtxRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {
        // Ignore
      }
      mediaStreamRef.current = null;
    }
    setAudioLevel(0);
    setFreqBars(Array(16).fill(8));
  }, []);

  const stopAllMicrophoneActivity = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore
      }
    }
    stopHardwareAudio();
    setIsListening(false);
    setIsRecordingClip(false);
  }, [stopHardwareAudio]);

  // Attach real-time 60fps Web Audio Analyser to a MediaStream
  const startAudioVisualizer = useCallback(
    (stream: MediaStream, capturePcm = false) => {
      try {
        const AudioContextCtor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioContextCtor) return;

        const ctx = new AudioContextCtor();
        audioCtxRef.current = ctx;
        if (ctx.state === 'suspended') {
          void ctx.resume();
        }

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);
        analyserRef.current = analyser;

        if (capturePcm) {
          pcmChunksRef.current = [];
          const processor = ctx.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            pcmChunksRef.current.push(new Float32Array(inputData));
          };
          source.connect(processor);
          processor.connect(ctx.destination);
          scriptProcessorRef.current = processor;
        }

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateMeter = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          let sum = 0;
          const nextBars: number[] = [];
          for (let i = 0; i < 16; i++) {
            const val = dataArray[i % bufferLength] || 0;
            sum += val;
            nextBars.push(Math.max(8, Math.min(100, Math.round((val / 255) * 100))));
          }
          const avg = Math.min(100, Math.round((sum / (16 * 255)) * 140));
          setAudioLevel(avg);
          setFreqBars(nextBars);

          animFrameRef.current = requestAnimationFrame(updateMeter);
        };

        animFrameRef.current = requestAnimationFrame(updateMeter);
      } catch {
        // Ignore visualizer errors on restricted WebViews
      }
    },
    []
  );

  // Fallback to Hardware getUserMedia + Universal Dictation Input when Web Speech API is unavailable/blocked
  const activateUniversalHardwareFallback = useCallback(
    async (reasonMsg?: string) => {
      try {
        const stream = await requestUniversalMicrophoneStream();
        mediaStreamRef.current = stream;
        setPermissionDenied(false);
        setErrorMessage(null);
        setUsingHardwareFallback(true);
        setIsListening(true);
        startAudioVisualizer(stream, false);

        setStatusMessage(
          reasonMsg ||
            'Mikrofon perangkat aktif! Silakan gunakan tombol dikte mikrofon pada keyboard perangkat Anda atau ketik/pilih perintah suara di bawah.'
        );

        setTimeout(() => {
          dictationInputRef.current?.focus();
        }, 120);
      } catch (err: unknown) {
        setIsListening(false);
        const errName =
          err && typeof err === 'object' && 'name' in err
            ? String((err as { name?: string }).name)
            : '';
        if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
          setPermissionDenied(true);
          setErrorMessage(
            'Izin akses mikrofon ditolak oleh browser/perangkat. Ikuti panduan di bawah untuk mengizinkan mikrofon.'
          );
        } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
          setErrorMessage(
            'Perangkat mikrofon tidak ditemukan. Pastikan mikrofon atau headset terhubung.'
          );
        } else {
          setErrorMessage(
            'Gagal mengakses perangkat mikrofon. Anda tetap dapat menggunakan kolom input atau tombol cepat di bawah.'
          );
        }
      }
    },
    [startAudioVisualizer]
  );

  // Start Voice Search (Speak-to-Text with synchronous gesture activation + universal hardware fallback)
  const handleStartVoiceSearch = useCallback(
    (langOverride?: SpeechLangOption) => {
      onPauseBackgroundAudio?.();

      if (isListening) {
        stopAllMicrophoneActivity();
        setStatusMessage('Perekaman suara dihentikan.');
        return;
      }

      setErrorMessage(null);
      setPermissionDenied(false);
      setInterimTranscript('');

      const targetLang = langOverride || speechLang;
      const SpeechRecognition = getSpeechRecognitionCtor();

      // If browser does not implement SpeechRecognition (e.g. Firefox, some WebViews),
      // immediately engage Universal Hardware Microphone + OS Dictation Mode
      if (!SpeechRecognition) {
        void activateUniversalHardwareFallback(
          `Mikrofon aktif pada ${capabilities.browserName} (${capabilities.osName}). Gunakan ikon mikrofon di keyboard Anda atau pilih perintah cepat.`
        );
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = targetLang;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.continuous = false;

        // On Desktop browsers, we can also run the Web Audio visualizer in parallel
        if (!capabilities.isMobile && capabilities.hasGetUserMedia) {
          requestUniversalMicrophoneStream()
            .then((stream) => {
              if (recognitionRef.current === recognition) {
                mediaStreamRef.current = stream;
                startAudioVisualizer(stream, false);
              } else {
                stream.getTracks().forEach((t) => t.stop());
              }
            })
            .catch(() => {
              // Ignore parallel visualizer stream error
            });
        }

        recognition.onstart = () => {
          setIsListening(true);
          setUsingHardwareFallback(false);
          setStatusMessage(
            'Mendengarkan suara Anda... Ucapkan nama surat (misal: "Surat Yasin"), ayat ("2:255"), atau kata kunci.'
          );
        };

        recognition.onresult = (event: any) => {
          let interim = '';
          let finalStr = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const textChunk = event.results[i][0]?.transcript || '';
            if (event.results[i].isFinal) {
              finalStr += textChunk;
            } else {
              interim += textChunk;
            }
          }

          if (interim) {
            setInterimTranscript(interim.trim());
            // Simulate dynamic meter feedback on mobile where single-stream is used
            if (capabilities.isMobile) {
              setAudioLevel(55 + Math.floor(Math.random() * 35));
              setFreqBars(
                Array.from({ length: 16 }, () => 20 + Math.floor(Math.random() * 75))
              );
            }
          }

          if (finalStr.trim()) {
            const cleanFinal = finalStr.trim();
            setTranscript(cleanFinal);
            setInterimTranscript('');
            setStatusMessage(`Suara berhasil dikenali: "${cleanFinal}"`);
          }
        };

        recognition.onerror = (evt: any) => {
          const errCode = String(evt?.error || '');

          if (errCode === 'language-not-supported' && targetLang === 'id-ID') {
            // Automatic fallback to generic 'id' or 'en-US'
            try {
              recognition.stop();
            } catch {
              // Ignore
            }
            recognitionRef.current = null;
            handleStartVoiceSearch('en-US');
            return;
          }

          if (errCode === 'not-allowed') {
            stopAllMicrophoneActivity();
            setPermissionDenied(true);
            setErrorMessage(
              'Izin mikrofon belum diberikan. Klik ikon gembok/pengaturan di bilah alamat browser untuk mengizinkan Mikrofon.'
            );
            return;
          }

          // For 'service-not-allowed' or 'network' (common on Brave, Linux Chromium, Android WebView, or Offline),
          // seamlessly switch to Universal Hardware Microphone + OS Keyboard Dictation fallback!
          if (
            errCode === 'service-not-allowed' ||
            errCode === 'network' ||
            errCode === 'audio-capture'
          ) {
            recognitionRef.current = null;
            void activateUniversalHardwareFallback(
              'Mikrofon perangkat terhubung! layanan STT awan sedang offline/dibatasi browser — gunakan dikte mikrofon keyboard atau ketik langsung di bawah.'
            );
            return;
          }

          if (errCode === 'no-speech') {
            stopAllMicrophoneActivity();
            setStatusMessage(
              'Belum ada suara yang terdengar. Ketuk tombol Mikrofon untuk mencoba lagi.'
            );
            return;
          }

          stopAllMicrophoneActivity();
          setStatusMessage('Silakan coba ucapkan kembali atau ketik kata kunci di bawah.');
        };

        recognition.onend = () => {
          if (!usingHardwareFallback) {
            stopHardwareAudio();
            setIsListening(false);
          }
        };

        // CRITICAL: Must be called synchronously inside user click handler for iOS Safari & Android Chrome
        recognition.start();
      } catch {
        // Fallback to universal hardware microphone if start() throws synchronously
        void activateUniversalHardwareFallback();
      }
    },
    [
      activateUniversalHardwareFallback,
      capabilities.browserName,
      capabilities.hasGetUserMedia,
      capabilities.isMobile,
      capabilities.osName,
      isListening,
      onPauseBackgroundAudio,
      speechLang,
      startAudioVisualizer,
      stopAllMicrophoneActivity,
      stopHardwareAudio,
      usingHardwareFallback,
    ]
  );

  // Execute parsed intent (open Surah/Ayat, switch tab, or run search query)
  const handleExecuteIntent = useCallback(
    (intentToRun: VoiceIntentResult) => {
      stopAllMicrophoneActivity();

      if (intentToRun.matchedSurah) {
        onOpenSurah(
          intentToRun.matchedSurah.surahNomor,
          intentToRun.matchedSurah.ayatNomor || 1
        );
        onShowToast?.(intentToRun.summaryLabel);
        onClose();
        return;
      }

      if (intentToRun.matchedTab && intentToRun.matchedTab !== 'reader') {
        if (intentToRun.matchedTab === 'doa' && intentToRun.doaQuery) {
          onApplyQuery(intentToRun.doaQuery);
        }
        onSelectTab(intentToRun.matchedTab);
        onShowToast?.(intentToRun.summaryLabel);
        onClose();
        return;
      }

      if (intentToRun.cleanedQuery) {
        onApplyQuery(intentToRun.cleanedQuery);
        onClose();
      }
    },
    [
      onApplyQuery,
      onClose,
      onOpenSurah,
      onSelectTab,
      onShowToast,
      stopAllMicrophoneActivity,
    ]
  );

  // Start / Stop Universal Voice Recording (Tab 2: Works on 100% of browsers & offline)
  const handleToggleVoiceRecorder = useCallback(async () => {
    onPauseBackgroundAudio?.();

    if (isRecordingClip) {
      // Stop recording
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore
        }
      } else if (pcmChunksRef.current.length > 0 && audioCtxRef.current) {
        // Fallback WAV encoder when MediaRecorder is not used
        const sampleRate = audioCtxRef.current.sampleRate || 44100;
        const totalLength = pcmChunksRef.current.reduce((acc, c) => acc + c.length, 0);
        const merged = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of pcmChunksRef.current) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }
        const wavBlob = encodeWavFromPcm(merged, sampleRate);
        const url = URL.createObjectURL(wavBlob);
        setRecordedClips((prev) => [
          {
            id: `clip-${Date.now()}`,
            url,
            blob: wavBlob,
            durationSec: Math.max(1, recordingSeconds),
            createdAt: new Date().toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            mimeType: 'audio/wav',
          },
          ...prev,
        ]);
        stopHardwareAudio();
        setIsRecordingClip(false);
      } else {
        stopHardwareAudio();
        setIsRecordingClip(false);
      }
      return;
    }

    // Start new recording
    setErrorMessage(null);
    setPermissionDenied(false);
    setRecordingSeconds(0);

    try {
      const stream = await requestUniversalMicrophoneStream();
      mediaStreamRef.current = stream;

      const useMediaRecorder =
        capabilities.hasMediaRecorder && typeof MediaRecorder !== 'undefined';

      startAudioVisualizer(stream, !useMediaRecorder);
      setIsRecordingClip(true);

      const startedAt = Date.now();
      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(Math.floor((Date.now() - startedAt) / 1000));
      }, 500);

      if (useMediaRecorder) {
        recordedChunksRef.current = [];
        const options = capabilities.preferredMimeType
          ? { mimeType: capabilities.preferredMimeType }
          : undefined;
        const recorder = options
          ? new MediaRecorder(stream, options)
          : new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          const finalMime =
            recorder.mimeType || capabilities.preferredMimeType || 'audio/webm';
          const blob = new Blob(recordedChunksRef.current, { type: finalMime });
          const url = URL.createObjectURL(blob);
          const dur = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
          setRecordedClips((prev) => [
            {
              id: `clip-${Date.now()}`,
              url,
              blob,
              durationSec: dur,
              createdAt: new Date().toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              }),
              mimeType: finalMime,
            },
            ...prev,
          ]);
          stopHardwareAudio();
          setIsRecordingClip(false);
          onShowToast?.('Rekaman suara berhasil disimpan.');
        };

        recorder.start(250);
      }
    } catch (err: unknown) {
      setIsRecordingClip(false);
      stopHardwareAudio();
      const errName =
        err && typeof err === 'object' && 'name' in err
          ? String((err as { name?: string }).name)
          : '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setErrorMessage(
          'Izin akses mikrofon ditolak oleh browser/perangkat. Ikuti panduan di bawah untuk mengaktifkan mikrofon.'
        );
      } else {
        setErrorMessage(
          'Gagal mengakses mikrofon perangkat. Pastikan mikrofon terhubung dan tidak sedang digunakan aplikasi lain.'
        );
      }
    }
  }, [
    capabilities.hasMediaRecorder,
    capabilities.preferredMimeType,
    isRecordingClip,
    onPauseBackgroundAudio,
    onShowToast,
    recordingSeconds,
    startAudioVisualizer,
    stopHardwareAudio,
  ]);

  const handlePlayClip = (clip: RecordedClip) => {
    let audio = clipAudioRef.current;
    if (!audio) {
      audio = new Audio();
      clipAudioRef.current = audio;
    }

    if (playingClipId === clip.id && !audio.paused) {
      audio.pause();
      setPlayingClipId(null);
      return;
    }

    audio.src = clip.url;
    audio.onended = () => setPlayingClipId(null);
    audio.onerror = () => setPlayingClipId(null);
    setPlayingClipId(clip.id);
    audio.play().catch(() => setPlayingClipId(null));
  };

  const handleDeleteClip = (clipId: string) => {
    setRecordedClips((prev) => {
      const target = prev.find((c) => c.id === clipId);
      if (target) {
        URL.revokeObjectURL(target.url);
      }
      return prev.filter((c) => c.id !== clipId);
    });
    if (playingClipId === clipId) {
      clipAudioRef.current?.pause();
      setPlayingClipId(null);
    }
  };

  // Cleanup when modal closes or unmounts
  useEffect(() => {
    if (!isOpen) {
      stopAllMicrophoneActivity();
      clipAudioRef.current?.pause();
      setPlayingClipId(null);
    }
  }, [isOpen, stopAllMicrophoneActivity]);

  useEffect(() => {
    setActiveMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    return () => {
      stopAllMicrophoneActivity();
      clipAudioRef.current?.pause();
    };
  }, [stopAllMicrophoneActivity]);

  if (!isOpen) return null;

  const formatSec = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="universal-mic-modal-title"
    >
      <div
        className="fixed inset-0"
        onClick={() => {
          stopAllMicrophoneActivity();
          onClose();
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#E3E9E3] max-h-[92dvh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-[#E3E9E3] bg-[#F7F8F5] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                isListening || isRecordingClip
                  ? 'bg-[#E53935] text-white animate-pulse'
                  : 'bg-[#046D38] text-[#FBC647]'
              }`}
            >
              <Mic className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="universal-mic-modal-title"
                className="font-display text-lg sm:text-xl font-bold text-[#14261C] truncate"
              >
                Fitur Microphone Universal
              </h2>
              <p className="text-xs text-[#68756C] truncate">
                {contextLabel}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopAllMicrophoneActivity();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-white hover:bg-stone-200 border border-[#E3E9E3] flex items-center justify-center text-[#14261C] shrink-0 cursor-pointer"
            aria-label="Tutup panel mikrofon"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="px-4 sm:px-6 pt-3.5 shrink-0">
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#F0F3EE] border border-[#E3E9E3]">
            <button
              type="button"
              onClick={() => {
                stopAllMicrophoneActivity();
                setActiveMode('VOICE_SEARCH');
              }}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeMode === 'VOICE_SEARCH'
                  ? 'bg-[#046D38] text-white shadow-xs'
                  : 'text-[#68756C] hover:text-[#14261C]'
              }`}
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span>Pencarian &amp; Perintah Suara</span>
            </button>
            <button
              type="button"
              onClick={() => {
                stopAllMicrophoneActivity();
                setActiveMode('VOICE_RECORDER');
              }}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeMode === 'VOICE_RECORDER'
                  ? 'bg-[#046D38] text-white shadow-xs'
                  : 'text-[#68756C] hover:text-[#14261C]'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5 shrink-0" />
              <span>Rekam Tilawah &amp; Uji Mic</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Error / Permission Helper Banner */}
          {errorMessage && (
            <div className="rounded-2xl border border-red-200 bg-red-50/90 p-3.5 sm:p-4 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs text-red-900">
                  <p className="font-bold">{errorMessage}</p>
                  {permissionDenied && (
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-red-800">
                      <li>
                        <strong>Android / Desktop (Chrome, Edge, Brave, Firefox):</strong> Ketuk ikon{' '}
                        <strong>Gembok / Pengaturan Situs</strong> di sebelah kiri alamat URL{' '}
                        <code className="font-mono">quran.ziezan.id</code>, lalu ubah{' '}
                        <strong>Mikrofon</strong> menjadi <strong>Izinkan (Allow)</strong>.
                      </li>
                      <li>
                        <strong>iPhone / iPad (Safari / iOS):</strong> Buka menu{' '}
                        <strong>AA / Pengaturan Situs Web</strong> di bilah alamat Safari &rarr;{' '}
                        <strong>Mikrofon: Izinkan</strong>.
                      </li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeMode === 'VOICE_SEARCH' ? (
            /* TAB 1: PENCARIAN & PERINTAH SUARA */
            <div className="space-y-4">
              {/* Language Selector & Active Status */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#035328] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FBC647]" />
                  <span>Bahasa Ucapan:</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'id-ID' as SpeechLangOption, label: 'Indonesia (ID)' },
                    { id: 'ar-SA' as SpeechLangOption, label: 'Arab (AR)' },
                    { id: 'en-US' as SpeechLangOption, label: 'English (EN)' },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setSpeechLang(lang.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                        speechLang === lang.id
                          ? 'bg-[#046D38] text-white border-[#046D38]'
                          : 'bg-[#F7F8F5] text-[#24352B] border-[#E3E9E3] hover:border-[#046D38]'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Microphone Visualizer Centerpiece */}
              <div className="rounded-2xl border border-[#E3E9E3] bg-[#F7F8F5] p-4 sm:p-5 text-center space-y-3.5">
                <div className="flex flex-col items-center justify-center">
                  <button
                    type="button"
                    onClick={() => handleStartVoiceSearch()}
                    aria-label={
                      isListening ? 'Hentikan mendengarkan suara' : 'Mulai bicara dengan mikrofon'
                    }
                    className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all transform active:scale-95 cursor-pointer shadow-lg ${
                      isListening
                        ? 'bg-[#E53935] text-white ring-8 ring-[#E53935]/25'
                        : 'bg-[#046D38] hover:bg-[#035328] text-white ring-4 ring-[#046D38]/15'
                    }`}
                  >
                    {isListening ? (
                      <MicOff className="w-8 h-8 text-white" />
                    ) : (
                      <Mic className="w-8 h-8 text-[#FBC647]" />
                    )}
                  </button>

                  <p className="mt-3 text-xs sm:text-sm font-bold text-[#14261C]">
                    {isListening ? 'Sedang Mendengarkan... (Ketuk untuk Berhenti)' : 'Ketuk Ikon Mikrofon untuk Mulai Bicara'}
                  </p>
                  <p className="text-[11px] sm:text-xs text-[#68756C] mt-0.5 max-w-md">
                    {statusMessage}
                  </p>
                </div>

                {/* Live 16-Bar Audio Spectrum Visualizer */}
                <div
                  className="h-10 flex items-end justify-center gap-1 px-4"
                  aria-hidden="true"
                >
                  {freqBars.map((heightPct, idx) => (
                    <span
                      key={idx}
                      className={`w-1.5 sm:w-2 rounded-full transition-all duration-75 ${
                        isListening ? 'bg-[#046D38]' : 'bg-[#CBD5CE]'
                      }`}
                      style={{
                        height: `${isListening ? Math.max(14, heightPct) : 16}%`,
                      }}
                    />
                  ))}
                </div>

                {/* Universal Voice Dictation & Editable Transcript Input (Works on 100% of Browsers & OS Keyboards) */}
                <div className="pt-1 text-left space-y-1.5">
                  <label
                    htmlFor="universal-voice-input"
                    className="text-[11px] font-bold text-[#035328] flex items-center justify-between"
                  >
                    <span>Hasil Suara / Input Dikte Universal:</span>
                    <span className="text-[10px] font-normal text-[#68756C] flex items-center gap-1">
                      <Keyboard className="w-3 h-3" />
                      <span>Mendukung Dikte Suara Keyboard OS</span>
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                      <input
                        ref={dictationInputRef}
                        id="universal-voice-input"
                        type="search"
                        inputMode="search"
                        lang="id"
                        value={transcript || interimTranscript}
                        onChange={(e) => {
                          setTranscript(e.target.value);
                          setInterimTranscript('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && parsedIntent.cleanedQuery) {
                            e.preventDefault();
                            handleExecuteIntent(parsedIntent);
                          }
                        }}
                        placeholder='Ucapkan atau dikte: "Surat Yasin", "Ayat Kursi", "2:255", "Sabar"...'
                        className="w-full min-h-[42px] pl-3.5 pr-9 py-2 rounded-xl border border-[#CBD5CE] bg-white text-xs sm:text-sm text-[#14261C] placeholder:text-[#68756C] focus:border-[#046D38] focus:outline-none"
                      />
                      {(transcript || interimTranscript) && (
                        <button
                          type="button"
                          onClick={() => {
                            setTranscript('');
                            setInterimTranscript('');
                          }}
                          className="w-7 h-7 rounded-full flex items-center justify-center absolute right-1.5 top-1/2 -translate-y-1/2 text-[#68756C] hover:bg-stone-100 cursor-pointer"
                          aria-label="Bersihkan teks suara"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={!activeText}
                      onClick={() => handleExecuteIntent(parsedIntent)}
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-[#046D38] hover:bg-[#035328] disabled:opacity-45 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                    >
                      <span>Jalankan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Smart Intent Preview Card when voice/text is detected */}
                {activeText && (
                  <div className="rounded-xl bg-white border border-[#046D38]/30 p-3 flex flex-wrap items-center justify-between gap-2 text-left shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-[#EDF5F0] text-[#046D38] flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-[#68756C]">
                          Deteksi Perintah Pintar:
                        </p>
                        <p className="text-xs sm:text-sm font-bold text-[#035328] truncate">
                          {parsedIntent.summaryLabel}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleExecuteIntent(parsedIntent)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#FBC647] hover:bg-[#f5bc33] text-[#14261C] text-xs font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <span>Buka Sekarang</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Voice Command Presets */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-[#14261C]">
                  Contoh Perintah Suara (Atau Ketuk Langsung):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {VOICE_PRESET_COMMANDS.map((cmd) => (
                    <button
                      key={cmd.label}
                      type="button"
                      onClick={() => {
                        setTranscript(cmd.transcript);
                        const intent = parseVoiceQuranIntent(cmd.transcript, surahs);
                        handleExecuteIntent(intent);
                      }}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#F7F8F5] hover:bg-[#EDF5F0] text-[#24352B] hover:text-[#046D38] border border-[#E3E9E3] hover:border-[#046D38] transition-colors cursor-pointer"
                    >
                      &ldquo;{cmd.label}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: REKAM TILAWAH & UJI MIKROFON (100% ALL BROWSERS & OFFLINE) */
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#E3E9E3] bg-[#F7F8F5] p-4 sm:p-5 text-center space-y-3.5">
                <div className="flex flex-col items-center justify-center">
                  <button
                    type="button"
                    onClick={handleToggleVoiceRecorder}
                    aria-label={
                      isRecordingClip ? 'Hentikan rekaman tilawah' : 'Mulai rekam suara tilawah'
                    }
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all transform active:scale-95 cursor-pointer shadow-lg ${
                      isRecordingClip
                        ? 'bg-[#E53935] text-white ring-8 ring-[#E53935]/25 animate-pulse'
                        : 'bg-[#046D38] hover:bg-[#035328] text-white ring-4 ring-[#046D38]/15'
                    }`}
                  >
                    {isRecordingClip ? (
                      <Square className="w-7 h-7 fill-current text-white" />
                    ) : (
                      <Mic className="w-8 h-8 text-[#FBC647]" />
                    )}
                  </button>

                  <div className="mt-3">
                    {isRecordingClip ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-mono-num font-bold">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                        <span>Merekam Suara · {formatSec(recordingSeconds)}</span>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm font-bold text-[#14261C]">
                        Ketuk untuk Merekam Tilawah / Menguji Suara Mikrofon
                      </p>
                    )}
                    <p className="text-[11px] sm:text-xs text-[#68756C] mt-1 max-w-md mx-auto">
                      Berfungsi di seluruh perangkat, OS &amp; browser (termasuk Firefox, Brave, Safari iOS, Chrome, Edge &amp; Mode Offline) untuk evaluasi bacaan atau tes mikrofon.
                    </p>
                  </div>
                </div>

                {/* Live 16-Bar Frequency Meter */}
                <div className="h-10 flex items-end justify-center gap-1 px-4" aria-hidden="true">
                  {freqBars.map((heightPct, idx) => (
                    <span
                      key={idx}
                      className={`w-1.5 sm:w-2 rounded-full transition-all duration-75 ${
                        isRecordingClip ? 'bg-[#E53935]' : 'bg-[#CBD5CE]'
                      }`}
                      style={{
                        height: `${isRecordingClip ? Math.max(14, heightPct) : 16}%`,
                      }}
                    />
                  ))}
                </div>

                {isRecordingClip && (
                  <p className="text-[11px] font-mono-num text-[#035328] font-semibold">
                    Level Sinyal Mikrofon: {audioLevel}%
                  </p>
                )}
              </div>

              {/* Recorded Clips List */}
              {recordedClips.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-[#14261C]">
                    Hasil Rekaman Suara Anda ({recordedClips.length}):
                  </h3>
                  <div className="space-y-2">
                    {recordedClips.map((clip, index) => {
                      const isPlaying = playingClipId === clip.id;
                      const ext = clip.mimeType.includes('wav')
                        ? 'wav'
                        : clip.mimeType.includes('mp4')
                          ? 'm4a'
                          : 'webm';
                      return (
                        <div
                          key={clip.id}
                          className="rounded-xl border border-[#E3E9E3] bg-white p-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => handlePlayClip(clip)}
                              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer ${
                                isPlaying
                                  ? 'bg-[#046D38] text-[#FBC647]'
                                  : 'bg-[#EDF5F0] text-[#046D38] hover:bg-[#046D38] hover:text-white'
                              }`}
                              aria-label={isPlaying ? 'Jeda rekaman' : 'Putar rekaman'}
                            >
                              {isPlaying ? (
                                <Pause className="w-4 h-4 fill-current" />
                              ) : (
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              )}
                            </button>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#14261C] truncate">
                                Rekaman Tilawah #{recordedClips.length - index}
                              </p>
                              <p className="text-[11px] text-[#68756C] font-mono-num">
                                Durasi {formatSec(clip.durationSec)} · Pukul {clip.createdAt}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={clip.url}
                              download={`tilawah-ziezan-quran-${clip.id}.${ext}`}
                              className="w-8 h-8 rounded-lg bg-[#F7F8F5] hover:bg-[#EDF5F0] text-[#046D38] flex items-center justify-center"
                              title="Unduh rekaman audio"
                              aria-label="Unduh rekaman audio"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteClip(clip.id)}
                              className="w-8 h-8 rounded-lg bg-[#F7F8F5] hover:bg-red-50 text-red-600 flex items-center justify-center cursor-pointer"
                              title="Hapus rekaman"
                              aria-label="Hapus rekaman"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
