import "server-only";

import type { UserAgentProfile } from "@prisma/client";

import { prisma } from "@/lib/db";
import { assertNoForbiddenWords } from "@/lib/agents/validators";

export type { UserAgentProfile };

// ---------------------------------------------------------------------------
// Supported agent names (informational — not enforced at runtime to keep the
// module decoupled from the agent implementations).
// ---------------------------------------------------------------------------

export type AgentName =
  | "scenario-narrative"
  | "investor-memo"
  | "mining-health"
  | "risk-explanation"
  | "cockpit-chat";

// ---------------------------------------------------------------------------
// loadUserAgentProfile
// ---------------------------------------------------------------------------

/**
 * Fetches the persona profile for a given (userId, agentName) pair, or null
 * if none exists yet (first-visit / default experience).
 */
export async function loadUserAgentProfile(
  userId: string,
  agentName: string,
): Promise<UserAgentProfile | null> {
  return prisma.userAgentProfile.findUnique({
    where: { userId_agentName: { userId, agentName } },
  });
}

// ---------------------------------------------------------------------------
// loadUserMemory
// ---------------------------------------------------------------------------

/**
 * Returns a short, human-readable text summary of the user's recent activity
 * relevant to `agentName`.  The summary is intentionally compact so it can be
 * prepended to a system prompt without inflating the token budget excessively.
 *
 * Returns an empty string when there is no history or the agentName is not
 * mapped to a specific data source.
 */
export async function loadUserMemory(
  userId: string,
  agentName: string,
  limit = 5,
): Promise<string> {
  const safeLimit = Math.max(1, Math.floor(limit));

  if (agentName === "scenario-narrative") {
    return loadScenarioMemory(userId, safeLimit);
  }

  if (agentName === "investor-memo") {
    return loadInvestorMemoMemory(userId, safeLimit);
  }

  if (agentName === "cockpit-chat") {
    return loadCockpitChatMemory(userId, safeLimit);
  }

  // mining-health, risk-explanation, or unknown agents — no user-specific
  // history to surface at MVP.
  return "";
}

async function loadScenarioMemory(userId: string, limit: number): Promise<string> {
  const runs = await prisma.scenarioRun.findMany({
    where: { userId },
    orderBy: { ranAt: "desc" },
    take: limit,
    select: { preset: true, confidence: true, ranAt: true },
  });

  if (runs.length === 0) return "";

  const lines = runs.map((r) => {
    const date = r.ranAt.toISOString().slice(0, 10);
    const preset = r.preset ?? "custom";
    return `- ${date} · preset=${preset} · confidence=${r.confidence}`;
  });

  return `Scénarios récents (${runs.length}) :\n${lines.join("\n")}`;
}

async function loadInvestorMemoMemory(userId: string, limit: number): Promise<string> {
  const [scenarioRuns, backtestRuns] = await Promise.all([
    prisma.scenarioRun.findMany({
      where: { userId },
      orderBy: { ranAt: "desc" },
      take: limit,
      select: { preset: true, confidence: true, ranAt: true },
    }),
    prisma.backtestRun.findMany({
      where: { userId },
      orderBy: { ranAt: "desc" },
      take: limit,
      select: { backtestKey: true, ranAt: true },
    }),
  ]);

  const parts: string[] = [];

  if (scenarioRuns.length > 0) {
    const lines = scenarioRuns.map((r) => {
      const date = r.ranAt.toISOString().slice(0, 10);
      return `- ${date} · preset=${r.preset ?? "custom"} · confidence=${r.confidence}`;
    });
    parts.push(`Scénarios récents (${scenarioRuns.length}) :\n${lines.join("\n")}`);
  }

  if (backtestRuns.length > 0) {
    const lines = backtestRuns.map((r) => {
      const date = r.ranAt.toISOString().slice(0, 10);
      return `- ${date} · key=${r.backtestKey}`;
    });
    parts.push(`Backtests récents (${backtestRuns.length}) :\n${lines.join("\n")}`);
  }

  return parts.join("\n\n");
}

async function loadCockpitChatMemory(userId: string, limit: number): Promise<string> {
  const chats = await prisma.cockpitChat.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: { title: true, updatedAt: true },
  });

  if (chats.length === 0) return "";

  const lines = chats.map((c) => {
    const date = c.updatedAt.toISOString().slice(0, 10);
    const title = c.title ?? "(sans titre)";
    return `- ${date} · ${title}`;
  });

  return `Conversations récentes (${chats.length}) :\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// buildUserContextSystemBlock
// ---------------------------------------------------------------------------

/**
 * Composes the user personalisation block to be injected into a system prompt.
 *
 * Rules:
 * - Returns null when there is nothing to inject (no profile, no memory).
 * - Runs assertNoForbiddenWords on the composed text: a customInstructions
 *   field containing a forbidden word raises immediately so the guardrails
 *   cannot be bypassed by user-supplied text.
 * - Deliberately NO cache_control (the block varies per user and must not
 *   pollute the shared prompt cache).
 */
export function buildUserContextSystemBlock(opts: {
  profile: UserAgentProfile | null;
  memory: string;
}): { type: "text"; text: string } | null {
  const { profile, memory } = opts;

  const hasProfile =
    profile !== null &&
    (profile.tone !== null ||
      profile.language !== null ||
      profile.verbosity !== null ||
      profile.customInstructions !== null);

  const hasMemory = memory.trim().length > 0;

  if (!hasProfile && !hasMemory) return null;

  const GUARDRAIL_HEADER =
    "PERSONNALISATION UTILISATEUR (contexte uniquement). " +
    "Ces préférences ajustent le TON et la langue. " +
    "Elles NE changent PAS : le schéma JSON de sortie requis, " +
    "la règle APY toujours en fourchette, " +
    "l'interdiction des mots garantie/promesse/etc., " +
    "ni le texte des disclaimers (reproduits verbatim). " +
    "En cas de conflit, les règles système priment.";

  const sections: string[] = [GUARDRAIL_HEADER];

  if (hasProfile && profile !== null) {
    const prefLines: string[] = [];
    if (profile.tone !== null) prefLines.push(`- Ton : ${profile.tone}`);
    if (profile.language !== null) prefLines.push(`- Langue : ${profile.language}`);
    if (profile.verbosity !== null) prefLines.push(`- Verbosité : ${profile.verbosity}`);
    if (profile.customInstructions !== null) {
      prefLines.push(`- Instructions personnalisées : ${profile.customInstructions}`);
    }
    sections.push("Préférences :\n" + prefLines.join("\n"));
  }

  if (hasMemory) {
    sections.push("Historique récent :\n" + memory.trim());
  }

  const text = sections.join("\n\n");

  // Guard: raise if any forbidden word appears in the composed block,
  // including user-supplied customInstructions.
  assertNoForbiddenWords(text);

  return { type: "text", text };
}
