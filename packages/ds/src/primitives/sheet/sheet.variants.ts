import { cva } from "@ds/utils/cva";

export const sheetContentVariants = cva(
  ["ds-flex ds-flex-col ds-outline-none"].join(" "),
  {
    variants: {
      desktopBehavior: { sheet: "", modal: "" },
    },
    defaultVariants: { desktopBehavior: "sheet" },
  },
);
