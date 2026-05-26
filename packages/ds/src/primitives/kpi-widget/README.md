# `kpi-widget`

Atomic KPI card with optional delta + inline sparkline + provenance pill.

```tsx
<KpiWidget
  variant="bordered"
  size="md"
  label="Yield Vault APY"
  value="9.4-12.8"
  unit="%"
  delta={{ value: 1.2, direction: "up" }}
  sparkline={[8.1, 9.2, 9.5, 10.1, 10.9, 11.3, 11.0, 11.4]}
  provenance="live"
  caption="Over 30 days, rule-based engine"
/>
```

Sparkline is plain SVG. No `recharts`, no `d3`. Adheres to AAA contrast.
