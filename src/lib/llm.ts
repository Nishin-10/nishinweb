/**
 * Provider router. Two tiers:
 *  - "quality": Claude first (nuanced writing: CV, cover letters, documents),
 *    Groq as fallback so features survive a missing/exhausted Anthropic key.
 *  - "fast": Groq first (chat, summaries — latency and free tokens win),
 *    Claude as fallback.
 */
import Anthropic from "@anthropic-ai/sdk";

const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

export type Tier = "quality" | "fast";

interface CompleteArgs {
  system: string;
  user: string;
  maxTokens: number;
  tier: Tier;
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
  };
}

export async function complete(args: CompleteArgs): Promise<string> {
  const { claude, groq } = providersAvailable();
  if (!claude && !groq) {
    throw new Error(
      "No AI provider configured. Add ANTHROPIC_API_KEY and/or GROQ_API_KEY to .env.local (and Vercel) and restart."
    );
  }

  const order =
    args.tier === "fast"
      ? ([groq && "groq", claude && "claude"] as const)
      : ([claude && "claude", groq && "groq"] as const);

  let lastError: unknown;
  for (const provider of order) {
    if (!provider) continue;
    try {
      return provider === "claude" ? await viaClaude(args) : await viaGroq(args);
    } catch (err) {
      lastError = err;
      console.error(`${provider} completion failed, trying fallback:`, err);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All providers failed.");
}
