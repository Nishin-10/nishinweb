"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { KeyRound, Loader2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { celebrate } from "@/lib/confetti";

function GateForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      if (!res.ok) throw new Error();
      setUnlocked(true);
      celebrate("win");
      setTimeout(() => router.replace(params.get("from") ?? "/"), 650);
    } catch {
      setError(true);
      setBusy(false);
      setTimeout(() => setError(false), 700);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.21, 0.62, 0.35, 1] }}
      className="glass relative w-full max-w-sm rounded-xl border border-line p-8 shadow-lift"
    >
      <motion.div
        animate={error ? { x: [0, -10, 10, -7, 7, -3, 0] } : {}}
        transition={{ duration: 0.45 }}
      >
        <motion.span
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full text-white
            bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] shadow-[var(--glow-accent)]"
          animate={unlocked ? { rotate: [0, -12, 0], scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.5 }}
        >
          {unlocked ? <Unlock className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
        </motion.span>

        <h1 className="text-center font-display text-xl font-bold tracking-tight">
          Companion is private
        </h1>
        <p className="mb-6 mt-1.5 text-center text-sm text-fg-muted">
          Enter the passphrase to come in.
        </p>

        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Passphrase"
              aria-label="Passphrase"
              aria-invalid={error}
              autoFocus
              className={`h-11 w-full rounded-md border bg-surface pl-9 pr-3 text-sm transition-colors
                placeholder:text-fg-subtle focus:outline-none
                ${error ? "border-danger" : "border-line focus:border-accent"}`}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy || !passphrase}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {unlocked ? "Welcome back" : "Unlock"}
          </Button>
          <p aria-live="polite" className="h-4 text-center text-xs text-danger">
            {error ? "Wrong passphrase. Try again." : ""}
          </p>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function GatePage() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
      {/* Aurora backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="aurora-blob left-[8%] top-[12%] h-[26rem] w-[26rem] bg-[radial-gradient(circle,var(--accent-soft),transparent_60%)]" />
        <div className="aurora-blob right-[6%] top-[30%] h-[30rem] w-[30rem] bg-[radial-gradient(circle,var(--accent-2-soft),transparent_60%)] [animation-delay:-7s]" />
        <div className="aurora-blob bottom-[4%] left-[30%] h-[24rem] w-[24rem] bg-[radial-gradient(circle,var(--accent-soft),transparent_60%)] [animation-delay:-13s]" />
        <div className="bg-grid-fade absolute inset-0" />
      </div>
      <Suspense>
        <GateForm />
      </Suspense>
    </div>
  );
}
