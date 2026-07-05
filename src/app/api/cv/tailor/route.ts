import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CV_TAILOR_SYSTEM, COVER_LETTER_SYSTEM } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "No ANTHROPIC_API_KEY set. Add it to .env.local (see .env.example) and restart the dev server.",
      },
      { status: 503 }
    );
  }

  const body = (await request.json()) as {
    cvText?: string;
    jobText?: string;
    jobTitle?: string;
    company?: string;
    mode?: "cv" | "cover-letter";
  };

  const { cvText, jobText, jobTitle, company, mode = "cv" } = body;
  if (!cvText || !jobText) {
    return NextResponse.json(
      { error: "Both the CV text and the job description are required." },
      { status: 400 }
    );
  }

  const client = new Anthropic();

  try {
    if (mode === "cover-letter") {
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 1200,
        system: COVER_LETTER_SYSTEM,
        messages: [
          {
            role: "user",
            content: `Job: ${jobTitle ?? "see posting"} at ${company ?? "the company"}\n\nJob posting:\n${jobText.slice(0, 12000)}\n\nCandidate CV:\n${cvText.slice(0, 12000)}`,
          },
        ],
      });
      const text = msg.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return NextResponse.json({ result: text.trim() });
    }

    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: CV_TAILOR_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Tailor this CV for the following job.\n\nJob: ${jobTitle ?? ""} ${company ? `at ${company}` : ""}\n\nJob posting:\n${jobText.slice(0, 12000)}\n\nCurrent CV:\n${cvText.slice(0, 16000)}`,
        },
      ],
    });

    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return NextResponse.json({ result: text.trim() });
  } catch (err) {
    console.error("Tailor request failed:", err);
    const message =
      err instanceof Anthropic.APIError
        ? `Claude API error (${err.status}): ${err.message}`
        : "The rewrite request failed. Check your network and API key, then retry.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
