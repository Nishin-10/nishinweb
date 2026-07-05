"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Brain,
  Crown,
  Flame,
  Grid3X3,
  HelpCircle,
  Layers,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { gameStats, type GameStats } from "@/lib/games/stats";
import { SudokuGame } from "./sudoku-game";
import { ChessGame } from "./chess-game";
import { Game2048 } from "./game-2048";
import { MemoryGame } from "./memory-game";
import { TriviaGame } from "./trivia-game";
import { ReflexGame } from "./reflex-game";
import { BrainrotGame } from "./brainrot-game";

type GameId = "sudoku" | "chess" | "2048" | "memory" | "trivia" | "reflex" | "brainrot";

const GAMES: {
  id: GameId;
  title: string;
  tagline: string;
  icon: typeof Brain;
  group: "Brain training" | "Quick fun";
  scoreUnit: string;
}[] = [
  { id: "sudoku", title: "Sudoku", tagline: "Three difficulties, honest single-solution puzzles.", icon: Grid3X3, group: "Brain training", scoreUnit: "pts" },
  { id: "chess", title: "Chess", tagline: "Play white against an engine with three strength levels.", icon: Crown, group: "Brain training", scoreUnit: "wins" },
  { id: "2048", title: "2048", tagline: "Slide, merge, and chase the big tile.", icon: Layers, group: "Brain training", scoreUnit: "pts" },
  { id: "memory", title: "Memory Match", tagline: "Sixteen cards, eight pairs, how few moves?", icon: Brain, group: "Quick fun", scoreUnit: "pts" },
  { id: "trivia", title: "Trivia", tagline: "Ten questions from the category you pick.", icon: HelpCircle, group: "Quick fun", scoreUnit: "/10" },
  { id: "reflex", title: "Reflex", tagline: "Tap on green. Average of five rounds counts.", icon: Zap, group: "Quick fun", scoreUnit: "ms" },
  { id: "brainrot", title: "Brain Rot Blitz", tagline: "Sort the feed: rot or brain food. 45 seconds, leaderboard glory.", icon: Flame, group: "Quick fun", scoreUnit: "pts" },
];

function StatsPanel() {
  const [all, setAll] = useState<Record<string, GameStats>>({});
  useEffect(() => setAll(gameStats.all()), []);

  const played = GAMES.filter((g) => all[g.id]?.plays);

  if (played.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-fg-muted">
          No games played yet. Your bests and history will collect here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {played.map((g) => {
        const s = all[g.id];
        return (
          <Card key={g.id}>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold">{g.title}</h3>
                <Badge tone="accent">
                  best {s.best}{g.scoreUnit === "/10" ? "/10" : ` ${g.scoreUnit}`}
                </Badge>
              </div>
              <p className="text-xs text-fg-subtle">{s.plays} plays</p>
              <ul className="space-y-1 text-xs text-fg-muted">
                {s.history.slice(0, 4).map((h, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="truncate">{h.label}</span>
                    <span className="shrink-0 text-fg-subtle">
                      {new Date(h.at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function PlayClient() {
  const [active, setActive] = useState<GameId | "stats" | null>(null);

  if (active) {
    const game = GAMES.find((g) => g.id === active);
    return (
      <div>
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setActive(null)}>
            <ArrowLeft className="h-4 w-4" /> All games
          </Button>
          <h2 className="font-display text-lg font-semibold">
            {active === "stats" ? "Your stats" : game?.title}
          </h2>
        </div>
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {active === "sudoku" && <SudokuGame />}
          {active === "chess" && <ChessGame />}
          {active === "2048" && <Game2048 />}
          {active === "memory" && <MemoryGame />}
          {active === "trivia" && <TriviaGame />}
          {active === "reflex" && <ReflexGame />}
          {active === "brainrot" && <BrainrotGame />}
          {active === "stats" && <StatsPanel />}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {(["Brain training", "Quick fun"] as const).map((group) => (
        <section key={group} aria-label={group}>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-fg-subtle">
            {group}
          </h2>
          <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GAMES.filter((g) => g.group === group).map((g) => {
              const Icon = g.icon;
              return (
                <RevealItem key={g.id}>
                  <button
                    type="button"
                    onClick={() => setActive(g.id)}
                    className="block w-full rounded-lg text-left outline-offset-4"
                  >
                    <Card interactive className="group h-full">
                      <CardContent className="flex items-start gap-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent transition-transform duration-300 group-hover:scale-110">
                          <Icon className="h-5.5 w-5.5" aria-hidden />
                        </span>
                        <div>
                          <h3 className="font-display font-semibold">{g.title}</h3>
                          <p className="mt-1 text-sm text-fg-muted">{g.tagline}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                </RevealItem>
              );
            })}
          </RevealGroup>
        </section>
      ))}

      <AnimatePresence>
        <Button variant="outline" onClick={() => setActive("stats")}>
          <BarChart3 className="h-4 w-4" /> View my stats
        </Button>
      </AnimatePresence>
    </div>
  );
}
