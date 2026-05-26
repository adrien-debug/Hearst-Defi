# Popover

Couche flottante interactive (formulaires, menus, contenu riche). Variants `default | menu | rich` — `rich` ajoute du padding pour contenus structurés.

```tsx
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverFooter,
  PopoverClose,
} from "@ds/primitives/popover";

<Popover>
  <PopoverTrigger>Filters</PopoverTrigger>
  <PopoverContent variant="rich" size="lg" side="bottom" align="end">
    <PopoverHeader>Filters</PopoverHeader>
    …
    <PopoverFooter>
      <PopoverClose>Done</PopoverClose>
    </PopoverFooter>
  </PopoverContent>
</Popover>;
```
