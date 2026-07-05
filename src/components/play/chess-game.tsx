"use client";

import { useCallback, useState } from "react";
import { Chess, type Square } from "chess.js";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { gameStats } from "@/lib/games/stats";

const PIECE_GLYPHS: Record<string, string> = {
  wk: "♔", wq: "♕", wr: "♖", wb: "♗", wn: "♘", wp: "♙",
  bk: "♚", bq: "♛", br: "♜", bb: "♝", bn: "♞", bp: "♟",
};

const PIECE_VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

/** Material + tiny mobility evaluation, from white's perspective. */
function evaluate(chess: Chess): number {
  let score = 0;
  for (const row of chess.board()) {
    for (const piece of row) {
      if (!piece) continue;
      score += (piece.color === "w" ? 1 : -1) * PIECE_VALUE[piece.type];
    }
  }
  return score;
}

/** Depth-limited negamax with alpha-beta. Levels: 1 = random-ish, 2-3 = deeper. */
function bestMove(chess: Chess, level: number): string | null {
  const moves = chess.moves();
  if (moves.length === 0) return null;
  if (level === 1) {
    // Beginner: mostly random, grabs free captures when obvious.
    const captures = moves.filter((m) => m.includes("x"));
    const pool = captures.length && Math.random() < 0.5 ? captures : moves;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const depth = level; // 2 or 3 plies
  const color = chess.turn() === "w" ? 1 : -1;

  const negamax = (d: number, alpha: number, beta: number, sign: number): number => {
    if (chess.isCheckmate()) return -99999 + (depth - d);
    if (chess.isDraw() || chess.isStalemate()) return 0;
    if (d === 0) return sign * evaluate(chess);

    let best = -Infinity;
    for (const move of chess.moves()) {
      chess.move(move);
      const value = -negamax(d - 1, -beta, -alpha, -sign);
      chess.undo();
      if (value > best) best = value;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  };

  let best: string | null = null;
  let bestScore = -Infinity;
  for (const move of moves) {
    chess.move(move);
    const score = -negamax(depth - 1, -Infinity, Infinity, -color);
    chess.undo();
    if (score > bestScore || (score === bestScore && Math.random() < 0.3)) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}

export function ChessGame() {
  // The Chess instance is mutable; `tick` forces renders after each move.
  const [chess, setChess] = useState(() => new Chess());
  const [, setTick] = useState(0);
  const [level, setLevel] = useState(2);
  const [selected, setSelected] = useState<Square | null>(null);
  const [targets, setTargets] = useState<Square[]>([]);
  const [thinking, setThinking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const rerender = () => setTick((t) => t + 1);

  const finish = useCallback(
    (result: "win" | "loss" | "draw") => {
      const text =
        result === "win" ? "You won. Checkmate." : result === "loss" ? "Checkmate. The engine wins." : "Draw.";
      setStatus(text);
      gameStats.record(
        "chess",
        result === "win" ? 1 : 0,
        `${text.replace(".", "")} vs level ${level}`
      );
    },
    [level]
  );

  const checkEnd = useCallback((): boolean => {
    if (chess.isCheckmate()) {
      finish(chess.turn() === "b" ? "win" : "loss");
      return true;
    }
    if (chess.isDraw() || chess.isStalemate()) {
      finish("draw");
      return true;
    }
    return false;
  }, [chess, finish]);

  const engineMove = useCallback(() => {
    setThinking(true);
    // Let the UI paint before the search blocks the main thread.
    setTimeout(() => {
      const move = bestMove(chess, level);
      if (move) chess.move(move);
      setThinking(false);
      rerender();
      checkEnd();
    }, 120);
  }, [chess, level, checkEnd]);

  const onSquare = (square: Square) => {
    if (thinking || status || chess.turn() !== "w") return;

    if (selected && targets.includes(square)) {
      chess.move({ from: selected, to: square, promotion: "q" });
      setSelected(null);
      setTargets([]);
      rerender();
      if (!checkEnd()) engineMove();
      return;
    }

    const piece = chess.get(square);
    if (piece && piece.color === "w") {
      setSelected(square);
      setTargets(
        chess.moves({ square, verbose: true }).map((m) => m.to as Square)
      );
    } else {
      setSelected(null);
      setTargets([]);
    }
  };

  const reset = () => {
    setChess(new Chess());
    setSelected(null);
    setTargets([]);
    setStatus(null);
    setThinking(false);
    rerender();
  };

  const board = chess.board();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-fg-muted">Engine strength</span>
        {[1, 2, 3].map((l) => (
          <Button
            key={l}
            size="sm"
            variant={level === l ? "primary" : "outline"}
            onClick={() => setLevel(l)}
          >
            {l === 1 ? "Casual" : l === 2 ? "Club" : "Sharp"}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={reset}>
          <RotateCcw className="h-4 w-4" /> New game
        </Button>
        <span className="ml-auto">
          {status ? (
            <Badge tone={status.startsWith("You won") ? "success" : "accent"}>{status}</Badge>
          ) : thinking ? (
            <Badge tone="cyan">Thinking…</Badge>
          ) : chess.inCheck() ? (
            <Badge tone="warning">Check</Badge>
          ) : (
            <Badge>Your move — you play white</Badge>
          )}
        </span>
      </div>

      <div
        role="grid"
        aria-label="Chess board"
        className="mx-auto grid w-fit grid-cols-8 overflow-hidden rounded-lg border-2 border-line-strong"
      >
        {board.map((row, r) =>
          row.map((piece, c) => {
            const square = (String.fromCharCode(97 + c) + (8 - r)) as Square;
            const dark = (r + c) % 2 === 1;
            const isSel = selected === square;
            const isTarget = targets.includes(square);
            return (
              <button
                key={square}
                role="gridcell"
                aria-label={`${square}${piece ? `, ${piece.color === "w" ? "white" : "black"} ${piece.type}` : ""}`}
                onClick={() => onSquare(square)}
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center text-2xl sm:h-12 sm:w-12 sm:text-3xl",
                  dark ? "bg-accent-soft" : "bg-surface",
                  isSel && "ring-2 ring-inset ring-[var(--accent)]",
                  "transition-colors"
                )}
              >
                {piece && (
                  <span
                    className={cn(
                      piece.color === "w"
                        ? "text-fg drop-shadow-sm"
                        : "text-fg opacity-90"
                    )}
                  >
                    {PIECE_GLYPHS[piece.color + piece.type]}
                  </span>
                )}
                {isTarget && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-0 m-auto rounded-full",
                      piece ? "h-full w-full ring-4 ring-inset ring-[var(--accent-2)]/70" : "h-3 w-3 bg-[var(--accent-2)]/70"
                    )}
                  />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
