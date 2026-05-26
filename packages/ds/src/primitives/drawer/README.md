# Drawer

Side panel coulissant (`left | right | top | bottom`), `sm | md | lg | xl | full`. Dismissible par défaut (Escape + backdrop click).

```tsx
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
  DrawerFooter,
  DrawerClose,
} from "@ds/primitives/drawer";

<Drawer>
  <DrawerTrigger>Open nav</DrawerTrigger>
  <DrawerContent side="left" size="md">
    <DrawerHeader><DrawerTitle>Navigation</DrawerTitle></DrawerHeader>
    <DrawerBody>…</DrawerBody>
    <DrawerFooter><DrawerClose>Done</DrawerClose></DrawerFooter>
  </DrawerContent>
</Drawer>;
```
