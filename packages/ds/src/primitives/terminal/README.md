# `terminal`

Log surface or interactive REPL.

```tsx
<Terminal
  variant="default"
  interactive
  prompt="$ "
  onSubmit={(cmd) => exec(cmd)}
  lines={[
    { id: "1", ts: new Date(), level: "info", content: "Booting engine…" },
    { id: "2", ts: new Date(), level: "success", content: "Snapshot ✔" },
    { id: "3", ts: new Date(), level: "error", content: "Oracle stale" },
  ]}
/>
```

Auto-scrolls to bottom unless the user is scrolled up.
