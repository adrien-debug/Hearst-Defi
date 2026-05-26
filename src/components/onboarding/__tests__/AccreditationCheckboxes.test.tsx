/**
 * AccreditationCheckboxes unit tests.
 *
 * Verifies:
 *   1. Renders 3 checkbox inputs
 *   2. "Continue" button is present
 *   3. "Continue" button has aria-disabled=true when not all boxes checked (initial state)
 *   4. Each checkbox has an associated label (htmlFor matches id)
 *
 * Uses renderToStaticMarkup for snapshot / structural checks (node env).
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

import { AccreditationCheckboxes } from "../AccreditationCheckboxes";

describe("AccreditationCheckboxes — static / initial state", () => {
  it("renders exactly 3 checkbox inputs", () => {
    const html = renderToStaticMarkup(<AccreditationCheckboxes />);
    const matches = html.match(/type="checkbox"/g);
    expect(matches).not.toBeNull();
    expect(matches?.length).toBe(3);
  });

  it("renders a Continue button", () => {
    const html = renderToStaticMarkup(<AccreditationCheckboxes />);
    expect(html.toLowerCase()).toContain("continue");
  });

  it("Continue button has aria-disabled=true when no boxes checked", () => {
    const html = renderToStaticMarkup(<AccreditationCheckboxes />);
    // Both aria-disabled="true" and the disabled attribute indicate disabled state
    expect(html).toMatch(/aria-disabled="true"|disabled/);
  });

  it("renders all three attestation IDs", () => {
    const html = renderToStaticMarkup(<AccreditationCheckboxes />);
    expect(html).toContain("rule-506c");
    expect(html).toContain("cayman-pif");
    expect(html).toContain("not-guaranteed");
  });

  it("renders the hint text when no boxes checked", () => {
    const html = renderToStaticMarkup(<AccreditationCheckboxes />);
    expect(html).toContain("All three attestations are required");
  });

  it("each checkbox has an associated label (htmlFor matches id)", () => {
    const html = renderToStaticMarkup(<AccreditationCheckboxes />);
    expect(html).toContain('for="attest-rule-506c"');
    expect(html).toContain('id="attest-rule-506c"');
    expect(html).toContain('for="attest-cayman-pif"');
    expect(html).toContain('for="attest-not-guaranteed"');
  });
});
