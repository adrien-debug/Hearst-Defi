import type { InputHTMLAttributes, ReactNode } from "react";

import type { InputRootVariantProps } from "./input.variants";

export type InputVariant = NonNullable<InputRootVariantProps["variant"]>;
export type InputSize = NonNullable<InputRootVariantProps["size"]>;

export type InputType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "search"
  | "tel"
  | "url"
  | "date"
  | "time"
  | "datetime-local";

export interface InputProps
  extends Omit<
      InputHTMLAttributes<HTMLInputElement>,
      "size" | "prefix" | "type"
    >,
    Pick<InputRootVariantProps, "variant" | "size"> {
  type?: InputType;
  /** Visible label rendered above the field. */
  label?: ReactNode;
  /** Helper text rendered below the field (muted). */
  description?: ReactNode;
  /** Error message — when present, the field becomes `aria-invalid`. */
  error?: ReactNode;
  /** Icon node rendered inside the field, leading. */
  iconLeft?: ReactNode;
  /** Icon node rendered inside the field, trailing. */
  iconRight?: ReactNode;
  /** Plain-text segment rendered at the start (e.g. `https://`). */
  prefix?: ReactNode;
  /** Plain-text segment rendered at the end (e.g. `.com`). */
  suffix?: ReactNode;
  /** Replaces trailing icon with a spinner while preserving width. */
  loading?: boolean;
  /** Shows a clear button when the field has a value. Uncontrolled-safe. */
  clearable?: boolean;
  /** Marks the field visually + semantically as required. */
  required?: boolean;
  /** Force the valid state (green border). */
  valid?: boolean;
  /** Container className override. */
  containerClassName?: string;
}
