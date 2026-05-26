/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHandle,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

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

safeDescribe("Sheet", () => {
  safeIt("trigger renders, content stays closed", () => {
    const html = renderToStaticMarkup(
      <Sheet>
        <SheetTrigger>open</SheetTrigger>
        <SheetContent>
          <SheetTitle>X</SheetTitle>
        </SheetContent>
      </Sheet>,
    );
    safeExpect(html).toContain("open");
    safeExpect(html).not.toContain('role="dialog"');
  });

  safeIt("renders content + dialog role when defaultOpen", () => {
    const html = renderToStaticMarkup(
      <Sheet defaultOpen snapPoints={[0.4, 0.7, 1]}>
        <SheetContent>
          <SheetHandle />
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <SheetBody>body</SheetBody>
          <SheetFooter>foot</SheetFooter>
        </SheetContent>
      </Sheet>,
    );
    safeExpect(html).toContain('role="dialog"');
    safeExpect(html).toContain("Filters");
    safeExpect(html).toContain("foot");
  });

  safeIt("uses tokenized overlay scrim", () => {
    const html = renderToStaticMarkup(
      <Sheet defaultOpen>
        <SheetContent>x</SheetContent>
      </Sheet>,
    );
    safeExpect(html).toContain("--ds-overlay-scrim");
    safeExpect(html).toContain("--ds-surface-overlay");
  });
});
