import { tv } from "@ds/utils/tv";

export const tableVariants = tv({
  base: [
    "ds-w-full ds-border-collapse",
    "ds-text-[var(--ds-text-primary)]",
  ].join(" "),
  variants: {
    variant: {
      default: "",
      striped: "",
      bordered:
        "ds-border ds-border-solid ds-border-[var(--ds-border-default)]",
      minimal: "",
    },
    size: {
      sm: "ds-text-[var(--ds-font-size-body-xs)]",
      md: "ds-text-[var(--ds-font-size-body-sm)]",
      lg: "ds-text-[var(--ds-font-size-body-md)]",
    },
  },
  defaultVariants: { variant: "default", size: "md" },
});

export const tdSizePadding: Record<"sm" | "md" | "lg", string> = {
  sm: "calc(var(--ds-spacing-2) * var(--ds-density-current))",
  md: "calc(var(--ds-spacing-3) * var(--ds-density-current))",
  lg: "calc(var(--ds-spacing-4) * var(--ds-density-current))",
};
