# Pagination

3 variants. Default produces `1 ... 4 5 [6] 7 8 ... 24` with siblings = 1.

```tsx
<Pagination page={page} totalPages={24} onChange={setPage} />
<Pagination page={page} totalPages={5} onChange={setPage} variant="minimal" />
<Pagination page={page} totalPages={4} onChange={setPage} variant="dots" />
```
