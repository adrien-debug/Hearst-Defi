/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

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

safeDescribe("Tabs", () => {
  safeIt("renders inline tabs prop", () => {
    const html = renderToStaticMarkup(
      <Tabs
        defaultValue="a"
        tabs={[
          { value: "a", label: "Alpha", content: "A!" },
          { value: "b", label: "Beta", content: "B!" },
        ]}
      />,
    );
    safeExpect(html).toContain("Alpha");
    safeExpect(html).toContain("Beta");
    safeExpect(html).toContain("A!");
    safeExpect(html).toContain('role="tab"');
    safeExpect(html).toContain('role="tablist"');
    safeExpect(html).toContain('role="tabpanel"');
  });

  safeIt("composition path works", () => {
    const html = renderToStaticMarkup(
      <Tabs defaultValue="x" variant="pills">
        <TabsList>
          <TabsTrigger value="x">X</TabsTrigger>
          <TabsTrigger value="y">Y</TabsTrigger>
        </TabsList>
        <TabsContent value="x">Hello</TabsContent>
      </Tabs>,
    );
    safeExpect(html).toContain("Hello");
    safeExpect(html).toContain('aria-selected="true"');
  });

  safeIt("uses accent token in pills active state", () => {
    const html = renderToStaticMarkup(
      <Tabs defaultValue="x" variant="pills">
        <TabsList>
          <TabsTrigger value="x">X</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    safeExpect(html).toContain("--ds-bg-accent-soft");
  });
});
