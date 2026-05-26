import { cva } from "@ds/utils/cva";

export const modalContentVariants = cva(
  [
    "ds-relative ds-flex ds-flex-col",
    "ds-outline-none",
    "ds-max-h-[calc(100dvh-var(--ds-spacing-12))]",
    "ds-overflow-hidden",
  ].join(" "),
  {
    variants: {
      size: { sm: "", md: "", lg: "", xl: "", full: "" },
      variant: { default: "", centered: "", "sheet-bottom": "" },
    },
    defaultVariants: { size: "md", variant: "default" },
  },
);
