# `Select`

Token-styled wrapper over `@radix-ui/react-select`. Accepts a flat `options` array, or
group-aware options (each option carries an optional `group` key). Same label /
description / error contract as `Input`. Inherits Radix's keyboard and ARIA correctness
(typeahead, ↑↓, Enter, Escape, Home / End).

```tsx
import { Select } from "@ds/primitives/select";

<Select
  label="Asset"
  placeholder="Pick a base asset"
  options={[
    { value: "btc", label: "Bitcoin", group: "Layer 1" },
    { value: "eth", label: "Ethereum", group: "Layer 1" },
    { value: "usdc", label: "USDC", group: "Stables" },
  ]}
  groupOrder={["Layer 1", "Stables"]}
/>
```
