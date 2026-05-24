import "server-only";

import { prisma } from "@/lib/db";
import {
  clampPageSize,
  toPrismaSkip,
  toPaginatedResult,
  type PaginatedResult,
} from "@/lib/pagination";

// ---------------------------------------------------------------------------
// Customers supervision contract.
//
// Aggregated investor list consumed by `src/app/admin/customers/page.tsx`.
// Decimal → number happens here at the data boundary so the UI never sees
// Prisma.Decimal (mirrors the pattern in `src/lib/data/dashboard.ts`).
// ---------------------------------------------------------------------------

export type KycStatus = "pending" | "approved" | "rejected";

export interface CustomerRow {
  /** Investor.id (cuid). */
  id: string;
  /** Auth identity email (User.email). */
  email: string;
  /** Connected payment wallet, or null until one is linked. */
  walletAddress: string | null;
  kycStatus: KycStatus;
  /** Number of positions with status === "active". */
  activePositions: number;
  /** Sum of principalUsdc across ALL the investor's positions, USDC. */
  totalPrincipalUsdc: number;
  /** Investor row creation date. */
  joinedAt: Date;
}

function normaliseKyc(status: string): KycStatus {
  if (status === "approved" || status === "rejected") return status;
  return "pending";
}

/**
 * Loads investors with their auth user + positions for the admin customers
 * table. Never throws on empty data — returns empty paginated result.
 *
 * Uses a manual batch join instead of Prisma's `include: { user }` to handle
 * orphaned Investor rows (userId references a deleted/missing User). Prisma
 * throws "Field user is required, got null" on those rows; fetching users
 * separately and filtering lets us skip orphans without crashing.
 */
export async function loadCustomers(
  page: number = 1,
  pageSize: number = 50,
): Promise<PaginatedResult<CustomerRow>> {
  const ps = clampPageSize(pageSize);

  const [investors, total] = await Promise.all([
    prisma.investor.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        positions: { select: { status: true, principalUsdc: true } },
      },
      skip: toPrismaSkip(page, ps),
      take: ps,
    }),
    prisma.investor.count(),
  ]);

  const userIds = investors.map((inv) => inv.userId).filter(Boolean);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true },
  });
  const userById = new Map(users.map((u) => [u.id, u.email]));

  const rows = investors
    .filter((inv) => {
      const known = userById.has(inv.userId);
      if (!known) {
        console.warn(
          `[customers] orphaned Investor ${inv.id} — userId ${inv.userId} has no User row, skipping`,
        );
      }
      return known;
    })
    .map((inv) => {
      const activePositions = inv.positions.filter(
        (p) => p.status === "active",
      ).length;

      // Decimal → number at the boundary, summed across all positions.
      const totalPrincipalUsdc = inv.positions.reduce(
        (sum, p) => sum + p.principalUsdc.toNumber(),
        0,
      );

      return {
        id: inv.id,
        email: userById.get(inv.userId) ?? "—",
        walletAddress: inv.walletAddress,
        kycStatus: normaliseKyc(inv.kycStatus),
        activePositions,
        totalPrincipalUsdc,
        joinedAt: inv.createdAt,
      };
    });

  return toPaginatedResult(rows, total, page, ps);
}
