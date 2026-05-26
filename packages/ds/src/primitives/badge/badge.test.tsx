/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Badge } from "./badge";

declare const describe: any;
declare const it: any;
declare const expect: any;

const safeDescribe: (name: string, fn: () => void) => void =
  typeof describe === "function"
    ? describe
    : (_n, fn) => {
        fn();
      };
const safeIt: (name: string, fn: () => void) => void =
  typeof it === "function"
    ? it
    : (_n, fn) => {
        fn();
      };
const safeExpect = <T,>(value: T) =>
  typeof expect === "function"
    ? expect(value)
    : {
        toContain(s: string) {
          if (!String(value).includes(s)) throw new Error(`miss ${s}`);
        },
        toBe(s: unknown) {
          if (value !== s) throw new Error(`neq`);
        },
      };

safeDescribe("Badge", () => {
  safeIt("renders children", () => {
    const html = renderToStaticMarkup(<Badge>Live</Badge>);
    safeExpect(html).toContain("Live");
  });

  safeIt("applies variant classes", () => {
    const html = renderToStaticMarkup(<Badge variant="success">Ok</Badge>);
    safeExpect(html).toContain("--ds-status-success-bg");
  });

  safeIt("renders count bubble", () => {
    const html = renderToStaticMarkup(<Badge count={5}>Inbox</Badge>);
    safeExpect(html).toContain("5");
  });
});
