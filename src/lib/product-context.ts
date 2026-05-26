import "server-only";

import type { ProductContext } from "@hearst/review-mode";
import { HEARST_PRODUCT_CONTEXT } from "@/lib/agents/system-prompts/review";

/**
 * Hearst Connect product map injected into the review-mode prompts.
 * Wraps the raw context string from `system-prompts/review.ts` into the
 * `ProductContext` shape expected by `@hearst/review-mode` factories.
 */
export const PRODUCT_CONTEXT: ProductContext = {
  text: HEARST_PRODUCT_CONTEXT,
};
