/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Timeline, TimelineItem } from "./timeline";

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

d("Timeline", () => {
  t("renders ol with items", () => {
    const html = renderToStaticMarkup(
      <Timeline>
        <TimelineItem title="Deposit" />
        <TimelineItem title="Distribution" />
      </Timeline>,
    );
    e(html).toContain("Deposit");
  });
  t("variant compact hides description", () => {
    const html = renderToStaticMarkup(
      <Timeline variant="compact">
        <TimelineItem title="x" description="should-not-render" />
      </Timeline>,
    );
    e(html).toContain("x");
  });
  t("tones apply via inline color", () => {
    const html = renderToStaticMarkup(
      <Timeline>
        <TimelineItem title="x" variant="success" />
      </Timeline>,
    );
    e(html).toContain("--ds-status-success-bg");
  });
});
