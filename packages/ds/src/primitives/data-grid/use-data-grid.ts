"use client";

import * as React from "react";

import type {
  DataGridColumn,
  SortDir,
  UseDataGridOptions,
  UseDataGridResult,
} from "./data-grid.types";

function compare(
  a: string | number | Date | null | undefined,
  b: string | number | Date | null | undefined,
): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (a instanceof Date && b instanceof Date)
    return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

/**
 * Headless data-grid hook. Pure computation, no DOM.
 */
export function useDataGrid<TRow>({
  data,
  columns,
  rowId: _rowId,
  sortBy,
  filterBy,
  pageSize = 50,
  page: pageProp,
}: UseDataGridOptions<TRow>): UseDataGridResult<TRow> {
  const [sortState, setSortState] = React.useState<{
    columnId: string | null;
    dir: SortDir;
  }>(() =>
    sortBy
      ? { columnId: sortBy.columnId, dir: sortBy.dir }
      : { columnId: null, dir: null },
  );
  const [filterPredicate, setFilterPredicate] = React.useState<
    ((row: TRow) => boolean) | null
  >(() => filterBy ?? null);
  const [pageState, setPageState] = React.useState<number>(pageProp ?? 1);

  React.useEffect(() => {
    if (typeof pageProp === "number") setPageState(pageProp);
  }, [pageProp]);

  const filtered = React.useMemo(() => {
    let out = data;
    if (filterPredicate) out = out.filter(filterPredicate);
    // Per-column filter predicates
    const colFilters = columns.filter((c) => c.filter);
    for (const c of colFilters) {
      const f = c.filter;
      if (f) out = out.filter(f);
    }
    return out;
  }, [data, columns, filterPredicate]);

  const sorted = React.useMemo(() => {
    if (!sortState.columnId || !sortState.dir) return filtered;
    const col = columns.find((c) => c.id === sortState.columnId);
    if (!col) return filtered;
    const accessor = col.sortValue ?? ((r: TRow) => col.accessor(r) as string);
    const arr = [...filtered];
    arr.sort((ra, rb) => {
      const va = accessor(ra) as string | number | Date | null;
      const vb = accessor(rb) as string | number | Date | null;
      const cmp = compare(va, vb);
      return sortState.dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, columns, sortState]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.max(1, Math.min(pageState, pageCount));
  const paged = React.useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage, pageSize],
  );

  const toggle = React.useCallback((columnId: string) => {
    setSortState((s) => {
      if (s.columnId !== columnId) return { columnId, dir: "asc" };
      if (s.dir === "asc") return { columnId, dir: "desc" };
      return { columnId: null, dir: null };
    });
  }, []);

  const headerProps = columns.map((c: DataGridColumn<TRow>) => ({
    columnId: c.id,
    sortable: Boolean(c.sortable),
    direction:
      sortState.columnId === c.id ? sortState.dir : (null as SortDir),
    width: c.width,
    onClick: () => {
      if (c.sortable) toggle(c.id);
    },
  }));

  return {
    rows: paged,
    headerProps,
    sort: {
      columnId: sortState.columnId,
      dir: sortState.dir,
      toggle,
    },
    filter: {
      set: setFilterPredicate,
    },
    pagination: {
      page: safePage,
      pageCount,
      pageSize,
      setPage: setPageState,
    },
  };
}
