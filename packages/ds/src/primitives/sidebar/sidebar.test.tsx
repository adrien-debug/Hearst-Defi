/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarSection,
  SidebarSeparator,
} from "./sidebar";

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

safeDescribe("Sidebar", () => {
  safeIt("renders aside with default expanded width", () => {
    const html = renderToStaticMarkup(
      <Sidebar>
        <SidebarHeader>Logo</SidebarHeader>
        <SidebarBody>
          <SidebarSection title="Nav">
            <SidebarItem label="Home" active />
            <SidebarItem label="Settings" badge="3" />
            <SidebarSeparator />
          </SidebarSection>
        </SidebarBody>
        <SidebarFooter>Foot</SidebarFooter>
      </Sidebar>,
    );
    safeExpect(html).toContain("240px");
    safeExpect(html).toContain("Home");
    safeExpect(html).toContain("Settings");
    safeExpect(html).toContain('aria-label="Sidebar"');
  });

  safeIt("collapses to 64px and hides labels", () => {
    const html = renderToStaticMarkup(
      <Sidebar defaultCollapsed>
        <SidebarBody>
          <SidebarItem label="Home" />
        </SidebarBody>
      </Sidebar>,
    );
    safeExpect(html).toContain("64px");
    safeExpect(html).not.toContain('flex:1');
  });

  safeIt("active item uses accent tokens", () => {
    const html = renderToStaticMarkup(
      <Sidebar>
        <SidebarBody>
          <SidebarItem label="X" active />
        </SidebarBody>
      </Sidebar>,
    );
    safeExpect(html).toContain("--ds-text-accent");
    safeExpect(html).toContain("--ds-bg-accent-soft");
    safeExpect(html).toContain('aria-current="page"');
  });
});
