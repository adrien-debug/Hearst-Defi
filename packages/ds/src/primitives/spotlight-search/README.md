# `spotlight-search`

Async, content-oriented search palette. Sections are returned by your `onQuery` callback.

```tsx
<SpotlightSearch
  open={open}
  onOpenChange={setOpen}
  onQuery={async (q) => [
    { section: "Vaults",       items: await searchVaults(q) },
    { section: "Investors",    items: await searchInvestors(q) },
    { section: "Distributions",items: await searchDistributions(q) },
  ]}
  onSelect={(it) => router.push(it.href!)}
/>
```

Debounced (~180 ms), Esc closes, ↑/↓ navigate, ↵ select. Falls back to `window.location.assign(item.href)` if no `onSelect` is provided.
