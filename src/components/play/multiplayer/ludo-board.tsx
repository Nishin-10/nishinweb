"use client";

import { motion } from "framer-motion";
import { Dice5, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HOME_COLUMNS,
  SAFE_CELLS,
  TRACK,
  trackIndex,
  type LudoState,
} from "@/lib/realtime/ludo";

const COLOR_BG = ["bg-[#e5484d]", "bg-[#30a46c]", "bg-[#f5a623]", "bg-[#4f7df0]"];
const COLOR_SOFT = ["bg-[#e5484d]/15", "bg-[#30a46c]/15", "bg-[#f5a623]/15", "bg-[#4f7df0]/15"];
const COLOR_NAME = ["Red", "Green", "Yellow", "Blue"];

/** Base quadrant origin per color: [col, row]. */
const BASE_ORIGIN: [number, number][] = [[0, 0], [9, 0], [9, 9], [0, 9]];
const BASE_SPOTS: [number, number][] = [[1.5, 1.5], [3.5, 1.5], [1.5, 3.5], [3.5, 3.5]];

interface LudoView extends LudoState {
  movable: number[];
}

export function LudoBoard({
  state,
  myId,
  onRoll,
  onMove,
  busy,
}: {
  state: LudoView;
  myId: string;
  onRoll: () => void;
  onMove: (tokenIdx: number) => void;
  busy: boolean;
}) {
  const me = state.players.find((p) => p.id === myId);
  const current = state.players[state.turn];
  const myTurn = current?.id === myId && !state.winner;

  // Map cells to occupying tokens
  const cellTokens = new Map<string, { color: number; tokenIdx: number; mine: boolean; movable: boolean }[]>();
  for (const player of state.players) {
    player.tokens.forEach((p, tokenIdx) => {
      let coord: [number, number] | null = null;
      if (p === -1) {
        const [ox, oy] = BASE_ORIGIN[player.color];
        const [sx, sy] = BASE_SPOTS[tokenIdx];
        coord = [ox + sx, oy + sy];
      } else if (p <= 50) {
        coord = TRACK[trackIndex(player.color, p)];
      } else if (p <= 55) {
        coord = HOME_COLUMNS[player.color][p - 51];
      } else {
        coord = [7, 7];
      }
      const key = `${coord[0]},${coord[1]}`;
      const list = cellTokens.get(key) ?? [];
      list.push({
        color: player.color,
        tokenIdx,
        mine: player.id === myId,
        movable: myTurn && player.id === myId && state.movable.includes(tokenIdx),
      });
      cellTokens.set(key, list);
    });
  }

  const trackSet = new Map<string, number>();
  TRACK.forEach(([x, y], i) => trackSet.set(`${x},${y}`, i));
  const homeSet = new Map<string, number>();
  HOME_COLUMNS.forEach((cells, color) =>
    cells.forEach(([x, y]) => homeSet.set(`${x},${y}`, color))
  );
  const startCells = new Map<string, number>();
  [0, 13, 26, 39].forEach((idx, color) => {
    const [x, y] = TRACK[idx];
    startCells.set(`${x},${y}`, color);
  });

  return (
    <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start">
      {/* Board */}
      <div
        className="grid aspect-square w-full max-w-[min(92vw,480px)] grid-cols-15 gap-px rounded-xl border-2 border-line-strong bg-line p-px"
        style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}
        role="grid"
        aria-label="Ludo board"
      >
        {Array.from({ length: 225 }, (_, i) => {
          const x = i % 15;
          const y = Math.floor(i / 15);
          const key = `${x},${y}`;
          const onTrack = trackSet.has(key);
          const homeColor = homeSet.get(key);
          const startColor = startCells.get(key);
          const inBase =
            (x < 6 && y < 6) ? 0 : (x > 8 && y < 6) ? 1 : (x > 8 && y > 8) ? 2 : (x < 6 && y > 8) ? 3 : null;
          const isCenter = x >= 6 && x <= 8 && y >= 6 && y <= 8 && !onTrack && homeColor === undefined;
          const isSafe = onTrack && SAFE_CELLS.has(trackSet.get(key)!);
          const tokens = cellTokens.get(key) ?? [];

          return (
            <div
              key={key}
              className={cn(
                "relative flex items-center justify-center",
                onTrack || homeColor !== undefined
                  ? "bg-surface"
                  : inBase !== null
                    ? COLOR_SOFT[inBase]
                    : isCenter
                      ? "bg-[linear-gradient(135deg,var(--accent-soft),var(--accent-2-soft))]"
                      : "bg-surface-2/60",
                startColor !== undefined && COLOR_SOFT[startColor],
                homeColor !== undefined && COLOR_SOFT[homeColor]
              )}
            >
              {isSafe && startColor === undefined && (
                <span className="absolute inset-[22%] rounded-full border border-line-strong opacity-60" aria-hidden />
              )}
              {tokens.map((t, ti) => (
                <motion.button
                  key={`${t.color}-${t.tokenIdx}`}
                  layout
                  layoutId={`token-${t.color}-${t.tokenIdx}`}
                  disabled={!t.movable || busy}
                  onClick={() => onMove(t.tokenIdx)}
                  aria-label={`${COLOR_NAME[t.color]} token${t.movable ? ", movable" : ""}`}
                  className={cn(
                    "absolute rounded-full border-2 border-white/70 shadow-md",
                    COLOR_BG[t.color],
                    tokens.length > 1 ? "h-[55%] w-[55%]" : "h-[72%] w-[72%]",
                    t.movable && "cursor-pointer ring-2 ring-white animate-pulse-soft"
                  )}
                  style={tokens.length > 1 ? { left: `${12 + ti * 18}%`, top: `${12 + ti * 14}%` } : undefined}
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="w-full max-w-xs space-y-3">
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="mb-2 text-sm text-fg-muted" aria-live="polite">{state.note}</p>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-lg border-2 font-display text-xl font-bold",
                state.lastRoll ? "border-accent text-accent" : "border-line text-fg-subtle"
              )}
              aria-label={state.lastRoll ? `Last roll: ${state.lastRoll}` : "No roll yet"}
            >
              {state.lastRoll ?? "–"}
            </div>
            {myTurn && state.dice === null && (
              <Button onClick={onRoll} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dice5 className="h-4 w-4" />}
                Roll
              </Button>
            )}
            {myTurn && state.dice !== null && (
              <Badge tone="accent">Pick a glowing token</Badge>
            )}
            {!myTurn && !state.winner && (
              <Badge>Waiting for {current?.name}…</Badge>
            )}
          </div>
        </div>

        <ul className="space-y-1.5">
          {state.players.map((p, i) => (
            <li
              key={p.id}
              className={cn(
                "flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm",
                i === state.turn && !state.winner && "border-accent bg-accent-soft/40"
              )}
            >
              <span className={cn("h-3 w-3 rounded-full", COLOR_BG[p.color])} aria-hidden />
              <span className="font-medium">{p.name}</span>
              {p.id === myId && <Badge className="ml-1">you</Badge>}
              <span className="ml-auto text-xs text-fg-subtle">
                {p.tokens.filter((t) => t === 56).length}/4 home
              </span>
            </li>
          ))}
        </ul>

        {state.winner && (
          <div className="rounded-lg bg-success-soft p-4 text-center font-display font-semibold text-success">
            🏆 {state.players.find((p) => p.id === state.winner)?.name} wins!
            {state.winner === me?.id && " That's you."}
          </div>
        )}
      </div>
    </div>
  );
}
