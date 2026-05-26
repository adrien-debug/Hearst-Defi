# `Button`

Token-only Button primitive (eight variants × five sizes). Polymorphic via Radix `Slot` (`asChild`),
WCAG AAA focus ring, `loading` state that preserves width and exposes `aria-busy`, optional leading
and trailing icons. Every visual property reads from `--ds-*` so it renders correctly in all 8 themes
without component changes.

```tsx
import { Button } from "@ds/primitives/button";
import { ArrowRight } from "lucide-react";

<Button variant="primary" size="md" iconRight={<ArrowRight />}>
  Continue
</Button>

<Button asChild variant="link">
  <a href="/docs">Read the docs</a>
</Button>
```
