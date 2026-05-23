import "server-only";
import { PrismaClient } from "@prisma/client";

/**
 * Standard Prisma + Next.js dev singleton pattern.
 *
 * In development, Next.js HMR re-evaluates this module on every change,
 * which would otherwise spawn a new PrismaClient (and a new connection
 * pool) on each reload until the DB runs out of connections. We stash
 * the client on `globalThis` so it survives HMR. The `as unknown as`
 * cast is required because `globalThis` is typed as the global scope and
 * has no `prisma` member — there is no safer way to augment it inline.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
