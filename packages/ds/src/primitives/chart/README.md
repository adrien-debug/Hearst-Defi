# `chart`

Native-SVG chart family. Palette drives off `--ds-chart-1..12` tokens.

```tsx
import { LineChart, BarChart, DonutChart, AreaChart, SparklineChart } from "@ds/primitives/chart";

<LineChart
  series={[{ id: "apy", data: snapshots, label: "APY %" }]}
  xKey="day"
  yKey="apy"
  gridlines
  tooltip
  a11yLabel="APY over the last 30 days"
/>
```

No zoom, no pan, no axis labels (MVP scope). Crosshair + tooltip on `LineChart` only.
Each chart renders a legend below the SVG.
