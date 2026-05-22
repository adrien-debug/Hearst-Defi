import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { kimi, KIMI_MODEL } from "@/lib/llm/kimi";
import { logger } from "@/lib/logger";
import { REVIEW_DOCUMENT_INSTRUCTIONS } from "@/lib/agents/system-prompts/review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The anthropic-compatible Kimi variant follows structured-output instructions
// more reliably; fall back to the default model if it is not configured.
const DOCUMENT_MODEL = env.HYPERCLI_ANTHROPIC_MODEL || KIMI_MODEL;
const GENERATION_TIMEOUT_MS = 60_000;

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
export async function POST(): Promise<Response> {
  let userId: string;
  try {
    ({ userId } = await requireAdmin());
  } catch {
    return unauthorized();
  }

  // Most recent conversation for this admin = the active review session.
  const chat = await prisma.cockpitChat.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (!chat) {
    return new Response(
      JSON.stringify({ error: "Aucune conversation de revue à analyser." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const messages = await prisma.cockpitMessage.findMany({
    where: { chatId: chat.id, role: { in: ["user", "assistant"] } },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });

  if (messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "La conversation est vide." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const transcript = messages
    .map((m) => `${m.role === "user" ? "Head of Product" : "Copilote"} : ${m.content}`)
    .join("\n\n");

  let contentMd: string;
  try {
    const completion = await kimi.chat.completions.create(
      {
        model: DOCUMENT_MODEL,
        messages: [
          { role: "system", content: REVIEW_DOCUMENT_INSTRUCTIONS },
          {
            role: "user",
            content:
              "Transcription de la session de revue :\n\n" + transcript,
          },
        ],
      },
      { timeout: GENERATION_TIMEOUT_MS },
    );
    contentMd = completion.choices[0]?.message?.content?.trim() ?? "";
  } catch (err) {
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
    return new Response(
      JSON.stringify({ error: "Le modèle a renvoyé un document vide." }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  // Stamp the generation date into the placeholder line the prompt leaves blank.
  const dated = contentMd.replace(
    /_Date de génération : .*_/,
    `_Date de génération : ${new Date().toISOString().slice(0, 10)}_`,
  );

  const saved = await prisma.reviewDocument.create({
    data: { userId, chatId: chat.id, contentMd: dated },
    select: { id: true, contentMd: true, createdAt: true },
  });

  return Response.json({ document: saved });
}
