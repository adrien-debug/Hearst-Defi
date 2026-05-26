/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

declare const describe: any;
declare const it: any;
declare const expect: any;

const safeDescribe: (name: string, fn: () => void) => void =
  typeof describe === "function" ? describe : (_n, fn) => fn();
const safeIt: (name: string, fn: () => void) => void =
  typeof it === "function" ? it : (_n, fn) => fn();
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

safeDescribe("Card", () => {
  safeIt("renders composed structure", () => {
    const html = renderToStaticMarkup(
      <Card>
        <CardHeader>
          <CardTitle>Hello</CardTitle>
          <CardDescription>World</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Foot</CardFooter>
      </Card>,
    );
    safeExpect(html).toContain("Hello");
    safeExpect(html).toContain("World");
    safeExpect(html).toContain("Body");
    safeExpect(html).toContain("Foot");
  });

  safeIt("uses semantic surface tokens (no hex)", () => {
    const html = renderToStaticMarkup(<Card variant="elevated">x</Card>);
    safeExpect(html).toContain("--ds-surface-raised");
    safeExpect(html).toContain("--ds-shadow-md");
  });

  safeIt("exposes button role + tabindex when interactive", () => {
    const html = renderToStaticMarkup(<Card interactive>x</Card>);
    safeExpect(html).toContain('role="button"');
    safeExpect(html).toContain('tabindex="0"');
  });

  safeIt("respects radius=xl token mapping", () => {
    const html = renderToStaticMarkup(<Card radius="xl">x</Card>);
    safeExpect(html).toContain("--ds-radius-3xl");
  });
});
