"use client";

import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
} from "framer-motion";

/**
 * App-wide atmosphere:
 *  - energy ripples: every click sends an expanding shockwave ring out from
 *    the tap point, tinted by time of day (dawn cyan, day violet, dusk ember),
 *  - fine film grain for texture,
 *  - a scroll-progress hairline along the top edge.
 * All pointer-events-none; hidden for reduced-motion users.
 */

function rippleColor(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "#2ed3e6";
  if (h >= 11 && h < 18) return "#8577ff";
  return "#f0736b";
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export function AmbientLayer() {
  const reduce = useReducedMotion();
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });

  useEffect(() => {
    if (reduce) return;
    let id = 0;
    const onDown = (e: PointerEvent) => {
      const ripple = { id: id++, x: e.clientX, y: e.clientY };
      setRipples((r) => [...r.slice(-4), ripple]);
      setTimeout(() => setRipples((r) => r.filter((x) => x.id !== ripple.id)), 1000);
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, [reduce]);

  if (reduce) return null;

  const color = rippleColor();

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[55]">
      {/* Scroll hairline */}
      <motion.div
        className="absolute inset-x-0 top-0 h-[2px] origin-left
          bg-[linear-gradient(90deg,var(--accent),var(--accent-2))]"
        style={{ scaleX: progress }}
      />

      {/* Click shockwaves: an outer ring, a chasing inner ring, a bright core */}
      <AnimatePresence>
        {ripples.map((r) => (
          <span key={r.id} className="absolute" style={{ left: r.x, top: r.y }}>
            <motion.span
              className="absolute rounded-full border-2"
              style={{ borderColor: color, translateX: "-50%", translateY: "-50%" }}
              initial={{ width: 0, height: 0, opacity: 0.7 }}
              animate={{ width: 180, height: 180, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.span
              className="absolute rounded-full border"
              style={{ borderColor: color, translateX: "-50%", translateY: "-50%" }}
              initial={{ width: 0, height: 0, opacity: 0.5 }}
              animate={{ width: 90, height: 90, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.span
              className="absolute h-2 w-2 rounded-full"
              style={{ background: color, translateX: "-50%", translateY: "-50%" }}
              initial={{ opacity: 0.9, scale: 1 }}
              animate={{ opacity: 0, scale: 0.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
            />
          </span>
        ))}
      </AnimatePresence>

      {/* Film grain */}
      <div className="bg-grain absolute inset-0 opacity-[0.05] dark:opacity-[0.08]" />
    </div>
  );
}
