/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Tooltip } from "./tooltip";

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
        not: {
          toContain(s: string) {
            if (String(v).includes(s)) throw new Error(`unexpected ${s}`);
          },
        },
      };

safeDescribe("Tooltip", () => {
  safeIt("renders only the child when closed", () => {
    const html = renderToStaticMarkup(
      <Tooltip content="Save (⌘S)">
        <button>save</button>
      </Tooltip>,
    );
    safeExpect(html).toContain("save");
    safeExpect(html).not.toContain("Save (⌘S)");
  });

  safeIt("renders tooltip role + content when defaultOpen", () => {
    const html = renderToStaticMarkup(
      <Tooltip defaultOpen content="Help">
        <button>?</button>
      </Tooltip>,
    );
    safeExpect(html).toContain('role="tooltip"');
    safeExpect(html).toContain("Help");
    safeExpect(html).toContain("aria-describedby");
  });

  safeIt("uses inverse surface token", () => {
    const html = renderToStaticMarkup(
      <Tooltip defaultOpen content="X">
        <span>x</span>
      </Tooltip>,
    );
    safeExpect(html).toContain("--ds-surface-inverse");
  });
});
