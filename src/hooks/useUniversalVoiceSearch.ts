import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSpeechRecognitionCtor,
  parseVoiceQuranIntent,
  VoiceIntentResult,
} from '../services/microphoneService';
import { SurahSummary } from '../types/quran';

interface UseUniversalVoiceSearchOptions {
  surahs?: SurahSummary[];
  onTranscriptChange?: (text: string) => void;
  onFinalIntent?: (intent: VoiceIntentResult) => void;
  onOpenFallbackModal?: () => void;
  onToast?: (msg: string) => void;
}

export function useUniversalVoiceSearch({
  surahs = [],
  onTranscriptChange,
  onFinalIntent,
  onOpenFallbackModal,
  onToast,
}: UseUniversalVoiceSearchOptions) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const stopListening = useCallback(() => {
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
    setIsListening(false);
  }, []);

  const toggleVoiceSearch = useCallback(
    (lang = 'id-ID') => {
      if (isListening && recognitionRef.current) {
        stopListening();
        onToast?.('Perekaman suara dihentikan.');
        return;
      }

      const SpeechRecognition = getSpeechRecognitionCtor();

      // If browser does not support Web Speech API natively (e.g. Firefox, Opera Mini, WebViews),
      // seamlessly open the Universal Microphone Modal which activates hardware getUserMedia + Web Audio + OS Dictation!
      if (!SpeechRecognition) {
        onOpenFallbackModal?.();
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = lang;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.continuous = false;

        recognition.onstart = () => {
          setIsListening(true);
          onToast?.('Mendengarkan ucapan Anda... Silakan bicara.');
        };

        recognition.onresult = (event: any) => {
          let interimStr = '';
          let finalStr = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const chunk = event.results[i][0]?.transcript || '';
            if (event.results[i].isFinal) {
              finalStr += chunk;
            } else {
              interimStr += chunk;
            }
          }

          const currentText = (finalStr || interimStr).trim();
          if (currentText) {
            onTranscriptChange?.(currentText);
          }

          if (finalStr.trim()) {
            setIsListening(false);
            const intent = parseVoiceQuranIntent(finalStr.trim(), surahs);
            onFinalIntent?.(intent);
          }
        };

        recognition.onerror = (evt: any) => {
          setIsListening(false);
          const errCode = String(evt?.error || '');

          if (errCode === 'language-not-supported' && lang === 'id-ID') {
            recognitionRef.current = null;
            toggleVoiceSearch('en-US');
            return;
          }

          // If browser blocks cloud STT (Brave, Linux Chromium, Android WebView, Offline) or permission needs interactive helper,
          // automatically open the Universal Microphone Modal
          if (
            errCode === 'service-not-allowed' ||
            errCode === 'network' ||
            errCode === 'not-allowed' ||
            errCode === 'audio-capture'
          ) {
            onOpenFallbackModal?.();
            return;
          }

          if (errCode === 'no-speech') {
            onToast?.('Suara belum terdeteksi. Ketuk ikon Mikrofon untuk mencoba lagi.');
            return;
          }

          onOpenFallbackModal?.();
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        // Must be called synchronously in user click event
        recognition.start();
      } catch {
        setIsListening(false);
        onOpenFallbackModal?.();
      }
    },
    [isListening, onFinalIntent, onOpenFallbackModal, onToast, onTranscriptChange, stopListening, surahs]
  );

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    toggleVoiceSearch,
    stopListening,
  };
}
