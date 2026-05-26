import { cva } from "@ds/utils/cva";

export const toastVariants = cva(
  ["ds-pointer-events-auto ds-outline-none"].join(" "),
  {
    variants: {
      variant: {
        default: "",
        success: "",
        error: "",
        warning: "",
        info: "",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
