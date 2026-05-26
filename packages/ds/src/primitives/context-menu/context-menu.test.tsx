/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./context-menu";

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

safeDescribe("ContextMenu", () => {
  safeIt("renders trigger and hides content by default", () => {
    const html = renderToStaticMarkup(
      <ContextMenu>
        <ContextMenuTrigger>area</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Copy</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    safeExpect(html).toContain("area");
    safeExpect(html).not.toContain("Copy");
  });

  safeIt("renders multiple triggers and Item w/o error (closed state)", () => {
    const html = renderToStaticMarkup(
      <ContextMenu>
        <ContextMenuTrigger>area</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>Actions</ContextMenuLabel>
          <ContextMenuItem destructive shortcut="⌘⌫">
            Delete
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem>Copy</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    // Closed in SSR → content hidden, trigger rendered.
    safeExpect(html).toContain("area");
    safeExpect(html).not.toContain("Delete");
  });

  safeIt("trigger renders a div wrapper", () => {
    const html = renderToStaticMarkup(
      <ContextMenu>
        <ContextMenuTrigger>x</ContextMenuTrigger>
      </ContextMenu>,
    );
    safeExpect(html).toContain("<div");
  });
});
