# Dropdown

Menu déroulant token-driven, clavier complet (Arrow Up/Down, Home/End, Esc, Enter/Space). Items supportent `disabled`, `destructive` (rouge), `inset`, `shortcut`.

```tsx
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
  DropdownCheckboxItem,
  DropdownRadioGroup,
  DropdownRadioItem,
  DropdownSub,
  DropdownSubTrigger,
  DropdownSubContent,
} from "@ds/primitives/dropdown";

<Dropdown>
  <DropdownTrigger>Open</DropdownTrigger>
  <DropdownContent side="bottom" align="start">
    <DropdownLabel>Actions</DropdownLabel>
    <DropdownItem shortcut="⌘E">Edit</DropdownItem>
    <DropdownItem destructive>Delete</DropdownItem>
    <DropdownSeparator />
    <DropdownCheckboxItem checked>Auto-sync</DropdownCheckboxItem>
    <DropdownRadioGroup value="medium">
      <DropdownRadioItem value="low">Low</DropdownRadioItem>
      <DropdownRadioItem value="medium">Medium</DropdownRadioItem>
    </DropdownRadioGroup>
    <DropdownSub>
      <DropdownSubTrigger>More</DropdownSubTrigger>
      <DropdownSubContent>
        <DropdownItem>Export</DropdownItem>
      </DropdownSubContent>
    </DropdownSub>
  </DropdownContent>
</Dropdown>;
```
