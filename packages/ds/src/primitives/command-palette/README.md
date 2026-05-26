# `command-palette`

Modal Cmd+K command launcher.

```tsx
import { useState } from "react";
import { CommandPalette, useCommandRegistry } from "@ds/primitives/command-palette";

function App() {
  const [open, setOpen] = useState(false);

  // Optional cross-app registration
  useCommandRegistry([
    {
      id: "nav.home",
      label: "Go home",
      group: "Navigation",
      shortcut: "⌘H",
      action: () => router.push("/"),
    },
  ]);

  return (
    <CommandPalette
      open={open}
      onOpenChange={setOpen}
      commands={[/* … */]}
      recentIds={["nav.home"]}
      placeholder="Search commands…"
    />
  );
}
```

Keyboard: `↑/↓` navigate (wraps), `Home`/`End` jump, `Enter` execute, `Esc` close.
Filter: case-insensitive, supports prefix, substring, and subsequence fuzzy.
Tokens only — never hardcode colors or spacing inside variants.
