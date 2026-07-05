"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const LINES: { words: string[]; gradient?: boolean }[] = [
  { words: ["Work", "sharper."] },
  { words: ["Unwind", "better."], gradient: true },
];

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section
      className="group/hero relative overflow-hidden rounded-xl border border-line bg-surface p-8 shadow-card sm:p-12"
      aria-labelledby="hero-title"
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
      }}
    >
      {/* Layered aurora + blueprint grid backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="aurora-blob -right-24 -top-28 h-80 w-80 bg-[radial-gradient(circle,var(--accent-soft),transparent_60%)]" />
        <div className="aurora-blob -bottom-32 -left-20 h-96 w-96 bg-[radial-gradient(circle,var(--accent-2-soft),transparent_60%)] [animation-delay:-6s]" />
        <div className="aurora-blob right-[30%] top-[55%] h-64 w-64 bg-[radial-gradient(circle,var(--accent-soft),transparent_65%)] [animation-delay:-12s]" />
        <div className="bg-grid-fade absolute inset-0" />
        {/* Cursor-following spotlight */}
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/hero:opacity-100"
          style={{
            background:
              "radial-gradient(320px circle at var(--mx, 50%) var(--my, 50%), color-mix(in oklab, var(--accent) 14%, transparent), transparent 70%)",
          }}
        />
      </div>

      <div className="relative max-w-2xl">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge tone="accent" className="mb-4">
            Your personal AI companion
          </Badge>
        </motion.div>

        <h1
          id="hero-title"
          className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl"
        >
          {LINES.map((line, li) => (
            <span key={li} className="block">
              {line.words.map((word, wi) => (
                <motion.span
                  key={wi}
                  className={`mr-[0.28em] inline-block ${line.gradient ? "gradient-text-animated" : ""}`}
                  initial={reduce ? false : { opacity: 0, y: 26, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{
                    duration: 0.55,
                    delay: 0.15 + (li * line.words.length + wi) * 0.12,
                    ease: [0.21, 0.62, 0.35, 1],
                  }}
                >
                  {word}
                </motion.span>
              ))}
            </span>
          ))}
        </h1>

        <motion.p
          className="mt-4 text-base text-fg-muted sm:text-lg"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.75 }}
        >
          One place for the job hunt and the downtime after it: a CV that beats
          the tracking systems, films worth your evening, puzzles for your
          brain, and a daily read on where AI is heading.
        </motion.p>
      </div>
    </section>
  );
}
