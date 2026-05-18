import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest/client";
import { investorMemoMonthly } from "@/lib/inngest/functions/investor-memo-monthly";
import { marketDataHourly } from "@/lib/inngest/functions/market-data-hourly";
import { miningHealthDaily } from "@/lib/inngest/functions/mining-health-daily";

/**
 * Inngest webhook endpoint.
 *
 * Inngest invokes this URL to discover registered functions and execute
 * individual steps. Cron triggers are scheduled by the Inngest platform
 * and dispatched here.
 *
 * Registered functions:
 *   - market-data-hourly  (every hour)
 *   - mining-health-daily (08:00 UTC daily)
 *   - investor-memo-monthly (1st of month 09:00 UTC)
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [marketDataHourly, miningHealthDaily, investorMemoMonthly],
});
