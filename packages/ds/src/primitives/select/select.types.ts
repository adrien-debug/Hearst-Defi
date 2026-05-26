import type { ReactNode } from "react";

import type { SelectTriggerVariantProps } from "./select.variants";

export type SelectSize = NonNullable<SelectTriggerVariantProps["size"]>;

export interface SelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
  /** Optional group key — items sharing a group get collected under a Label. */
  group?: string;
}

export interface SelectProps
  extends Pick<SelectTriggerVariantProps, "size"> {
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  placeholder?: string;
  /** Either a flat array or a group-aware array of options. */
  options: ReadonlyArray<SelectOption>;
  /** Optional ordered list of group keys to display groups in. */
  groupOrder?: ReadonlyArray<string>;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  /** Container className. */
  className?: string;
  /** Trigger className override. */
  triggerClassName?: string;
}
