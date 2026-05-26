import { cva } from "@ds/utils/cva";

export const tooltipVariants = cva(["ds-pointer-events-none"].join(" "), {
  variants: {
    size: { sm: "", md: "", lg: "" },
  },
  defaultVariants: { size: "md" },
});
