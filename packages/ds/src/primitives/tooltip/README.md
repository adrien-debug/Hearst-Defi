# Tooltip

Affichage retardé sur hover/focus, dismissable via Escape. `delayDuration` 300ms par défaut.

```tsx
import { Tooltip } from "@ds/primitives/tooltip";

<Tooltip content="Save (⌘S)" side="top" delayDuration={400}>
  <Button>Save</Button>
</Tooltip>;
```

A11y: tooltip ID injecté dans `aria-describedby` du child trigger.
