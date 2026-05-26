import type * as React from "react";

export type SortDir = "asc" | "desc" | null;

export interface DataGridColumn<TRow> {
  id: string;
  header: React.ReactNode;
  /** Accessor reading the cell value from a row. */
  accessor: (row: TRow) => React.ReactNode;
  /** Provide a comparable primitive for sorting. */
  sortValue?: (row: TRow) => string | number | Date | null;
  /** When true, header is clickable to toggle sort. */
  sortable?: boolean;
  /** Default & current width in CSS units. */
  width?: string;
  /** Disable inline resize. */
  resizable?: boolean;
  align?: "start" | "center" | "end";
  numeric?: boolean;
  /** Custom filter predicate (row) => boolean. */
  filter?: (row: TRow) => boolean;
}

export interface UseDataGridOptions<TRow> {
  data: TRow[];
  columns: DataGridColumn<TRow>[];
  rowId: (row: TRow) => string;
  sortBy?: { columnId: string; dir: Exclude<SortDir, null> };
  filterBy?: (row: TRow) => boolean;
  pageSize?: number;
  /** External page state. */
  page?: number;
}

export interface UseDataGridResult<TRow> {
  rows: TRow[];
  headerProps: Array<{
    columnId: string;
    sortable: boolean;
    direction: SortDir;
    onClick: () => void;
    width: string | undefined;
  }>;
  sort: {
    columnId: string | null;
    dir: SortDir;
    toggle: (columnId: string) => void;
  };
  filter: {
    set: (predicate: ((row: TRow) => boolean) | null) => void;
  };
  pagination: {
    page: number;
    pageCount: number;
    pageSize: number;
    setPage: (n: number) => void;
  };
}

export interface DataGridProps<TRow> extends React.HTMLAttributes<HTMLDivElement> {
  columns: DataGridColumn<TRow>[];
  rows: TRow[];
  rowId: (row: TRow) => string;
  pageSize?: number;
  /** Render bulk actions toolbar when >0 rows selected. */
  bulkActions?: (selectedIds: string[], clear: () => void) => React.ReactNode;
  /** Toast text shown for 10s when a bulk action runs with undo handler. */
  onBulkUndoLabel?: string;
  /** Sticky first column. */
  stickyFirstColumn?: boolean;
}
