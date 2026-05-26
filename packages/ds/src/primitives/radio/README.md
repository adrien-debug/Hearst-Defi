# `RadioGroup` + `Radio`

Token-styled wrapper over `@radix-ui/react-radio-group`. `RadioGroup` exposes the same
label / description / error contract as `Input`; `Radio` has two layout variants
(`default` / `card`), three sizes, and inherits Radix's roving-tabindex keyboard model.

```tsx
import { RadioGroup, Radio } from "@ds/primitives/radio";

<RadioGroup label="Subscription tier" defaultValue="pro">
  <Radio value="free" label="Free" description="Limited to 1 vault." />
  <Radio value="pro" label="Pro" description="Up to 10 vaults." />
  <Radio variant="card" value="ent" label="Enterprise" description="Custom." />
</RadioGroup>
```
