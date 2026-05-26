/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { EmptyState } from "./empty-state";

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

d("EmptyState", () => {
  t("renders title", () => {
    const html = renderToStaticMarkup(<EmptyState title="Nothing here yet" />);
    e(html).toContain("Nothing here yet");
  });
  t("renders action", () => {
    const html = renderToStaticMarkup(
      <EmptyState title="x" action={<button>add</button>} />,
    );
    e(html).toContain("add");
  });
  t("applies bordered variant", () => {
    const html = renderToStaticMarkup(<EmptyState variant="bordered" title="x" />);
    e(html).toContain("ds-border-dashed");
  });
});
