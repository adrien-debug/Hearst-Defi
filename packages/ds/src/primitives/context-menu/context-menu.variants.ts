import { cva } from "@ds/utils/cva";

export const contextMenuContentVariants = cva(["ds-outline-none"].join(" "), {
  variants: {
    size: { sm: "", md: "", lg: "" },
  },
  defaultVariants: { size: "md" },
});
