"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Loader2, Mic, Send, Volume2, VolumeX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  guessLang,
  speak,
  stopSpeaking,
  useSpeechInput,
} from "@/lib/use-voice";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const LANGS = [
  { code: "auto", label: "Auto" },
  { code: "en-US", label: "English" },
  { code: "es-ES", label: "Español" },
  { code: "fr-FR", label: "Français" },
  { code: "ar-SA", label: "العربية" },
  { code: "hi-IN", label: "हिन्दी" },
  { code: "ml-IN", label: "മലയാളം" },
  { code: "ta-IN", label: "தமிழ்" },
];

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi, I'm Companion. Ask me anything, or tell me to run a job search, pick you a book or film, open a game, or brief you on today's tech news. I speak your language, whichever one that is.",
};

const STORE_KEY = "companion:agent-chat";

/**
 * Persistent AI assistant dock, reachable from every page.
 * Voice input via Web Speech API, optional spoken replies, and app actions
 * (the server can ask us to navigate somewhere after answering).
 */
export function AgentDock() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceOut, setVoiceOut] = useState(false);
  const [lang, setLang] = useState("auto");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sttLang = lang === "auto" ? (typeof navigator !== "undefined" ? navigator.language : "en-US") : lang;
  const { supported: micSupported, listening, start, stop } = useSpeechInput(sttLang);

  // Session persistence
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORE_KEY);
      if (raw) setMessages(JSON.parse(raw) as ChatMessage[]);
    } catch {
      /* fresh session */
    }
  }, []);
  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      /* storage full; fine */
    }
  }, [messages]);

  // Keep scrolled to the newest message
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, open]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    stopSpeaking();
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-16) }),
      });
      const data = (await res.json()) as {
        reply?: string;
        error?: string;
        action?: { type: "navigate"; href: string };
      };
      const reply = data.reply ?? data.error ?? "Something went wrong.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      if (voiceOut && data.reply) {
        speak(data.reply, guessLang(data.reply, sttLang));
      }
      if (data.action?.type === "navigate") {
        setTimeout(() => router.push(data.action!.href), 600);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "I could not reach the server. Try again in a moment." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const toggleMic = () => {
    if (listening) {
      stop();
    } else {
      start((text) => {
        setInput("");
        void send(text);
      });
    }
  };

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        aria-expanded={open}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className={cn(
          "fixed bottom-20 right-4 z-50 flex h-13 w-13 items-center justify-center",
          "rounded-full text-white shadow-lift",
          "bg-[linear-gradient(135deg,var(--accent),var(--accent-2))]",
          "lg:bottom-6 lg:right-6",
          !open && "ring-beacon"
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? "close" : "bot"}
            initial={{ rotate: -60, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 60, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex"
          >
            {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="AI assistant"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="glass fixed bottom-36 right-4 z-50 flex h-[min(34rem,70dvh)] w-[calc(100vw-2rem)]
              max-w-md flex-col overflow-hidden rounded-xl border border-line shadow-lift
              lg:bottom-24 lg:right-6"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-line p-3.5">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white
                  bg-[linear-gradient(135deg,var(--accent),var(--accent-2))]"
              >
                <Bot className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-semibold">Forza Nishin</p>
                <p className="truncate text-xs text-fg-subtle">
                  {listening ? "Listening…" : busy ? "Thinking…" : "Multilingual assistant"}
                </p>
              </div>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                aria-label="Voice language"
                className="h-8 rounded-md border border-line bg-surface px-1.5 text-xs text-fg-muted focus:border-accent focus:outline-none"
              >
                {LANGS.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={voiceOut ? "Turn spoken replies off" : "Turn spoken replies on"}
                aria-pressed={voiceOut}
                onClick={() => {
                  if (voiceOut) stopSpeaking();
                  setVoiceOut((v) => !v);
                }}
              >
                {voiceOut ? <Volume2 className="h-4 w-4 text-accent" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            </div>

            {/* Messages */}
            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-3.5" aria-live="polite">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                      m.role === "user"
                        ? "rounded-br-sm bg-accent text-accent-fg"
                        : "rounded-bl-sm bg-surface-2 text-fg"
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start" aria-label="Assistant is thinking">
                  <div className="flex gap-1.5 rounded-xl rounded-bl-sm bg-surface-2 px-4 py-3">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-fg-subtle"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Composer */}
            <form
              className="flex items-center gap-2 border-t border-line p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              {micSupported && (
                <motion.button
                  type="button"
                  onClick={toggleMic}
                  aria-label={listening ? "Stop listening" : "Speak to the assistant"}
                  aria-pressed={listening}
                  className={cn(
                    "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
                    listening ? "bg-danger-soft text-danger" : "bg-surface-2 text-fg-muted hover:text-fg"
                  )}
                >
                  {listening && (
                    <motion.span
                      className="absolute inset-0 rounded-full border-2 border-danger"
                      animate={{ scale: [1, 1.35], opacity: [0.8, 0] }}
                      transition={{ duration: 1.1, repeat: Infinity }}
                      aria-hidden
                    />
                  )}
                  <Mic className="h-4.5 w-4.5" />
                </motion.button>
              )}
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={listening ? "Listening…" : "Ask or say anything…"}
                aria-label="Message the assistant"
                className="h-10 flex-1 rounded-md border border-line bg-surface px-3 text-sm
                  placeholder:text-fg-subtle focus:border-accent focus:outline-none"
              />
              <Button type="submit" size="icon" aria-label="Send" disabled={busy || !input.trim()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
