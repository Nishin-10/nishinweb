import { NextResponse } from "next/server";
import { providersAvailable } from "@/lib/llm";
import { usingRedis } from "@/lib/realtime/store";

export const runtime = "nodejs";

/**
 * Liveness + dependency readiness. Safe to expose: reports which
 * capabilities are configured, never any secret values.
 */
export async function GET() {
  const providers = providersAvailable();
  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
    capabilities: {
      ai_quality: providers.claude,
      ai_fast: providers.groq,
      ai_gemini: providers.gemini,
      multiplayer_store: usingRedis(),
      gate: Boolean(process.env.ACCESS_PASSPHRASE),
    },
  });
}
