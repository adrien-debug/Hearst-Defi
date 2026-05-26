import type { ReactNode, TextareaHTMLAttributes } from "react";

import type { TextareaVariantProps } from "./textarea.variants";

export type TextareaVariant = NonNullable<TextareaVariantProps["variant"]>;
export type TextareaSize = NonNullable<TextareaVariantProps["size"]>;

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size" | "prefix">,
    Pick<TextareaVariantProps, "variant" | "size"> {
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  /** Dynamically grows `rows` as content overflows. Default false. */
  autoResize?: boolean;
  /** Visible row baseline (HTML `rows`). Ignored when `autoResize` is on. */
  rows?: number;
  /** Renders an inline counter `current / maxLength` bottom-right. */
  maxLength?: number;
  required?: boolean;
  containerClassName?: string;
}
