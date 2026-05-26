import { cva } from "@ds/utils/cva";

export const popoverContentVariants = cva(["ds-outline-none"].join(" "), {
  variants: {
    variant: { default: "", menu: "", rich: "" },
    size: { sm: "", md: "", lg: "" },
  },
  defaultVariants: { variant: "default", size: "md" },
});
