import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link
      href="/"
      className={cn("group flex items-center gap-2.5 outline-offset-4", className)}
      aria-label="Forza Nishin home"
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-lg text-white
          bg-[linear-gradient(135deg,var(--accent),var(--accent-2))]
          shadow-[var(--glow-accent)] transition-transform duration-300 group-hover:rotate-6"
      >
        <Sparkles className="h-4.5 w-4.5" aria-hidden />
      </span>
      {!compact && (
        <span className="font-display text-lg font-bold tracking-tight">
          Forza<span className="gradient-text">Nishin</span>
        </span>
      )}
    </Link>
  );
}
