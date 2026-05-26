import type { ComponentPropsWithoutRef, ReactNode } from "react";
import type * as RxRadio from "@radix-ui/react-radio-group";

import type {
  RadioControlVariantProps,
  RadioGroupVariantProps,
  RadioRowVariantProps,
} from "./radio.variants";

export type RadioSize = NonNullable<RadioControlVariantProps["size"]>;
export type RadioVariant = NonNullable<RadioRowVariantProps["variant"]>;
export type RadioOrientation = NonNullable<
  RadioGroupVariantProps["orientation"]
>;

export interface RadioGroupProps
  extends ComponentPropsWithoutRef<typeof RxRadio.Root>,
    Pick<RadioGroupVariantProps, "orientation"> {
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  containerClassName?: string;
}

export interface RadioProps
  extends Omit<ComponentPropsWithoutRef<typeof RxRadio.Item>, "value">,
    Pick<RadioRowVariantProps, "variant">,
    Pick<RadioControlVariantProps, "size"> {
  value: string;
  label?: ReactNode;
  description?: ReactNode;
  rootClassName?: string;
}
