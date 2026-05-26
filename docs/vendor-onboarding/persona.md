# Persona — KYC prod onboarding

**Goal:** get the 3 env vars below into `.env.local` + Vercel prod, with a
working webhook receiving real Persona events.

Estimated time: **15 min sign-up + 10 min template config**.

---

## Step 1 — Create the account

1. Go to https://withpersona.com/onboarding.
2. Sign up with `adrien@hearstcorporation.io`.
3. Company name: **Hearst Connect** (or Hearst DeFi SARL — whatever matches the
   entity that will appear on the receipts).
4. Pick the **"Investor accreditation / KYC for institutional finance"**
   workspace type. If it asks for an industry, pick **"Crypto / Web3"** —
   Persona has dedicated SDK paths for this.
5. Verify the email and set 2FA.

## Step 2 — Create the Inquiry Template

1. Sidebar → **Templates** → **+ New template**.
2. Template name: `Hearst Connect — LP KYC v1`.
3. Verification steps (order matters):
   - **Government ID** (passport, driver's licence, national ID)
   - **Selfie + liveness**
   - **Address verification** (utility bill or bank statement, max 3 months)
   - **(Optional)** PEP / sanctions screening — add if your Cayman counsel
     requires it; Persona surfaces it as a separate paid module.
4. Save. The URL ends in `tmpl_xxx` — **copy that ID**.

→ Fill `NEXT_PUBLIC_PERSONA_TEMPLATE_ID=tmpl_xxx` in `.env.local`.

## Step 3 — Wire the webhook

1. Sidebar → **Settings → Webhooks → + Add endpoint**.
2. URL: `https://connect.hearst.app/api/persona/webhook`.
3. Events to subscribe to:
   - `inquiry.completed`
   - `inquiry.approved`
   - `inquiry.declined`
   - `inquiry.failed`
4. Save. Persona shows a one-time **signing secret** (`shhh_xxx`). Copy
   immediately — it never displays again. If you lose it, rotate.

→ Fill `PERSONA_WEBHOOK_SECRET=shhh_xxx` in `.env.local`.

## Step 4 — Environment

Add to `.env.local` and to Vercel prod (Settings → Environment variables):

```
NEXT_PUBLIC_PERSONA_TEMPLATE_ID=tmpl_xxx
PERSONA_WEBHOOK_SECRET=shhh_xxx
NEXT_PUBLIC_PERSONA_ENVIRONMENT=production
```

`sandbox` for staging, `production` for `connect.hearst.app`.

## Step 5 — Smoke test

1. Run a local dev: `pnpm dev`.
2. Navigate to `/onboarding/identity`.
3. Click "Start KYC". The Persona embed should open in an iframe.
4. Complete with a Persona test ID (sandbox flow: Persona provides synthetic
   IDs in their docs — search "Persona test IDs sandbox").
5. Check the webhook hits: `pnpm prisma studio` → table `KycEvent` → one new
   row with `inquiryId` set and `status` = `completed` or `approved`.
6. Verify `markKycComplete` ran: same investor's row in `Investor` table
   has `kycStatus = "approved"`.

## Step 6 — Mark `kyc-persona` validated

Once steps 1-5 pass with real prod credentials and a real webhook hit:

```bash
# Open admin UI
pnpm dev
# → http://localhost:4105/admin/roadmap → find "kyc-persona" → validate
```

Or via Prisma:

```ts
await prisma.roadmapValidation.update({
  where: { itemId: "kyc-persona" },
  data: {
    status: "validated",
    validatedBy: "adrien@hearstcorporation.io",
    validatedAt: new Date(),
    evidenceUrl: "https://app.withpersona.com/dashboard/templates/tmpl_xxx",
  },
});
```

## Pricing reminder

Starter plan is free for the first few inquiries (~10 in trial). Production
runs $1-2 per inquiry. With $250k min ticket institutional LPs, that's
negligible. Negotiate volume discount once you cross 100 inquiries/month.

## Things that can bite you

- **Template versioning:** if you edit the template after going live, Persona
  creates a new version. The webhook payload includes `template_id` (without
  version) — match on that, not the version-pinned form.
- **Webhook retries:** Persona retries with exponential backoff over 24h.
  Our route handles this idempotently (`KycEvent.inquiryId @unique` → P2002
  early-return 200), see commit `808d4e3`.
- **HMAC freshness:** our route rejects timestamps older than 300 s
  (`TIMESTAMP_TOLERANCE_SECONDS`, commit `808d4e3`). If you delay a webhook
  in transit (rare), Persona retries with a fresh `t=`.
