"use client";

import { useMemo, useState } from "react";
import { diffWords } from "diff";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function DiffView({ before, after }: { before: string; after: string }) {
  const [showRemoved, setShowRemoved] = useState(true);

  const parts = useMemo(() => diffWords(before, after), [before, after]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-fg-subtle">
          <span className="rounded bg-success-soft px-1.5 py-0.5 text-success">added</span>{" "}
          <span className="rounded bg-danger-soft px-1.5 py-0.5 text-danger line-through">removed</span>
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowRemoved((v) => !v)}
          aria-pressed={showRemoved}
        >
          {showRemoved ? "Hide removed text" : "Show removed text"}
        </Button>
      </div>
      <div className="max-h-[32rem] overflow-y-auto whitespace-pre-wrap rounded-md border border-line bg-surface-2/50 p-4 font-mono text-xs leading-relaxed">
        {parts.map((part, i) => {
          if (part.removed && !showRemoved) return null;
          return (
            <span
              key={i}
              className={cn(
                part.added && "rounded-sm bg-success-soft text-success",
                part.removed && "rounded-sm bg-danger-soft text-danger line-through"
              )}
            >
              {part.value}
            </span>
          );
        })}
      </div>
    </div>
  );
}
