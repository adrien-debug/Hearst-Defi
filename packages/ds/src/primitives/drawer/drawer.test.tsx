/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer";

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

safeDescribe("Drawer", () => {
  safeIt("hides content when closed", () => {
    const html = renderToStaticMarkup(
      <Drawer>
        <DrawerTrigger>open</DrawerTrigger>
        <DrawerContent>
          <DrawerTitle>X</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );
    safeExpect(html).not.toContain("X</");
  });

  safeIt("renders dialog with aria-label when defaultOpen", () => {
    const html = renderToStaticMarkup(
      <Drawer defaultOpen>
        <DrawerContent side="left" size="lg" aria-label="Nav">
          <DrawerHeader>
            <DrawerTitle>Menu</DrawerTitle>
          </DrawerHeader>
          <DrawerBody>x</DrawerBody>
          <DrawerFooter>foot</DrawerFooter>
        </DrawerContent>
      </Drawer>,
    );
    safeExpect(html).toContain('role="dialog"');
    safeExpect(html).toContain("Menu");
    safeExpect(html).toContain("foot");
  });

  safeIt("uses surface-overlay token", () => {
    const html = renderToStaticMarkup(
      <Drawer defaultOpen>
        <DrawerContent>x</DrawerContent>
      </Drawer>,
    );
    safeExpect(html).toContain("--ds-surface-overlay");
  });
});
