"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import {
  ArrowDown, Briefcase, Compass, Gamepad2, Newspaper, Trophy, Wrench,
} from "lucide-react";

const ORBIT_ICONS = [Briefcase, Compass, Gamepad2, Trophy, Newspaper, Wrench];

const META = [
  { label: "Modules", value: "6" },
  { label: "Games", value: "9" },
  { label: "Languages", value: "10+" },
  { label: "Engine", value: "Claude" },
];

const LINES: { words: string[]; gradient?: boolean }[] = [
  { words: ["Work", "sharper."] },
  { words: ["Unwind", "better."], gradient: true },
];

export function Hero() {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const orbX = useSpring(useTransform(mx, [0, 1], [-24, 24]), { stiffness: 60, damping: 20 });
  const orbY = useSpring(useTransform(my, [0, 1], [-16, 16]), { stiffness: 60, damping: 20 });

  return (
    <section
      aria-labelledby="hero-title"
      className="relative -mx-4 min-h-[calc(100dvh-8rem)] overflow-hidden px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:-mt-10 lg:min-h-[calc(100dvh-4rem)] lg:px-10 lg:pt-10"
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - rect.left) / rect.width);
        my.set((e.clientY - rect.top) / rect.height);
      }}
    >
      {/* Backdrop: grid + soft aurora */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="bg-grid-fade absolute inset-0" />
        <div className="aurora-blob -right-32 top-1/4 h-[32rem] w-[32rem] bg-[radial-gradient(circle,var(--accent-2-soft),transparent_62%)] [animation-delay:-8s]" />
        <div className="aurora-blob -left-24 bottom-0 h-[26rem] w-[26rem] bg-[radial-gradient(circle,var(--accent-soft),transparent_62%)]" />
      </div>

      {/* The Companion core: a breathing gradient orb, Gemini-style */}
      <motion.div
        aria-hidden
        style={reduce ? undefined : { x: orbX, y: orbY }}
        className="pointer-events-none absolute right-[4%] top-1/2 hidden -translate-y-1/2 md:block lg:right-[8%]"
      >
        <motion.div
          animate={reduce ? {} : { scale: [1, 1.045, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="relative flex h-[22rem] w-[22rem] items-center justify-center rounded-full
            bg-[radial-gradient(circle_at_35%_30%,color-mix(in_oklab,var(--accent)_28%,var(--surface)),color-mix(in_oklab,var(--accent-2)_18%,var(--surface))_55%,var(--surface)_100%)]
            shadow-[0_0_120px_-20px_var(--accent)] lg:h-[26rem] lg:w-[26rem]"
        >
          {/* Orbiting module icons: the whole app circling its core */}
          <motion.div
            animate={reduce ? {} : { rotate: 360 }}
            transition={{ duration: 46, repeat: Infinity, ease: "linear" }}
            className="absolute inset-8"
          >
            {ORBIT_ICONS.map((Icon, i) => {
              const angle = (i / ORBIT_ICONS.length) * 2 * Math.PI;
              return (
                <motion.span
                  key={i}
                  className="absolute flex h-11 w-11 items-center justify-center rounded-full
                    border border-line bg-surface/90 text-accent shadow-card"
                  style={{
                    left: `calc(50% + ${Math.cos(angle) * 50}% - 22px)`,
                    top: `calc(50% + ${Math.sin(angle) * 50}% - 22px)`,
                  }}
                  animate={reduce ? {} : { rotate: -360 }}
                  transition={{ duration: 46, repeat: Infinity, ease: "linear" }}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.6} />
                </motion.span>
              );
            })}
          </motion.div>
          <motion.span
            animate={reduce ? {} : { scale: [1, 1.18, 1], opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            className="h-20 w-20 rounded-full bg-[radial-gradient(circle_at_35%_30%,var(--accent-2),var(--accent))] shadow-[var(--glow-accent)]"
          />
        </motion.div>
      </motion.div>

      <div className="relative flex min-h-[inherit] flex-col">
        {/* Top meta row */}
        <motion.p
          initial={reduce ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="pt-4 font-mono text-[11px] uppercase tracking-[0.25em] text-fg-subtle"
        >
          Companion — Personal AI · Career / Lifestyle · Est. 2026
        </motion.p>

        {/* Massive editorial headline */}
        <div className="flex flex-1 flex-col justify-center py-12">
          <h1
            id="hero-title"
            className="max-w-4xl font-display text-[13.5vw] font-bold leading-[0.98] tracking-[-0.03em] sm:text-7xl lg:text-8xl xl:text-[7rem]"
          >
            {LINES.map((line, li) => (
              <span key={li} className="block overflow-hidden pb-1">
                {line.words.map((word, wi) => (
                  <motion.span
                    key={wi}
                    className={`mr-[0.24em] inline-block ${line.gradient ? "gradient-text-animated" : ""}`}
                    initial={reduce ? false : { y: "110%" }}
                    animate={{ y: 0 }}
                    transition={{
                      duration: 0.8,
                      delay: 0.15 + (li * line.words.length + wi) * 0.11,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    {word}
                  </motion.span>
                ))}
              </span>
            ))}
          </h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.85 }}
            className="mt-8 max-w-md text-base leading-relaxed text-fg-muted sm:text-lg"
          >
            One place for the job hunt and the downtime after it. A CV that
            beats the tracking systems. Films worth your evening. Puzzles,
            rivals, and a daily read on where AI is heading.
          </motion.p>
        </div>

        {/* Bottom meta strip + scroll cue */}
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          className="flex items-end justify-between border-t border-line pb-2 pt-5"
        >
          <dl className="flex gap-8 sm:gap-12">
            {META.map((m) => (
              <div key={m.label}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
                  {m.label}
                </dt>
                <dd className="mt-1 font-display text-lg font-semibold">{m.value}</dd>
              </div>
            ))}
          </dl>
          <motion.span
            animate={reduce ? {} : { y: [0, 6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="flex items-center gap-2 pb-1 text-xs uppercase tracking-[0.2em] text-fg-subtle"
            aria-hidden
          >
            Explore <ArrowDown className="h-4 w-4" />
          </motion.span>
        </motion.div>
      </div>
    </section>
  );
}
