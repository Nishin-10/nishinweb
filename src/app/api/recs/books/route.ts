import { NextResponse } from "next/server";
import type { RecItem } from "@/lib/recs";

export const runtime = "nodejs";

const MOOD_TERMS: Record<string, string> = {
  uplifting: "humor",
  dark: "dark fantasy",
  cozy: "cozy",
  thoughtful: "philosophy",
  thrilling: "suspense",
};

interface OpenLibraryDoc {
  key: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  ratings_average?: number;
  number_of_pages_median?: number;
  first_sentence?: string[];
  subject?: string[];
  language?: string[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get("genre") ?? "fiction";
  const language = searchParams.get("language") ?? "";
  const mood = searchParams.get("mood") ?? "";
  const length = searchParams.get("length") ?? ""; // short | medium | long
  const era = searchParams.get("era") ?? ""; // classic | 20th | modern

  const url = new URL("https://openlibrary.org/search.json");
  const q = [
    `subject:${genre}`,
    mood && MOOD_TERMS[mood] ? `subject:"${MOOD_TERMS[mood]}"` : "",
    language ? `language:${language}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "40");
  url.searchParams.set("sort", "rating desc");
  url.searchParams.set(
    "fields",
    "key,title,author_name,first_publish_year,cover_i,ratings_average,number_of_pages_median,first_sentence,subject,language"
  );

  const res = await fetch(url, {
    headers: { "User-Agent": "companion-app/1.0 (personal project)" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    return NextResponse.json({ error: `Open Library returned ${res.status}.` }, { status: 502 });
  }
  const json = (await res.json()) as { docs?: OpenLibraryDoc[] };

  let docs = (json.docs ?? []).filter((d) => d.title && d.author_name?.length);

  if (era === "classic") docs = docs.filter((d) => (d.first_publish_year ?? 9999) < 1950);
  if (era === "20th")
    docs = docs.filter(
      (d) => (d.first_publish_year ?? 0) >= 1950 && (d.first_publish_year ?? 9999) < 2000
    );
  if (era === "modern") docs = docs.filter((d) => (d.first_publish_year ?? 0) >= 2000);

  if (length === "short") docs = docs.filter((d) => (d.number_of_pages_median ?? 300) < 250);
  if (length === "medium")
    docs = docs.filter(
      (d) => (d.number_of_pages_median ?? 300) >= 250 && (d.number_of_pages_median ?? 300) <= 450
    );
  if (length === "long") docs = docs.filter((d) => (d.number_of_pages_median ?? 0) > 450);

  const items: RecItem[] = docs.slice(0, 18).map((d) => {
    const author = d.author_name?.[0] ?? "Unknown author";
    const blurb =
      d.first_sentence?.[0] ??
      (d.subject ? `Touches on ${d.subject.slice(0, 4).join(", ").toLowerCase()}.` : "");
    return {
      id: `book-${d.key}`,
      kind: "book",
      title: d.title!,
      subtitle: author,
      blurb,
      image: d.cover_i
        ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
        : undefined,
      rating: d.ratings_average ? Math.round(d.ratings_average * 20) / 10 : undefined,
      year: d.first_publish_year,
      tags: [genre, mood, author, ...(d.subject?.slice(0, 5) ?? [])].filter(Boolean),
      meta: d.number_of_pages_median ? `~${d.number_of_pages_median} pages` : undefined,
      links: [
        { label: "Open Library", url: `https://openlibrary.org${d.key}` },
        {
          label: "Google Books",
          url: `https://www.google.com/search?tbm=bks&q=${encodeURIComponent(`${d.title} ${author}`)}`,
        },
        {
          label: "Buy",
          url: `https://www.amazon.com/s?k=${encodeURIComponent(`${d.title} ${author}`)}&i=stripbooks`,
        },
      ],
    };
  });

  return NextResponse.json({ items });
}
