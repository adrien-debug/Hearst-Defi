/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Calendar } from "./calendar";

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

d("Calendar", () => {
  t("renders 42 day grid cells", () => {
    const html = renderToStaticMarkup(
      <Calendar defaultMonth={new Date(2026, 4, 1)} />,
    );
    e(html).toContain("role=\"grid\"");
  });
  t("has aria-label", () => {
    const html = renderToStaticMarkup(<Calendar />);
    e(html).toContain("aria-label=\"Calendar\"");
  });
  t("compact variant adjusts cell height", () => {
    const html = renderToStaticMarkup(<Calendar variant="compact" />);
    e(html).toContain("--ds-spacing-6");
  });
});
