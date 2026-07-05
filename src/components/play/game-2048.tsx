"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { gameStats } from "@/lib/games/stats";

type Board = number[][]; // 4x4, 0 = empty

function emptyBoard(): Board {
  return Array.from({ length: 4 }, () => Array(4).fill(0));
}

function addTile(board: Board): Board {
  const empties: [number, number][] = [];
  board.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v === 0) empties.push([r, c]);
    })
  );
  if (!empties.length) return board;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  const next = board.map((row) => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slideRow(row: number[]): { row: number[]; gained: number } {
  const vals = row.filter((v) => v !== 0);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < vals.length; i++) {
    if (vals[i] === vals[i + 1]) {
      out.push(vals[i] * 2);
      gained += vals[i] * 2;
      i++;
    } else {
      out.push(vals[i]);
    }
  }
  while (out.length < 4) out.push(0);
  return { row: out, gained };
}

function transpose(b: Board): Board {
  return b[0].map((_, c) => b.map((row) => row[c]));
}

function move(board: Board, dir: "left" | "right" | "up" | "down"): { board: Board; gained: number; moved: boolean } {
  let work = board.map((r) => [...r]);
  const vertical = dir === "up" || dir === "down";
  const reverse = dir === "right" || dir === "down";
  if (vertical) work = transpose(work);
  let gained = 0;
  work = work.map((row) => {
    const input = reverse ? [...row].reverse() : row;
    const { row: slid, gained: g } = slideRow(input);
    gained += g;
    return reverse ? slid.reverse() : slid;
  });
  if (vertical) work = transpose(work);
  const moved = JSON.stringify(work) !== JSON.stringify(board);
  return { board: work, gained, moved };
}

function canMove(board: Board): boolean {
  return (["left", "right", "up", "down"] as const).some((d) => move(board, d).moved);
}

const TILE_STYLES: Record<number, string> = {
  2: "bg-surface-2 text-fg",
  4: "bg-accent-soft text-fg",
  8: "bg-accent-2-soft text-accent-2",
  16: "bg-warning-soft text-warning",
  32: "bg-[var(--warning)] text-white",
  64: "bg-[var(--danger)] text-white",
  128: "bg-[var(--accent)] text-white",
  256: "bg-[var(--accent)] text-white",
  512: "bg-[var(--accent-2)] text-white",
  1024: "bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-white",
  2048: "bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-white shadow-lift",
};

export function Game2048() {
  const [board, setBoard] = useState<Board>(() => addTile(addTile(emptyBoard())));
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const touchStart = useRef<[number, number] | null>(null);

  const doMove = useCallback(
    (dir: "left" | "right" | "up" | "down") => {
      if (over) return;
      setBoard((b) => {
        const { board: nb, gained, moved } = move(b, dir);
        if (!moved) return b;
        const withTile = addTile(nb);
        setScore((s) => {
          const ns = s + gained;
          if (!canMove(withTile)) {
            setOver(true);
            gameStats.record("2048", ns, `${ns} points`);
          }
          return ns;
        });
        return withTile;
      });
    },
    [over]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, "left" | "right" | "up" | "down"> = {
        ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        doMove(dir);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doMove]);

  const reset = () => {
    setBoard(addTile(addTile(emptyBoard())));
    setScore(0);
    setOver(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge tone="accent">Score {score}</Badge>
        {over && <Badge tone="danger">No moves left</Badge>}
        <Button size="sm" variant="ghost" onClick={reset} className="ml-auto">
          <RotateCcw className="h-4 w-4" /> New game
        </Button>
      </div>

      <div
        role="application"
        aria-label="2048 board. Use arrow keys or swipe."
        tabIndex={0}
        onTouchStart={(e) => {
          touchStart.current = [e.touches[0].clientX, e.touches[0].clientY];
        }}
        onTouchEnd={(e) => {
          if (!touchStart.current) return;
          const dx = e.changedTouches[0].clientX - touchStart.current[0];
          const dy = e.changedTouches[0].clientY - touchStart.current[1];
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
          doMove(
            Math.abs(dx) > Math.abs(dy)
              ? dx > 0 ? "right" : "left"
              : dy > 0 ? "down" : "up"
          );
          touchStart.current = null;
        }}
        className="mx-auto grid w-fit grid-cols-4 gap-2 rounded-lg bg-surface-2 p-2"
      >
        {board.flatMap((row, r) =>
          row.map((v, c) => (
            <motion.div
              key={`${r}-${c}-${v}`}
              initial={v ? { scale: 0.6 } : false}
              animate={{ scale: 1 }}
              transition={{ duration: 0.12 }}
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-md font-display text-xl font-bold sm:h-20 sm:w-20 sm:text-2xl",
                v === 0 ? "bg-surface" : TILE_STYLES[v] ?? TILE_STYLES[2048]
              )}
            >
              {v || ""}
            </motion.div>
          ))
        )}
      </div>
      <p className="text-center text-xs text-fg-subtle">Arrow keys or swipe to play.</p>
    </div>
  );
}
