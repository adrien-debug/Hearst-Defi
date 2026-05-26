/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  Popover,
  PopoverContent,
  PopoverFooter,
  PopoverHeader,
  PopoverTrigger,
} from "./popover";

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

safeDescribe("Popover", () => {
  safeIt("trigger exposes aria-haspopup=dialog", () => {
    const html = renderToStaticMarkup(
      <Popover>
        <PopoverTrigger>x</PopoverTrigger>
      </Popover>,
    );
    safeExpect(html).toContain('aria-haspopup="dialog"');
  });

  safeIt("renders content with role=dialog when defaultOpen", () => {
    const html = renderToStaticMarkup(
      <Popover defaultOpen>
        <PopoverContent variant="rich" size="lg" aria-label="X">
          <PopoverHeader>Title</PopoverHeader>
          body
          <PopoverFooter>foot</PopoverFooter>
        </PopoverContent>
      </Popover>,
    );
    safeExpect(html).toContain('role="dialog"');
    safeExpect(html).toContain("body");
    safeExpect(html).toContain("foot");
  });

  safeIt("hides content when closed", () => {
    const html = renderToStaticMarkup(
      <Popover>
        <PopoverContent>x</PopoverContent>
      </Popover>,
    );
    safeExpect(html).not.toContain('role="dialog"');
  });
});
