"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { gameStats } from "@/lib/games/stats";

type Phase = "idle" | "waiting" | "go" | "early" | "result";

export function ReflexGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [ms, setMs] = useState<number | null>(null);
  const [rounds, setRounds] = useState<number[]>([]);
  const startTime = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const begin = () => {
    setPhase("waiting");
    setMs(null);
    timer.current = setTimeout(() => {
      startTime.current = performance.now();
      setPhase("go");
    }, 1200 + Math.random() * 2300);
  };

  const click = () => {
    if (phase === "idle" || phase === "early" || phase === "result") {
      begin();
      return;
    }
    if (phase === "waiting") {
      if (timer.current) clearTimeout(timer.current);
      setPhase("early");
      return;
    }
    // go
    const elapsed = Math.round(performance.now() - startTime.current);
    setMs(elapsed);
    setPhase("result");
    setRounds((r) => {
      const next = [...r, elapsed].slice(-5);
      if (next.length === 5) {
        const avg = Math.round(next.reduce((a, b) => a + b, 0) / 5);
        gameStats.record("reflex", avg, `${avg} ms average over 5`, true);
        return [];
      }
      return next;
    });
  };

  const label =
    phase === "idle"
      ? "Tap to start. Wait for green, then tap as fast as you can."
      : phase === "waiting"
        ? "Wait for it…"
        : phase === "go"
          ? "GO!"
          : phase === "early"
            ? "Too soon. Tap to retry."
            : `${ms} ms${ms !== null && ms < 220 ? " — quick." : ms !== null && ms > 400 ? " — coffee first?" : ""}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge tone="accent">Round {Math.min(rounds.length + 1, 5)}/5</Badge>
        {rounds.length > 0 && (
          <Badge tone="cyan">
            avg {Math.round(rounds.reduce((a, b) => a + b, 0) / rounds.length)} ms
          </Badge>
        )}
      </div>
      <button
        type="button"
        onClick={click}
        aria-label="Reaction test area"
        className={cn(
          "flex h-64 w-full select-none items-center justify-center rounded-lg font-display text-xl font-bold transition-colors duration-150 sm:text-2xl",
          phase === "go"
            ? "bg-[var(--success)] text-white"
            : phase === "waiting"
              ? "bg-[var(--danger)] text-white"
              : phase === "early"
                ? "bg-warning-soft text-warning"
                : "bg-surface-2 text-fg"
        )}
      >
        {label}
      </button>
      <p className="text-center text-xs text-fg-subtle">
        Five rounds make a set; your average lands in the stats.
      </p>
    </div>
  );
}
