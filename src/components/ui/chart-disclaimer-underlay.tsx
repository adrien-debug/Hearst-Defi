import { cn } from "@/lib/cn";

const DEFAULT_TEXT =
  "projections · not guaranteed · methodology v1.0" as const;

export interface ChartDisclaimerUnderlayProps {
  text?: string;
  className?: string;
}

/**
 * Decorative disclaimer watermark rendered behind chart content.
 *
 * Absolutely fills its positioned ancestor, pointer-events disabled.
 * Text is rotated −12 °, font-size 0.625 rem, letter-spacing 0.15 em,
 * color var(--ct-text-faint) at 0.08 opacity.
 *
 * aria-hidden="true" — content is announced through the chart's own
 * provenance badge and methodology disclosure elsewhere in the page.
 */
export function ChartDisclaimerUnderlay({
  text = DEFAULT_TEXT,
  className,
}: ChartDisclaimerUnderlayProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute inset-0 flex items-center justify-center pointer-events-none select-none",
        className,
      )}
      style={{ overflow: "hidden" }}
    >
      <span
        style={{
          transform: "rotate(-12deg)",
          color: "var(--ct-text-faint, var(--ct-text-muted))",
          opacity: 0.08,
          fontSize: "0.625rem",
          letterSpacing: "0.15em",
          whiteSpace: "nowrap",
          fontWeight: 500,
          textTransform: "uppercase",
        }}
      >
        {text}
      </span>
    </div>
  );
}
