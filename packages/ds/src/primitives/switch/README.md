# `Switch`

Toggle switch on top of `@radix-ui/react-switch`. Three sizes (`sm`, `md`, `lg`), configurable
label position (`left` is the canonical settings-row layout). Animations respect
`prefers-reduced-motion`. Focus ring uses `--ds-color-focus-ring`.

```tsx
import { Switch } from "@ds/primitives/switch";

<Switch
  label="Email notifications"
  description="Send a recap every Monday."
  labelPosition="left"
  defaultChecked
/>
```
