/**
 * Recommendation domain types + the thumbs up/down feedback loop.
 * Feedback lives in localStorage; items get re-ranked client-side by how much
 * their tags overlap with what you liked or disliked before.
 */

export type RecKind = "book" | "movie" | "game";

export interface RecItem {
  id: string;
  kind: RecKind;
  title: string;
  subtitle: string; // author / director-ish line
  blurb: string;
  image?: string;
  rating?: number; // normalized 0-10
  year?: number;
  tags: string[]; // genres, language, mood terms — used by the feedback loop
  links: { label: string; url: string }[];
  meta?: string; // pages, platform list, etc.
}

export interface RecFeedback {
  id: string;
  kind: RecKind;
  liked: boolean;
  tags: string[];
  at: string;
}

const KEY = "companion:rec-feedback";

export const recFeedback = {
  all(): RecFeedback[] {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as RecFeedback[];
    } catch {
      return [];
    }
  },
  get(id: string): RecFeedback | undefined {
    return recFeedback.all().find((f) => f.id === id);
  },
  set(item: RecItem, liked: boolean) {
    const rest = recFeedback.all().filter((f) => f.id !== item.id);
    rest.push({ id: item.id, kind: item.kind, liked, tags: item.tags, at: new Date().toISOString() });
    window.localStorage.setItem(KEY, JSON.stringify(rest.slice(-300)));
  },
  clear(id: string) {
    window.localStorage.setItem(
      KEY,
      JSON.stringify(recFeedback.all().filter((f) => f.id !== id))
    );
  },
};

/**
 * Score = sum of tag affinities learned from past feedback.
 * Liked tag: +1 each occurrence. Disliked: -1. Items you already rated sink
 * (liked) or drop away (disliked) so fresh suggestions surface.
 */
export function rankWithFeedback(items: RecItem[], kind: RecKind): RecItem[] {
  const fb = recFeedback.all().filter((f) => f.kind === kind);
  if (fb.length === 0) return items;

  const affinity = new Map<string, number>();
  for (const f of fb) {
    for (const tag of f.tags) {
      const t = tag.toLowerCase();
      affinity.set(t, (affinity.get(t) ?? 0) + (f.liked ? 1 : -1));
    }
  }
  const rated = new Map(fb.map((f) => [f.id, f.liked]));

  return [...items].sort((a, b) => {
    const score = (x: RecItem) => {
      let s = x.tags.reduce((acc, t) => acc + (affinity.get(t.toLowerCase()) ?? 0), 0);
      if (rated.has(x.id)) s += rated.get(x.id) ? -2 : -50;
      return s;
    };
    return score(b) - score(a);
  });
}

export const LANGUAGES = [
  { label: "English", book: "eng", movie: "en" },
  { label: "Spanish", book: "spa", movie: "es" },
  { label: "French", book: "fre", movie: "fr" },
  { label: "Arabic", book: "ara", movie: "ar" },
  { label: "Hindi", book: "hin", movie: "hi" },
  { label: "Malayalam", book: "mal", movie: "ml" },
  { label: "Tamil", book: "tam", movie: "ta" },
  { label: "Korean", book: "kor", movie: "ko" },
  { label: "Japanese", book: "jpn", movie: "ja" },
  { label: "German", book: "ger", movie: "de" },
  { label: "Italian", book: "ita", movie: "it" },
  { label: "Portuguese", book: "por", movie: "pt" },
] as const;
