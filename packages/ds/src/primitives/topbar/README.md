# Topbar

Barre horizontale 3 slots (`left | center | right`). Sticky par défaut. Variants `default | bordered | floating | glass`.

```tsx
import { Topbar } from "@ds/primitives/topbar";

<Topbar
  variant="glass"
  left={<><Logo /><Breadcrumb /></>}
  center={<SearchInput />}
  right={<><Button>Invite</Button><Avatar /></>}
/>;
```

Override total via `children` si besoin d'un layout custom.
