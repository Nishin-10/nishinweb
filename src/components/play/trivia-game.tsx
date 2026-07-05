"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { gameStats } from "@/lib/games/stats";
import { celebrate } from "@/lib/confetti";

interface Question {
  question: string;
  answers: string[];
  correct: string;
}

function decodeHtml(s: string): string {
  const el = document.createElement("textarea");
  el.innerHTML = s;
  return el.value;
}

const CATEGORIES = [
  { label: "Mixed", id: 0 },
  { label: "Science", id: 17 },
  { label: "Computers", id: 18 },
  { label: "Film", id: 11 },
  { label: "Games", id: 15 },
  { label: "History", id: 23 },
];

export function TriviaGame() {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState(0);
  const [done, setDone] = useState(false);

  const load = async (cat = category) => {
    setLoading(true);
    setError(null);
    setDone(false);
    try {
      const url = `https://opentdb.com/api.php?amount=10&type=multiple${cat ? `&category=${cat}` : ""}`;
      const res = await fetch(url);
      const json = (await res.json()) as {
        results?: Array<{ question: string; correct_answer: string; incorrect_answers: string[] }>;
      };
      if (!json.results?.length) throw new Error("No questions came back. Try another category.");
      setQuestions(
        json.results.map((q) => {
          const correct = decodeHtml(q.correct_answer);
          const answers = [...q.incorrect_answers.map(decodeHtml), correct].sort(
            () => Math.random() - 0.5
          );
          return { question: decodeHtml(q.question), answers, correct };
        })
      );
      setIndex(0);
      setScore(0);
      setPicked(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load questions.");
    } finally {
      setLoading(false);
    }
  };

  const answer = (a: string) => {
    if (picked || !questions) return;
    setPicked(a);
    const right = a === questions[index].correct;
    if (right) setScore((s) => s + 1);
    setTimeout(() => {
      if (index + 1 >= questions.length) {
        const final = score + (right ? 1 : 0);
        setDone(true);
        if (final >= 7) celebrate(final === 10 ? "big" : "win");
        gameStats.record("trivia", final, `${final}/10 correct`);
      } else {
        setIndex((i) => i + 1);
        setPicked(null);
      }
    }, 900);
  };

  if (!questions || done) {
    return (
      <div className="space-y-4 text-center">
        {done && (
          <p className="font-display text-lg font-semibold">
            You scored {score}/10{score >= 8 ? " — sharp." : score >= 5 ? " — solid." : ". Rough round."}
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant={category === c.id ? "primary" : "outline"}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </Button>
          ))}
        </div>
        <Button onClick={() => load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {done ? "Play again" : "Start trivia"}
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  }

  const q = questions[index];

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <Badge tone="accent">Question {index + 1}/10</Badge>
        <Badge tone="cyan">Score {score}</Badge>
        <Button size="sm" variant="ghost" onClick={() => setQuestions(null)}>
          <RotateCcw className="h-4 w-4" /> Quit
        </Button>
      </div>

      <motion.p
        key={index}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-lg font-semibold leading-snug"
      >
        {q.question}
      </motion.p>

      <div className="grid gap-2">
        {q.answers.map((a) => {
          const isCorrect = picked && a === q.correct;
          const isWrongPick = picked === a && a !== q.correct;
          return (
            <button
              key={a}
              onClick={() => answer(a)}
              disabled={!!picked}
              className={cn(
                "rounded-md border border-line px-4 py-3 text-left text-sm font-medium transition-all",
                !picked && "hover:border-accent hover:bg-accent-soft",
                isCorrect && "border-success bg-success-soft text-success",
                isWrongPick && "border-danger bg-danger-soft text-danger"
              )}
            >
              {a}
            </button>
          );
        })}
      </div>
    </div>
  );
}
