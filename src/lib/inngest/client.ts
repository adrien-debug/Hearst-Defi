import "server-only";

import { Inngest } from "inngest";

/**
 * Singleton Inngest client for Hearst Connect.
 *
 * All cron functions and event-triggered jobs register against this client.
 * The client id MUST match the value used in `serve({ client })` at the
 * `/api/inngest` route.
 */
export const inngest = new Inngest({ id: "hearst-connect" });
