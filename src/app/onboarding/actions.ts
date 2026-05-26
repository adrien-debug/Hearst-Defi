"use server";

import { z } from "zod";

import { prisma } from "@/lib/db";

/**
 * Environment variable accessors.
 * All three must be set; we validate lazily (at call time) so the module can be
 * imported without crashing at boot when the vars are absent in test mocks.
 */
function getDocusignConfig(): {
  baseUrl: string;
  apiKey: string;
  accountId: string;
} {
  const baseUrl = process.env.DOCUSIGN_BASE_URL;
  const apiKey = process.env.DOCUSIGN_API_KEY;
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;

  if (!baseUrl || !apiKey || !accountId) {
    throw new Error(
      "Missing DocuSign configuration. Set DOCUSIGN_BASE_URL, DOCUSIGN_API_KEY, and DOCUSIGN_ACCOUNT_ID.",
    );
  }

  return { baseUrl, apiKey, accountId };
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const CreateEnvelopeInputSchema = z.object({
  userId: z.string().min(1).max(200),
  vaultId: z.string().min(1).max(200),
  amount: z.number().positive(),
});

// DocuSign REST API — minimal subset of the createEnvelope response we use.
const DocusignCreateEnvelopeResponseSchema = z.object({
  envelopeId: z.string().min(1),
  status: z.string(),
});

// DocuSign REST API — createRecipientView response.
const DocusignRecipientViewSchema = z.object({
  url: z.string().url(),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateSubscriptionEnvelopeResult {
  envelopeId: string;
  signingUrl: string;
}

// ---------------------------------------------------------------------------
// DocuSign helpers (pure functions — easier to test)
// ---------------------------------------------------------------------------

/**
 * POST /v2.1/accounts/{accountId}/envelopes
 * Creates an envelope for the subscription agreement.
 *
 * We use a "template" envelope body — in a real integration the templateId
 * would be an env var and the pre-populated tab values would carry investor
 * details. For the MVP we embed a minimal inline document so the call
 * works against a sandbox without a template pre-created.
 */
export async function docusignCreateEnvelope(
  baseUrl: string,
  apiKey: string,
  accountId: string,
  opts: { userId: string; vaultId: string; amount: number },
): Promise<{ envelopeId: string; status: string }> {
  const body = {
    emailSubject: "Hearst Connect — Subscription Agreement",
    status: "sent",
    documents: [
      {
        documentBase64: Buffer.from(
          `Hearst Connect Subscription Agreement\n\nInvestor: ${opts.userId}\nVault: ${opts.vaultId}\nAmount: ${opts.amount} USDC\n\nNot guaranteed. See full terms.`,
        ).toString("base64"),
        name: "Subscription Agreement",
        fileExtension: "txt",
        documentId: "1",
      },
    ],
    recipients: {
      signers: [
        {
          email: `${opts.userId}@placeholder.hearst`,
          name: opts.userId,
          recipientId: "1",
          routingOrder: "1",
          tabs: {
            signHereTabs: [
              {
                documentId: "1",
                pageNumber: "1",
                recipientId: "1",
                xPosition: "100",
                yPosition: "100",
              },
            ],
          },
        },
      ],
    },
  };

  const response = await fetch(
    `${baseUrl}/v2.1/accounts/${accountId}/envelopes`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `DocuSign createEnvelope failed: ${response.status} ${response.statusText} — ${text}`,
    );
  }

  const json: unknown = await response.json();
  const parsed = DocusignCreateEnvelopeResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(
      `DocuSign createEnvelope unexpected response shape: ${parsed.error.message}`,
    );
  }

  return parsed.data;
}

/**
 * POST /v2.1/accounts/{accountId}/envelopes/{envelopeId}/views/recipient
 * Creates a one-time embedded signing URL (expires in ~5 minutes).
 */
export async function docusignCreateRecipientView(
  baseUrl: string,
  apiKey: string,
  accountId: string,
  envelopeId: string,
  opts: { userId: string; returnUrl: string },
): Promise<string> {
  const body = {
    authenticationMethod: "none",
    clientUserId: opts.userId,
    email: `${opts.userId}@placeholder.hearst`,
    recipientId: "1",
    returnUrl: opts.returnUrl,
    userName: opts.userId,
  };

  const response = await fetch(
    `${baseUrl}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/views/recipient`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `DocuSign createRecipientView failed: ${response.status} ${response.statusText} — ${text}`,
    );
  }

  const json: unknown = await response.json();
  const parsed = DocusignRecipientViewSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(
      `DocuSign createRecipientView unexpected response shape: ${parsed.error.message}`,
    );
  }

  return parsed.data.url;
}

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

/**
 * Creates a DocuSign envelope for the subscription agreement and persists it.
 *
 * @param userId  - Auth identity (User.id or Privy DID).
 * @param vaultId - VaultDeployment.id or vault key.
 * @param amount  - Subscription amount in USDC.
 *
 * @returns `{ envelopeId, signingUrl }` — the signingUrl is a one-time URL;
 *          the caller must render it immediately (it expires in ~5 min).
 */
export async function createSubscriptionEnvelope(
  userId: string,
  vaultId: string,
  amount: number,
): Promise<CreateSubscriptionEnvelopeResult> {
  // 1. Validate inputs
  const parsed = CreateEnvelopeInputSchema.safeParse({ userId, vaultId, amount });
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.message}`);
  }

  const { userId: validUserId, vaultId: validVaultId, amount: validAmount } =
    parsed.data;

  // 2. Load env config
  const { baseUrl, apiKey, accountId } = getDocusignConfig();

  // 3. Derive a return URL — the caller can override this; here we use the app root.
  const returnUrl =
    process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/signed`
      : "https://connect.hearst.app/onboarding/signed";

  // 4. Create envelope with DocuSign
  const { envelopeId } = await docusignCreateEnvelope(
    baseUrl,
    apiKey,
    accountId,
    { userId: validUserId, vaultId: validVaultId, amount: validAmount },
  );

  // 5. Persist envelope in DB (status = "sent")
  await prisma.subscriptionEnvelope.create({
    data: {
      userId: validUserId,
      vaultId: validVaultId,
      envelopeId,
      status: "sent",
    },
  });

  // 6. Create one-time embedded signing URL
  const signingUrl = await docusignCreateRecipientView(
    baseUrl,
    apiKey,
    accountId,
    envelopeId,
    { userId: validUserId, returnUrl },
  );

  return { envelopeId, signingUrl };
}
