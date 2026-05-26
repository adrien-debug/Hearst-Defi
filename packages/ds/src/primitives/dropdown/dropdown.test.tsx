/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  Dropdown,
  DropdownCheckboxItem,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownRadioGroup,
  DropdownRadioItem,
  DropdownSeparator,
  DropdownTrigger,
} from "./dropdown";

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

safeDescribe("Dropdown", () => {
  safeIt("renders trigger with menu aria attrs", () => {
    const html = renderToStaticMarkup(
      <Dropdown>
        <DropdownTrigger>menu</DropdownTrigger>
      </Dropdown>,
    );
    safeExpect(html).toContain('aria-haspopup="menu"');
    safeExpect(html).toContain('aria-expanded="false"');
  });

  safeIt("renders items + separator + label when open", () => {
    const html = renderToStaticMarkup(
      <Dropdown defaultOpen>
        <DropdownTrigger>menu</DropdownTrigger>
        <DropdownContent>
          <DropdownLabel>Actions</DropdownLabel>
          <DropdownItem shortcut="⌘E">Edit</DropdownItem>
          <DropdownSeparator />
          <DropdownItem destructive>Delete</DropdownItem>
          <DropdownCheckboxItem checked>Sync</DropdownCheckboxItem>
          <DropdownRadioGroup value="a">
            <DropdownRadioItem value="a">A</DropdownRadioItem>
            <DropdownRadioItem value="b">B</DropdownRadioItem>
          </DropdownRadioGroup>
        </DropdownContent>
      </Dropdown>,
    );
    safeExpect(html).toContain("Actions");
    safeExpect(html).toContain("Edit");
    safeExpect(html).toContain("⌘E");
    safeExpect(html).toContain('role="menuitemcheckbox"');
    safeExpect(html).toContain('role="menuitemradio"');
  });

  safeIt("destructive item carries danger token", () => {
    const html = renderToStaticMarkup(
      <Dropdown defaultOpen>
        <DropdownContent>
          <DropdownItem destructive>Remove</DropdownItem>
        </DropdownContent>
      </Dropdown>,
    );
    safeExpect(html).toContain("--ds-status-danger-fg");
  });
});
