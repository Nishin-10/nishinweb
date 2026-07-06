"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ModelChoice = "claude" | "groq" | "gemini";

const KEY = "companion:model-pref";

/** Current app-wide model preference (shared by every AI feature). */
export function getModelPref(): ModelChoice {
  if (typeof window === "undefined") return "claude";
  const v = window.localStorage.getItem(KEY);
  return v === "groq" || v === "gemini" ? v : "claude";
}

const OPTIONS: { value: ModelChoice; label: string; hint: string }[] = [
  { value: "claude", label: "Claude", hint: "paid · best writing" },
  { value: "groq", label: "Groq", hint: "free · fastest" },
  { value: "gemini", label: "Gemini", hint: "free · balanced" },
];

export function ModelPicker({ className }: { className?: string }) {
  const [choice, setChoice] = useState<ModelChoice>("claude");

  useEffect(() => setChoice(getModelPref()), []);

  const pick = (value: ModelChoice) => {
    setChoice(value);
    window.localStorage.setItem(KEY, value);
  };

  return (
    <div
      role="radiogroup"
      aria-label="AI model"
      className={cn("flex gap-1 rounded-md bg-surface-2 p-1", className)}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={choice === opt.value}
          onClick={() => pick(opt.value)}
          className={cn(
            "flex-1 rounded px-2.5 py-1.5 text-left transition-colors",
            choice === opt.value ? "bg-surface shadow-card" : "hover:bg-surface/50"
          )}
        >
          <span className={cn("block text-xs font-semibold", choice === opt.value ? "text-fg" : "text-fg-muted")}>
            {opt.label}
          </span>
          <span className="block text-[10px] text-fg-subtle">{opt.hint}</span>
        </button>
      ))}
    </div>
  );
}
