import { cva } from "@ds/utils/cva";

export const tabsListVariants = cva(
  ["ds-flex ds-relative"].join(" "),
  {
    variants: {
      variant: { default: "", pills: "", underline: "", enclosed: "" },
      size: { sm: "", md: "", lg: "" },
      orientation: { horizontal: "", vertical: "" },
    },
    defaultVariants: { variant: "default", size: "md", orientation: "horizontal" },
  },
);

export const tabsTriggerVariants = cva(
  ["ds-inline-flex ds-items-center ds-justify-center ds-outline-none"].join(
    " ",
  ),
  {
    variants: {
      variant: { default: "", pills: "", underline: "", enclosed: "" },
      size: { sm: "", md: "", lg: "" },
      active: { true: "", false: "" },
    },
    defaultVariants: { variant: "default", size: "md", active: false },
  },
);
