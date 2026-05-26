# Context-Menu

Miroir API du Dropdown, mais ancré au point du clic droit (`oncontextmenu` natif). Bloque le menu navigateur tant que l'utilisateur clique-droit dans le `<ContextMenuTrigger/>`.

```tsx
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
} from "@ds/primitives/context-menu";

<ContextMenu>
  <ContextMenuTrigger>
    <div className="canvas">click-droit ici</div>
  </ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuLabel>Actions</ContextMenuLabel>
    <ContextMenuItem shortcut="⌘C">Copy</ContextMenuItem>
    <ContextMenuItem destructive shortcut="⌘⌫">Delete</ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuCheckboxItem checked>Auto-snap</ContextMenuCheckboxItem>
    <ContextMenuRadioGroup value="medium">
      <ContextMenuRadioItem value="low">Low</ContextMenuRadioItem>
      <ContextMenuRadioItem value="medium">Medium</ContextMenuRadioItem>
    </ContextMenuRadioGroup>
  </ContextMenuContent>
</ContextMenu>;
```
