"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Grid } from "@/lib/games/sudoku";
import { celebrate } from "@/lib/confetti";

interface RaceViewState {
  difficulty: string;
  puzzle: Grid;
  grid: Grid;
  myErrors: number;
  winner: string | null;
  startedAt: number;
  finishedAt: number | null;
  progress: Record<string, number>;
}

export function RaceBoard({
  state,
  players,
  myId,
  onFill,
  wrongFlash,
}: {
  state: RaceViewState;
  players: { id: string; name: string }[];
  myId: string;
  onFill: (r: number, c: number, v: number) => void;
  wrongFlash: number;
}) {
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [shake, setShake] = useState(0);
  const done = Boolean(state.winner);
  const iWon = state.winner === myId;

  useEffect(() => {
    if (wrongFlash > 0) setShake((s) => s + 1);
  }, [wrongFlash]);

  useEffect(() => {
    if (iWon) celebrate("big");
  }, [iWon]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selected || done) return;
      if (/^[1-9]$/.test(e.key)) onFill(selected[0], selected[1], Number(e.key));
      if (e.key === "Backspace" || e.key === "Delete") onFill(selected[0], selected[1], 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, onFill, done]);

  return (
    <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start">
      <motion.div
        key={shake}
        animate={shake ? { x: [0, -7, 7, -4, 4, 0] } : {}}
        transition={{ duration: 0.3 }}
      >
        <div
          role="grid"
          aria-label="Race sudoku board"
          className="grid w-fit grid-cols-9 overflow-hidden rounded-lg border-2 border-line-strong"
        >
          {state.grid.map((row, r) =>
            row.map((value, c) => {
              const given = state.puzzle[r][c] !== 0;
              const isSel = selected?.[0] === r && selected?.[1] === c;
              const sameUnit =
                selected &&
                (selected[0] === r ||
                  selected[1] === c ||
                  (Math.floor(selected[0] / 3) === Math.floor(r / 3) &&
                    Math.floor(selected[1] / 3) === Math.floor(c / 3)));
              return (
                <button
                  key={`${r}-${c}`}
                  role="gridcell"
                  aria-label={`Row ${r + 1} column ${c + 1}${value ? `, ${value}` : ", empty"}`}
                  onClick={() => setSelected([r, c])}
                  disabled={done}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center border border-line text-sm font-medium sm:h-10 sm:w-10",
                    c % 3 === 2 && c !== 8 && "border-r-2 border-r-line-strong",
                    r % 3 === 2 && r !== 8 && "border-b-2 border-b-line-strong",
                    given ? "font-bold text-fg" : "text-accent",
                    isSel ? "bg-accent-soft" : sameUnit ? "bg-surface-2/70" : "bg-surface"
                  )}
                >
                  {value || ""}
                </button>
              );
            })
          )}
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <Button
              key={n}
              variant="secondary"
              size="sm"
              className="w-9"
              disabled={done || !selected}
              onClick={() => selected && onFill(selected[0], selected[1], n)}
            >
              {n}
            </Button>
          ))}
        </div>
      </motion.div>

      <div className="w-full max-w-xs space-y-3">
        <Badge tone="warning">{state.myErrors} wrong tries</Badge>
        <ul className="space-y-2">
          {players.map((p) => {
            const pct = Math.round((state.progress[p.id] ?? 0) * 100);
            const winner = state.winner === p.id;
            return (
              <li key={p.id} className="rounded-md border border-line bg-surface p-3">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {p.name} {p.id === myId && <span className="text-fg-subtle">(you)</span>}
                    {winner && " 🏆"}
                  </span>
                  <span className="text-xs text-fg-subtle">{pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <motion.div
                    className={cn(
                      "h-full",
                      winner
                        ? "bg-[var(--success)]"
                        : "bg-[linear-gradient(90deg,var(--accent),var(--accent-2))]"
                    )}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        {done && (
          <div className="rounded-lg bg-success-soft p-4 text-center font-display font-semibold text-success">
            {iWon
              ? "You won the race!"
              : `${players.find((p) => p.id === state.winner)?.name ?? "Someone"} finished first.`}
          </div>
        )}
      </div>
    </div>
  );
}
