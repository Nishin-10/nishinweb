"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { gameStats } from "@/lib/games/stats";

const EMOJI = ["🚀", "🎧", "🌵", "🐙", "🍜", "🎲", "🛰️", "🦕", "🍉", "🎯", "🧊", "🌋"];

interface CardState {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

function deal(pairs: number): CardState[] {
  const chosen = [...EMOJI].sort(() => Math.random() - 0.5).slice(0, pairs);
  return [...chosen, ...chosen]
    .sort(() => Math.random() - 0.5)
    .map((emoji, id) => ({ id, emoji, flipped: false, matched: false }));
}

export function MemoryGame() {
  const [cards, setCards] = useState<CardState[]>(() => deal(8));
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);
  const [won, setWon] = useState(false);

  const flipped = cards.filter((c) => c.flipped && !c.matched);

  useEffect(() => {
    if (flipped.length !== 2) return;
    setLock(true);
    const [a, b] = flipped;
    const timer = setTimeout(() => {
      setCards((cs) => {
        const match = a.emoji === b.emoji;
        const next = cs.map((c) =>
          c.id === a.id || c.id === b.id
            ? { ...c, flipped: false, matched: c.matched || match }
            : c
        );
        if (next.every((c) => c.matched)) {
          setWon(true);
          const score = Math.max(500 - (moves + 1) * 10, 50);
          gameStats.record("memory", score, `${moves + 1} moves`);
        }
        return next;
      });
      setMoves((m) => m + 1);
      setLock(false);
    }, a.emoji === b.emoji ? 350 : 800);
    return () => clearTimeout(timer);
  }, [flipped, moves]);

  const flip = (id: number) => {
    if (lock || won) return;
    setCards((cs) =>
      cs.map((c) =>
        c.id === id && !c.matched && !c.flipped && flipped.length < 2
          ? { ...c, flipped: true }
          : c
      )
    );
  };

  const reset = () => {
    setCards(deal(8));
    setMoves(0);
    setWon(false);
    setLock(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge tone="accent">{moves} moves</Badge>
        {won && (
          <Badge tone="success">
            <Sparkles className="h-3 w-3" /> All matched
          </Badge>
        )}
        <Button size="sm" variant="ghost" onClick={reset} className="ml-auto">
          <RotateCcw className="h-4 w-4" /> New game
        </Button>
      </div>

      <div className="mx-auto grid w-fit grid-cols-4 gap-2">
        {cards.map((card) => {
          const showing = card.flipped || card.matched;
          return (
            <motion.button
              key={card.id}
              onClick={() => flip(card.id)}
              whileTap={{ scale: 0.92 }}
              aria-label={showing ? card.emoji : "Hidden card"}
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-md text-3xl sm:h-20 sm:w-20 sm:text-4xl",
                "transition-all duration-300 [transform-style:preserve-3d]",
                showing
                  ? "bg-surface shadow-card [transform:rotateY(0deg)]"
                  : "bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] [transform:rotateY(180deg)]",
                card.matched && "opacity-60"
              )}
            >
              {showing ? card.emoji : ""}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
