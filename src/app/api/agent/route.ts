import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { AGENT_SYSTEM } from "@/lib/prompts";
import { complete } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Actions the client knows how to perform after the reply. */
export interface AgentAction {
  type: "navigate";
  href: string;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "open_section",
    description:
      "Navigate the user to a section of the app. Use when they ask to open, start, or go somewhere: job search, CV studio, recommendations, games, news, home.",
    input_schema: {
      type: "object",
      properties: {
        section: {
          type: "string",
          enum: ["home", "jobs", "discover", "play", "news"],
        },
      },
      required: ["section"],
    },
  },
  {
    name: "search_jobs",
    description:
      "Search live job postings by keywords. Returns top matches with titles and companies.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        location: { type: "string" },
      },
      required: ["query"],
    },
  },
  {
    name: "recommend",
    description:
      "Get book, movie or game recommendations by genre. Returns top picks with titles and details.",
    input_schema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["book", "movie", "game"] },
        genre: { type: "string" },
        language: {
          type: "string",
          description: "Optional ISO code, e.g. eng/spa for books, en/es for movies",
        },
      },
      required: ["kind", "genre"],
    },
  },
  {
    name: "news_brief",
    description: "Fetch today's top tech headlines so you can summarize them.",
    input_schema: { type: "object", properties: {} },
  },
];

async function runTool(
  name: string,
  input: Record<string, unknown>,
  origin: string
): Promise<{ result: string; action?: AgentAction }> {
  try {
    switch (name) {
      case "open_section": {
        const section = String(input.section ?? "home");
        const href = section === "home" ? "/" : `/${section}`;
        return { result: `Navigating the user to ${href}.`, action: { type: "navigate", href } };
      }
      case "search_jobs": {
        const q = encodeURIComponent(String(input.query ?? ""));
        const loc = encodeURIComponent(String(input.location ?? ""));
        const res = await fetch(`${origin}/api/jobs/search?q=${q}&location=${loc}`);
        const data = (await res.json()) as { jobs?: Array<{ title: string; company: string; location: string; source: string }> };
        const top = (data.jobs ?? []).slice(0, 5);
        return {
          result: top.length
            ? top.map((j) => `${j.title} at ${j.company} (${j.location || "n/a"}, via ${j.source})`).join("\n")
            : "No live matches from the free feeds right now.",
          action: { type: "navigate", href: "/jobs" },
        };
      }
      case "recommend": {
        const kind = String(input.kind ?? "book");
        const genre = encodeURIComponent(String(input.genre ?? ""));
        const lang = String(input.language ?? "");
        const url =
          kind === "book"
            ? `${origin}/api/recs/books?genre=${genre}${lang ? `&language=${lang}` : ""}`
            : kind === "movie"
              ? `${origin}/api/recs/movies?genre=${genre}${lang ? `&languages=${lang}` : ""}`
              : `${origin}/api/recs/games?genre=${genre}`;
        const res = await fetch(url);
        const data = (await res.json()) as { items?: Array<{ title: string; subtitle: string; year?: number }>; error?: string };
        if (data.error) return { result: `Lookup problem: ${data.error}` };
        const top = (data.items ?? []).slice(0, 5);
        return {
          result: top.length
            ? top.map((i) => `${i.title}${i.year ? ` (${i.year})` : ""} — ${i.subtitle}`).join("\n")
            : "Nothing matched.",
          action: { type: "navigate", href: "/discover" },
        };
      }
      case "news_brief": {
        const res = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", {
          next: { revalidate: 900 },
        });
        const ids = ((await res.json()) as number[]).slice(0, 8);
        const stories = await Promise.all(
          ids.map(async (id) => {
            const s = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
              next: { revalidate: 900 },
            });
            return (await s.json()) as { title?: string; score?: number };
          })
        );
        return {
          result: stories
            .filter((s) => s.title)
            .map((s) => `${s.title} (${s.score ?? 0} points)`)
            .join("\n"),
          action: { type: "navigate", href: "/news" },
        };
      }
      default:
        return { result: `Unknown tool ${name}.` };
    }
  } catch (err) {
    console.error(`Agent tool ${name} failed:`, err);
    return { result: "That lookup failed. Answer from general knowledge and say the live data was unavailable." };
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as { messages?: ChatMessage[] };
  const history = (body.messages ?? []).slice(-16);
  if (history.length === 0) {
    return NextResponse.json({ error: "Empty conversation." }, { status: 400 });
  }

  // Without a Claude key the tool-use loop is unavailable; fall back to a
  // plain Groq conversation so the assistant still talks.
  if (!process.env.ANTHROPIC_API_KEY) {
    try {
      const reply = await complete({
        tier: "fast",
        system: AGENT_SYSTEM,
        maxTokens: 800,
        user: history.map((m) => `${m.role}: ${m.content}`).join("\n"),
      });
      return NextResponse.json({ reply });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Assistant unavailable." },
        { status: 503 }
      );
    }
  }

  const origin = new URL(request.url).origin;
  const client = new Anthropic();

  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let action: AgentAction | undefined;

  try {
    for (let turn = 0; turn < 3; turn++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1000,
        system: AGENT_SYSTEM,
        tools: TOOLS,
        messages,
      });

      if (response.stop_reason !== "tool_use") {
        const text = response.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        return NextResponse.json({ reply: text, action });
      }

      messages.push({ role: "assistant", content: response.content });
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          const { result, action: a } = await runTool(
            block.name,
            block.input as Record<string, unknown>,
            origin
          );
          if (a) action = a;
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }
      messages.push({ role: "user", content: toolResults });
    }

    return NextResponse.json({
      reply: "I got stuck chaining lookups. Try asking that in one step.",
      action,
    });
  } catch (err) {
    console.error("Agent request failed:", err);
    const message =
      err instanceof Anthropic.APIError
        ? `Claude API error (${err.status}): ${err.message}`
        : "The assistant call failed. Check your connection and try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
