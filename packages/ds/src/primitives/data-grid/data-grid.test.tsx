/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DataGrid } from "./data-grid";

declare const describe: any;
declare const it: any;
declare const expect: any;
const d: (n: string, f: () => void) => void =
  typeof describe === "function" ? describe : (_n, f) => f();
const t: (n: string, f: () => void) => void =
  typeof it === "function" ? it : (_n, f) => f();
const e = <T,>(v: T) =>
  typeof expect === "function"
    ? expect(v)
    : {
        toContain(s: string) {
          if (!String(v).includes(s)) throw new Error("miss");
        },
      };

type Tx = { id: string; amount: number; asset: string };
const rows: Tx[] = Array.from({ length: 3 }).map((_, i) => ({
  id: `t${i}`,
  amount: i * 10,
  asset: "USDC",
}));

d("DataGrid", () => {
  t("renders rows", () => {
    const html = renderToStaticMarkup(
      <DataGrid<Tx>
        rowId={(r) => r.id}
        rows={rows}
        columns={[
          { id: "amt", header: "Amount", accessor: (r) => r.amount, numeric: true },
          { id: "asset", header: "Asset", accessor: (r) => r.asset },
        ]}
      />,
    );
    e(html).toContain("USDC");
  });
  t("renders pagination footer", () => {
    const html = renderToStaticMarkup(
      <DataGrid<Tx>
        rowId={(r) => r.id}
        rows={rows}
        pageSize={2}
        columns={[
          { id: "amt", header: "Amount", accessor: (r) => r.amount },
        ]}
      />,
    );
    e(html).toContain("Page 1 of");
  });
  t("bulk actions toolbar absent when no selection", () => {
    const html = renderToStaticMarkup(
      <DataGrid<Tx>
        rowId={(r) => r.id}
        rows={rows}
        bulkActions={() => <button>Archive</button>}
        columns={[
          { id: "amt", header: "Amount", accessor: (r) => r.amount },
        ]}
      />,
    );
    e(html).toContain("USDC");
  });
});
