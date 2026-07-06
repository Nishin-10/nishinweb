import { NextResponse } from "next/server";
import { complete } from "@/lib/llm";
import { DOC_WRITER_SYSTEM, SUMMARIZER_SYSTEM } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
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
    const result = await complete(
      mode === "summarize"
        ? {
            tier: "fast", // summaries: speed wins, Groq first
            system: SUMMARIZER_SYSTEM,
            maxTokens: 1200,
            user: `Summarize this document:\n\n${text!.slice(0, 60000)}`,
          }
        : {
            tier: "quality", // drafting: writing quality wins, Claude first
            system: DOC_WRITER_SYSTEM,
            maxTokens: 2500,
            user: `Write this document:\n\n${instructions}${text?.trim() ? `\n\nReference material to draw from:\n${text.slice(0, 30000)}` : ""}`,
          }
    );
    return NextResponse.json({ result });
  } catch (err) {
    console.error("Tools request failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The request failed. Try again." },
      { status: 502 }
    );
  }
}
