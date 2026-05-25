import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";
import { kimi, KIMI_MODEL } from "@/lib/llm/kimi";
import { logger } from "@/lib/logger";
import { assertRateLimit, assertBodySize } from "@/lib/rate-limit";
import { getProductRoutes } from "@/lib/product-routes";
import { getSpecIndex } from "@/lib/spec";
import { REVIEW_DOCUMENT_INSTRUCTIONS } from "@/lib/agents/system-prompts/review";
import { estimateKimiCostUsd } from "@/lib/llm/cost";
import { REVIEW_DOCUMENT_HASH } from "@/lib/llm/prompt-hash";
import { capTranscriptByTokens, MAX_TRANSCRIPT_TOKENS } from "@/lib/llm/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Document review runs on the single Kimi K2.6 model.
const DOCUMENT_MODEL = KIMI_MODEL;
const GENERATION_TIMEOUT_MS = 60_000;

/** Admin routes are heavily rate-limited: 5 requests / 60s / admin. */
const ADMIN_RATE_MAX = 5;
const ADMIN_RATE_WINDOW_MS = 60_000;

/**
 * Maximum number of ReviewDocument rows kept per user.
 * When a new document is created and the total for this user exceeds this
 * threshold, the oldest rows (beyond the 20 most recent) are purged.
 * This bounds storage and keeps the GET endpoint fast.
 */
const REVIEW_DOC_KEEP_LATEST = 20;

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Admin access required" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

/** Returns the most recent generated review document for the admin, or null. */
export async function GET(): Promise<Response> {
  let userId: string;
  try {
    ({ userId } = await requireAdmin());
  } catch {
    return unauthorized();
  }

  try {
    await assertRateLimit(`admin:review-doc:${userId}`, ADMIN_RATE_MAX, ADMIN_RATE_WINDOW_MS);
  } catch {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  const doc = await prisma.reviewDocument.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, contentMd: true, createdAt: true },
  });

  return Response.json({ document: doc ?? null });
}

/**
 * Distils the admin's most recent cockpit conversation into a structured
 * "suggested modifications" Markdown document, persists it, and returns it.
 */
export async function POST(req: NextRequest): Promise<Response> {
  // 0. Body size guard — prevent DoS via oversized payloads.
  try {
    await assertBodySize(req);
  } catch (sizeErr) {
    return new Response(
      JSON.stringify({
        error: sizeErr instanceof Error ? sizeErr.message : "Request too large",
      }),
      { status: 413, headers: { "Content-Type": "application/json" } },
    );
  }

  let userId: string;
  try {
    ({ userId } = await requireAdmin());
  } catch {
    return unauthorized();
  }

  try {
    await assertRateLimit(`admin:review-doc:${userId}`, ADMIN_RATE_MAX, ADMIN_RATE_WINDOW_MS);
  } catch {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Most recent conversation that actually contains review-mode messages for
  // this admin. A chat that has only normal-mode chatter is not a review
  // session and must not be used as a source — picking "the last updated
  // chat" blindly would pull a random conversation if review was never
  // toggled in it.
  const chat = await prisma.cockpitChat.findFirst({
    where: {
      userId,
      messages: { some: { mode: "review" } },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (!chat) {
    return new Response(
      JSON.stringify({
        error:
          "Aucune conversation de revue à analyser (active le mode Revue et discute avant de générer le document).",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Take the 200 MOST RECENT messages (desc), then reverse to chronological
  // order for the transcript. A naive `asc + take 200` would silently drop
  // the latest remarks in a long review session — the opposite of what we want.
  //
  // Filter on `mode: "review"` so the generator only sees what was actually
  // exchanged under the facilitator persona. Without this filter, normal-mode
  // chatter that happened in the same chat row (admin who toggled in/out of
  // review during the session) would contaminate the analysis — the LLM would
  // cite "verbatims" from messages that weren't part of a real review.
  const recentDesc = await prisma.cockpitMessage.findMany({
    where: {
      chatId: chat.id,
      role: { in: ["user", "assistant"] },
      mode: "review",
    },
    orderBy: { createdAt: "desc" },
    select: { role: true, content: true },
    take: 200,
  });

  if (recentDesc.length === 0) {
    return new Response(
      JSON.stringify({
        error:
          "Aucun message en mode revue à analyser dans la conversation en cours.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const messages = recentDesc.slice().reverse();

  // Cap the transcript to avoid context-window overflow.
  // The most recent messages are kept; the oldest are dropped when the budget
  // is exceeded. A note is prepended to the transcript when truncation occurs.
  const { capped, droppedCount } = capTranscriptByTokens(messages, MAX_TRANSCRIPT_TOKENS);
  if (droppedCount > 0) {
    logger.warn("review-document transcript truncated", {
      userId,
      chatId: chat.id,
      droppedCount,
      keptCount: capped.length,
    });
  }

  const transcriptBody = capped
    .map((m) => `${m.role === "user" ? "Head of Product" : "Copilote"} : ${m.content}`)
    .join("\n\n");

  const transcript =
    droppedCount > 0
      ? `[NOTE: début de session tronqué pour respecter la limite de contexte — ${droppedCount} message(s) le(s) plus ancien(s) omis.]\n\n${transcriptBody}`
      : transcriptBody;

  // Real route inventory derived from the filesystem — the model must anchor
  // every remark on one of these (never invent a route). Best-effort: a read
  // failure degrades to no inventory rather than blocking generation.
  let routesBlock = "";
  try {
    const routes = await getProductRoutes();
    if (routes.length > 0) {
      routesBlock =
        "Routes réelles de la plateforme (ancre CHAQUE remarque sur l'une d'elles, n'en invente aucune) :\n" +
        routes.map((r) => `- ${r}`).join("\n") +
        "\n\n";
    }
  } catch {
    // no inventory → fall through with empty block
  }

  // Spec index — lets the model align its proposals on the documented product
  // vision. Only the index (slug + title), never the full MDX, to bound tokens.
  // Best-effort: a read failure degrades to no specs block.
  let specsBlock = "";
  try {
    const specs = await getSpecIndex();
    if (specs.length > 0) {
      specsBlock =
        "Specs produit documentées (aligne tes propositions sur cette vision) :\n" +
        specs.map((s) => `- ${s.slug} — ${s.title}`).join("\n") +
        "\n\n";
    }
  } catch {
    // no specs → fall through with empty block
  }

  // Trace the LLM call as an LlmRun row. The generation is the most expensive
  // operation in the review flow; latency and failure modes must be observable
  // from the same dashboard as the other agent runs (cockpit-chat, memo, etc.).
  // Tracing failures must NEVER break the user-facing response.
  async function traceLlmRun(
    status: "success" | "failed" | "timeout",
    latencyMs: number,
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens?: number } | null,
    err?: unknown,
  ): Promise<void> {
    try {
      await prisma.llmRun.create({
        data: {
          agentName: "review-document",
          model: DOCUMENT_MODEL,
          status,
          latencyMs,
          userId,
          systemPromptHash: REVIEW_DOCUMENT_HASH,
          ...(usage != null
            ? {
                inputTokens: usage.prompt_tokens,
                outputTokens: usage.completion_tokens,
                costUsd: estimateKimiCostUsd({
                  prompt_tokens: usage.prompt_tokens,
                  completion_tokens: usage.completion_tokens,
                }),
              }
            : {}),
          ...(err
            ? {
                errorType: err instanceof Error ? err.name : "UnknownError",
                errorMessage:
                  err instanceof Error ? err.message : "unknown error",
              }
            : {}),
        },
      });
    } catch (traceErr) {
      logger.warn(
        "review-document LlmRun trace failed",
        { userId },
        traceErr instanceof Error ? traceErr : undefined,
      );
    }
  }

  let contentMd: string;
  const startedAt = Date.now();
  try {
    const completion = await kimi.chat.completions.create(
      {
        model: DOCUMENT_MODEL,
        messages: [
          { role: "system", content: REVIEW_DOCUMENT_INSTRUCTIONS },
          {
            role: "user",
            content:
              routesBlock +
              specsBlock +
              "Transcription de la session de revue :\n\n" +
              transcript,
          },
        ],
      },
      { timeout: GENERATION_TIMEOUT_MS },
    );
    contentMd = completion.choices[0]?.message?.content?.trim() ?? "";
    await traceLlmRun("success", Date.now() - startedAt, completion.usage ?? null);
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    // Heuristic: surface explicit timeout as a distinct status so it can be
    // alerted on separately from generic LLM errors.
    const isTimeout =
      err instanceof Error &&
      (err.name === "APITimeoutError" || /timeout/i.test(err.message));
    await traceLlmRun(isTimeout ? "timeout" : "failed", latencyMs, null, err);
    logger.error(
      "review-document generation failed",
      { userId, chatId: chat.id },
      err instanceof Error ? err : undefined,
    );
    return new Response(
      JSON.stringify({ error: "Échec de la génération du document." }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!contentMd) {
    // Treated as a failure for observability — the call succeeded HTTP-wise
    // but the model produced no usable content.
    await traceLlmRun(
      "failed",
      0,
      null,
      new Error("model returned empty content"),
    );
    return new Response(
      JSON.stringify({ error: "Le modèle a renvoyé un document vide." }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  // Stamp the generation date into the placeholder line the prompt leaves
  // blank. The model is instructed to emit `_Date de génération : _`, but if
  // it drops the italic markers or rewords the line, the regex won't match.
  // Fallback: prepend the date line right after the H1 so the document is
  // always dated, regardless of model formatting drift.
  const today = new Date().toISOString().slice(0, 10);
  const stamped = `_Date de génération : ${today}_`;
  const datePlaceholder = /_Date de génération : .*_/;
  let dated: string;
  if (datePlaceholder.test(contentMd)) {
    dated = contentMd.replace(datePlaceholder, stamped);
  } else {
    // Inject right after the first H1 (the prompt's mandated title), or at
    // the top if no H1 is present.
    const h1Match = contentMd.match(/^#\s.+$/m);
    if (h1Match && h1Match.index !== undefined) {
      const insertAt = h1Match.index + h1Match[0].length;
      dated =
        contentMd.slice(0, insertAt) +
        "\n" +
        stamped +
        contentMd.slice(insertAt);
    } else {
      dated = stamped + "\n\n" + contentMd;
    }
    logger.warn(
      "review-document date placeholder missing — prepended fallback",
      { userId, chatId: chat.id },
    );
  }

  const saved = await prisma.reviewDocument.create({
    data: { userId, chatId: chat.id, contentMd: dated },
    select: { id: true, contentMd: true, createdAt: true },
  });

  // Retention: keep only the REVIEW_DOC_KEEP_LATEST most recent documents
  // per user. Purge failures are non-fatal — we always return the saved doc.
  try {
    const stale = await prisma.reviewDocument.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: REVIEW_DOC_KEEP_LATEST,
      select: { id: true },
    });
    if (stale.length > 0) {
      await prisma.reviewDocument.deleteMany({
        where: { id: { in: stale.map((d) => d.id) } },
      });
      logger.info("review-document retention purged", {
        userId,
        purgedCount: stale.length,
      });
    }
  } catch (purgeErr) {
    logger.warn(
      "review-document retention purge failed",
      { userId },
      purgeErr instanceof Error ? purgeErr : undefined,
    );
  }

  return Response.json({ document: saved });
}
