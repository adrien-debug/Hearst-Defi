import {
  createCockpitChatHandler,
  type CockpitChatHandlerConfig,
} from "@hearst/cockpit-shell/handler";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { kimi, KIMI_MODEL } from "@/lib/llm/kimi";
import { requireAuth } from "@/lib/auth/require-auth";
import { assertRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT =
  "Tu es l'assistant Kimi intégré à Hearst Connect — DeFi institutionnel adossé au cashflow du mining BTC (vault de rendement, infra on-chain). Réponds en français.";

// Per-user rate-limit: 20 chat requests / 60s (mirrors the handler default,
// but keyed on the authenticated userId so corporate NAT users don't share
// an IP bucket). Enforced here because we need the userId from requireAuth().
const CHAT_RATE_MAX = 20;
const CHAT_RATE_WINDOW_MS = 60_000;

// Hard caps. NOTE: the @hearst/cockpit-shell handler does NOT accept
// maxTokens/temperature (neither in CockpitChatHandlerConfig nor in its
// body schema — it builds the LLM call internally), so these are enforced
// on the inbound body to reject abusive payloads before they reach the
// handler. They cannot be forwarded to the model call itself.
const MAX_OUTPUT_TOKENS = 2048;
const MAX_CONTENT_LEN = 8_000;
const MAX_MESSAGES = 30;
const MAX_SYSTEM_LEN = 4_000;

const HTML_TAG_RE = /<[^>]*>/g;

/** Strip HTML tags from untrusted user content (server-side, no DOMPurify). */
function sanitizeContent(value: string): string {
  return value.replace(HTML_TAG_RE, "").trim();
}

/**
 * Inbound body validation.
 *
 * The cockpit-shell handler's own schema is
 * `{ chatId?, message, messages?, productId?, system? }`. We validate the
 * security-relevant fields here (BEFORE the handler re-parses the body) and
 * keep the shape rétro-compatible: `message` stays required, `messages` is
 * the optional history array the task asked us to constrain.
 */
const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(MAX_CONTENT_LEN),
});

const ChatBodySchema = z.object({
  chatId: z.string().max(200).nullish(),
  message: z.string().min(1).max(MAX_CONTENT_LEN),
  messages: z.array(ChatMessageSchema).max(MAX_MESSAGES).optional(),
  productId: z.string().max(200).nullish(),
  system: z.string().max(MAX_SYSTEM_LEN).optional(),
  // Accepted but clamped (handler ignores these; we cap defensively).
  maxTokens: z.number().int().positive().max(MAX_OUTPUT_TOKENS).optional(),
  temperature: z.number().min(0).max(1).optional(),
});

type PersistedRole = "user" | "assistant" | "system";

interface PersistedMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

/**
 * Prisma-backed chat persistence, scoped to a single authenticated user.
 *
 * The handler's `ChatPersistence` contract only passes `chatId` to load/save,
 * so userId isolation is enforced HERE by closing over the verified userId:
 *   - `createChat()` always stamps the row with this user.
 *   - `loadMessages()` only returns history if the chat belongs to this user
 *     (a foreign chatId yields an empty history — no cross-tenant leak).
 *   - `saveMessage()` no-ops if the chat is not owned by this user.
 */
function createUserScopedPersistence(
  userId: string,
): NonNullable<CockpitChatHandlerConfig["persistence"]> {
  async function ownsChat(chatId: string): Promise<boolean> {
    const chat = await prisma.cockpitChat.findUnique({
      where: { id: chatId },
      select: { userId: true },
    });
    return chat?.userId === userId;
  }

  return {
    async createChat(): Promise<string> {
      const chat = await prisma.cockpitChat.create({
        data: { userId },
        select: { id: true },
      });
      return chat.id;
    },

    async loadMessages(chatId: string): Promise<PersistedMessage[]> {
      if (!(await ownsChat(chatId))) {
        // Unknown or foreign chat id — treat as empty rather than leaking.
        return [];
      }
      const rows = await prisma.cockpitMessage.findMany({
        where: { chatId },
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, createdAt: true },
      });
      return rows
        .filter(
          (r): r is typeof r & { role: "user" | "assistant" } =>
            r.role === "user" || r.role === "assistant",
        )
        .map((r) => ({
          id: r.id,
          role: r.role,
          content: r.content,
          createdAt: r.createdAt.getTime(),
        }));
    },

    async saveMessage(chatId: string, msg: PersistedMessage): Promise<void> {
      if (!(await ownsChat(chatId))) {
        // Refuse to write into a chat this user does not own.
        return;
      }
      const role: PersistedRole = msg.role;
      await prisma.cockpitMessage.create({
        data: { chatId, role, content: msg.content },
      });
      await prisma.cockpitChat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });
    },
  };
}

export async function POST(req: NextRequest): Promise<Response> {
  // 1. Auth — failure here is a 401, distinct from handler failures below.
  let userId: string;
  try {
    const auth = await requireAuth();
    userId = auth.userId;
  } catch (err) {
    logger.warn(
      "cockpit-chat auth rejected",
      {},
      err instanceof Error ? err : undefined,
    );
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Per-user rate-limit (defence-in-depth: the handler also rate-limits on
  //    userId, but enforcing here lets us use the shared Upstash/Redis backend
  //    so the limit holds across serverless instances).
  try {
    await assertRateLimit(
      `cockpit-chat:${userId}`,
      CHAT_RATE_MAX,
      CHAT_RATE_WINDOW_MS,
    );
  } catch {
    return new Response(
      "Trop de requêtes — réessaie dans quelques instants.",
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  // 3. Validate + sanitize the body BEFORE the handler re-parses it.
  //    The handler calls `req.json()` internally, so we reconstruct a
  //    fresh Request carrying the sanitized payload.
  let sanitizedReq: NextRequest;
  try {
    const raw: unknown = await req.json();
    const parsed = ChatBodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const body = parsed.data;
    const cleanMessage = sanitizeContent(body.message);
    if (!cleanMessage) {
      return new Response(
        JSON.stringify({ error: "Message is empty after sanitization" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const sanitizedBody = {
      ...(body.chatId != null ? { chatId: body.chatId } : {}),
      message: cleanMessage,
      ...(body.messages
        ? {
            messages: body.messages.map((m) => ({
              role: m.role,
              content:
                m.role === "user" ? sanitizeContent(m.content) : m.content,
            })),
          }
        : {}),
      ...(body.productId != null ? { productId: body.productId } : {}),
      ...(body.system ? { system: body.system } : {}),
    };

    sanitizedReq = new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify(sanitizedBody),
    }) as NextRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 4. Build a per-request handler bound to this user (rate-limit key +
  //    persistence are both userId-scoped).
  const handler = createCockpitChatHandler({
    llmClient: kimi,
    model: KIMI_MODEL,
    systemPrompt: SYSTEM_PROMPT,
    userId,
    persistence: createUserScopedPersistence(userId),
    rateLimitMax: CHAT_RATE_MAX,
    rateLimitWindowMs: CHAT_RATE_WINDOW_MS,
  });

  // 5. Trace the call as an LlmRun. The handler streams internally and does
  //    not surface token usage or a completion hook, so we can only record
  //    wall-clock latency + terminal status here (inputTokens/outputTokens/
  //    costUsd stay null — capturing them would require forking the handler,
  //    which is out of scope and would duplicate its stream logic).
  const startedAt = Date.now();
  try {
    const res = await handler.POST(sanitizedReq);
    const latencyMs = Date.now() - startedAt;
    const ok = res.status < 400;
    try {
      await prisma.llmRun.create({
        data: {
          agentName: "cockpit-chat-kimi",
          model: KIMI_MODEL,
          status: ok ? "success" : "failed",
          latencyMs,
          userId,
          ...(ok
            ? {}
            : {
                errorType: "handler_http_error",
                errorMessage: `handler returned ${res.status}`,
              }),
        },
      });
    } catch (traceErr) {
      // Tracing must never break the user-facing response.
      logger.warn(
        "cockpit-chat LlmRun trace failed",
        {},
        traceErr instanceof Error ? traceErr : undefined,
      );
    }
    return res;
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    logger.error(
      "cockpit-chat handler failed",
      {},
      err instanceof Error ? err : undefined,
    );
    try {
      await prisma.llmRun.create({
        data: {
          agentName: "cockpit-chat-kimi",
          model: KIMI_MODEL,
          status: "failed",
          latencyMs,
          userId,
          errorType: err instanceof Error ? err.name : "UnknownError",
          errorMessage: err instanceof Error ? err.message : "unknown error",
        },
      });
    } catch (traceErr) {
      logger.warn(
        "cockpit-chat LlmRun trace failed",
        {},
        traceErr instanceof Error ? traceErr : undefined,
      );
    }
    return new Response(JSON.stringify({ error: "Chat handler error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
