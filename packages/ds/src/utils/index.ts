/**
 * @ds/core — utility & variant layer.
 *
 * Plumbing consumed by every primitive: className merging, variant authoring,
 * polymorphism, slot composition, SSR-safe responsive hooks, accessibility.
 *
 * Owned by Agent D (CONTRACT.md §8).
 */

// Class composition
export { cn, type ClassValue } from "./cn";

// Variant authoring
export { cva, cx } from "./cva";
export type { VariantProps } from "./cva";
export { tv } from "./tv";
export type { TVVariantProps } from "./tv";

// Slot / polymorphism
export { Slot, Slottable } from "./slot";
export type {
  AsChildProps,
  PolymorphicRef,
  PolymorphicComponentProps,
  PolymorphicComponentPropsWithRef,
  PolymorphicForwardRefComponent,
} from "./polymorphic";

// Refs
export { composeRefs, useComposedRefs } from "./compose-refs";

// State patterns
export { useControllableState } from "./controllable";

// Identity
export { useId } from "./id";

// Responsive / viewport / container
export {
  BREAKPOINTS,
  useBreakpoint,
  useMediaQuery,
  useContainerQuery,
  useIsClient,
} from "./responsive";
export type { Breakpoint } from "./responsive";

// Accessibility
export {
  srOnly,
  focusRingClasses,
  getInteractiveAttributes,
  useFocusTrap,
  useEscapeKey,
  useClickOutside,
} from "./a11y";
