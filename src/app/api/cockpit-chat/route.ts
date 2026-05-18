import { createCockpitChatHandler } from "@hearst/cockpit-shell/handler";
import type { NextRequest } from "next/server";
import { kimi, KIMI_MODEL } from "@/lib/llm/kimi";
import { requireAuth } from "@/lib/auth/require-auth";

export const runtime = "nodejs";

const handler = createCockpitChatHandler({
  llmClient: kimi,
  model: KIMI_MODEL,
  systemPrompt:
    "Tu es l'assistant Kimi intégré à Hearst Connect — DeFi institutionnel adossé au cashflow du mining BTC (vault de rendement, infra on-chain). Réponds en français.",
});

export async function POST(req: NextRequest): Promise<Response> {
  try {
    await requireAuth();
  } catch {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return handler.POST(req);
}
