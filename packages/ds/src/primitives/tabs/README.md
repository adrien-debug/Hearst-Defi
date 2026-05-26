# Tabs

Tab strip. Variants `default | pills | underline | enclosed`, sizes `sm | md | lg`, `horizontal | vertical`. Clavier complet (Arrow, Home, End).

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@ds/primitives/tabs";

// composition
<Tabs defaultValue="overview" variant="underline">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="activity" badge={3}>Activity</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">…</TabsContent>
  <TabsContent value="activity">…</TabsContent>
</Tabs>

// inline
<Tabs
  defaultValue="a"
  tabs={[
    { value: "a", label: "Alpha", content: <>A</> },
    { value: "b", label: "Beta", content: <>B</>, badge: 2 },
  ]}
/>;
```
