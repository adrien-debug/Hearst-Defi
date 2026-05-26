# Breadcrumb

Composed primitive: `<Breadcrumb>` wraps items; separators are auto-injected.

```tsx
<Breadcrumb>
  <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>
  <BreadcrumbItem><BreadcrumbLink href="/vaults">Vaults</BreadcrumbLink></BreadcrumbItem>
  <BreadcrumbItem current>Hearst Yield</BreadcrumbItem>
</Breadcrumb>
```

When more than 5 items are passed, the middle ones collapse to `…`.
