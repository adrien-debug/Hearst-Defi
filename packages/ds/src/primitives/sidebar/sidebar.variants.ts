import { cva } from "@ds/utils/cva";

export const sidebarVariants = cva(
  [
    "ds-flex ds-flex-col ds-h-full",
    "ds-transition-[width] ds-duration-200",
  ].join(" "),
  {
    variants: {
      collapsed: { true: "", false: "" },
      variant: { default: "", floating: "", inset: "" },
    },
    defaultVariants: { collapsed: false, variant: "default" },
  },
);
