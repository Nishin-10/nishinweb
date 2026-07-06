/**
 * Provider router. Two tiers:
 *  - "quality": Claude first (nuanced writing: CV, cover letters, documents),
 *    Groq as fallback so features survive a missing/exhausted Anthropic key.
 *  - "fast": Groq first (chat, summaries — latency and free tokens win),
 *    Claude as fallback.
 */
import Anthropic from "@anthropic-ai/sdk";

const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const GROQ_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export type Tier = "quality" | "fast";
export type Provider = "claude" | "groq" | "gemini";

interface CompleteArgs {
  system: string;
  user: string;
  maxTokens: number;
  tier: Tier;
  /** Explicit user choice; overrides tier-based ordering. */
  provider?: Provider;
}

export function parseProvider(value: unknown): Provider | undefined {
  return value === "claude" || value === "groq" || value === "gemini"
    ? value
    : undefined;
}

async function viaGemini(args: CompleteArgs): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: args.system }] },
        contents: [{ role: "user", parts: [{ text: args.user }] }],
        generationConfig: { maxOutputTokens: args.maxTokens },
      }),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini error ${res.status}: ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("Gemini returned an empty completion.");
  return text;
}

async function viaClaude(args: CompleteArgs): Promise<string> {
  const client = new Anthropic();
  const msg = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: args.maxTokens,
    system: args.system,
    messages: [{ role: "user", content: args.user }],
  });
  return msg.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

async function viaGroq(args: CompleteArgs): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: args.maxTokens,
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Groq error ${res.status}: ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Groq returned an empty completion.");
  return text;
}

export function providersAvailable() {
  return {
    claude: Boolean(process.env.ANTHROPIC_API_KEY),
    groq: Boolean(process.env.GROQ_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
  };
}

const CALLERS: Record<Provider, (args: CompleteArgs) => Promise<string>> = {
  claude: viaClaude,
  groq: viaGroq,
  gemini: viaGemini,
};

export async function complete(args: CompleteArgs): Promise<string> {
  const available = providersAvailable();
  if (!available.claude && !available.groq && !available.gemini) {
    throw new Error(
      "No AI provider configured. Add ANTHROPIC_API_KEY, GROQ_API_KEY or GEMINI_API_KEY to .env.local (and Vercel) and restart."
    );
  }

  // Explicit choice first; otherwise fast tier prefers Groq, quality Claude.
  const preferred: Provider =
    args.provider ?? (args.tier === "fast" ? "groq" : "claude");
  const order = [
    preferred,
    ...(["claude", "groq", "gemini"] as Provider[]).filter((p) => p !== preferred),
  ].filter((p) => available[p]);

  let lastError: unknown;
  for (const provider of order) {
    try {
      return await CALLERS[provider](args);
    } catch (err) {
      lastError = err;
      console.error(`${provider} completion failed, trying fallback:`, err);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All providers failed.");
}
