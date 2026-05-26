import type { ReactNode } from "react";

import type { ComboTriggerVariantProps } from "./combobox.variants";

export type ComboboxSize = NonNullable<ComboTriggerVariantProps["size"]>;

export interface ComboboxOption {
  value: string;
  label: ReactNode;
  /** Pure search string. Defaults to `String(label)`. */
  searchText?: string;
  disabled?: boolean;
}

export type ComboboxValue<Multi extends boolean | undefined> =
  Multi extends true ? readonly string[] : string | undefined;

export interface ComboboxBaseProps {
  options: ReadonlyArray<ComboboxOption>;
  size?: ComboboxSize;
  placeholder?: string;
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
  triggerClassName?: string;
  /** Show a spinner inside the trigger. */
  loading?: boolean;
  /** Message rendered when no option matches the query. */
  emptyMessage?: ReactNode;
  /** Allow creating new options inline (Enter on a query with no match). */
  creatable?: boolean;
  /** Maximum height of the popover scroll area in CSS units. */
  maxHeight?: string;
  /** Callback when the user creates a brand new option. */
  onCreate?: (value: string) => void;
}

export type ComboboxSingleProps = ComboboxBaseProps & {
  multi?: false;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string | undefined) => void;
};

export type ComboboxMultiProps = ComboboxBaseProps & {
  multi: true;
  value?: readonly string[];
  defaultValue?: readonly string[];
  onChange?: (value: readonly string[]) => void;
};

export type ComboboxProps = ComboboxSingleProps | ComboboxMultiProps;
