import { NextResponse } from "next/server";
import { complete, parseProvider } from "@/lib/llm";
import { CV_TAILOR_SYSTEM, COVER_LETTER_SYSTEM } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    cvText?: string;
    jobText?: string;
    jobTitle?: string;
    company?: string;
    mode?: "cv" | "cover-letter";
    provider?: string;
  };

  const { cvText, jobText, jobTitle, company, mode = "cv" } = body;
  const provider = parseProvider(body.provider);
  if (!cvText || !jobText) {
    return NextResponse.json(
      { error: "Both the CV text and the job description are required." },
      { status: 400 }
    );
  }

  try {
    const result =
      mode === "cover-letter"
        ? await complete({
            tier: "quality",
            provider,
            system: COVER_LETTER_SYSTEM,
            maxTokens: 1200,
            user: `Job: ${jobTitle ?? "see posting"} at ${company ?? "the company"}\n\nJob posting:\n${jobText.slice(0, 12000)}\n\nCandidate CV:\n${cvText.slice(0, 12000)}`,
          })
        : await complete({
            tier: "quality",
            provider,
            system: CV_TAILOR_SYSTEM,
            maxTokens: 4000,
            user: `Tailor this CV for the following job.\n\nJob: ${jobTitle ?? ""} ${company ? `at ${company}` : ""}\n\nJob posting:\n${jobText.slice(0, 12000)}\n\nCurrent CV:\n${cvText.slice(0, 16000)}`,
          });

    return NextResponse.json({ result });
  } catch (err) {
    console.error("Tailor request failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The rewrite request failed. Retry." },
      { status: 502 }
    );
  }
}
