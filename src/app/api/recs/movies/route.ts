import { NextResponse } from "next/server";
import type { RecItem } from "@/lib/recs";

export const runtime = "nodejs";

/** TMDB's fixed movie genre ids. */
const GENRES: Record<string, number> = {
  action: 28, adventure: 12, animation: 16, comedy: 35, crime: 80,
  documentary: 99, drama: 18, family: 10751, fantasy: 14, history: 36,
  horror: 27, music: 10402, mystery: 9648, romance: 10749,
  "sci-fi": 878, thriller: 53, war: 10752, western: 37,
};

/** Common streaming providers (TMDB watch provider ids, region US). */
const PROVIDERS: Record<string, number> = {
  netflix: 8,
  "prime video": 9,
  "disney+": 337,
  "apple tv+": 350,
  max: 1899,
  hulu: 15,
};

interface TmdbMovie {
  id: number;
  title?: string;
  original_title?: string;
  overview?: string;
  poster_path?: string;
  vote_average?: number;
  release_date?: string;
  original_language?: string;
}

export async function GET(request: Request) {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error:
          "TMDB_API_KEY is not set. Get a free key at themoviedb.org/settings/api, add it to .env.local and restart.",
        needsKey: true,
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const genre = (searchParams.get("genre") ?? "drama").toLowerCase();
  const langs = (searchParams.get("languages") ?? "en").split(",").filter(Boolean).slice(0, 4);
  const era = searchParams.get("era") ?? "";
  const minRating = Number(searchParams.get("minRating") ?? 0);
  const provider = (searchParams.get("provider") ?? "").toLowerCase();

  const genreId = GENRES[genre] ?? GENRES.drama;

  const fetchLang = async (lang: string): Promise<RecItem[]> => {
    const url = new URL("https://api.themoviedb.org/3/discover/movie");
    url.searchParams.set("api_key", key);
    url.searchParams.set("with_genres", String(genreId));
    url.searchParams.set("with_original_language", lang);
    url.searchParams.set("sort_by", "vote_average.desc");
    url.searchParams.set("vote_count.gte", "150");
    if (minRating > 0) url.searchParams.set("vote_average.gte", String(minRating));
    if (era === "classic") url.searchParams.set("primary_release_date.lte", "1979-12-31");
    if (era === "80s90s") {
      url.searchParams.set("primary_release_date.gte", "1980-01-01");
      url.searchParams.set("primary_release_date.lte", "1999-12-31");
    }
    if (era === "2000s") {
      url.searchParams.set("primary_release_date.gte", "2000-01-01");
      url.searchParams.set("primary_release_date.lte", "2015-12-31");
    }
    if (era === "recent") url.searchParams.set("primary_release_date.gte", "2016-01-01");
    if (provider && PROVIDERS[provider]) {
      url.searchParams.set("with_watch_providers", String(PROVIDERS[provider]));
      url.searchParams.set("watch_region", "US");
    }

    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: TmdbMovie[] };

    return (json.results ?? []).slice(0, 8).map((m) => ({
      id: `movie-${m.id}`,
      kind: "movie" as const,
      title: m.title ?? m.original_title ?? "Untitled",
      subtitle: `${lang.toUpperCase()} · ${m.release_date?.slice(0, 4) ?? "—"}`,
      blurb: m.overview ?? "",
      image: m.poster_path
        ? `https://image.tmdb.org/t/p/w342${m.poster_path}`
        : undefined,
      rating: m.vote_average ? Math.round(m.vote_average * 10) / 10 : undefined,
      year: m.release_date ? Number(m.release_date.slice(0, 4)) : undefined,
      tags: [genre, lang, era].filter(Boolean),
      links: [
        { label: "TMDB", url: `https://www.themoviedb.org/movie/${m.id}` },
        {
          label: "Trailer",
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${m.title} trailer`)}`,
        },
        {
          label: "Where to watch",
          url: `https://www.themoviedb.org/movie/${m.id}/watch`,
        },
      ],
    }));
  };

  const results = await Promise.allSettled(langs.map(fetchLang));
  const items = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  // Interleave languages instead of blocks of one language.
  items.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  return NextResponse.json({ items });
}
