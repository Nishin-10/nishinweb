"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, Flame, Heart, HelpCircle, Play, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { gameStats } from "@/lib/games/stats";
import { celebrate } from "@/lib/confetti";

/* ---------------- content ---------------- */

interface FeedItem {
  emoji: string;
  label: string;
  rot: boolean;
}

const ROT: Omit<FeedItem, "rot">[] = [
  { emoji: "🚽", label: "Skibidi compilation" },
  { emoji: "😹", label: "Cat video #4917" },
  { emoji: "🤖", label: "AI slop reel" },
  { emoji: "🍿", label: "Drama thread, part 12" },
  { emoji: "📱", label: "3 a.m. doomscroll" },
  { emoji: "🍜", label: "Mukbang marathon" },
  { emoji: "🎰", label: "Gacha pull stream" },
  { emoji: "😡", label: "Rage bait post" },
  { emoji: "🗿", label: "Sigma grindset edit" },
  { emoji: "👁️", label: "Conspiracy deep dive" },
  { emoji: "💅", label: "Get-ready-with-me #83" },
  { emoji: "🔁", label: "Repost of a repost" },
];

const FOOD: Omit<FeedItem, "rot">[] = [
  { emoji: "📚", label: "Read 20 pages" },
  { emoji: "🏋️", label: "Gym session" },
  { emoji: "🥗", label: "Actual vegetables" },
  { emoji: "🎧", label: "Science podcast" },
  { emoji: "💻", label: "Deep work block" },
  { emoji: "🌳", label: "Walk outside" },
  { emoji: "💧", label: "Glass of water" },
  { emoji: "😴", label: "Sleep before midnight" },
  { emoji: "🧘", label: "Ten minutes of quiet" },
  { emoji: "🛠️", label: "Learn a skill" },
  { emoji: "✍️", label: "Journal entry" },
  { emoji: "📞", label: "Call your mom" },
];

function nextItem(): FeedItem {
  const rot = Math.random() < 0.5;
  const pool = rot ? ROT : FOOD;
  return { ...pool[Math.floor(Math.random() * pool.length)], rot };
}

/* ---------------- leaderboard ---------------- */

interface BoardEntry {
  name: string;
  score: number;
  at: string;
}

const BOARD_KEY = "companion:brainrot-board";

function readBoard(): BoardEntry[] {
  try {
    return JSON.parse(window.localStorage.getItem(BOARD_KEY) ?? "[]") as BoardEntry[];
  } catch {
    return [];
  }
}

function qualifies(board: BoardEntry[], score: number): boolean {
  if (score <= 0) return false;
  return board.length < 10 || score > board[board.length - 1].score;
}

function saveEntry(board: BoardEntry[], entry: BoardEntry): BoardEntry[] {
  const next = [...board, entry].sort((a, b) => b.score - a.score).slice(0, 10);
  window.localStorage.setItem(BOARD_KEY, JSON.stringify(next));
  return next;
}

/* ---------------- game ---------------- */

const ROUND_SECONDS = 45;
const START_WINDOW = 2000;
const MIN_WINDOW = 850;

type Phase = "menu" | "playing" | "entry";
type MenuTab = "play" | "rules" | "board";

export function BrainrotGame() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [tab, setTab] = useState<MenuTab>("play");
  const [board, setBoard] = useState<BoardEntry[]>([]);

  const [item, setItem] = useState<FeedItem>(nextItem);
  const [itemKey, setItemKey] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [maxCombo, setMaxCombo] = useState(1);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [flash, setFlash] = useState<"good" | "bad" | null>(null);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [initials, setInitials] = useState("");

  const [windowMs, setWindowMs] = useState(START_WINDOW);
  const itemTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setBoard(readBoard()), []);

  const advance = useCallback(() => {
    setItem(nextItem());
    setItemKey((k) => k + 1);
  }, []);

  const endRun = useCallback(
    (finalScore: number, finalMaxCombo: number) => {
      if (itemTimer.current) clearTimeout(itemTimer.current);
      setLastScore(finalScore);
      gameStats.record("brainrot", finalScore, `${finalScore} pts · x${finalMaxCombo} best combo`);
      const b = readBoard();
      if (qualifies(b, finalScore)) {
        if (b.length === 0 || finalScore > (b[0]?.score ?? 0)) celebrate("big");
        setPhase("entry");
      } else {
        setPhase("menu");
        setTab("board");
      }
    },
    []
  );

  // Round countdown
  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      endRun(score, maxCombo);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, endRun, score, maxCombo]);

  // Per-item shot clock: too slow = combo gone
  useEffect(() => {
    if (phase !== "playing") return;
    itemTimer.current = setTimeout(() => {
      setCombo(1);
      setFlash("bad");
      advance();
    }, windowMs);
    return () => {
      if (itemTimer.current) clearTimeout(itemTimer.current);
    };
    // windowMs only changes together with itemKey, so it can't re-arm mid-item.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, itemKey, advance]);

  const answer = useCallback(
    (saidRot: boolean) => {
      if (phase !== "playing") return;
      if (itemTimer.current) clearTimeout(itemTimer.current);
      if (saidRot === item.rot) {
        setScore((s) => s + 10 * combo);
        setCombo((c) => {
          const n = Math.min(c + 1, 5);
          setMaxCombo((m) => Math.max(m, n));
          return n;
        });
        setFlash("good");
        setWindowMs((w) => Math.max(MIN_WINDOW, w - 30));
        advance();
      } else {
        setFlash("bad");
        setCombo(1);
        setLives((l) => {
          if (l - 1 <= 0) {
            endRun(score, maxCombo);
            return 0;
          }
          advance();
          return l - 1;
        });
      }
    },
    [phase, item, combo, advance, endRun, score, maxCombo]
  );

  // Keyboard: left = rot, right = brain food
  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") answer(true);
      if (e.key === "ArrowRight") answer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, answer]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 220);
    return () => clearTimeout(t);
  }, [flash, itemKey]);

  const start = () => {
    setScore(0);
    setCombo(1);
    setMaxCombo(1);
    setLives(3);
    setTimeLeft(ROUND_SECONDS);
    setWindowMs(START_WINDOW);
    setLastScore(null);
    advance();
    setPhase("playing");
  };

  const submitInitials = () => {
    const name = (initials.trim() || "???").toUpperCase().slice(0, 3);
    setBoard(saveEntry(readBoard(), { name, score: lastScore ?? 0, at: new Date().toISOString() }));
    setInitials("");
    setPhase("menu");
    setTab("board");
  };

  /* ---------------- render ---------------- */

  if (phase === "playing") {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex items-center gap-2">
          <Badge tone="accent">Score {score}</Badge>
          <Badge tone={combo > 1 ? "warning" : "neutral"}>
            <Flame className="h-3 w-3" /> x{combo}
          </Badge>
          <span className="flex gap-0.5" aria-label={`${lives} lives left`}>
            {[...Array(3)].map((_, i) => (
              <Heart
                key={i}
                className={cn("h-4 w-4", i < lives ? "fill-[var(--danger)] text-danger" : "text-fg-subtle opacity-40")}
              />
            ))}
          </span>
          <span className="ml-auto font-mono text-sm text-fg-muted">{timeLeft}s</span>
        </div>

        {/* Shot-clock bar */}
        <div className="h-1 overflow-hidden rounded-full bg-surface-2">
          <motion.div
            key={itemKey}
            className="h-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))]"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: windowMs / 1000, ease: "linear" }}
          />
        </div>

        <motion.div
          animate={
            flash === "bad"
              ? { x: [0, -8, 8, -5, 5, 0] }
              : flash === "good"
                ? { scale: [1, 1.03, 1] }
                : {}
          }
          transition={{ duration: 0.22 }}
        >
          <Card
            className={cn(
              "transition-colors",
              flash === "good" && "border-success",
              flash === "bad" && "border-danger"
            )}
          >
            <CardContent className="py-10 text-center">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={itemKey}
                  initial={{ opacity: 0, y: 30, rotate: -4, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -30, rotate: 4, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <div className="text-6xl">{item.emoji}</div>
                  <p className="mt-3 font-display text-lg font-semibold">{item.label}</p>
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="danger" size="lg" onClick={() => answer(true)}>
            🧠🔥 Brain rot
          </Button>
          <Button size="lg" onClick={() => answer(false)}>
            🥦 Brain food
          </Button>
        </div>
        <p className="text-center text-xs text-fg-subtle">
          Arrow keys work too: ← rot, → food.
        </p>
      </div>
    );
  }

  if (phase === "entry") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-sm"
      >
        <Card>
          <CardContent className="space-y-4 py-8 text-center">
            <Trophy className="mx-auto h-10 w-10 text-warning" />
            <div>
              <p className="font-display text-2xl font-bold">{lastScore} points</p>
              <p className="text-sm text-fg-muted">That&apos;s a leaderboard score. Claim it.</p>
            </div>
            <input
              value={initials}
              onChange={(e) => setInitials(e.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 3))}
              onKeyDown={(e) => e.key === "Enter" && submitInitials()}
              placeholder="AAA"
              maxLength={3}
              autoFocus
              aria-label="Your initials, three letters"
              className="mx-auto block h-14 w-32 rounded-md border border-line bg-surface text-center
                font-mono text-2xl font-bold uppercase tracking-[0.3em] focus:border-accent focus:outline-none"
            />
            <Button onClick={submitInitials} className="w-full">
              Save score
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Menu
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div role="tablist" aria-label="Brain Rot Blitz menu" className="flex gap-1 rounded-md bg-surface-2 p-1">
        {(
          [
            ["play", "Play", Play],
            ["rules", "How to play", HelpCircle],
            ["board", "Leaderboard", Trophy],
          ] as [MenuTab, string, typeof Play][]
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-2 text-sm font-medium transition-colors",
              tab === key ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </button>
        ))}
      </div>

      {tab === "play" && (
        <Card>
          <CardContent className="space-y-4 py-10 text-center">
            <div className="text-5xl">🧠🔥</div>
            <div>
              <h3 className="font-display text-xl font-bold">Brain Rot Blitz</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-fg-muted">
                Your feed is coming at you fast. Sort brain rot from brain food
                before the clock eats your streak.
              </p>
            </div>
            {lastScore !== null && (
              <Badge tone="accent">Last run: {lastScore} pts</Badge>
            )}
            <Button size="lg" onClick={start}>
              <Play className="h-5 w-5" /> Start 45-second run
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === "rules" && (
        <Card>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <h3 className="font-display font-semibold">How to play</h3>
            <ul className="list-disc space-y-2 pl-5 text-fg-muted">
              <li>
                A feed item appears. Decide: <strong className="text-fg">🧠🔥 Brain rot</strong> (left
                button or ← key) or <strong className="text-fg">🥦 Brain food</strong> (right button or → key).
              </li>
              <li>You have <strong className="text-fg">45 seconds</strong> and <strong className="text-fg">3 lives</strong>. A wrong sort costs a life.</li>
              <li>
                Each item has a shot clock (the thin bar). Let it run out and
                your combo resets, but you keep your lives.
              </li>
              <li>
                Correct answers build a combo up to <strong className="text-fg">x5</strong>. Points per item
                are 10 × combo, so a held streak is worth far more than safe, slow play.
              </li>
              <li>The feed speeds up as you get better. It always does.</li>
              <li>Crack the top 10 and you sign the leaderboard, arcade style.</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {tab === "board" && (
        <Card>
          <CardContent>
            <h3 className="mb-3 font-display font-semibold">Leaderboard</h3>
            {board.length === 0 ? (
              <p className="py-6 text-center text-sm text-fg-muted">
                Nobody yet. The first run sets the bar.
              </p>
            ) : (
              <ol className="space-y-1.5">
                {board.map((entry, i) => (
                  <motion.li
                    key={`${entry.name}-${entry.at}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                      i === 0 ? "bg-warning-soft" : i % 2 ? "bg-surface-2/50" : ""
                    )}
                  >
                    <span className="w-6 font-mono text-fg-subtle">{i + 1}.</span>
                    <span className="font-mono font-bold tracking-widest">{entry.name}</span>
                    {i === 0 && <Trophy className="h-3.5 w-3.5 text-warning" aria-hidden />}
                    <span className="ml-auto font-display font-semibold">{entry.score}</span>
                    <span className="w-20 text-right text-xs text-fg-subtle">
                      {new Date(entry.at).toLocaleDateString()}
                    </span>
                  </motion.li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      )}

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-fg-subtle">
        <Brain className="h-3.5 w-3.5" aria-hidden />
        Ironically, this is brain training. Sort of.
      </p>
    </div>
  );
}
