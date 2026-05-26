# DocuSign — Subscription agreement embedded signing

**Account already opened:** https://na4.docusign.net (datacenter NA4, prod).

**Goal:** ship an embedded subscription agreement signing flow at
`/onboarding/sign-subscription` so a LP can sign the sub agreement
without leaving Hearst Connect, with a webhook persisting envelope state.

Estimated time: **30 min credentials + 1-3 days for legal template** (with
your Cayman counsel).

---

## Step 1 — Pick the plan

Go to https://account.docusign.com/billing — you need at minimum:

- **Business Pro** (~$45/mo, 5 envelopes/mo included) — works for the embedded
  flow, BUT no API key. Skip.
- **Advanced Solutions / API plan** (~$60/mo + per-envelope after included) —
  required to get an Integration Key (API client ID).

If the workspace was opened on Business Pro by accident, upgrade to API plan
before going further.

## Step 2 — Get the credentials

1. Go to https://apps-na4.docusign.com/send/home (top-right gear → **Admin**).
2. Sidebar → **Integrations → Apps and Keys**.
3. Click **Add App and Integration Key**. Name it `hearst-connect-prod`.
4. Authentication method: **JWT Grant**.
5. Generate an RSA key pair (DocuSign UI gives the public key; you keep the
   private key locally). Copy the **Integration Key** (= `client_id`).
6. From the same page, scroll to **API Account ID** — that's
   `DOCUSIGN_ACCOUNT_ID` (looks like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).
7. **User ID** for the JWT subject: top right → your profile → **My Profile** →
   look for **API Username** (also a UUID).
8. **Auth URI:** for NA4 prod, use `https://account.docusign.com/oauth/token`.
   (For sandbox you'd use `account-d.docusign.com`.)

→ Save these to `.env.local`:

```
DOCUSIGN_BASE_URL=https://na4.docusign.net/restapi
DOCUSIGN_AUTH_BASE_URL=https://account.docusign.com
DOCUSIGN_ACCOUNT_ID=...
DOCUSIGN_INTEGRATION_KEY=...
DOCUSIGN_USER_ID=...
DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
```

(One-line the private key with `\n` literals, or use a multiline `.env` syntax
your runtime supports.)

## Step 3 — One-time consent grant

DocuSign JWT requires a one-time admin consent before tokens issue. Open:

```
https://account.docusign.com/oauth/auth
  ?response_type=code
  &scope=signature%20impersonation
  &client_id=DOCUSIGN_INTEGRATION_KEY
  &redirect_uri=https://connect.hearst.app/api/docusign/oauth/callback
```

Replace `DOCUSIGN_INTEGRATION_KEY` and accept the consent screen. After this,
the server can mint JWT access tokens silently for the `DOCUSIGN_USER_ID`.

If you do not yet have a callback URL set up, DocuSign will refuse the
consent — temporarily add `http://localhost:4105/api/docusign/oauth/callback`
in the app config (Apps and Keys → your app → Edit → Redirect URIs), grant
consent on localhost, then remove the URI.

## Step 4 — Connect (webhook) configuration

1. Admin → **Integrations → Connect**.
2. **Add Configuration → Custom**.
3. URL: `https://connect.hearst.app/api/docusign/webhook`.
4. Format: **JSON v2.1** (legacy XML is harder to parse — skip).
5. Events to subscribe to: `envelope-sent`, `envelope-delivered`,
   `envelope-completed`, `envelope-declined`, `envelope-voided`.
6. Authentication: **HMAC Signature**. DocuSign generates a secret — copy it
   ASAP.

→ Save to `.env.local`:

```
DOCUSIGN_WEBHOOK_SECRET=...
```

## Step 5 — Upload the template

Two paths:

- **You have a legal sub agreement** drafted by your Cayman counsel
  → upload PDF to **Templates → New Template → Upload**. Place signature
  tabs (`/sig1/`, `/date1/`, `/name1/`, etc.) where each party signs.
- **You don't have one yet** → use the placeholder at
  [subscription-agreement-placeholder.md](subscription-agreement-placeholder.md)
  (not a legal doc — for product wiring only) until counsel returns the
  final.

Once uploaded, copy the **Template ID** (UUID).

→ Save to `.env.local`:

```
DOCUSIGN_SUBSCRIPTION_TEMPLATE_ID=...
```

## Step 6 — Smoke test

```bash
pnpm dev
# → /onboarding/sign-subscription
# Trigger createSubscriptionEnvelope(userId, vaultId, amount)
# DocuSign embed appears
# Sign with DocuSign test signer
# Webhook fires → SubscriptionEnvelope.status = "completed", signedAt set
```

Verify in Prisma Studio: `SubscriptionEnvelope` row, `signedAt` populated.

## Step 7 — Mark `lp-docusign-embedded` validated

(Already validated in commit `360436a`. After this prod smoke test, no
DB change needed — the validation already documents the wiring; the
secrets ride in env vars.)

## Things that can bite you

- **Demo vs prod base URL:** `demo.docusign.net` for sandbox, `na4.docusign.net`
  for your prod account. Confusing them produces 401s.
- **JWT clock skew:** DocuSign's JWT validator rejects tokens with `iat`
  more than ~5 min off server time. Sync your Vercel functions clock (NTP
  is default, so usually fine).
- **Envelope per LP:** create one envelope per LP per subscription. Don't
  reuse envelopes — DocuSign tracks signatures per-recipient and reusing
  leads to "completed" events firing for the wrong LP.
- **HMAC secret rotation:** if you rotate it, the webhook route needs a
  hot reload of `DOCUSIGN_WEBHOOK_SECRET` (Vercel triggers it on env var
  change, but local dev needs a restart).
- **Template versions:** if you bump the template after going live, in-flight
  envelopes keep the old template — that's intentional. New envelopes pick
  the latest.

## Cost note

API plan + per-envelope pricing means each LP onboarding costs ~$2-5
depending on tier. With $250k min ticket, irrelevant. Re-negotiate at
50+ envelopes/mo.
