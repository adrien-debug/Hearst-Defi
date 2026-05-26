# Sidebar

Rail vertical collapsable. Expanded 240px / collapsed 64px (icônes seules). Variants `default | floating | inset`. Item peut être `<a href>` ou `<button onClick>`.

```tsx
import {
  Sidebar,
  SidebarHeader,
  SidebarBody,
  SidebarFooter,
  SidebarSection,
  SidebarItem,
  SidebarSeparator,
} from "@ds/primitives/sidebar";

const [collapsed, setCollapsed] = React.useState(false);

<Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed}>
  <SidebarHeader>Logo</SidebarHeader>
  <SidebarBody>
    <SidebarSection title="Workspace">
      <SidebarItem icon={<HomeIcon />} label="Home" href="/" active />
      <SidebarItem icon={<InboxIcon />} label="Inbox" badge="12" />
      <SidebarSeparator />
      <SidebarItem icon={<CogIcon />} label="Settings" href="/settings" />
    </SidebarSection>
  </SidebarBody>
  <SidebarFooter>©</SidebarFooter>
</Sidebar>;
```

Quand `collapsed`, le label disparaît, le tooltip natif `title` prend le relais.
