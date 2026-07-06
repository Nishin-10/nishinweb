"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Command, CornerDownLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

interface Cmd {
  label: string;
  hint: string;
  action: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setIndex(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const commands = useMemo<Cmd[]>(
    () => [
      ...navItems.map((n) => ({
        label: `Go to ${n.label}`,
        hint: n.description,
        action: () => go(n.href),
      })),
      { label: "Play Sudoku", hint: "Brain training", action: () => go("/play") },
      { label: "Play Chess", hint: "vs the engine", action: () => go("/play") },
      { label: "Brain Rot Blitz", hint: "45-second chaos", action: () => go("/play") },
      { label: "Play with friends", hint: "Ludo or Sudoku Race rooms", action: () => go("/play") },
      { label: "Tailor my CV", hint: "CV studio", action: () => go("/jobs") },
      { label: "World Cup scores", hint: "Live now", action: () => go("/football") },
      { label: "Summarize a document", hint: "Tools", action: () => go("/tools") },
    ],
    [go]
  );

  const filtered = commands.filter((c) =>
    `${c.label} ${c.hint}`.toLowerCase().includes(query.toLowerCase())
  );

  const askAI = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("companion:ask", { detail: query }));
  };

  const items: Cmd[] = filtered.length
    ? filtered
    : query.trim()
      ? [{ label: `Ask the assistant: "${query}"`, hint: "AI answer", action: askAI }]
      : [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 px-4 pt-[18vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-label="Command palette"
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-lg overflow-hidden rounded-xl border border-line bg-surface shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-line px-4">
              <Command className="h-4 w-4 text-fg-subtle" aria-hidden />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(i + 1, items.length - 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
                  if (e.key === "Enter" && items[index]) items[index].action();
                }}
                placeholder="Jump anywhere, or ask anything…"
                aria-label="Command"
                className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-subtle"
              />
              <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] text-fg-subtle">esc</kbd>
            </div>
            <ul className="max-h-72 overflow-y-auto p-2">
              {items.map((cmd, i) => (
                <li key={cmd.label}>
                  <button
                    type="button"
                    onClick={cmd.action}
                    onMouseEnter={() => setIndex(i)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm",
                      i === index ? "bg-accent-soft text-accent" : "text-fg-muted"
                    )}
                  >
                    {cmd.label.startsWith("Ask") ? (
                      <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                    ) : (
                      <CornerDownLeft className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
                    )}
                    <span className="flex-1 truncate font-medium">{cmd.label}</span>
                    <span className="truncate text-xs text-fg-subtle">{cmd.hint}</span>
                  </button>
                </li>
              ))}
              {items.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-fg-subtle">Type to search or ask.</li>
              )}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
