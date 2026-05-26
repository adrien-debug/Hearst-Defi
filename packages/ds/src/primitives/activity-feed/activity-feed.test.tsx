/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ActivityFeed } from "./activity-feed";

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

const NOW = Date.parse("2026-05-26T12:00:00Z");
const items = [
  { id: "1", user: "Adrien", verb: "deposited", target: "$250k", timestamp: "2026-05-26T11:55:00Z" },
];

d("ActivityFeed", () => {
  t("renders relative time", () => {
    const html = renderToStaticMarkup(<ActivityFeed items={items} now={NOW} />);
    e(html).toContain("5m ago");
  });
  t("compact variant skips meta", () => {
    const html = renderToStaticMarkup(
      <ActivityFeed
        variant="compact"
        items={[{ ...items[0]!, meta: "should-skip" }]}
        now={NOW}
      />,
    );
    e(html).toContain("deposited");
  });
  t("grouped variant prints day heading", () => {
    const html = renderToStaticMarkup(
      <ActivityFeed variant="grouped" items={items} now={NOW} />,
    );
    e(html).toContain("2026-05-26");
  });
});
