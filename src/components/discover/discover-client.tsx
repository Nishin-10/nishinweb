"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Clapperboard, Gamepad2, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LANGUAGES, rankWithFeedback, type RecItem, type RecKind } from "@/lib/recs";
import { RecCard } from "./rec-card";

type Tab = RecKind;

/* ---------- filter primitives ---------- */

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-xs font-medium text-fg-subtle">{label}</span>
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-line text-fg-muted hover:border-line-strong hover:text-fg"
      )}
    >
      {children}
    </button>
  );
}

/* ---------- constants ---------- */

const BOOK_GENRES = ["fantasy", "science fiction", "mystery", "romance", "history", "biography", "self-help", "horror", "poetry"];
const BOOK_MOODS = ["", "uplifting", "dark", "cozy", "thoughtful", "thrilling"];
const BOOK_LENGTHS = ["", "short", "medium", "long"];
const BOOK_ERAS = ["", "classic", "20th", "modern"];

const MOVIE_GENRES = ["drama", "comedy", "thriller", "sci-fi", "action", "romance", "horror", "animation", "documentary", "mystery"];
const MOVIE_ERAS = ["", "classic", "80s90s", "2000s", "recent"];
const MOVIE_PROVIDERS = ["", "netflix", "prime video", "disney+", "hulu", "max"];

const GAME_GENRES = ["action", "adventure", "rpg", "strategy", "shooter", "racing", "sports", "card", "puzzle", "indie"];
const GAME_PLATFORMS = ["", "pc", "playstation", "xbox", "switch", "mobile"];
const GAME_MOODS = ["", "relaxing", "competitive", "story-driven", "challenging"];

/* ---------- panel ---------- */

function usePanel(kind: RecKind, buildUrl: () => string) {
  const [items, setItems] = useState<RecItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildUrl());
      const data = (await res.json()) as { items?: RecItem[]; error?: string; note?: string };
      if (!res.ok || !data.items) throw new Error(data.error ?? "Lookup failed.");
      setItems(rankWithFeedback(data.items, kind));
      setNote(data.note ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed.");
      setItems(null);
    } finally {
      setLoading(false);
    }
  }, [buildUrl, kind]);

  return { items, loading, error, note, load };
}

function ResultGrid({
  items,
  loading,
  error,
  note,
}: {
  items: RecItem[] | null;
  loading: boolean;
  error: string | null;
  note: string | null;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-72 w-full" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-fg-muted">{error}</CardContent>
      </Card>
    );
  }
  if (!items) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-14 text-center text-sm text-fg-muted">
          <Sparkles className="h-6 w-6 text-accent" aria-hidden />
          Set your filters and hit Recommend.
        </CardContent>
      </Card>
    );
  }
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-fg-muted">
          Nothing matched that combination. Loosen a filter and try again.
        </CardContent>
      </Card>
    );
  }
  return (
    <div>
      {note && <p className="mb-3 text-xs text-fg-subtle">{note}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <RecCard key={item.id} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}

/* ---------- tab panels ---------- */

function BooksPanel() {
  const [genre, setGenre] = useState("fantasy");
  const [language, setLanguage] = useState("eng");
  const [mood, setMood] = useState("");
  const [length, setLength] = useState("");
  const [era, setEra] = useState("");

  const buildUrl = useCallback(
    () =>
      `/api/recs/books?genre=${encodeURIComponent(genre)}&language=${language}&mood=${mood}&length=${length}&era=${era}`,
    [genre, language, mood, length, era]
  );
  const panel = usePanel("book", buildUrl);

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-3">
          <FilterRow label="Genre">
            {BOOK_GENRES.map((g) => (
              <Pill key={g} active={genre === g} onClick={() => setGenre(g)}>{g}</Pill>
            ))}
          </FilterRow>
          <FilterRow label="Language">
            {LANGUAGES.slice(0, 7).map((l) => (
              <Pill key={l.book} active={language === l.book} onClick={() => setLanguage(l.book)}>
                {l.label}
              </Pill>
            ))}
          </FilterRow>
          <FilterRow label="Mood">
            {BOOK_MOODS.map((m) => (
              <Pill key={m || "any"} active={mood === m} onClick={() => setMood(m)}>{m || "any"}</Pill>
            ))}
          </FilterRow>
          <FilterRow label="Length">
            {BOOK_LENGTHS.map((l) => (
              <Pill key={l || "any"} active={length === l} onClick={() => setLength(l)}>{l || "any"}</Pill>
            ))}
          </FilterRow>
          <FilterRow label="Era">
            {BOOK_ERAS.map((e) => (
              <Pill key={e || "any"} active={era === e} onClick={() => setEra(e)}>
                {e === "20th" ? "1950-2000" : e || "any"}
              </Pill>
            ))}
          </FilterRow>
          <p className="text-xs text-fg-subtle">
            Language means an edition exists in that language, so translated classics show up too.
          </p>
          <Button onClick={panel.load} disabled={panel.loading}>
            {panel.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Recommend books
          </Button>
        </CardContent>
      </Card>
      <ResultGrid {...panel} />
    </div>
  );
}

function MoviesPanel() {
  const [genre, setGenre] = useState("drama");
  const [langs, setLangs] = useState<string[]>(["en"]);
  const [era, setEra] = useState("");
  const [provider, setProvider] = useState("");

  const toggleLang = (code: string) =>
    setLangs((prev) =>
      prev.includes(code)
        ? prev.length > 1
          ? prev.filter((c) => c !== code)
          : prev
        : [...prev, code].slice(-4)
    );

  const buildUrl = useCallback(
    () =>
      `/api/recs/movies?genre=${genre}&languages=${langs.join(",")}&era=${era}&provider=${encodeURIComponent(provider)}`,
    [genre, langs, era, provider]
  );
  const panel = usePanel("movie", buildUrl);

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-3">
          <FilterRow label="Genre">
            {MOVIE_GENRES.map((g) => (
              <Pill key={g} active={genre === g} onClick={() => setGenre(g)}>{g}</Pill>
            ))}
          </FilterRow>
          <FilterRow label="Languages">
            {LANGUAGES.map((l) => (
              <Pill key={l.movie} active={langs.includes(l.movie)} onClick={() => toggleLang(l.movie)}>
                {l.label}
              </Pill>
            ))}
          </FilterRow>
          <FilterRow label="Era">
            {MOVIE_ERAS.map((e) => (
              <Pill key={e || "any"} active={era === e} onClick={() => setEra(e)}>
                {e === "80s90s" ? "'80s-'90s" : e || "any"}
              </Pill>
            ))}
          </FilterRow>
          <FilterRow label="Streaming">
            {MOVIE_PROVIDERS.map((p) => (
              <Pill key={p || "any"} active={provider === p} onClick={() => setProvider(p)}>{p || "any"}</Pill>
            ))}
          </FilterRow>
          <p className="text-xs text-fg-subtle">
            Pick up to four languages to mix, say, Korean and Spanish thrillers in one list.
          </p>
          <Button onClick={panel.load} disabled={panel.loading}>
            {panel.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Recommend movies
          </Button>
        </CardContent>
      </Card>
      <ResultGrid {...panel} />
    </div>
  );
}

function GamesPanel() {
  const [genre, setGenre] = useState("rpg");
  const [platform, setPlatform] = useState("");
  const [mood, setMood] = useState("");

  const buildUrl = useCallback(
    () => `/api/recs/games?genre=${genre}&platform=${platform}&mood=${mood}`,
    [genre, platform, mood]
  );
  const panel = usePanel("game", buildUrl);

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-3">
          <FilterRow label="Genre">
            {GAME_GENRES.map((g) => (
              <Pill key={g} active={genre === g} onClick={() => setGenre(g)}>{g}</Pill>
            ))}
          </FilterRow>
          <FilterRow label="Platform">
            {GAME_PLATFORMS.map((p) => (
              <Pill key={p || "any"} active={platform === p} onClick={() => setPlatform(p)}>{p || "any"}</Pill>
            ))}
          </FilterRow>
          <FilterRow label="Mood">
            {GAME_MOODS.map((m) => (
              <Pill key={m || "any"} active={mood === m} onClick={() => setMood(m)}>{m || "any"}</Pill>
            ))}
          </FilterRow>
          <Button onClick={panel.load} disabled={panel.loading}>
            {panel.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Recommend games
          </Button>
        </CardContent>
      </Card>
      <ResultGrid {...panel} />
    </div>
  );
}

/* ---------- root ---------- */

export function DiscoverClient() {
  const [tab, setTab] = useState<Tab>("book");

  const tabs = [
    ["book", "Books", BookOpen],
    ["movie", "Movies", Clapperboard],
    ["game", "Games", Gamepad2],
  ] as const;

  return (
    <div>
      <div role="tablist" aria-label="Recommendation type" className="mb-6 flex gap-1 rounded-md bg-surface-2 p-1 sm:w-fit">
        {tabs.map(([key, label, Icon]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors sm:flex-none",
              tab === key ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "book" && <BooksPanel />}
          {tab === "movie" && <MoviesPanel />}
          {tab === "game" && <GamesPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
