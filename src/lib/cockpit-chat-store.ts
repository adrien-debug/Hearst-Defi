import "server-only";
import { prisma as db } from "@/lib/db";

/**
 * cockpit-chat-store.ts
 * Server-only. Isolation par userId (Privy DID) au niveau application —
 * équivalent du RLS Supabase demandé par la SPEC §6, appliqué via filtre Prisma.
 */

// ---------------------------------------------------------------------------
// listChats — tous les chats de l'utilisateur, triés par updatedAt desc
// ---------------------------------------------------------------------------
export async function listChats(userId: string) {
  return db.cockpitChat.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// ---------------------------------------------------------------------------
// getChat — un chat + ses messages (throw si userId mismatch)
// ---------------------------------------------------------------------------
export async function getChat(userId: string, chatId: string) {
  const chat = await db.cockpitChat.findUnique({
    where: { id: chatId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!chat) throw new Error(`Chat not found: ${chatId}`);
  if (chat.userId !== userId) throw new Error("Forbidden: userId mismatch");

  return chat;
}

// ---------------------------------------------------------------------------
// createChat — nouveau thread vide
// ---------------------------------------------------------------------------
export async function createChat(userId: string, title?: string) {
  return db.cockpitChat.create({
    data: { userId, title: title ?? null },
  });
}

// ---------------------------------------------------------------------------
// appendMessage — ajoute un message et bumpe updatedAt du chat
// ---------------------------------------------------------------------------
export async function appendMessage(
  userId: string,
  chatId: string,
  role: "user" | "assistant" | "system",
  content: string
) {
  // Vérifie l'ownership avant d'écrire
  const chat = await db.cockpitChat.findUnique({
    where: { id: chatId },
    select: { userId: true },
  });

  if (!chat) throw new Error(`Chat not found: ${chatId}`);
  if (chat.userId !== userId) throw new Error("Forbidden: userId mismatch");

  return db.cockpitMessage.create({
    data: { chatId, role, content },
  });
}
