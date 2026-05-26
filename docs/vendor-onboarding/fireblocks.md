# Fireblocks — Custody onboarding

**Goal:** prod Fireblocks workspace with API access, vault account for
Hearst Connect's USDC float, and PoR endpoint live.

Estimated time: **20 min sign-up + 24-72h compliance review by Fireblocks**.

---

## Step 0 — Do you already have a workspace?

Per project memory there may already be a workspace `hearst-defi` with
vault account `86`. If yes, jump to Step 4 and reuse those.

If unsure: log into https://console.fireblocks.io with your work email.
If you get in → workspace exists. If "no account" → fresh sign-up below.

## Step 1 — Sign up

1. https://www.fireblocks.com/start (or contact sales — Fireblocks is
   self-serve for sign-up but enterprise pricing is negotiated).
2. Workspace name: `Hearst Connect`. Environment: **Production** (not
   sandbox — sandbox is a separate workspace later if needed).
3. Pass the Fireblocks compliance KYB:
   - Articles of incorporation (Cayman SPV docs)
   - Beneficial ownership chart (UBO declaration)
   - Source of funds attestation
   - Director IDs
4. Submit. Expect 24-72h for activation in production.

While waiting, you can configure most of the workspace — only outbound
transfers are gated by compliance review.

## Step 2 — Create the vault account

1. Console → **Accounts → Create vault account**.
2. Name: `Hearst Connect — Operating`.
3. Tag: `prod`.
4. Add asset: **USDC (Ethereum)** initially. Add **USDC (Base)** once
   Fireblocks lists it (check **Settings → Assets** — Base support is
   recent, usually present).
5. Take note of the **Vault Account ID** (numeric — could be `86` if memory
   is right, otherwise a fresh one). This is `FIREBLOCKS_VAULT_ACCOUNT_ID`.

## Step 3 — API user + RSA keypair

1. Console → **Settings → Users → + Add API User**.
2. User name: `hearst-connect-prod`.
3. Role: start with **Viewer** (read-only — sufficient for PoR endpoint and
   balance display). Escalate to **Signer** later once multisig integration
   is approved.
4. Generate an RSA 4096 keypair locally:
   ```bash
   openssl genrsa -out fireblocks_prod.key 4096
   openssl rsa -in fireblocks_prod.key -pubout -out fireblocks_prod.pub
   ```
5. Upload `fireblocks_prod.pub` to the new API user.
6. Fireblocks displays the **API Key** (UUID) — copy it.

→ Save to `.env.local`:

```
FIREBLOCKS_API_KEY=...
FIREBLOCKS_PRIVATE_KEY_PATH=/absolute/path/to/fireblocks_prod.key
FIREBLOCKS_VAULT_ACCOUNT_ID=86   # or whatever the new ID is
FIREBLOCKS_BASE_URL=https://api.fireblocks.io/v1
```

**Critical:** the base URL **must** include `/v1`. Forgetting it returns
HTTP 404 with no helpful message (project memory pitfall: error -7 = env
or approval missing, error -15 = `/v1` missing).

## Step 4 — Transaction policy (TAP)

If you have **Signer** role, configure Fireblocks TAP (Transaction
Authorization Policy) before any outbound transfer:

1. Settings → **Transaction Authorization Policy → Edit**.
2. Default deny.
3. Add rules:
   - **Allowed:** withdrawals to whitelisted addresses (LPs in our
     `AddressAllowlist` table) up to a daily cap (e.g. $5M).
   - **Require co-sign 2-of-N:** any withdrawal above the cap or to
     non-whitelisted address.
   - **Travel Rule:** if Cayman regs apply, attach a Travel Rule provider
     (Notabene, Sumsub Travel) — Fireblocks integrates them natively.
4. Test with a $1 USDC test transfer to your own treasury wallet before
   any LP transfer.

This step is **product-critical**: misconfigured TAP either bricks
withdrawals or gives an API key too much power.

## Step 5 — Webhook (optional but recommended)

Console → **Settings → Webhooks → + Add endpoint**.

URL: `https://connect.hearst.app/api/fireblocks/webhook` (you'll need to add
this route if it doesn't exist — we don't have a webhook handler wired for
Fireblocks yet, it's a TODO).

For now, skip the webhook and rely on polling `getVaultAccount` from
`src/lib/data/custody.ts`.

## Step 6 — Smoke test

```ts
// scripts/smoke-fireblocks.ts (one-off, don't commit)
import { fireblocks } from "@/lib/data/custody";

const account = await fireblocks.getVaultAccount(
  process.env.FIREBLOCKS_VAULT_ACCOUNT_ID!,
);
console.log(account);
// Expect: { id: "86", name: "Hearst Connect — Operating", assets: [...] }
```

If you get `error -7`: env var missing or compliance not approved yet.
If `error -15`: base URL missing `/v1`.
If `401`: API key mismatch or signature failure (RSA key wrong file).

## Step 7 — Mark `custody-fireblocks` validated

(Already validated in commit `360436a` — the wiring exists in
`src/lib/data/custody.ts`. After compliance approves and the smoke test
passes with real prod credentials, no DB change needed.)

## Things that can bite you

- **Compliance can take 5 business days.** If you submit late Friday, you
  get nothing until Wednesday. Submit Monday morning.
- **Sandbox is a separate workspace** with its own API user/keys. Don't
  mix sandbox keys with prod URL or vice versa.
- **API key + RSA key are paired.** Losing the private RSA key means rotate
  the API key (re-generate, re-upload public, update env).
- **Base USDC vs Ethereum USDC** are two different assets in Fireblocks.
  Make sure the vault account holds USDC on the chain your contracts deploy
  to (Base for us).
- **`requiredSigners` mismatch:** if you set up Fireblocks workspace with
  3 admins, the API will refuse Signer-role transactions unless 2 of them
  co-sign. Make sure the headcount matches what's in your contracts.

## When to escalate to Fireblocks sales

If you cross **$10M AUM** or expect **>50 LPs**, ask for:

- Dedicated CSM
- Volume discount (default pricing is per-transaction; institutional gets
  flat monthly)
- Multi-region failover
