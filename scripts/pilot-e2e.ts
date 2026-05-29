/**
 * Pilot E2E — proves the testnet money rail end-to-end against the DEPLOYED
 * HearstYieldVault on Base Sepolia: approve → deposit → redeem, printing real
 * tx hashes. This is the headless equivalent of the in-app wallet flow (which
 * is gated behind Privy); it bypasses the UI to verify the on-chain contracts.
 *
 * Requires a FUNDED Base Sepolia key (test ETH for gas + test USDC):
 *   PILOT_PRIVATE_KEY=0x...           (a throwaway testnet key — NEVER mainnet)
 *   NEXT_PUBLIC_CHAIN_RPC_URL=...      (read from .env.local)
 *   NEXT_PUBLIC_HEARST_YIELD_VAULT_ADDRESS=... (read from .env.local)
 * Get test USDC from the Circle faucet (Base Sepolia) for 0x036CbD…CF7e.
 *
 * Run:  pnpm tsx scripts/pilot-e2e.ts [amountUsdc=1]
 */

import { readFileSync } from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// ── env (.env.local, no dotenv dep) ─────────────────────────────────────────
const env: Record<string, string> = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && m[1]) env[m[1]] = (m[2] ?? "").replace(/^"|"$/g, "");
}
const PK = process.env.PILOT_PRIVATE_KEY ?? env.PILOT_PRIVATE_KEY ?? "";
const RPC = env.NEXT_PUBLIC_CHAIN_RPC_URL || "https://sepolia.base.org";
const VAULT = (env.NEXT_PUBLIC_HEARST_YIELD_VAULT_ADDRESS ||
  env.NEXT_PUBLIC_HEARST_VAULT_ADDRESS) as `0x${string}`;
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as `0x${string}`;
const amountUsdc = Number(process.argv[2] ?? "1");

if (!PK) {
  console.log(
    "PILOT_PRIVATE_KEY not set. Set a FUNDED Base Sepolia throwaway key " +
      "(test ETH + test USDC) to run the real E2E. Aborting — no fabricated tx.",
  );
  process.exit(0);
}

const erc20 = [
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ name: "s", type: "address" }, { name: "a", type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;
const vaultAbi = [
  { name: "deposit", type: "function", stateMutability: "nonpayable", inputs: [{ name: "assets", type: "uint256" }, { name: "receiver", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "maxRedeem", type: "function", stateMutability: "view", inputs: [{ name: "o", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "redeem", type: "function", stateMutability: "nonpayable", inputs: [{ name: "shares", type: "uint256" }, { name: "receiver", type: "address" }, { name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

(async () => {
  const account = privateKeyToAccount(PK as `0x${string}`);
  const pub = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
  const wallet = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });
  console.log("Account:", account.address, "| Vault:", VAULT);

  const usdcBal = (await pub.readContract({ address: USDC, abi: erc20, functionName: "balanceOf", args: [account.address] })) as bigint;
  console.log("USDC balance:", formatUnits(usdcBal, 6));
  const assets = parseUnits(String(amountUsdc), 6);
  if (usdcBal < assets) {
    console.log(`Insufficient test USDC (need ${amountUsdc}). Fund via Circle faucet. Aborting.`);
    process.exit(1);
  }

  console.log(`\n1) approve(${amountUsdc} USDC)…`);
  const approveTx = await wallet.writeContract({ address: USDC, abi: erc20, functionName: "approve", args: [VAULT, assets], account, chain: baseSepolia });
  await pub.waitForTransactionReceipt({ hash: approveTx });
  console.log("   approve tx:", approveTx);

  console.log(`2) deposit(${amountUsdc} USDC)…`);
  const depositTx = await wallet.writeContract({ address: VAULT, abi: vaultAbi, functionName: "deposit", args: [assets, account.address], account, chain: baseSepolia });
  await pub.waitForTransactionReceipt({ hash: depositTx });
  console.log("   deposit tx:", depositTx);

  const shares = (await pub.readContract({ address: VAULT, abi: vaultAbi, functionName: "maxRedeem", args: [account.address] })) as bigint;
  console.log("   redeemable shares:", shares.toString());

  console.log("3) redeem(all shares)…");
  const redeemTx = await wallet.writeContract({ address: VAULT, abi: vaultAbi, functionName: "redeem", args: [shares, account.address, account.address], account, chain: baseSepolia });
  await pub.waitForTransactionReceipt({ hash: redeemTx });
  console.log("   redeem tx:", redeemTx);

  console.log("\nE2E OK — approve/deposit/redeem confirmed on Base Sepolia.");
  console.log("BaseScan:", `https://sepolia.basescan.org/address/${account.address}`);
})().catch((e) => { console.error("E2E FAILED:", e?.shortMessage ?? e?.message ?? e); process.exit(1); });
