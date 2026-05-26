# Card

Surface container. Variants `default | elevated | outlined | filled | glass | ghost`, padding `none | sm | md | lg`, radius `sm | md | lg | xl`. Set `interactive` to lift on hover, expose `role="button"`, and respond to Enter/Space.

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@ds/primitives/card";

<Card variant="elevated" radius="lg" padding="md" interactive>
  <CardHeader>
    <CardTitle>Portfolio</CardTitle>
    <CardDescription>Last 30 days</CardDescription>
  </CardHeader>
  <CardContent>…</CardContent>
  <CardFooter>…</CardFooter>
</Card>;
```

Every visual value resolves to a `var(--ds-*)` token — no hex, no px.
