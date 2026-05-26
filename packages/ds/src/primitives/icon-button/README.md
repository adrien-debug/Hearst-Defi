# `IconButton`

Square icon-only button. Identical motion/focus contract as `Button` but with a typed-required
`aria-label` (no visible text → screen readers depend on it). Three variants (`ghost`, `solid`,
`outline`), five sizes (`xs` through `xl`, all ≥ 24×24 hit area for `xs`, ≥ 44×44 for `md+`).

```tsx
import { IconButton } from "@ds/primitives/icon-button";
import { X } from "lucide-react";

<IconButton aria-label="Close" variant="ghost" size="md">
  <X />
</IconButton>
```
