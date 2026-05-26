import { cva } from "@ds/utils/cva";

export const topbarVariants = cva(
  ["ds-flex ds-items-center ds-w-full"].join(" "),
  {
    variants: {
      variant: { default: "", bordered: "", floating: "", glass: "" },
      sticky: { true: "", false: "" },
    },
    defaultVariants: { variant: "default", sticky: true },
  },
);
