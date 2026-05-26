# DataGrid

For big datasets (>100 rows). Composes `<Table>` + `<Pagination>` and uses the
headless `useDataGrid` hook (slice-based virtualization, sort, filter,
pagination). Built-in row selection, bulk actions toolbar, optional sticky
first column.

```tsx
const columns: DataGridColumn<Tx>[] = [
  { id: "asset", header: "Asset", accessor: (r) => r.asset, sortable: true },
  { id: "amt", header: "Amount", accessor: (r) => r.amount, numeric: true, sortable: true,
    sortValue: (r) => r.amount },
];

<DataGrid<Tx>
  rowId={(r) => r.id}
  rows={transactions}
  columns={columns}
  pageSize={50}
  bulkActions={(ids, clear) => (
    <Button onClick={() => { archive(ids); clear(); }}>Archive {ids.length}</Button>
  )}
/>
```
