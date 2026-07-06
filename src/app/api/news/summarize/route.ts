import { NextResponse } from "next/server";
import { complete } from "@/lib/llm";
import { NEWS_SUMMARY_SYSTEM } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const { title, excerpt, url } = (await request.json()) as {
    title?: string;
    excerpt?: string;
    url?: string;
  };
  if (!title) {
    return NextResponse.json({ error: "Missing title." }, { status: 400 });
  }

  try {
    const summary = await complete({
      tier: "fast", // high-volume, latency-sensitive: Groq first
      system: NEWS_SUMMARY_SYSTEM,
      maxTokens: 300,
      user: `Summarize this news item. If the excerpt is thin, say what the headline implies and what a reader should check in the article.\n\nHeadline: ${title}\nSource link: ${url ?? "n/a"}\nExcerpt: ${excerpt || "(none provided)"}`,
    });
    return NextResponse.json({ summary });
  } catch (err) {
    console.error("Summarize failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Summary failed. Try again." },
      { status: 502 }
    );
  }
}
