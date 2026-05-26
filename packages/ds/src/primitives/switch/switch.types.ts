import type { ComponentPropsWithoutRef, ReactNode } from "react";
import type * as RxSwitch from "@radix-ui/react-switch";

import type {
  SwitchControlVariantProps,
  SwitchRowVariantProps,
} from "./switch.variants";

export type SwitchSize = NonNullable<SwitchControlVariantProps["size"]>;
export type SwitchLabelPosition = NonNullable<
  SwitchRowVariantProps["labelPosition"]
>;

export interface SwitchProps
  extends ComponentPropsWithoutRef<typeof RxSwitch.Root>,
    Pick<SwitchControlVariantProps, "size">,
    Pick<SwitchRowVariantProps, "labelPosition"> {
  label?: ReactNode;
  description?: ReactNode;
  rootClassName?: string;
}
