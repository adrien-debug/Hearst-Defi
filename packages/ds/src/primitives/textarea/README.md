# `Textarea`

Multi-line input. Same label / description / error contract as `Input`. Supports `autoResize`
(grows with content, manual resize off), `maxLength` with an inline polite counter
(`23 / 280`), and three visual variants (`default`, `filled`, `flushed`).

```tsx
import { Textarea } from "@ds/primitives/textarea";

<Textarea
  label="Investor memo"
  description="Markdown supported."
  autoResize
  maxLength={2000}
/>
```
