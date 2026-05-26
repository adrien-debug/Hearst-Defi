/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Loader } from "./loader";

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

d("Loader", () => {
  t("renders spinner svg", () => {
    const html = renderToStaticMarkup(<Loader />);
    e(html).toContain("svg");
  });
  t("progress with value sets aria-valuenow", () => {
    const html = renderToStaticMarkup(<Loader variant="progress" value={0.42} />);
    e(html).toContain("aria-valuenow");
  });
  t("a11y status role and label", () => {
    const html = renderToStaticMarkup(<Loader variant="dots" label="Saving" />);
    e(html).toContain("Saving");
  });
});
