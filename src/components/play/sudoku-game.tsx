"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  generate,
  isComplete,
  type Difficulty,
  type Grid,
} from "@/lib/games/sudoku";
import { gameStats } from "@/lib/games/stats";
import { celebrate } from "@/lib/confetti";

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function SudokuGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [{ puzzle, solution }, setBoard] = useState(() => generate("easy"));
  const [grid, setGrid] = useState<Grid>(() => puzzle.map((r) => [...r]));
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [won, setWon] = useState(false);
  const [errors, setErrors] = useState(0);

  const fixed = useMemo(
    () => puzzle.map((row) => row.map((v) => v !== 0)),
    [puzzle]
  );

  useEffect(() => {
    if (won) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [won]);

  const newGame = (d: Difficulty) => {
    const b = generate(d);
    setDifficulty(d);
    setBoard(b);
    setGrid(b.puzzle.map((r) => [...r]));
    setSelected(null);
    setSeconds(0);
    setErrors(0);
    setWon(false);
  };

  const place = (value: number) => {
    if (!selected || won) return;
    const [r, c] = selected;
    if (fixed[r][c]) return;

    setGrid((g) => {
      const next = g.map((row) => [...row]);
      next[r][c] = value;
      if (value !== 0 && value !== solution[r][c]) {
        setErrors((e) => e + 1);
      }
      if (value !== 0 && isComplete(next, solution)) {
        setWon(true);
        celebrate("win");
        const score = Math.max(1000 - seconds - errors * 30, 50);
        gameStats.record(
          "sudoku",
          score,
          `${difficulty} · ${formatTime(seconds)} · ${errors} mistakes`
        );
      }
      return next;
    });
  };

  // Keyboard input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selected) return;
      if (/^[1-9]$/.test(e.key)) place(Number(e.key));
      if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") place(0);
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        setSelected((prev) => {
          const [r, c] = prev ?? [0, 0];
          if (e.key === "ArrowUp") return [Math.max(0, r - 1), c];
          if (e.key === "ArrowDown") return [Math.min(8, r + 1), c];
          if (e.key === "ArrowLeft") return [r, Math.max(0, c - 1)];
          return [r, Math.min(8, c + 1)];
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, won, fixed, solution, seconds, errors, difficulty]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
          <Button
            key={d}
            size="sm"
            variant={difficulty === d ? "primary" : "outline"}
            onClick={() => newGame(d)}
          >
            {d}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => newGame(difficulty)} aria-label="New puzzle">
          <RotateCcw className="h-4 w-4" /> New
        </Button>
        <span className="ml-auto flex items-center gap-2 text-sm text-fg-muted">
          <Badge tone={errors > 0 ? "warning" : "neutral"}>{errors} mistakes</Badge>
          <span className="font-mono">{formatTime(seconds)}</span>
        </span>
      </div>

      <div
        role="grid"
        aria-label="Sudoku board"
        className="mx-auto grid w-fit grid-cols-9 overflow-hidden rounded-lg border-2 border-line-strong"
      >
        {grid.map((row, r) =>
          row.map((value, c) => {
            const isSel = selected?.[0] === r && selected?.[1] === c;
            const sameUnit =
              selected &&
              (selected[0] === r ||
                selected[1] === c ||
                (Math.floor(selected[0] / 3) === Math.floor(r / 3) &&
                  Math.floor(selected[1] / 3) === Math.floor(c / 3)));
            const wrong = value !== 0 && !fixed[r][c] && value !== solution[r][c];
            return (
              <button
                key={`${r}-${c}`}
                role="gridcell"
                aria-label={`Row ${r + 1} column ${c + 1}${value ? `, ${value}` : ", empty"}`}
                onClick={() => setSelected([r, c])}
                className={cn(
                  "flex h-9 w-9 items-center justify-center text-sm font-medium transition-colors sm:h-11 sm:w-11 sm:text-base",
                  "border border-line",
                  c % 3 === 2 && c !== 8 && "border-r-2 border-r-line-strong",
                  r % 3 === 2 && r !== 8 && "border-b-2 border-b-line-strong",
                  fixed[r][c] ? "font-bold text-fg" : "text-accent",
                  wrong && "bg-danger-soft text-danger",
                  isSel ? "bg-accent-soft" : sameUnit ? "bg-surface-2/70" : "bg-surface"
                )}
              >
                {value || ""}
              </button>
            );
          })
        )}
      </div>

      <div className="mx-auto flex w-fit flex-wrap justify-center gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <Button key={n} variant="secondary" size="sm" className="w-9" onClick={() => place(n)}>
            {n}
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={() => place(0)}>
          Clear
        </Button>
      </div>

      {won && (
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center gap-2 text-center font-display font-semibold text-success"
        >
          <Sparkles className="h-5 w-5" /> Solved in {formatTime(seconds)} with {errors} mistakes
        </motion.p>
      )}
    </div>
  );
}
