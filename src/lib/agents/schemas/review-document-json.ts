import { z } from "zod";

/**
 * Structured JSON output produced ALONGSIDE the markdown by the
 * review-document agent. Allows downstream UIs to filter by severity,
 * mark items as done, diff between sessions, or export to Linear/GitHub.
 */
export const ReviewDocumentJsonSchema = z
  .object({
    synthesis: z.string().min(1),
    items: z.array(
      z
        .object({
          page: z.string().min(1),
          severity: z.enum(["P0", "P1", "P2"]),
          current: z.string().min(1),
          expected: z.string().min(1),
          verbatim: z.string().min(1),
          confidence: z.enum(["haute", "moyenne", "basse"]),
          doneWhen: z.string().min(1),
        })
        .strict(),
    ),
    clarifications: z
      .array(
        z
          .object({
            remark: z.string().min(1),
            question: z.string().min(1),
          })
          .strict(),
      )
      .default([]),
  })
  .strict();

export type ReviewDocumentJson = z.infer<typeof ReviewDocumentJsonSchema>;
