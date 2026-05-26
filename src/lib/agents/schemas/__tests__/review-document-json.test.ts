import { describe, expect, it } from "vitest";
import { ReviewDocumentJsonSchema } from "@/lib/agents/schemas/review-document-json";

const validItem = {
  page: "/portfolio",
  severity: "P1" as const,
  current: "La KPI n'affiche pas la période de référence.",
  expected: "Afficher un sous-label avec la période et un tooltip.",
  verbatim: "On voit un chiffre de yield mais on sait pas si c'est sur l'année.",
  confidence: "haute" as const,
  doneWhen: "La carte Yield YTD affiche sa période sans interaction.",
};

const validPayload = {
  synthesis: "Session productive. Thèmes : lisibilité des KPI, navigation vaults.",
  items: [validItem],
  clarifications: [
    {
      remark: "Pierre parle d'un bouton flou.",
      question: "Sur quelle route exactement, /vaults ou /vaults/[id] ?",
    },
  ],
};

describe("ReviewDocumentJsonSchema", () => {
  it("parses a well-formed payload", () => {
    const parsed = ReviewDocumentJsonSchema.parse(validPayload);
    expect(parsed.synthesis).toBe(validPayload.synthesis);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]?.severity).toBe("P1");
    expect(parsed.clarifications).toHaveLength(1);
  });

  it("rejects an invalid severity", () => {
    const bad = {
      ...validPayload,
      items: [{ ...validItem, severity: "p1" }],
    };
    expect(() => ReviewDocumentJsonSchema.parse(bad)).toThrow();
  });

  it("rejects severity not in enum (e.g. P3)", () => {
    const bad = {
      ...validPayload,
      items: [{ ...validItem, severity: "P3" }],
    };
    expect(() => ReviewDocumentJsonSchema.parse(bad)).toThrow();
  });

  it("rejects an invalid confidence", () => {
    const bad = {
      ...validPayload,
      items: [{ ...validItem, confidence: "high" }],
    };
    expect(() => ReviewDocumentJsonSchema.parse(bad)).toThrow();
  });

  it("rejects confidence in uppercase (e.g. Haute)", () => {
    const bad = {
      ...validPayload,
      items: [{ ...validItem, confidence: "Haute" }],
    };
    expect(() => ReviewDocumentJsonSchema.parse(bad)).toThrow();
  });

  it("clarifications defaults to empty array when omitted", () => {
    const withoutClarifications = {
      synthesis: validPayload.synthesis,
      items: validPayload.items,
    };
    const parsed = ReviewDocumentJsonSchema.parse(withoutClarifications);
    expect(parsed.clarifications).toEqual([]);
  });

  it("rejects extra fields at top level (strict)", () => {
    const bad = { ...validPayload, unexpected: "not allowed" };
    expect(() => ReviewDocumentJsonSchema.parse(bad)).toThrow();
  });

  it("rejects extra fields inside an item (strict)", () => {
    const bad = {
      ...validPayload,
      items: [{ ...validItem, extraField: "not allowed" }],
    };
    expect(() => ReviewDocumentJsonSchema.parse(bad)).toThrow();
  });

  it("rejects extra fields inside a clarification (strict)", () => {
    const bad = {
      ...validPayload,
      clarifications: [
        { remark: "vague", question: "precise?", extra: "no" },
      ],
    };
    expect(() => ReviewDocumentJsonSchema.parse(bad)).toThrow();
  });

  it("items can be empty array", () => {
    const payload = { ...validPayload, items: [] };
    const parsed = ReviewDocumentJsonSchema.parse(payload);
    expect(parsed.items).toEqual([]);
  });

  it("accepts all three severity values", () => {
    for (const severity of ["P0", "P1", "P2"] as const) {
      const payload = {
        ...validPayload,
        items: [{ ...validItem, severity }],
      };
      expect(ReviewDocumentJsonSchema.parse(payload).items[0]?.severity).toBe(severity);
    }
  });

  it("accepts all three confidence values", () => {
    for (const confidence of ["haute", "moyenne", "basse"] as const) {
      const payload = {
        ...validPayload,
        items: [{ ...validItem, confidence }],
      };
      expect(ReviewDocumentJsonSchema.parse(payload).items[0]?.confidence).toBe(confidence);
    }
  });

  it("rejects empty string for synthesis", () => {
    const bad = { ...validPayload, synthesis: "" };
    expect(() => ReviewDocumentJsonSchema.parse(bad)).toThrow();
  });

  it("rejects empty string for item fields", () => {
    const bad = {
      ...validPayload,
      items: [{ ...validItem, current: "" }],
    };
    expect(() => ReviewDocumentJsonSchema.parse(bad)).toThrow();
  });
});
