# `Input`

Form input field with label / description / error slots, leading and trailing icons, plain-text
prefix / suffix add-ons, loading spinner, and an optional clear button. Four visual variants
(`default`, `filled`, `flushed`, `outline`), three sizes. ARIA `aria-invalid` / `aria-describedby`
are wired automatically from `error` and `description`.

```tsx
import { Input } from "@ds/primitives/input";
import { Mail } from "lucide-react";

<Input
  label="Work email"
  description="We'll only use it for login alerts."
  iconLeft={<Mail />}
  type="email"
  required
/>
```
