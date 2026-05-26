import { cva } from "@ds/utils/cva";

export const dropdownContentVariants = cva(
  ["ds-outline-none"].join(" "),
  {
    variants: {
      size: { sm: "", md: "", lg: "" },
    },
    defaultVariants: { size: "md" },
  },
);

export const dropdownItemVariants = cva(
  ["ds-outline-none"].join(" "),
  {
    variants: {
      destructive: { true: "", false: "" },
      inset: { true: "", false: "" },
      disabled: { true: "", false: "" },
    },
    defaultVariants: { destructive: false, inset: false, disabled: false },
  },
);
