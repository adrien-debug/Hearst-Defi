/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DatePicker } from "./date-picker";

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

d("DatePicker", () => {
  t("renders input with aria-haspopup", () => {
    const html = renderToStaticMarkup(<DatePicker />);
    e(html).toContain("aria-haspopup=\"dialog\"");
  });
  t("renders ISO formatted value", () => {
    const html = renderToStaticMarkup(
      <DatePicker defaultValue={new Date(2026, 4, 26)} />,
    );
    e(html).toContain("2026-05-26");
  });
  t("supports placeholder", () => {
    const html = renderToStaticMarkup(<DatePicker placeholder="Pick" />);
    e(html).toContain("Pick");
  });
});
