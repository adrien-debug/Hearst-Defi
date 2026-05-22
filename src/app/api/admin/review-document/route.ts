import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";
import { kimi, KIMI_MODEL } from "@/lib/llm/kimi";
import { logger } from "@/lib/logger";
import { getProductRoutes } from "@/lib/product-routes";
import { getSpecIndex } from "@/lib/spec";
import { REVIEW_DOCUMENT_INSTRUCTIONS } from "@/lib/agents/system-prompts/review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Document review runs on the single Kimi K2.6 model.
const DOCUMENT_MODEL = KIMI_MODEL;
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
