"use client";

import confetti from "canvas-confetti";

/** Celebration burst in brand colors. Skipped for reduced-motion users. */
export function celebrate(intensity: "win" | "big" = "win") {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const styles = getComputedStyle(document.documentElement);
  const colors = [
    styles.getPropertyValue("--accent").trim() || "#6355f2",
    styles.getPropertyValue("--accent-2").trim() || "#0ea5b7",
    "#f0b35c",
    "#ffffff",
  ];

  const big = intensity === "big";
  confetti({
    particleCount: big ? 160 : 80,
    spread: big ? 110 : 70,
    startVelocity: big ? 42 : 32,
    origin: { y: 0.7 },
    colors,
    disableForReducedMotion: true,
  });
  if (big) {
    setTimeout(
      () =>
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 60,
          origin: { x: 0, y: 0.8 },
          colors,
        }),
      180
    );
    setTimeout(
      () =>
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 60,
          origin: { x: 1, y: 0.8 },
          colors,
        }),
      320
    );
  }
}
