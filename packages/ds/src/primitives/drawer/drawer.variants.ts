import { cva } from "@ds/utils/cva";

export const drawerContentVariants = cva(
  ["ds-flex ds-flex-col ds-outline-none ds-fixed"].join(" "),
  {
    variants: {
      side: { left: "", right: "", top: "", bottom: "" },
      size: { sm: "", md: "", lg: "", xl: "", full: "" },
    },
    defaultVariants: { side: "right", size: "md" },
  },
);
