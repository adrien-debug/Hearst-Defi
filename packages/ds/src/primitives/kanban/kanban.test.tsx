/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Kanban, KanbanCard, KanbanColumn } from "./kanban";

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

d("Kanban", () => {
  t("renders board region", () => {
    const html = renderToStaticMarkup(
      <Kanban>
        <KanbanColumn id="todo" title="To Do" count={2}>
          <KanbanCard id="c1">Task</KanbanCard>
        </KanbanColumn>
      </Kanban>,
    );
    e(html).toContain("Kanban board");
  });
  t("count badge renders", () => {
    const html = renderToStaticMarkup(
      <Kanban>
        <KanbanColumn id="x" title="X" count={5}>
          <KanbanCard id="a">A</KanbanCard>
        </KanbanColumn>
      </Kanban>,
    );
    e(html).toContain("5");
  });
  t("cards are draggable", () => {
    const html = renderToStaticMarkup(
      <Kanban>
        <KanbanColumn id="x" title="X">
          <KanbanCard id="a">A</KanbanCard>
        </KanbanColumn>
      </Kanban>,
    );
    e(html).toContain("draggable");
  });
});
