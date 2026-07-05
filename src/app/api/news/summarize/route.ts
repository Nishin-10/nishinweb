import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { NEWS_SUMMARY_SYSTEM } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "No ANTHROPIC_API_KEY set. Add it to .env.local and restart." },
      { status: 503 }
    );
  }

  const { title, excerpt, url } = (await request.json()) as {
    title?: string;
    excerpt?: string;
    url?: string;
  };
  if (!title) {
    return NextResponse.json({ error: "Missing title." }, { status: 400 });
  }

  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: NEWS_SUMMARY_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Summarize this news item. If the excerpt is thin, say what the headline implies and what a reader should check in the article.\n\nHeadline: ${title}\nSource link: ${url ?? "n/a"}\nExcerpt: ${excerpt || "(none provided)"}`,
        },
      ],
    });
    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return NextResponse.json({ summary: text });
  } catch (err) {
    console.error("Summarize failed:", err);
    return NextResponse.json({ error: "Summary failed. Try again." }, { status: 502 });
  }
}
