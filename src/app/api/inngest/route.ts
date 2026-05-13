import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest/client";
import { investorMemoMonthly } from "@/lib/inngest/functions/investor-memo-monthly";
import { miningHealthDaily } from "@/lib/inngest/functions/mining-health-daily";

/**
 * Inngest webhook endpoint.
 *
 * Inngest invokes this URL to discover registered functions and execute
 * individual steps. Cron triggers (`mining-health-daily`, `investor-memo-monthly`)
 * are scheduled by the Inngest platform and dispatched here.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [miningHealthDaily, investorMemoMonthly],
});
