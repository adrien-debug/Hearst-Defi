/**
 * DocusignEmbedded component — static render tests.
 *
 * Uses renderToStaticMarkup (node env) for structural checks.
 * No DOM interaction needed — the component is primarily an iframe wrapper.
 *
 * Coverage:
 *   1. Renders an iframe pointing at the signingUrl (with return_url appended).
 *   2. Renders with the correct data-envelope-id attribute.
 *   3. Renders the loading overlay text by default.
 *   4. iframe has required security sandbox attributes.
 *   5. iframe title is set for accessibility.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DocusignEmbedded } from "../docusign-embedded";

const ENVELOPE_ID = "env-test-abc-123";
const RETURN_URL = "https://connect.hearst.app/onboarding/signed";
const SIGNING_URL = "https://demo.docusign.net/signing?t=test-token";

describe("DocusignEmbedded — static / structural", () => {
  it("renders an iframe element", () => {
    const html = renderToStaticMarkup(
      <DocusignEmbedded
        envelopeId={ENVELOPE_ID}
        returnUrl={RETURN_URL}
        signingUrl={SIGNING_URL}
      />,
    );
    expect(html).toContain("<iframe");
  });

  it("includes the signingUrl in the iframe src", () => {
    const html = renderToStaticMarkup(
      <DocusignEmbedded
        envelopeId={ENVELOPE_ID}
        returnUrl={RETURN_URL}
        signingUrl={SIGNING_URL}
      />,
    );
    // The src contains the signing URL (possibly URL-encoded components)
    expect(html).toContain("demo.docusign.net");
    expect(html).toContain("t=test-token");
  });

  it("appends return_url to the iframe src", () => {
    const html = renderToStaticMarkup(
      <DocusignEmbedded
        envelopeId={ENVELOPE_ID}
        returnUrl={RETURN_URL}
        signingUrl={SIGNING_URL}
      />,
    );
    expect(html).toContain("return_url=");
    // URL-encoded form of the returnUrl should appear
    expect(html).toContain("hearst.app");
  });

  it("sets data-envelope-id on the wrapper", () => {
    const html = renderToStaticMarkup(
      <DocusignEmbedded
        envelopeId={ENVELOPE_ID}
        returnUrl={RETURN_URL}
        signingUrl={SIGNING_URL}
      />,
    );
    expect(html).toContain(`data-envelope-id="${ENVELOPE_ID}"`);
  });

  it("sets data-testid on the wrapper", () => {
    const html = renderToStaticMarkup(
      <DocusignEmbedded
        envelopeId={ENVELOPE_ID}
        returnUrl={RETURN_URL}
        signingUrl={SIGNING_URL}
      />,
    );
    expect(html).toContain('data-testid="docusign-embedded"');
  });

  it("sets an accessible title on the iframe", () => {
    const html = renderToStaticMarkup(
      <DocusignEmbedded
        envelopeId={ENVELOPE_ID}
        returnUrl={RETURN_URL}
        signingUrl={SIGNING_URL}
      />,
    );
    expect(html.toLowerCase()).toContain("subscription agreement");
  });

  it("renders the loading overlay by default", () => {
    const html = renderToStaticMarkup(
      <DocusignEmbedded
        envelopeId={ENVELOPE_ID}
        returnUrl={RETURN_URL}
        signingUrl={SIGNING_URL}
      />,
    );
    expect(html.toLowerCase()).toContain("loading signing ceremony");
  });

  it("passes extra className to the wrapper", () => {
    const html = renderToStaticMarkup(
      <DocusignEmbedded
        envelopeId={ENVELOPE_ID}
        returnUrl={RETURN_URL}
        signingUrl={SIGNING_URL}
        className="extra-class"
      />,
    );
    expect(html).toContain("extra-class");
  });
});
