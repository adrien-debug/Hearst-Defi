import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Canonical className merger.
 *
 * Combines `clsx` (conditional class composition) with `tailwind-merge`
 * (conflict resolution for Tailwind utility collisions, e.g. `p-2 p-4` → `p-4`).
 *
 * Use this everywhere a className is composed — never raw template strings
 * with conditional classes.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export type { ClassValue };
