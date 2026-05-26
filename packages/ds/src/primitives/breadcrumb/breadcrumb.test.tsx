/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from "./breadcrumb";

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

d("Breadcrumb", () => {
  t("renders nav landmark", () => {
    const html = renderToStaticMarkup(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem current>Vault</BreadcrumbItem>
      </Breadcrumb>,
    );
    e(html).toContain("aria-label");
  });
  t("aria-current on current item", () => {
    const html = renderToStaticMarkup(
      <Breadcrumb>
        <BreadcrumbItem current>Now</BreadcrumbItem>
      </Breadcrumb>,
    );
    e(html).toContain("aria-current=\"page\"");
  });
  t("collapses when >5 items", () => {
    const html = renderToStaticMarkup(
      <Breadcrumb>
        <BreadcrumbItem>a</BreadcrumbItem>
        <BreadcrumbItem>b</BreadcrumbItem>
        <BreadcrumbItem>c</BreadcrumbItem>
        <BreadcrumbItem>d</BreadcrumbItem>
        <BreadcrumbItem>e</BreadcrumbItem>
        <BreadcrumbItem>f</BreadcrumbItem>
      </Breadcrumb>,
    );
    e(html).toContain("…");
  });
});
