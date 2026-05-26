/**
 * Pagination computes its own variants inline because each variant has
 * a fundamentally different DOM shape (default = page buttons,
 * minimal = prev/next + counter, dots = round indicators).
 *
 * This file is kept for naming-symmetry with the other primitives.
 */
export const paginationVariantNames = ["default", "minimal", "dots"] as const;
