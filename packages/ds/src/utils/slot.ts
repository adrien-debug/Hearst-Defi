/**
 * Re-export of `@radix-ui/react-slot`.
 *
 * `<Slot />` merges its props (className, refs, event handlers) onto its
 * single child element. Used to implement the `asChild` polymorphism pattern
 * required by CONTRACT.md §3.3.
 *
 * `<Slottable />` marks the child that should receive the slot when wrapping
 * additional siblings (icon + label inside a Button using `asChild`, etc.).
 */
export { Slot, Slottable } from "@radix-ui/react-slot";
