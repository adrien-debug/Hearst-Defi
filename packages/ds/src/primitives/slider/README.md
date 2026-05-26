# `Slider`

Token-styled wrapper over `@radix-ui/react-slider`. Single-thumb or dual-thumb (`dualThumb`),
two visual variants (`default`, `gradient`), optional marks under the track, optional
floating tooltip with custom formatter. Keyboard model inherited from Radix
(←/→, Home/End, PageUp/PageDown).

```tsx
import { Slider } from "@ds/primitives/slider";

<Slider
  min={0}
  max={100}
  step={5}
  defaultValue={[20, 80]}
  dualThumb
  showTooltip
  formatValue={(n) => `${n}%`}
  marks={[{ value: 0, label: "0" }, { value: 50, label: "50" }, { value: 100, label: "100" }]}
  ariaLabel="Allocation range"
/>
```
