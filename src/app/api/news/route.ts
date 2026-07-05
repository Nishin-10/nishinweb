import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

export const runtime = "nodejs";

export type NewsTopic = "ai" | "huggingface" | "cloud" | "tech";

export interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  topic: NewsTopic;
  publishedAt?: string;
  excerpt?: string;
}

const RSS_FEEDS: { url: string; source: string; topic: NewsTopic }[] = [
  { url: "https://techcrunch.com/category/artificial-intelligence/feed/", source: "TechCrunch AI", topic: "ai" },
  { url: "https://huggingface.co/blog/feed.xml", source: "Hugging Face Blog", topic: "huggingface" },
  { url: "https://aws.amazon.com/blogs/aws/feed/", source: "AWS Blog", topic: "cloud" },
  { url: "https://azure.microsoft.com/en-us/blog/feed/", source: "Azure Blog", topic: "cloud" },
  { url: "https://cloudblog.withgoogle.com/rss/", source: "Google Cloud Blog", topic: "cloud" },
];

const parser = new XMLParser({ ignoreAttributes: false });

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchRss(feed: (typeof RSS_FEEDS)[number]): Promise<Article[]> {
  const res = await fetch(feed.url, {
    headers: { "User-Agent": "companion-app/1.0" },
    next: { revalidate: 1800 },
  });
  if (!res.ok) return [];
  const xml = await res.text();
  // RSS and Atom shapes vary too much for precise typing; narrow at use sites.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = parser.parse(xml) as Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: Array<Record<string, any>> =
    doc?.rss?.channel?.item ?? doc?.feed?.entry ?? [];

  return (Array.isArray(items) ? items : [items]).slice(0, 8).map((item, i) => {
    const link =
      typeof item.link === "string"
        ? item.link
        : item.link?.["@_href"] ?? item.link?.[0]?.["@_href"] ?? "";
    const description = stripHtml(
      String(item.description ?? item.summary?.["#text"] ?? item.summary ?? "")
    );
    return {
      id: `${feed.source}-${i}-${String(item.title).slice(0, 30)}`,
      title: stripHtml(String(item.title?.["#text"] ?? item.title ?? "Untitled")),
      url: String(link),
      source: feed.source,
      topic: feed.topic,
      publishedAt: item.pubDate ?? item.published ?? item.updated,
      excerpt: description.slice(0, 320),
    };
  });
}

async function fetchHackerNews(): Promise<Article[]> {
  const res = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", {
    next: { revalidate: 900 },
  });
  if (!res.ok) return [];
  const ids = ((await res.json()) as number[]).slice(0, 12);
  const stories = await Promise.all(
    ids.map(async (id) => {
      const s = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
        next: { revalidate: 900 },
      });
      return (await s.json()) as {
        id: number; title?: string; url?: string; score?: number; time?: number;
      };
    })
  );
  return stories
    .filter((s) => s.title)
    .map((s) => ({
      id: `hn-${s.id}`,
      title: s.title!,
      url: s.url ?? `https://news.ycombinator.com/item?id=${s.id}`,
      source: `Hacker News · ${s.score ?? 0} pts`,
      topic: "tech" as const,
      publishedAt: s.time ? new Date(s.time * 1000).toISOString() : undefined,
      excerpt: "",
    }));
}

async function fetchHuggingFaceTrending(): Promise<Article[]> {
  const [modelsRes, spacesRes] = await Promise.all([
    fetch("https://huggingface.co/api/models?sort=trendingScore&limit=6", {
      next: { revalidate: 1800 },
    }),
    fetch("https://huggingface.co/api/spaces?sort=trendingScore&limit=4", {
      next: { revalidate: 1800 },
    }),
  ]);
  const articles: Article[] = [];
  if (modelsRes.ok) {
    const models = (await modelsRes.json()) as Array<{
      id: string; likes?: number; downloads?: number; pipeline_tag?: string;
    }>;
    for (const m of models) {
      articles.push({
        id: `hf-model-${m.id}`,
        title: `Trending model: ${m.id}`,
        url: `https://huggingface.co/${m.id}`,
        source: "Hugging Face",
        topic: "huggingface",
        excerpt: [m.pipeline_tag, m.likes ? `${m.likes} likes` : "", m.downloads ? `${m.downloads.toLocaleString()} downloads` : ""]
          .filter(Boolean)
          .join(" · "),
      });
    }
  }
  if (spacesRes.ok) {
    const spaces = (await spacesRes.json()) as Array<{ id: string; likes?: number }>;
    for (const s of spaces) {
      articles.push({
        id: `hf-space-${s.id}`,
        title: `Trending Space: ${s.id}`,
        url: `https://huggingface.co/spaces/${s.id}`,
        source: "Hugging Face",
        topic: "huggingface",
        excerpt: s.likes ? `${s.likes} likes` : "",
      });
    }
  }
  return articles;
}

export async function GET() {
  const results = await Promise.allSettled([
    fetchHackerNews(),
    fetchHuggingFaceTrending(),
    ...RSS_FEEDS.map(fetchRss),
  ]);

  const articles = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({
    articles,
    fetchedAt: new Date().toISOString(),
    degraded: failed > 0,
  });
}
