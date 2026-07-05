import { NextResponse } from "next/server";
import type { RecItem } from "@/lib/recs";

export const runtime = "nodejs";

const MOOD_TAGS: Record<string, string> = {
  relaxing: "relaxing",
  competitive: "competitive",
  "story-driven": "story-rich",
  challenging: "difficult",
};

const RAWG_PLATFORMS: Record<string, string> = {
  pc: "4",
  playstation: "187,18",
  xbox: "1,186",
  switch: "7",
  mobile: "21,3",
};

interface RawgGame {
  id: number;
  name?: string;
  background_image?: string;
  rating?: number;
  released?: string;
  genres?: { name: string }[];
  platforms?: { platform: { name: string } }[];
  tags?: { name: string }[];
}

async function fromRawg(key: string, genre: string, platform: string, mood: string) {
  const url = new URL("https://api.rawg.io/api/games");
  url.searchParams.set("key", key);
  if (genre) url.searchParams.set("genres", genre.toLowerCase());
  if (platform && RAWG_PLATFORMS[platform]) {
    url.searchParams.set("platforms", RAWG_PLATFORMS[platform]);
  }
  if (mood && MOOD_TAGS[mood]) url.searchParams.set("tags", MOOD_TAGS[mood]);
  url.searchParams.set("ordering", "-rating");
  url.searchParams.set("page_size", "18");

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`RAWG returned ${res.status}`);
  const json = (await res.json()) as { results?: RawgGame[] };

  const items: RecItem[] = (json.results ?? []).map((g) => {
    const platforms = g.platforms?.map((p) => p.platform.name).slice(0, 4).join(", ");
    return {
      id: `game-rawg-${g.id}`,
      kind: "game",
      title: g.name ?? "Untitled",
      subtitle: g.genres?.map((x) => x.name).slice(0, 3).join(" · ") ?? "",
      blurb: platforms ? `Available on ${platforms}.` : "",
      image: g.background_image,
      rating: g.rating ? Math.round(g.rating * 20) / 10 : undefined,
      year: g.released ? Number(g.released.slice(0, 4)) : undefined,
      tags: [genre, mood, platform, ...(g.tags?.slice(0, 4).map((t) => t.name) ?? [])].filter(Boolean),
      meta: platforms,
      links: [
        {
          label: "Store search",
          url: `https://store.steampowered.com/search/?term=${encodeURIComponent(g.name ?? "")}`,
        },
        {
          label: "RAWG",
          url: `https://rawg.io/games/${g.id}`,
        },
      ],
    };
  });
  return items;
}

/** Keyless fallback: free-to-play catalog only, but always works. */
async function fromFreeToGame(genre: string, platform: string) {
  const categoryMap: Record<string, string> = {
    action: "shooter", adventure: "mmorpg", rpg: "mmorpg", strategy: "strategy",
    racing: "racing", sports: "sports", shooter: "shooter", card: "card",
    fighting: "fighting", social: "social",
  };
  const url = new URL("https://www.freetogame.com/api/games");
  const cat = categoryMap[genre.toLowerCase()];
  if (cat) url.searchParams.set("category", cat);
  if (platform === "pc") url.searchParams.set("platform", "pc");

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`FreeToGame returned ${res.status}`);
  const json = (await res.json()) as Array<Record<string, unknown>>;

  const items: RecItem[] = json.slice(0, 18).map((g) => ({
    id: `game-ftg-${g.id}`,
    kind: "game",
    title: String(g.title ?? "Untitled"),
    subtitle: `${g.genre ?? ""} · ${g.platform ?? ""}`,
    blurb: String(g.short_description ?? ""),
    image: typeof g.thumbnail === "string" ? g.thumbnail : undefined,
    year: g.release_date ? Number(String(g.release_date).slice(0, 4)) : undefined,
    tags: [genre, String(g.genre ?? "")].filter(Boolean),
    meta: String(g.platform ?? ""),
    links: [{ label: "Play", url: String(g.game_url ?? "") }],
  }));
  return items;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get("genre") ?? "";
  const platform = (searchParams.get("platform") ?? "").toLowerCase();
  const mood = searchParams.get("mood") ?? "";

  const key = process.env.RAWG_API_KEY;

  try {
    if (key) {
      const items = await fromRawg(key, genre, platform, mood);
      return NextResponse.json({ items, source: "rawg" });
    }
    const items = await fromFreeToGame(genre, platform);
    return NextResponse.json({
      items,
      source: "freetogame",
      note: "Showing free-to-play games only. Add a free RAWG_API_KEY to .env.local for the full catalog with moods and consoles.",
    });
  } catch (err) {
    console.error("Games recs failed:", err);
    return NextResponse.json({ error: "Game lookup failed. Try again shortly." }, { status: 502 });
  }
}
