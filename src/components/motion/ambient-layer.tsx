"use client";

import { useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
} from "framer-motion";

/**
 * App-wide atmosphere, one fixed layer:
 *  - a soft gradient aura that trails the cursor (screen blend, so it lights
 *    up whatever it passes over),
 *  - fine film grain for texture,
 *  - a scroll-progress hairline along the top edge.
 * All pointer-events-none; hidden for reduced-motion users.
 */
export function AmbientLayer() {
  const reduce = useReducedMotion();
  const [hasPointer, setHasPointer] = useState(false);
  const mx = useMotionValue(-400);
  const my = useMotionValue(-400);
  const x = useSpring(mx, { stiffness: 120, damping: 22, mass: 0.6 });
  const y = useSpring(my, { stiffness: 120, damping: 22, mass: 0.6 });
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });

  useEffect(() => {
    if (reduce) return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    setHasPointer(fine);
    if (!fine) return;
    const onMove = (e: PointerEvent) => {
      mx.set(e.clientX);
      my.set(e.clientY);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, mx, my]);

  if (reduce) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[55]">
      {/* Scroll hairline */}
      <motion.div
        className="absolute inset-x-0 top-0 h-[2px] origin-left
          bg-[linear-gradient(90deg,var(--accent),var(--accent-2))]"
        style={{ scaleX: progress }}
      />

      {/* Cursor aura */}
      {hasPointer && (
        <motion.div
          className="absolute h-72 w-72 rounded-full mix-blend-screen"
          style={{
            x,
            y,
            translateX: "-50%",
            translateY: "-50%",
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--accent) 22%, transparent), transparent 65%)",
          }}
        />
      )}

      {/* Film grain */}
      <div className="bg-grain absolute inset-0 opacity-[0.05] dark:opacity-[0.08]" />
    </div>
  );
}
