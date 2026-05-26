import type * as React from "react";

/**
 * Adds an optional `asChild` flag to a props bag (Radix Slot pattern).
 * When `asChild` is true, the component renders via `<Slot />` and merges
 * its props/ref onto its single child element.
 */
export type AsChildProps<T> = T & { asChild?: boolean };

/**
 * Ref type for a polymorphic component rendered as element `E`.
 */
export type PolymorphicRef<E extends React.ElementType> =
  React.ComponentPropsWithRef<E>["ref"];

/**
 * Props for a polymorphic component:
 * - Own props `P`
 * - Native props of the rendered element `E` (minus collisions with `P`)
 * - Optional `as` to override the rendered element
 *
 * Use together with `forwardRef` to get a fully typed `as` prop.
 */
export type PolymorphicComponentProps<
  E extends React.ElementType,
  P = object,
> = P &
  Omit<React.ComponentPropsWithoutRef<E>, keyof P | "as"> & {
    as?: E;
  };

/**
 * Same as `PolymorphicComponentProps` but with `ref` included.
 */
export type PolymorphicComponentPropsWithRef<
  E extends React.ElementType,
  P = object,
> = PolymorphicComponentProps<E, P> & { ref?: PolymorphicRef<E> };

/**
 * Helper to type a polymorphic forwardRef component.
 *
 * @example
 * const Box = forwardRef(<E extends ElementType = "div">(
 *   props: PolymorphicComponentProps<E, { color?: string }>,
 *   ref: PolymorphicRef<E>
 * ) => { ... }) as PolymorphicForwardRefComponent<"div", { color?: string }>;
 */
export type PolymorphicForwardRefComponent<
  DefaultElement extends React.ElementType,
  P = object,
> = <E extends React.ElementType = DefaultElement>(
  props: PolymorphicComponentPropsWithRef<E, P>,
) => React.ReactElement | null;
