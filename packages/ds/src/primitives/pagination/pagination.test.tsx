/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Pagination } from "./pagination";

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

d("Pagination", () => {
  t("renders nav landmark", () => {
    const html = renderToStaticMarkup(
      <Pagination page={1} totalPages={5} onChange={() => {}} />,
    );
    e(html).toContain("<nav");
  });
  t("ellipsis when totalPages > 7", () => {
    const html = renderToStaticMarkup(
      <Pagination page={6} totalPages={24} onChange={() => {}} />,
    );
    e(html).toContain("…");
  });
  t("minimal variant shows X / Y", () => {
    const html = renderToStaticMarkup(
      <Pagination
        page={2}
        totalPages={9}
        onChange={() => {}}
        variant="minimal"
      />,
    );
    e(html).toContain("2 / 9");
  });
});
