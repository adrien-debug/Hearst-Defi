/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Avatar, AvatarGroup, AvatarStatus } from "./avatar";

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

d("Avatar", () => {
  t("renders initials fallback", () => {
    const html = renderToStaticMarkup(<Avatar alt="Adrien Chen" />);
    e(html).toContain("AC");
  });
  t("renders img when src provided", () => {
    const html = renderToStaticMarkup(<Avatar src="/x.png" alt="x" />);
    e(html).toContain("/x.png");
  });
  t("AvatarStatus has aria-label", () => {
    const html = renderToStaticMarkup(<AvatarStatus variant="online" />);
    e(html).toContain("online");
  });
  t("AvatarGroup overflows beyond max", () => {
    const html = renderToStaticMarkup(
      <AvatarGroup max={2}>
        <Avatar alt="A" />
        <Avatar alt="B" />
        <Avatar alt="C" />
        <Avatar alt="D" />
      </AvatarGroup>,
    );
    e(html).toContain("+2");
  });
});
