import { tv, type TVVariantProps } from "../../utils/tv";

export const chartVariants = tv({
  slots: {
    root: ["relative inline-block w-full text-[color:var(--ds-text-primary)]"],
    svg: ["block w-full h-auto"],
    grid: ["stroke-[color:var(--ds-border-default)]"],
    axisLabel: [
      "fill-[color:var(--ds-text-secondary)]",
      "font-[family-name:var(--ds-font-family-mono)]",
    ],
    tooltip: [
      "pointer-events-none absolute z-[var(--ds-z-tooltip)]",
      "px-[var(--ds-spacing-2)] py-[var(--ds-spacing-1)]",
      "rounded-[var(--ds-radius-md)]",
      "border border-solid border-[color:var(--ds-border-default)]",
      "bg-[color:var(--ds-bg-elevated,var(--ds-color-neutral-50))]",
      "text-[length:var(--ds-font-size-body-xs)]",
      "text-[color:var(--ds-text-primary)]",
      "shadow-[var(--ds-shadow-sm,0_1px_2px_0_rgba(0,0,0,0.05))]",
      "translate-x-[-50%] translate-y-[-100%]",
    ],
    legend: [
      "flex flex-wrap gap-[var(--ds-spacing-3)]",
      "mt-[var(--ds-spacing-2)]",
      "text-[length:var(--ds-font-size-body-xs)]",
      "text-[color:var(--ds-text-secondary)]",
    ],
    legendItem: ["inline-flex items-center gap-[var(--ds-spacing-1)]"],
    legendSwatch: [
      "inline-block h-[var(--ds-spacing-2)] w-[var(--ds-spacing-2)]",
      "rounded-[var(--ds-radius-xs)]",
    ],
  },
});

export type ChartVariantProps = TVVariantProps<typeof chartVariants>;

export const CHART_PALETTE: readonly string[] = [
  "var(--ds-chart-1,var(--ds-color-accent-500))",
  "var(--ds-chart-2,var(--ds-color-info-500))",
  "var(--ds-chart-3,var(--ds-color-warning-500))",
  "var(--ds-chart-4,var(--ds-color-danger-500))",
  "var(--ds-chart-5,var(--ds-color-primary-500))",
  "var(--ds-chart-6,var(--ds-color-success-500))",
  "var(--ds-chart-7,var(--ds-color-accent-300))",
  "var(--ds-chart-8,var(--ds-color-info-300))",
  "var(--ds-chart-9,var(--ds-color-warning-300))",
  "var(--ds-chart-10,var(--ds-color-danger-300))",
  "var(--ds-chart-11,var(--ds-color-primary-300))",
  "var(--ds-chart-12,var(--ds-color-success-300))",
];

export function pickColor(
  index: number,
  palette: readonly string[] = CHART_PALETTE,
): string {
  return palette[index % palette.length] ?? CHART_PALETTE[0]!;
}
