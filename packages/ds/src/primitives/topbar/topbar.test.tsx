/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Topbar } from "./topbar";

declare const describe: any;
declare const it: any;
declare const expect: any;
const safeDescribe: (n: string, f: () => void) => void =
  typeof describe === "function" ? describe : (_n, f) => f();
const safeIt: (n: string, f: () => void) => void =
  typeof it === "function" ? it : (_n, f) => f();
const safeExpect = <T,>(v: T) =>
  typeof expect === "function"
    ? expect(v)
    : {
        toContain(s: string) {
          if (!String(v).includes(s)) throw new Error(`miss ${s}`);
        },
      };

safeDescribe("Topbar", () => {
  safeIt("renders left/center/right slots and banner role", () => {
    const html = renderToStaticMarkup(
      <Topbar
        left={<div>L</div>}
        center={<div>C</div>}
        right={<div>R</div>}
      />,
    );
    safeExpect(html).toContain('role="banner"');
    safeExpect(html).toContain(">L<");
    safeExpect(html).toContain(">C<");
    safeExpect(html).toContain(">R<");
  });

  safeIt("sticky by default", () => {
    const html = renderToStaticMarkup(<Topbar />);
    safeExpect(html).toContain("position:sticky");
  });

  safeIt("glass variant uses --ds-glass-bg", () => {
    const html = renderToStaticMarkup(<Topbar variant="glass" />);
    safeExpect(html).toContain("--ds-glass-bg");
  });
});
