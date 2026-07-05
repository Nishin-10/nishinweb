"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type NewsTopic = "ai" | "huggingface" | "cloud" | "tech";

interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  topic: NewsTopic;
  publishedAt?: string;
  excerpt?: string;
}

const TOPICS: { key: NewsTopic | "all" | "saved"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ai", label: "AI" },
  { key: "huggingface", label: "Hugging Face" },
  { key: "cloud", label: "Cloud" },
  { key: "tech", label: "Top tech" },
  { key: "saved", label: "Saved" },
];

const FAV_KEY = "companion:news-favorites";

function readFavs(): Article[] {
  try {
    return JSON.parse(window.localStorage.getItem(FAV_KEY) ?? "[]") as Article[];
  } catch {
    return [];
  }
}

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

function ArticleCard({
  article,
  saved,
  onToggleSave,
  index,
}: {
  article: Article;
  saved: boolean;
  onToggleSave: () => void;
  index: number;
}) {
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const summarize = async () => {
    if (summary) {
      setSummary(null);
      return;
    }
    setSummarizing(true);
    try {
      const res = await fetch("/api/news/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: article.title,
          excerpt: article.excerpt,
          url: article.url,
        }),
      });
      const data = (await res.json()) as { summary?: string; error?: string };
      setSummary(data.summary ?? data.error ?? "No summary available.");
    } catch {
      setSummary("Summary failed. Try again.");
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }}
    >
      <Card interactive>
        <CardContent className="space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-display font-semibold leading-snug tracking-tight hover:text-accent"
            >
              {article.title}
              <ExternalLink className="ml-1.5 inline h-3.5 w-3.5 text-fg-subtle" aria-hidden />
            </a>
            <button
              type="button"
              onClick={onToggleSave}
              aria-pressed={saved}
              aria-label={saved ? "Remove from saved" : "Save article"}
              className={cn(
                "shrink-0 rounded-md p-1.5 transition-all hover:scale-110",
                saved ? "text-accent" : "text-fg-subtle hover:text-fg"
              )}
            >
              {saved ? <BookmarkCheck className="h-4.5 w-4.5" /> : <Bookmark className="h-4.5 w-4.5" />}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
            <Badge tone="cyan">{article.source}</Badge>
            {article.publishedAt && <span>{timeAgo(article.publishedAt)}</span>}
          </div>

          {article.excerpt && (
            <p className="line-clamp-2 text-sm leading-relaxed text-fg-muted">{article.excerpt}</p>
          )}

          <div>
            <Button variant="ghost" size="sm" onClick={summarize} disabled={summarizing}>
              {summarizing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {summary ? "Hide summary" : "AI summary"}
            </Button>
            <AnimatePresence>
              {summary && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-md bg-accent-soft/60 px-3 py-2 text-sm leading-relaxed text-fg"
                >
                  {summary}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.article>
  );
}

export function NewsClient() {
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState<(typeof TOPICS)[number]["key"]>("all");
  const [favs, setFavs] = useState<Article[]>([]);

  useEffect(() => setFavs(readFavs()), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/news");
      if (!res.ok) throw new Error(`News fetch failed (${res.status}).`);
      const data = (await res.json()) as { articles: Article[] };
      setArticles(data.articles);
    } catch (e) {
      setError(e instanceof Error ? e.message : "News fetch failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleSave = (article: Article) => {
    setFavs((prev) => {
      const has = prev.some((a) => a.id === article.id);
      const next = has ? prev.filter((a) => a.id !== article.id) : [article, ...prev].slice(0, 100);
      window.localStorage.setItem(FAV_KEY, JSON.stringify(next));
      return next;
    });
  };

  const savedIds = new Set(favs.map((a) => a.id));
  const shown =
    topic === "saved"
      ? favs
      : (articles ?? []).filter((a) => topic === "all" || a.topic === topic);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {TOPICS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTopic(t.key)}
            aria-pressed={topic === t.key}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              topic === t.key
                ? "border-accent bg-accent-soft text-accent"
                : "border-line text-fg-muted hover:border-line-strong hover:text-fg"
            )}
          >
            {t.label}
            {t.key === "saved" && favs.length > 0 && ` (${favs.length})`}
          </button>
        ))}
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="ml-auto">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-danger">{error}</CardContent>
        </Card>
      )}

      {!loading && !error && shown.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-fg-muted">
            {topic === "saved"
              ? "Nothing saved yet. Hit the bookmark on any article."
              : "No articles in this topic right now."}
          </CardContent>
        </Card>
      )}

      {!loading && shown.length > 0 && (
        <div className="space-y-3">
          {shown.map((article, i) => (
            <ArticleCard
              key={article.id}
              article={article}
              saved={savedIds.has(article.id)}
              onToggleSave={() => toggleSave(article)}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
