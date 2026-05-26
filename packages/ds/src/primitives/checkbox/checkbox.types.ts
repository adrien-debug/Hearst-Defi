import type { ComponentPropsWithoutRef, ReactNode } from "react";
import type * as RxCheckbox from "@radix-ui/react-checkbox";

import type {
  CheckboxControlVariantProps,
  CheckboxRootVariantProps,
} from "./checkbox.variants";

export type CheckboxSize = NonNullable<CheckboxControlVariantProps["size"]>;
export type CheckboxVariant = NonNullable<CheckboxRootVariantProps["variant"]>;

export interface CheckboxProps
  extends Omit<
      ComponentPropsWithoutRef<typeof RxCheckbox.Root>,
      "checked" | "defaultChecked" | "onCheckedChange"
    >,
    Pick<CheckboxRootVariantProps, "variant">,
    Pick<CheckboxControlVariantProps, "size"> {
  label?: ReactNode;
  description?: ReactNode;
  /** Controlled value. `true` | `false` | `"indeterminate"`. */
  checked?: boolean | "indeterminate";
  /** Uncontrolled initial value. */
  defaultChecked?: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean | "indeterminate") => void;
  /** Explicitly force the indeterminate render even when checked is false. */
  indeterminate?: boolean;
  /** Marks visually as invalid. */
  invalid?: boolean;
  /** Wrapper className override. */
  rootClassName?: string;
}
