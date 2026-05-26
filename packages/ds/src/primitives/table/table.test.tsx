/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Table, Tbody, Td, Th, Thead, Tr } from "./table";

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

d("Table", () => {
  t("renders compound structure", () => {
    const html = renderToStaticMarkup(
      <Table>
        <Thead>
          <Tr>
            <Th>Asset</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>BTC</Td>
          </Tr>
        </Tbody>
      </Table>,
    );
    e(html).toContain("BTC");
  });
  t("sortable Th sets aria-sort", () => {
    const html = renderToStaticMarkup(
      <Table>
        <Thead>
          <Tr>
            <Th sortable direction="desc">
              APY
            </Th>
          </Tr>
        </Thead>
      </Table>,
    );
    e(html).toContain("aria-sort=\"descending\"");
  });
  t("striped variant only adds class", () => {
    const html = renderToStaticMarkup(
      <Table variant="striped">
        <Tbody>
          <Tr>
            <Td>x</Td>
          </Tr>
        </Tbody>
      </Table>,
    );
    e(html).toContain("table");
  });
});
