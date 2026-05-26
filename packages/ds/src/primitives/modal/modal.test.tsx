/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "./modal";

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
        not: {
          toContain(s: string) {
            if (String(value).includes(s)) throw new Error(`unexpected ${s}`);
          },
        },
      };

safeDescribe("Modal", () => {
  safeIt("renders trigger but not content when closed", () => {
    const html = renderToStaticMarkup(
      <Modal>
        <ModalTrigger>open</ModalTrigger>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Title</ModalTitle>
          </ModalHeader>
        </ModalContent>
      </Modal>,
    );
    safeExpect(html).toContain("open");
    safeExpect(html).not.toContain("Title");
  });

  safeIt("renders content when defaultOpen", () => {
    const html = renderToStaticMarkup(
      <Modal defaultOpen>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>The Title</ModalTitle>
            <ModalDescription>Desc</ModalDescription>
          </ModalHeader>
          <ModalBody>Body</ModalBody>
          <ModalFooter>Foot</ModalFooter>
        </ModalContent>
      </Modal>,
    );
    safeExpect(html).toContain("The Title");
    safeExpect(html).toContain("Desc");
    safeExpect(html).toContain("Body");
  });

  safeIt("exposes role=dialog + aria-modal", () => {
    const html = renderToStaticMarkup(
      <Modal defaultOpen>
        <ModalContent aria-label="X">x</ModalContent>
      </Modal>,
    );
    safeExpect(html).toContain('role="dialog"');
    safeExpect(html).toContain("aria-modal");
  });
});
