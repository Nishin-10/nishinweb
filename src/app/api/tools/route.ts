import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { DOC_WRITER_SYSTEM, SUMMARIZER_SYSTEM } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 90;

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "No ANTHROPIC_API_KEY set. Add it to .env.local and restart." },
      { status: 503 }
    );
  }

  const { mode, text, instructions } = (await request.json()) as {
    mode?: "summarize" | "write";
    text?: string;
    instructions?: string;
  };

  if (mode === "summarize" && (!text || text.trim().length < 40)) {
    return NextResponse.json(
      { error: "Paste or upload at least a paragraph to summarize." },
      { status: 400 }
    );
  }
  if (mode === "write" && (!instructions || instructions.trim().length < 10)) {
    return NextResponse.json(
      { error: "Describe what the document should say." },
      { status: 400 }
    );
  }
  if (mode !== "summarize" && mode !== "write") {
    return NextResponse.json({ error: "Unknown mode." }, { status: 400 });
  }

  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: mode === "write" ? 2500 : 1200,
      system: mode === "summarize" ? SUMMARIZER_SYSTEM : DOC_WRITER_SYSTEM,
      messages: [
        {
          role: "user",
          content:
            mode === "summarize"
              ? `Summarize this document:\n\n${text!.slice(0, 60000)}`
              : `Write this document:\n\n${instructions}${text?.trim() ? `\n\nReference material to draw from:\n${text.slice(0, 30000)}` : ""}`,
        },
      ],
    });
    const result = msg.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return NextResponse.json({ result });
  } catch (err) {
    console.error("Tools request failed:", err);
    const message =
      err instanceof Anthropic.APIError
        ? `Claude API error (${err.status}): ${err.message}`
        : "The request failed. Try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
