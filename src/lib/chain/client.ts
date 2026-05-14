import "server-only";

import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

const DEFAULT_RPC_URL = "https://sepolia.base.org";

function getRpcUrl(): string {
  const url = process.env.NEXT_PUBLIC_CHAIN_RPC_URL;
  if (!url || url.trim().length === 0) return DEFAULT_RPC_URL;
  return url;
}

function build() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(getRpcUrl()),
  });
}

// Inferred type from viem 2.x — avoids the dual-version `PublicClient` collision
// that surfaces when `@walletconnect/utils` pins an older viem.
export type ChainClient = ReturnType<typeof build>;

let cachedClient: ChainClient | null = null;

export function getPublicClient(): ChainClient {
  if (cachedClient === null) {
    cachedClient = build();
  }
  return cachedClient;
}

function parseAddress(raw: string | undefined): `0x${string}` | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("0x") || trimmed.length !== 42) return null;
  if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return null;
  return trimmed as `0x${string}`;
}

export function getEventLoggerAddress(): `0x${string}` | null {
  return parseAddress(process.env.NEXT_PUBLIC_EVENT_LOGGER_ADDRESS);
}

export function getPoRRegistryAddress(): `0x${string}` | null {
  return parseAddress(process.env.NEXT_PUBLIC_POR_REGISTRY_ADDRESS);
}

export function isChainConfigured(): boolean {
  return getEventLoggerAddress() !== null && getPoRRegistryAddress() !== null;
}

export const CHAIN_ID = baseSepolia.id; // 84532
export const EXPLORER_TX_BASE = "https://sepolia.basescan.org/tx/";
export const EXPLORER_ADDRESS_BASE = "https://sepolia.basescan.org/address/";
