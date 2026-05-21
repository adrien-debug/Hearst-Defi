import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  CT_ACCENT_HEX,
  CT_PDF,
  CT_PRODUCT_CONNECT_HEX,
} from "../cockpit-tokens";

/**
 * Pins the intentional drift between
 *  - the WEB tokens declared in `src/app/cockpit.css` (dark UI)
 *  - the PRINT tokens declared in `src/lib/cockpit-tokens.ts` (PDF on white).
 *
 * These two sources are intentionally different (see comment block above
 * `CT_PDF.statusSuccess` in cockpit-tokens.ts). The test exists to make any
 * silent unification fail loudly — if you change one side, you must update
 * the other side explicitly OR update these expectations.
 */

const COCKPIT_CSS_PATH = join(__dirname, "..", "..", "app", "cockpit.css");
const COCKPIT_CSS = readFileSync(COCKPIT_CSS_PATH, "utf8");

function readToken(name: string): string {
  const match = COCKPIT_CSS.match(
    new RegExp(`--ct-${name}\\s*:\\s*([^;]+);`),
  );
  if (!match) throw new Error(`token --ct-${name} not found in cockpit.css`);
  return match[1]!.trim();
}

describe("cockpit-tokens — web/PDF status drift is intentional", () => {
  it("pins web status tokens to their dark-UI values", () => {
    expect(readToken("status-success")).toBe("#4ade80");
    expect(readToken("status-warning")).toBe("#fbbf24");
    expect(readToken("status-danger")).toBe("#f87171");
  });

  it("pins PDF status constants to their print-ink values", () => {
    expect(CT_PDF.statusSuccess).toBe("#16a34a");
    expect(CT_PDF.statusWarning).toBe("#d97706");
    expect(CT_PDF.statusDanger).toBe("#dc2626");
  });

  it("guarantees web ≠ PDF for every status (no silent unification)", () => {
    expect(CT_PDF.statusSuccess).not.toBe(readToken("status-success"));
    expect(CT_PDF.statusWarning).not.toBe(readToken("status-warning"));
    expect(CT_PDF.statusDanger).not.toBe(readToken("status-danger"));
  });
});

describe("cockpit-tokens — accent + product chip stay in sync with package", () => {
  it("CT_ACCENT_HEX mirrors the Connect bordeaux", () => {
    expect(CT_ACCENT_HEX).toBe("#8A1538");
  });

  it("CT_PRODUCT_CONNECT_HEX is the Hearst maroon accent (not the reference repo green)", () => {
    expect(CT_PRODUCT_CONNECT_HEX).toBe("#8A1538");
  });
});

describe("cockpit-tokens — explicit duration tokens are declared locally", () => {
  it("declares --ct-dur-base in cockpit.css (not implicit from package)", () => {
    expect(readToken("dur-base")).toBe("220ms");
  });

  it("declares --ct-dur-fast / --ct-dur-slow companions", () => {
    expect(readToken("dur-fast")).toBe("150ms");
    expect(readToken("dur-slow")).toBe("400ms");
  });
});
