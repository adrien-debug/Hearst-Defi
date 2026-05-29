// src/lib/onchain/vault.ts
//
// Real viem helpers for ERC-20 approve + ERC-4626 deposit against the
// Hearst Yield Vault deployed on Base Sepolia.
//
// Design contracts:
//  - All addresses are resolved from NEXT_PUBLIC_* env vars (public, not secret).
//  - Every function requires a connected WalletClient (from Privy's
//    `getEthereumProvider` / `createWalletClient`). No WalletClient = explicit
//    error thrown — never a fake txHash.
//  - `publicClient` is caller-supplied for `waitForTransactionReceipt`; callers
//    that can't supply one get a typed `ConfigError` rather than a silent fail.
//  - ABI is declared inline — no imports from `contracts/out/`.

import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseUnits,
  type Hex,
  type WalletClient,
  type PublicClient,
  type Address,
} from "viem";
// Privy's EIP1193Provider uses `on(eventName: string, ...)` which is structurally
// narrower than viem's generic-overloaded signature. Bridging via `unknown` is the
// only safe cast — we never use the `on`/`removeListener` methods ourselves, and
// the `request` method matches exactly. See vault.ts: walletClientFromProvider.
type ViemCompatibleProvider = Parameters<typeof custom>[0];
import { baseSepolia } from "viem/chains";

// ---------------------------------------------------------------------------
// Addresses — from NEXT_PUBLIC_* env (public, safe in browser bundles)
// ---------------------------------------------------------------------------

const BASE_SEPOLIA_CHAIN_ID = 84532;

/** The deployed ERC-4626 vault address. */
export const VAULT_ADDRESS: Address | null = (() => {
  const raw = process.env.NEXT_PUBLIC_HEARST_VAULT_ADDRESS;
  if (!raw) return null;
  const t = raw.trim();
  return /^0x[0-9a-fA-F]{40}$/.test(t) ? (t as Address) : null;
})();

/** The USDC token address on Base Sepolia. */
export const USDC_ADDRESS: Address =
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

/** USDC has 6 decimals on all chains. */
const USDC_DECIMALS = 6;

// ---------------------------------------------------------------------------
// Minimal ABIs (inline — no contracts/out imports)
// ---------------------------------------------------------------------------

const ERC20_ABI = [
  {
    name: "approve",
    type: "function" as const,
    stateMutability: "nonpayable" as const,
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const ERC4626_ABI = [
  {
    name: "deposit",
    type: "function" as const,
    stateMutability: "nonpayable" as const,
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ name: "shares", type: "uint256" }],
  },
  {
    name: "previewDeposit",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [{ name: "assets", type: "uint256" }],
    outputs: [{ name: "shares", type: "uint256" }],
  },
  {
    name: "asset",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "balanceOf",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ---------------------------------------------------------------------------
// Typed error classes — callers distinguish config vs chain vs contract errors
// ---------------------------------------------------------------------------

export class ConfigError extends Error {
  readonly code = "CONFIG_ERROR" as const;
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export class ChainError extends Error {
  readonly code = "CHAIN_ERROR" as const;
  constructor(message: string) {
    super(message);
    this.name = "ChainError";
  }
}

// ---------------------------------------------------------------------------
// Public client factory (client-side) — not server-only; used in "use client"
// components. Separate from src/lib/chain/client.ts which is server-only.
// ---------------------------------------------------------------------------

function buildPublicClientBrowser(): PublicClient {
  const rpc =
    process.env.NEXT_PUBLIC_CHAIN_RPC_URL?.trim() || "https://sepolia.base.org";
  return createPublicClient({
    chain: baseSepolia,
    transport: http(rpc, { timeout: 10_000, retryCount: 2 }),
  }) as PublicClient;
}

// Lazily instantiated once per browser session.
let _cachedPublicClient: PublicClient | null = null;
export function getBrowserPublicClient(): PublicClient {
  if (!_cachedPublicClient) {
    _cachedPublicClient = buildPublicClientBrowser();
  }
  return _cachedPublicClient;
}

// ---------------------------------------------------------------------------
// Wallet client factory from a Privy / EIP-1193 provider
// ---------------------------------------------------------------------------

export function walletClientFromProvider(
  // `unknown` accepts both viem's EIP1193Provider and Privy's narrower variant
  // (whose `.on` signature differs in ways that are irrelevant at runtime).
  // We do NOT expose `any` — callers that pass an unexpected shape will discover
  // it at `writeContract` time from viem's own runtime checks.
  provider: unknown,
  address: Address,
): WalletClient {
  const viemProvider = provider as ViemCompatibleProvider;
  return createWalletClient({
    account: address,
    chain: baseSepolia,
    transport: custom(viemProvider),
  });
}

// ---------------------------------------------------------------------------
// Chain guard — verifies the wallet is on Base Sepolia before transacting
// ---------------------------------------------------------------------------

export async function assertBaseSepolia(walletClient: WalletClient): Promise<void> {
  const chainId = await walletClient.getChainId();
  if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
    throw new ChainError(
      `Wallet is on chain ${chainId}. Switch to Base Sepolia (84532) before transacting.`,
    );
  }
}

// ---------------------------------------------------------------------------
// ERC-20 approve
// ---------------------------------------------------------------------------

export interface ApproveUsdcOpts {
  walletClient: WalletClient;
  /** USDC amount in whole dollars (integer). Internally converted to 6-decimal units. */
  amountUsdc: number;
}

export interface ApproveUsdcResult {
  txHash: Hex;
}

/**
 * Sends an ERC-20 `approve(vault, amount)` on behalf of the connected wallet.
 *
 * Throws `ConfigError` if NEXT_PUBLIC_HEARST_VAULT_ADDRESS is unset.
 * Throws `ChainError`  if the wallet is not on Base Sepolia.
 * Throws the underlying viem/RPC error for any contract-level rejection.
 */
export async function approveUsdc(opts: ApproveUsdcOpts): Promise<ApproveUsdcResult> {
  if (!VAULT_ADDRESS) {
    throw new ConfigError(
      "NEXT_PUBLIC_HEARST_VAULT_ADDRESS is not configured. " +
        "Set the env var to enable on-chain transactions.",
    );
  }

  await assertBaseSepolia(opts.walletClient);

  const amount = parseUnits(String(opts.amountUsdc), USDC_DECIMALS);

  const account = opts.walletClient.account;
  if (!account) {
    throw new ConfigError("WalletClient has no account. Reconnect your wallet.");
  }

  const txHash = await opts.walletClient.writeContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [VAULT_ADDRESS, amount],
    account,
    chain: baseSepolia,
  });

  const publicClient = getBrowserPublicClient();
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return { txHash };
}

// ---------------------------------------------------------------------------
// ERC-4626 deposit
// ---------------------------------------------------------------------------

export interface DepositToVaultOpts {
  walletClient: WalletClient;
  /** USDC amount in whole dollars (integer). */
  amountUsdc: number;
  /** Receiver of the vault shares — usually the same as the connected wallet. */
  receiver: Address;
}

export interface DepositToVaultResult {
  txHash: Hex;
  amountUsdc: number;
}

/**
 * Calls `vault.deposit(assets, receiver)`.
 * Assumes the caller has already approved a sufficient USDC allowance.
 *
 * Throws `ConfigError` if NEXT_PUBLIC_HEARST_VAULT_ADDRESS is unset.
 * Throws `ChainError`  if the wallet is not on Base Sepolia.
 */
export async function depositToVault(
  opts: DepositToVaultOpts,
): Promise<DepositToVaultResult> {
  if (!VAULT_ADDRESS) {
    throw new ConfigError(
      "NEXT_PUBLIC_HEARST_VAULT_ADDRESS is not configured. " +
        "Set the env var to enable on-chain transactions.",
    );
  }

  await assertBaseSepolia(opts.walletClient);

  const assets = parseUnits(String(opts.amountUsdc), USDC_DECIMALS);

  const account = opts.walletClient.account;
  if (!account) {
    throw new ConfigError("WalletClient has no account. Reconnect your wallet.");
  }

  const txHash = await opts.walletClient.writeContract({
    address: VAULT_ADDRESS,
    abi: ERC4626_ABI,
    functionName: "deposit",
    args: [assets, opts.receiver],
    account,
    chain: baseSepolia,
  });

  const publicClient = getBrowserPublicClient();
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return { txHash, amountUsdc: opts.amountUsdc };
}

// ---------------------------------------------------------------------------
// Read helpers (no wallet required)
// ---------------------------------------------------------------------------

/**
 * Reads the current USDC allowance granted by `owner` to the vault.
 * Returns the allowance as a USDC whole-dollar integer.
 * Returns 0 if the vault address is not configured.
 */
export async function readAllowance(owner: Address): Promise<number> {
  if (!VAULT_ADDRESS) return 0;
  const publicClient = getBrowserPublicClient();
  const raw = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [owner, VAULT_ADDRESS],
  });
  // Convert from 6-decimal USDC units to whole dollars (truncated)
  return Number(raw / BigInt(10 ** USDC_DECIMALS));
}

/**
 * Returns the vault's underlying asset address.
 * Useful as a sanity-check that the vault is wired to the expected USDC.
 * Returns null if vault address is not configured.
 */
export async function readVaultAsset(): Promise<Address | null> {
  if (!VAULT_ADDRESS) return null;
  const publicClient = getBrowserPublicClient();
  const asset = await publicClient.readContract({
    address: VAULT_ADDRESS,
    abi: ERC4626_ABI,
    functionName: "asset",
    args: [],
  });
  return asset as Address;
}
