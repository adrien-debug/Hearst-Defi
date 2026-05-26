# `Checkbox`

Token-styled wrapper over `@radix-ui/react-checkbox`. Two layout variants: `default` (compact,
inline) and `card` (entire row clickable, bordered, accent-tinted when checked). Three sizes
(`sm`, `md`, `lg`), an honest `indeterminate` state, and Lucide-icon glyphs.

```tsx
import { Checkbox } from "@ds/primitives/checkbox";

<Checkbox label="Accept terms" description="You can revoke at any time." />

<Checkbox variant="card" label="Power user" description="Unlocks expert mode." />
```
