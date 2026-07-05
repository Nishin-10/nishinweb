"use client";

/**
 * Thin wrappers over the browser's Web Speech API.
 * Free, no keys, works offline-ish; Chrome and Edge have the best support.
 */
import { useCallback, useEffect, useRef, useState } from "react";

/* Minimal typings; lib.dom omits the prefixed constructor. */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export function useSpeechInput(lang: string) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef<(text: string) => void>(() => {});

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition)
    );
  }, []);

  const start = useCallback(
    (onFinal: (text: string) => void) => {
      const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
      if (!Ctor) return;
      onFinalRef.current = onFinal;

      const rec = new Ctor();
      rec.lang = lang;
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (event) => {
        const last = event.results[event.results.length - 1];
        const text = last?.[0]?.transcript?.trim();
        if (text) onFinalRef.current(text);
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recRef.current = rec;
      setListening(true);
      rec.start();
    },
    [lang]
  );

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  return { supported, listening, start, stop };
}

/** Guess a BCP-47 language for TTS from the text itself. */
export function guessLang(text: string, fallback: string): string {
  if (/[؀-ۿ]/.test(text)) return "ar-SA";
  if (/[ऀ-ॿ]/.test(text)) return "hi-IN";
  if (/[ഀ-ൿ]/.test(text)) return "ml-IN";
  if (/[஀-௿]/.test(text)) return "ta-IN";
  if (/[¿¡ñ]|(\b(el|la|los|las|una?|que|para|con)\b.*){2,}/i.test(text)) return "es-ES";
  if (/[àâçéèêëîïôùûü]|(\b(le|la|les|des|une?|est|avec|pour)\b.*){2,}/i.test(text)) return "fr-FR";
  return fallback;
}

export function speak(text: string, lang: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  const voice = window.speechSynthesis
    .getVoices()
    .find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  if (voice) utterance.voice = voice;
  utterance.rate = 1.02;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}
