"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, RefreshCw, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Team {
  name: string;
  abbrev: string;
  score: string;
  logo?: string;
  winner?: boolean;
}
interface Match {
  id: string;
  status: "pre" | "in" | "post";
  statusText: string;
  venue?: string;
  round?: string;
  kickoff?: string;
  home: Team;
  away: Team;
}

const LEAGUES = [
  { key: "worldcup", label: "World Cup", cup: true },
  { key: "epl", label: "Premier League" },
  { key: "laliga", label: "La Liga" },
  { key: "bundesliga", label: "Bundesliga" },
  { key: "seriea", label: "Serie A" },
  { key: "ligue1", label: "Ligue 1" },
  { key: "ucl", label: "Champions League" },
  { key: "mls", label: "MLS" },
];

function fmtDate(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(offset: number, d: Date): string {
  if (offset === 0) return "Today";
  if (offset === -1) return "Yesterday";
  if (offset === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function TeamRow({ team, live }: { team: Team; live: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element -- ESPN CDN logos */}
      {team.logo ? (
        <img src={team.logo} alt="" className="h-6 w-6 object-contain" loading="lazy" />
      ) : (
        <span className="h-6 w-6 rounded-full bg-surface-2" aria-hidden />
      )}
      <span className={cn("flex-1 truncate text-sm", team.winner && "font-semibold")}>
        {team.name}
      </span>
      <span
        className={cn(
          "min-w-6 text-right font-display text-lg font-bold tabular-nums",
          live && "text-accent"
        )}
      >
        {team.score || "–"}
      </span>
    </div>
  );
}

export function FootballClient() {
  const [league, setLeague] = useState("worldcup");
  const [offset, setOffset] = useState(0);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [season, setSeason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const date = new Date();
  date.setDate(date.getDate() + offset);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const res = await fetch(`/api/football?league=${league}&date=${fmtDate(d)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Feed unavailable.");
      setMatches(data.matches);
      setSeason(data.season ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Feed unavailable.");
      setMatches(null);
    } finally {
      setLoading(false);
    }
  }, [league, offset]);

  useEffect(() => {
    void load();
    // Live scores: refresh every 60s while the tab is open
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const live = matches?.filter((m) => m.status === "in") ?? [];

  return (
    <div className="space-y-5">
      {/* World Cup banner */}
      {league === "worldcup" && (
        <Card className="overflow-hidden border-accent/40">
          <CardContent className="relative flex items-center gap-4 bg-[linear-gradient(120deg,var(--accent-soft),var(--accent-2-soft))]">
            {/* Mini celebrating characters drifting across the banner */}
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              {["🏆", "⚽", "🎉", "🧑‍🤝‍🧑", "🥁", "🌍", "🎺", "🚩"].map((e, i) => (
                <motion.span
                  key={i}
                  className="absolute text-lg opacity-25"
                  style={{ left: `${(i * 13 + 4) % 94}%`, top: `${(i * 37 + 10) % 70}%` }}
                  animate={{ y: [0, -8, 0], rotate: [0, i % 2 ? 14 : -14, 0] }}
                  transition={{ duration: 4 + (i % 3), delay: -i, repeat: Infinity, ease: "easeInOut" }}
                >
                  {e}
                </motion.span>
              ))}
            </div>
            <motion.div
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 1.4 }}
              className="relative shrink-0"
            >
              <Trophy className="h-11 w-11 text-warning drop-shadow-[0_0_12px_rgba(240,179,92,0.5)]" aria-hidden />
            </motion.div>
            <div className="relative">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                World Cup 2026 edition
                <motion.span
                  aria-hidden
                  animate={{ y: [0, -7, 0] }}
                  transition={{ duration: 0.7, repeat: Infinity, ease: "easeOut" }}
                  className="inline-block text-base"
                >
                  ⚽
                </motion.span>
              </h2>
              <p className="text-sm text-fg-muted">
                {season ?? "FIFA World Cup"} · live scores refresh every minute
                {live.length > 0 && ` · ${live.length} match${live.length > 1 ? "es" : ""} live now`}
              </p>
            </div>
            {live.length > 0 && (
              <Badge tone="danger" className="relative ml-auto animate-pulse-soft">● LIVE</Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* League pills */}
      <div className="flex flex-wrap gap-2">
        {LEAGUES.map((l) => (
          <button
            key={l.key}
            type="button"
            onClick={() => setLeague(l.key)}
            aria-pressed={league === l.key}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              league === l.key
                ? "border-accent bg-accent-soft text-accent"
                : "border-line text-fg-muted hover:border-line-strong hover:text-fg"
            )}
          >
            {l.cup && "🏆 "}
            {l.label}
          </button>
        ))}
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setOffset((o) => o - 1)} aria-label="Previous day">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={() => setOffset(0)}
          className="font-display text-sm font-semibold hover:text-accent"
        >
          {dayLabel(offset, date)}
        </button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={load} disabled={loading} aria-label="Refresh scores">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOffset((o) => o + 1)} aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Matches */}
      {loading && !matches && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-danger">{error}</CardContent>
        </Card>
      )}

      {matches && matches.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-fg-muted">
            No matches on this day for this competition. Try another date.
          </CardContent>
        </Card>
      )}

      {matches && matches.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {matches.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
            >
              <Card
                interactive
                className={cn("h-full", m.status === "in" && "border-accent/50")}
              >
                <CardContent className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-fg-subtle">
                      {m.round ?? m.venue ?? ""}
                    </span>
                    <Badge
                      tone={m.status === "in" ? "danger" : m.status === "post" ? "neutral" : "cyan"}
                      className={cn(m.status === "in" && "animate-pulse-soft")}
                    >
                      {m.status === "in" && "● "}
                      {m.statusText ||
                        (m.kickoff
                          ? new Date(m.kickoff).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "TBD")}
                    </Badge>
                  </div>
                  <TeamRow team={m.home} live={m.status === "in"} />
                  <TeamRow team={m.away} live={m.status === "in"} />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
