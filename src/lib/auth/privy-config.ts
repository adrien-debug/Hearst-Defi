import "server-only";

import { env } from "@/lib/env";

/**
 * Privy configuration values, read from validated environment.
 *
 * `NEXT_PUBLIC_PRIVY_APP_ID` is also referenced from client components
 * (it's compiled into the bundle by Next), so this server-only module only
 * touches the secret. The public app id is re-exported here for convenience
 * on the server (e.g. middleware, server components passing it down).
 */
export const PRIVY_APP_ID = env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
