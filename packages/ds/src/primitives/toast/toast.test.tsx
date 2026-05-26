/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ToastProvider, ToastViewport, useToast } from "./toast";

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
        toBe(s: unknown) {
          if (v !== s) throw new Error(`neq ${String(s)}`);
        },
        toThrow() {
          /* noop */
        },
      };

safeDescribe("Toast", () => {
  safeIt("ToastViewport renders empty region inside Provider", () => {
    const html = renderToStaticMarkup(
      <ToastProvider>
        <ToastViewport />
      </ToastProvider>,
    );
    safeExpect(html).toContain('role="region"');
    safeExpect(html).toContain('aria-label="Notifications"');
  });

  safeIt("useToast throws outside provider", () => {
    let thrown = false;
    function Inner(): React.JSX.Element {
      try {
        useToast();
      } catch {
        thrown = true;
      }
      return <div />;
    }
    renderToStaticMarkup(<Inner />);
    safeExpect(thrown).toBe(true);
  });

  safeIt("ToastViewport returns null outside Provider", () => {
    const html = renderToStaticMarkup(<ToastViewport />);
    safeExpect(html).toBe("");
  });
});
