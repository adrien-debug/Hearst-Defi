import { createCockpitChatHandler } from "@hearst/cockpit-shell/handler";
import { kimi, KIMI_MODEL } from "@/lib/llm/kimi";

export const runtime = "nodejs";

export const { POST } = createCockpitChatHandler({
  llmClient: kimi,
  model: KIMI_MODEL,
  systemPrompt:
    "Tu es l'assistant Kimi intégré à Hearst Connect — DeFi institutionnel adossé au cashflow du mining BTC (vault de rendement, infra on-chain). Réponds en français.",
});
