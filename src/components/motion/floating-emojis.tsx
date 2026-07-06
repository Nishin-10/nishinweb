"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Decorative drifting emojis behind headers. Deterministic positions (no
 * Math.random) so server and client render identically.
 */
export function FloatingEmojis({ emojis, className }: { emojis: string[]; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}>
      {emojis.map((emoji, i) => {
        const left = (i * 83 + 11) % 92;
        const top = (i * 47 + 9) % 70;
        const duration = 6 + (i % 4) * 1.7;
        const delay = -(i * 1.3);
        const size = 1.1 + ((i * 7) % 3) * 0.35;
        return (
          <motion.span
            key={`${emoji}-${i}`}
            className="absolute select-none opacity-[0.16] dark:opacity-[0.22]"
            style={{ left: `${left}%`, top: `${top}%`, fontSize: `${size}rem` }}
            animate={{
              y: [0, -14, 0],
              rotate: [0, i % 2 ? 12 : -12, 0],
            }}
            transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
          >
            {emoji}
          </motion.span>
        );
      })}
    </div>
  );
}
