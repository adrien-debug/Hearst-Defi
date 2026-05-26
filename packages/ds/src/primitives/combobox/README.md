# `Combobox`

Searchable single- or multi-select. Built on Radix Popover plus a custom listbox so we can ship
multi-select badges, an inline `creatable` flow, and the standard keyboard model
(↑/↓ navigate, Enter select, Escape close, Backspace removes the last multi badge when the
query is empty). Token-styled trigger reuses Input tokens; popover uses popover tokens.

```tsx
import { Combobox } from "@ds/primitives/combobox";

<Combobox
  label="Vaults"
  placeholder="Pick one or more"
  multi
  creatable
  options={[
    { value: "yield", label: "Yield" },
    { value: "def", label: "Defensive" },
    { value: "btc+", label: "BTC Plus" },
  ]}
  onCreate={(v) => console.log("create", v)}
/>
```
