import { NextResponse } from "next/server";
import type { JobPosting } from "@/lib/career";

export const runtime = "nodejs";

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#?\w+;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function searchRemoteOk(query: string): Promise<JobPosting[]> {
  const res = await fetch("https://remoteok.com/api", {
    headers: { "User-Agent": "companion-app/1.0" },
    next: { revalidate: 1800 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<Record<string, unknown>>;
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  return data
    .filter((item) => item && typeof item === "object" && "id" in item)
    .map((item) => {
      const title = `${item.position ?? ""} ${(item.tags as string[] | undefined)?.join(" ") ?? ""}`.toLowerCase();
      const haystack = `${title} ${item.description ?? ""}`.toLowerCase();
      const inTitle = terms.filter((t) => title.includes(t)).length;
      const inAll = terms.filter((t) => haystack.includes(t)).length;
      return { item, inTitle, inAll };
    })
    .filter(({ inAll, inTitle }) => terms.length === 0 || inAll === terms.length || inTitle > 0)
    .sort((a, b) => b.inTitle - a.inTitle || b.inAll - a.inAll)
    .map(({ item }) => item)
    .slice(0, 15)
    .map((item) => ({
      id: `remoteok-${item.id}`,
      title: String(item.position ?? "Untitled role"),
      company: String(item.company ?? "Unknown"),
      location: String(item.location || "Remote"),
      url: String(item.url ?? ""),
      source: "RemoteOK",
      salary:
        item.salary_min && item.salary_max
          ? `$${Number(item.salary_min).toLocaleString()} - $${Number(item.salary_max).toLocaleString()}`
          : undefined,
      postedAt: item.date ? String(item.date).slice(0, 10) : undefined,
      description: stripHtml(String(item.description ?? "")),
    }));
}

async function searchArbeitnow(query: string): Promise<JobPosting[]> {
  const res = await fetch(
    `https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(query)}`,
    { next: { revalidate: 1800 } }
  );
  if (!res.ok) return [];
  const json = (await res.json()) as {
    data?: Array<Record<string, unknown>>;
  };
  return (json.data ?? []).slice(0, 15).map((item) => ({
    id: `arbeitnow-${item.slug}`,
    title: String(item.title ?? "Untitled role"),
    company: String(item.company_name ?? "Unknown"),
    location: [String(item.location ?? ""), item.remote ? "Remote" : ""]
      .filter(Boolean)
      .join(" · "),
    url: String(item.url ?? ""),
    source: "Arbeitnow",
    postedAt: item.created_at
      ? new Date(Number(item.created_at) * 1000).toISOString().slice(0, 10)
      : undefined,
    description: stripHtml(String(item.description ?? "")),
  }));
}

async function searchAdzuna(query: string, location: string): Promise<JobPosting[]> {
  const id = process.env.ADZUNA_APP_ID;
  const key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) return [];
  const url = new URL("https://api.adzuna.com/v1/api/jobs/gb/search/1");
  url.searchParams.set("app_id", id);
  url.searchParams.set("app_key", key);
  url.searchParams.set("what", query);
  if (location) url.searchParams.set("where", location);
  url.searchParams.set("results_per_page", "15");
  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) return [];
  interface AdzunaResult {
    id?: string | number;
    title?: string;
    company?: { display_name?: string };
    location?: { display_name?: string };
    redirect_url?: string;
    salary_min?: number;
    salary_is_predicted?: string;
    created?: string;
    description?: string;
  }
  const json = (await res.json()) as { results?: AdzunaResult[] };
  return (json.results ?? []).map((item) => ({
    id: `adzuna-${item.id}`,
    title: String(item.title ?? "").replace(/<[^>]+>/g, ""),
    company: String(item.company?.display_name ?? "Unknown"),
    location: String(item.location?.display_name ?? ""),
    url: String(item.redirect_url ?? ""),
    source: "Adzuna",
    salary: item.salary_min
      ? `~${Math.round(item.salary_min).toLocaleString()} ${item.salary_is_predicted === "1" ? "(est.)" : ""}`
      : undefined,
    postedAt: item.created ? String(item.created).slice(0, 10) : undefined,
    description: stripHtml(String(item.description ?? "")),
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const location = searchParams.get("location") ?? "";

  const results = await Promise.allSettled([
    searchRemoteOk(query),
    searchArbeitnow(query),
    searchAdzuna(query, location),
  ]);

  const jobs = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const sources = ["RemoteOK", "Arbeitnow", "Adzuna"].map((name, i) => ({
    name,
    ok: results[i].status === "fulfilled",
    enabled: name !== "Adzuna" || Boolean(process.env.ADZUNA_APP_ID),
  }));

  return NextResponse.json({ jobs, sources });
}
