import { describe, expect, it } from "vitest";

import {
  HEARST_PRODUCT_CONTEXT,
  REVIEW_DOCUMENT_INSTRUCTIONS,
  REVIEW_FACILITATOR_PROMPT,
} from "@/lib/agents/system-prompts/review";

/**
 * These tests pin the review-mode prompts on their non-negotiables.
 * They are NOT prose-level snapshots — they assert the structural claims the
 * review system relies on (product map, 4-fields method, severity scale,
 * verbatim format, anti-hallucination clause). A regression here means the
 * facilitator persona has lost one of its guardrails, which is exactly the
 * kind of silent drift the explicit asserts are meant to catch.
 */

describe("HEARST_PRODUCT_CONTEXT", () => {
  it("lists every canonical product route", () => {
    const expectedRoutes = [
      '"/"',
      "/portfolio",
      "/portfolio/[positionId]",
      "/vaults",
      "/vaults/[id]",
      "/vaults/[id]/invest",
      "/vaults/[id]/invest/confirmed",
      "/proof-center",
      "/profile",
    ];

    for (const route of expectedRoutes) {
      expect(HEARST_PRODUCT_CONTEXT).toContain(route);
    }
  });

  it("restates the investor-side non-negotiables", () => {
    expect(HEARST_PRODUCT_CONTEXT).toMatch(/APY toujours.*fourchette/i);
    expect(HEARST_PRODUCT_CONTEXT).toContain("badge de provenance");
    expect(HEARST_PRODUCT_CONTEXT).toContain("non garanti");
    expect(HEARST_PRODUCT_CONTEXT).toMatch(/mots interdits/i);
  });
});

describe("REVIEW_FACILITATOR_PROMPT", () => {
  it("embeds the product context", () => {
    expect(REVIEW_FACILITATOR_PROMPT).toContain(HEARST_PRODUCT_CONTEXT);
  });

  it("declares the 4-field elicitation method", () => {
    // The persona requires PAGE / ÉLÉMENT / ACTUEL→ATTENDU / SÉVÉRITÉ before
    // a point is considered captured — these labels MUST appear literally.
    expect(REVIEW_FACILITATOR_PROMPT).toMatch(/PAGE/);
    expect(REVIEW_FACILITATOR_PROMPT).toMatch(/ÉLÉMENT/);
    expect(REVIEW_FACILITATOR_PROMPT).toMatch(/ACTUEL → ATTENDU/);
    expect(REVIEW_FACILITATOR_PROMPT).toMatch(/SÉVÉRITÉ/);
  });

  it("uses the P0 / P1 / P2 severity scale", () => {
    expect(REVIEW_FACILITATOR_PROMPT).toContain("P0");
    expect(REVIEW_FACILITATOR_PROMPT).toContain("P1");
    expect(REVIEW_FACILITATOR_PROMPT).toContain("P2");
  });

  it("forbids empty acknowledgements ('excellente remarque' etc.)", () => {
    expect(REVIEW_FACILITATOR_PROMPT).toMatch(/flatterie|acquiescement/i);
  });

  it("requires an explicit confirmation before moving on", () => {
    // The persona reformulates each point and only proceeds on an explicit
    // "yes". This is the contract the document generator relies on later.
    expect(REVIEW_FACILITATOR_PROMPT).toMatch(/REFORMULE/i);
    expect(REVIEW_FACILITATOR_PROMPT).toMatch(/OUI explicite|FAIS CONFIRMER/i);
  });
});

describe("REVIEW_DOCUMENT_INSTRUCTIONS", () => {
  it("imposes the Markdown structure of the change document", () => {
    expect(REVIEW_DOCUMENT_INSTRUCTIONS).toContain(
      "# Plan de modifications — Revue produit",
    );
    expect(REVIEW_DOCUMENT_INSTRUCTIONS).toContain("## Synthèse");
    expect(REVIEW_DOCUMENT_INSTRUCTIONS).toContain("## Modifications par page");
    expect(REVIEW_DOCUMENT_INSTRUCTIONS).toContain("## Points à clarifier");
  });

  it("requires each bullet to carry verbatim, proposition, confidence, fait-quand", () => {
    expect(REVIEW_DOCUMENT_INSTRUCTIONS).toMatch(/\*Verbatim\*/);
    expect(REVIEW_DOCUMENT_INSTRUCTIONS).toMatch(/\*Proposition\*/);
    expect(REVIEW_DOCUMENT_INSTRUCTIONS).toMatch(/\*Confiance d'ancrage\*/);
    expect(REVIEW_DOCUMENT_INSTRUCTIONS).toMatch(/\*Fait quand\*/);
  });

  it("declares the anti-hallucination clause on code references", () => {
    // The generator never has source access, only the transcript. It must
    // refuse to cite file names, components, endpoints, tables.
    expect(REVIEW_DOCUMENT_INSTRUCTIONS).toMatch(/INTERDICTION/i);
    expect(REVIEW_DOCUMENT_INSTRUCTIONS).toMatch(
      /noms de fichiers|composants React|endpoints|tables/i,
    );
  });

  it("leaves a date placeholder the route can substitute", () => {
    expect(REVIEW_DOCUMENT_INSTRUCTIONS).toMatch(
      /_Date de génération : .*_/,
    );
  });

  it("forbids proposing changes that would violate a non-negotiable", () => {
    expect(REVIEW_DOCUMENT_INSTRUCTIONS).toMatch(
      /violer un non-négociable/i,
    );
  });
});
