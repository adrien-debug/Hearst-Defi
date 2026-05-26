/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Skeleton } from "./skeleton";

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

d("Skeleton", () => {
  t("renders default text variant", () => {
    const html = renderToStaticMarkup(<Skeleton />);
    e(html).toContain("role=\"status\"");
  });
  t("renders multiple lines", () => {
    const html = renderToStaticMarkup(<Skeleton lines={3} />);
    e(html).toContain("status");
  });
  t("avatar variant", () => {
    const html = renderToStaticMarkup(<Skeleton variant="avatar" />);
    e(html).toContain("ds-rounded");
  });
});
