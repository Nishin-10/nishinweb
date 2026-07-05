"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ChevronsDown, Pause, Play, RotateCw, RotateCcw as Ccw, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { gameStats } from "@/lib/games/stats";
import { celebrate } from "@/lib/confetti";

/* ---------------- pieces ---------------- */

const COLS = 10;
const ROWS = 20;

type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

/** [x, y] block offsets for each of the four rotation states. */
const SHAPES: Record<PieceType, number[][][]> = {
  I: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  O: [
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
  ],
  T: [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  S: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[1, 1], [2, 1], [0, 2], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[2, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
  ],
  J: [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  L: [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
};

const COLORS: Record<PieceType, string> = {
  I: "bg-[var(--accent-2)]",
  O: "bg-[var(--warning)]",
  T: "bg-[var(--accent)]",
  S: "bg-[var(--success)]",
  Z: "bg-[var(--danger)]",
  J: "bg-[#5b8def]",
  L: "bg-[#ef8f5b]",
};

const KICKS = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0]];

interface Piece {
  type: PieceType;
  rot: number;
  x: number;
  y: number;
}

type Cell = PieceType | null;
type Board = Cell[][];

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

function bag(): PieceType[] {
  const types: PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  return types;
}

function blocks(piece: Piece): [number, number][] {
  return SHAPES[piece.type][piece.rot].map(([bx, by]) => [piece.x + bx, piece.y + by]);
}

function fits(board: Board, piece: Piece): boolean {
  return blocks(piece).every(
    ([x, y]) => x >= 0 && x < COLS && y < ROWS && (y < 0 || board[y][x] === null)
  );
}

function spawn(type: PieceType): Piece {
  return { type, rot: 0, x: 3, y: type === "I" ? -1 : 0 };
}

const LINE_SCORES = [0, 100, 300, 500, 800];

function MiniPiece({ type }: { type: PieceType | null }) {
  return (
    <div className="grid h-12 w-16 grid-cols-4 grid-rows-4 gap-px">
      {Array.from({ length: 16 }, (_, i) => {
        const x = i % 4;
        const y = Math.floor(i / 4);
        const on = type && SHAPES[type][0].some(([bx, by]) => bx === x && by === y);
        return <div key={i} className={cn("rounded-[2px]", on ? COLORS[type!] : "bg-transparent")} />;
      })}
    </div>
  );
}

/* ---------------- component ---------------- */

type Phase = "menu" | "playing" | "paused" | "over";

export function BlockfallGame() {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [piece, setPiece] = useState<Piece | null>(null);
  const [queue, setQueue] = useState<PieceType[]>([]);
  const [hold, setHold] = useState<PieceType | null>(null);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState<Phase>("menu");
  const [clearing, setClearing] = useState<number[]>([]);
  const best = useRef<number | null>(null);

  useEffect(() => {
    best.current = gameStats.get("blockfall").best;
  }, []);

  const refill = useCallback((q: PieceType[]): PieceType[] => {
    return q.length < 7 ? [...q, ...bag()] : q;
  }, []);

  const start = () => {
    const q = bag();
    setBoard(emptyBoard());
    setPiece(spawn(q[0]));
    setQueue(refill(q.slice(1)));
    setHold(null);
    setCanHold(true);
    setScore(0);
    setLines(0);
    setLevel(1);
    setClearing([]);
    setPhase("playing");
  };

  const lockPiece = useCallback(
    (p: Piece, extraScore = 0) => {
      setBoard((b) => {
        const next = b.map((row) => [...row]);
        for (const [x, y] of blocks(p)) {
          if (y < 0) {
            setPhase("over"); // stats recorded by the phase watcher below
            return next;
          }
          next[y][x] = p.type;
        }

        const full = next
          .map((row, i) => (row.every((c) => c !== null) ? i : -1))
          .filter((i) => i >= 0);

        if (full.length > 0) {
          setClearing(full);
          setTimeout(() => {
            setBoard((b2) => {
              const kept = b2.filter((_, i) => !full.includes(i));
              const fresh = Array.from({ length: full.length }, () => Array<Cell>(COLS).fill(null));
              return [...fresh, ...kept];
            });
            setClearing([]);
          }, 180);
          setLines((l) => {
            const total = l + full.length;
            const newLevel = Math.floor(total / 10) + 1;
            setLevel((lv) => {
              if (newLevel > lv) celebrate("win");
              return newLevel;
            });
            return total;
          });
          setScore((s) => s + extraScore + LINE_SCORES[full.length] * level);
        } else {
          setScore((s) => s + extraScore);
        }
        return next;
      });

      setQueue((q) => {
        const nq = refill(q);
        const nextPiece = spawn(nq[0]);
        setPiece(nextPiece);
        setCanHold(true);
        return nq.slice(1);
      });
    },
    [level, refill]
  );

  const move = useCallback(
    (dx: number, dy: number): boolean => {
      let moved = false;
      setPiece((p) => {
        if (!p || phase !== "playing") return p;
        const candidate = { ...p, x: p.x + dx, y: p.y + dy };
        if (fits(board, candidate)) {
          moved = true;
          return candidate;
        }
        return p;
      });
      return moved;
    },
    [board, phase]
  );

  const rotate = useCallback(
    (dir: 1 | -1) => {
      setPiece((p) => {
        if (!p || phase !== "playing") return p;
        const rot = (p.rot + dir + 4) % 4;
        for (const [kx, ky] of KICKS) {
          const candidate = { ...p, rot, x: p.x + kx, y: p.y + ky };
          if (fits(board, candidate)) return candidate;
        }
        return p;
      });
    },
    [board, phase]
  );

  const softDrop = useCallback(() => {
    setPiece((p) => {
      if (!p || phase !== "playing") return p;
      const down = { ...p, y: p.y + 1 };
      if (fits(board, down)) {
        setScore((s) => s + 1);
        return down;
      }
      lockPiece(p);
      return p;
    });
  }, [board, phase, lockPiece]);

  const hardDrop = useCallback(() => {
    setPiece((p) => {
      if (!p || phase !== "playing") return p;
      let drop = p;
      let cells = 0;
      while (fits(board, { ...drop, y: drop.y + 1 })) {
        drop = { ...drop, y: drop.y + 1 };
        cells++;
      }
      lockPiece(drop, cells * 2);
      return drop;
    });
  }, [board, phase, lockPiece]);

  const holdPiece = useCallback(() => {
    if (!canHold || phase !== "playing") return;
    setPiece((p) => {
      if (!p) return p;
      setCanHold(false);
      setHold((h) => {
        if (h) {
          setPiece(spawn(h));
        } else {
          setQueue((q) => {
            const nq = refill(q);
            setPiece(spawn(nq[0]));
            return nq.slice(1);
          });
        }
        return p.type;
      });
      return p;
    });
  }, [canHold, phase, refill]);

  // Record the run once, after the final score/lines state settles
  useEffect(() => {
    if (phase !== "over") return;
    gameStats.record("blockfall", score, `${score} pts · ${lines} lines · lvl ${level}`);
    if (best.current !== null && score > best.current) celebrate("big");
    best.current = Math.max(best.current ?? 0, score);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Gravity
  useEffect(() => {
    if (phase !== "playing") return;
    const speed = Math.max(90, 720 - (level - 1) * 60);
    const t = setInterval(() => {
      setPiece((p) => {
        if (!p) return p;
        const down = { ...p, y: p.y + 1 };
        if (fits(board, down)) return down;
        lockPiece(p);
        return p;
      });
    }, speed);
    return () => clearInterval(t);
  }, [phase, level, board, lockPiece]);

  // Keyboard
  useEffect(() => {
    if (phase !== "playing" && phase !== "paused") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "p" || e.key === "P") {
        setPhase((ph) => (ph === "playing" ? "paused" : "playing"));
        return;
      }
      if (phase !== "playing") return;
      switch (e.key) {
        case "ArrowLeft": e.preventDefault(); move(-1, 0); break;
        case "ArrowRight": e.preventDefault(); move(1, 0); break;
        case "ArrowDown": e.preventDefault(); softDrop(); break;
        case "ArrowUp":
        case "x": case "X": e.preventDefault(); rotate(1); break;
        case "z": case "Z": rotate(-1); break;
        case " ": e.preventDefault(); hardDrop(); break;
        case "c": case "C": holdPiece(); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, move, rotate, softDrop, hardDrop, holdPiece]);

  /* ---------------- render ---------------- */

  // Ghost piece position
  let ghost: Piece | null = null;
  if (piece && phase === "playing") {
    ghost = piece;
    while (fits(board, { ...ghost, y: ghost.y + 1 })) ghost = { ...ghost, y: ghost.y + 1 };
  }

  const activeCells = new Map<string, PieceType>();
  if (piece) for (const [x, y] of blocks(piece)) activeCells.set(`${x},${y}`, piece.type);
  const ghostCells = new Set<string>();
  if (ghost && ghost.y !== piece?.y) for (const [x, y] of blocks(ghost)) ghostCells.add(`${x},${y}`);

  if (phase === "menu") {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <div className="text-5xl">🧱</div>
        <h3 className="font-display text-xl font-bold">Blockfall</h3>
        <p className="text-sm text-fg-muted">
          The falling-block classic, rebuilt: ghost piece, hold slot, next queue,
          wall kicks, and levels that stop being polite around 6.
        </p>
        <div className="mx-auto max-w-xs rounded-md bg-surface-2/60 p-3 text-left text-xs leading-relaxed text-fg-muted">
          <p>← → move · ↓ soft drop · Space hard drop</p>
          <p>↑ / X rotate · Z rotate back · C hold · P pause</p>
          <p>Clears score 100/300/500/800 × level. Hard drops pay 2 per cell.</p>
        </div>
        <Button size="lg" onClick={start}>
          <Play className="h-5 w-5" /> Play
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-fit flex-col items-center gap-4 sm:flex-row sm:items-start">
      {/* Board */}
      <div className="relative">
        <div
          role="application"
          aria-label="Blockfall board"
          className="grid grid-cols-10 gap-px rounded-lg border-2 border-line-strong bg-line p-px"
        >
          {board.map((row, y) =>
            row.map((cell, x) => {
              const key = `${x},${y}`;
              const active = activeCells.get(key);
              const isGhost = ghostCells.has(key);
              const isClearing = clearing.includes(y);
              return (
                <div
                  key={key}
                  className={cn(
                    "h-5 w-5 rounded-[2px] transition-colors sm:h-6 sm:w-6",
                    isClearing
                      ? "animate-pulse-soft bg-white"
                      : active
                        ? COLORS[active]
                        : cell
                          ? cn(COLORS[cell], "opacity-90")
                          : isGhost
                            ? "bg-fg/10 ring-1 ring-inset ring-fg/20"
                            : "bg-surface"
                  )}
                />
              );
            })
          )}
        </div>

        {(phase === "paused" || phase === "over") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg"
          >
            <p className="font-display text-xl font-bold">
              {phase === "paused" ? "Paused" : "Game over"}
            </p>
            {phase === "over" && (
              <p className="text-sm text-fg-muted">{score} pts · {lines} lines · level {level}</p>
            )}
            <Button onClick={phase === "paused" ? () => setPhase("playing") : start}>
              {phase === "paused" ? <><Play className="h-4 w-4" /> Resume</> : "Play again"}
            </Button>
          </motion.div>
        )}
      </div>

      {/* Side panel */}
      <div className="flex w-full flex-row gap-3 sm:w-36 sm:flex-col">
        <div className="flex-1 space-y-1 rounded-lg border border-line bg-surface p-3">
          <Badge tone="accent" className="w-full justify-center">{score}</Badge>
          <p className="text-center text-xs text-fg-subtle">Level {level} · {lines} lines</p>
        </div>
        <div className="flex-1 rounded-lg border border-line bg-surface p-3">
          <p className="mb-1 text-xs font-medium text-fg-subtle">Next</p>
          <div className="flex gap-1 sm:flex-col">
            {queue.slice(0, 3).map((t, i) => <MiniPiece key={i} type={t} />)}
          </div>
        </div>
        <div className="flex-1 rounded-lg border border-line bg-surface p-3">
          <p className="mb-1 text-xs font-medium text-fg-subtle">Hold (C)</p>
          <MiniPiece type={hold} />
        </div>
      </div>

      {/* Touch controls */}
      <div className="grid w-full grid-cols-6 gap-2 sm:hidden">
        <Button variant="secondary" size="sm" aria-label="Move left" onClick={() => move(-1, 0)}>←</Button>
        <Button variant="secondary" size="sm" aria-label="Move right" onClick={() => move(1, 0)}>→</Button>
        <Button variant="secondary" size="sm" aria-label="Rotate" onClick={() => rotate(1)}><RotateCw className="h-4 w-4" /></Button>
        <Button variant="secondary" size="sm" aria-label="Rotate back" onClick={() => rotate(-1)}><Ccw className="h-4 w-4" /></Button>
        <Button variant="secondary" size="sm" aria-label="Soft drop" onClick={softDrop}><ArrowDown className="h-4 w-4" /></Button>
        <Button variant="secondary" size="sm" aria-label="Hard drop" onClick={hardDrop}><ChevronsDown className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" className="col-span-3" onClick={holdPiece}><Package className="h-4 w-4" /> Hold</Button>
        <Button variant="outline" size="sm" className="col-span-3" onClick={() => setPhase((p) => p === "playing" ? "paused" : "playing")}><Pause className="h-4 w-4" /> Pause</Button>
      </div>
    </div>
  );
}
