# Sheet

Bottom-sheet mobile-first avec snap points. Sur desktop (≥640px), bascule en Modal `sm` centré. `snapPoints` exprimés en fraction du viewport (`0.4` = 40%).

```tsx
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHandle,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
  SheetClose,
} from "@ds/primitives/sheet";

<Sheet snapPoints={[0.4, 0.7, 1]}>
  <SheetTrigger>Filters</SheetTrigger>
  <SheetContent aria-label="Filters">
    <SheetHandle />
    <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
    <SheetBody>…</SheetBody>
    <SheetFooter><SheetClose>Apply</SheetClose></SheetFooter>
  </SheetContent>
</Sheet>;
```

Drag handle : tirer vers le bas réduit le snap ; arrivé au plus bas, ferme (si `dismissible`).
