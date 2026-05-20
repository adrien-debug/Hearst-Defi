import "server-only";

import { POR_REGISTRY_ABI } from "./abis";
import { getPoRRegistryAddress, getPublicClient } from "./client";

export interface OnChainAttestation {
  attestationId: bigint;
  period: bigint; // YYYYMM
  attestor: `0x${string}`;
  /** Total AUM in USD (6-decimal USDC convention) → human-readable number. */
  totalAumUsd: number;
  /** Mining output in BTC (converted from sats). */
  minedBtc: number;
  rawTotalAumUsd: bigint;
  rawMinedBtcSats: bigint;
  evidenceHash: `0x${string}`;
  evidenceCid: string;
  timestamp: Date;
  txHash: `0x${string}`;
  blockNumber: bigint;
}

export interface FetchAttestationsOptions {
  limit?: number;
  fromBlock?: bigint | "earliest";
}

const USDC_DECIMALS = 6n;

function fromBaseUnits(raw: bigint, decimals: bigint): number {
  // Safe for typical USD AUM values; PoR pinning is informational, not balance accounting.
  const divisor = 10n ** decimals;
  const whole = raw / divisor;
  const frac = raw % divisor;
  // Avoid scientific notation while keeping precision for the UI.
  return Number(whole) + Number(frac) / Number(divisor);
}

/**
 * Reads `AttestationPublished` logs from the PoRRegistry contract.
 *
 * Never throws. Returns descending-by-id, capped at `limit` (default 12).
 */
export async function fetchOnChainAttestations(
  opts: FetchAttestationsOptions = {},
): Promise<OnChainAttestation[]> {
  const addr = getPoRRegistryAddress();
  if (!addr) return [];

  const limit = opts.limit ?? 12;
  const fromBlock = opts.fromBlock ?? "earliest";

  try {
    const client = getPublicClient();
    const logs = await client.getContractEvents({
      address: addr,
      abi: POR_REGISTRY_ABI,
      eventName: "AttestationPublished",
      fromBlock,
      toBlock: "latest",
    });

    const attestations: OnChainAttestation[] = [];
    for (const log of logs) {
      const args = log.args;
      if (
        args.attestationId === undefined ||
        args.period === undefined ||
        args.attestor === undefined ||
        args.totalAumUsd === undefined ||
        args.minedBtcSats === undefined ||
        args.evidenceHash === undefined ||
        args.evidenceCid === undefined
      ) {
        continue;
      }

      const block = await client
        .getBlock({ blockNumber: log.blockNumber })
        .catch(() => null);

      attestations.push({
        attestationId: args.attestationId,
        period: args.period,
        attestor: args.attestor,
        totalAumUsd: fromBaseUnits(args.totalAumUsd, USDC_DECIMALS),
        minedBtc: fromBaseUnits(args.minedBtcSats, 8n),
        rawTotalAumUsd: args.totalAumUsd,
        rawMinedBtcSats: args.minedBtcSats,
        evidenceHash: args.evidenceHash,
        evidenceCid: args.evidenceCid,
        timestamp: block
          ? new Date(Number(block.timestamp) * 1000)
          : new Date(0),
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
      });
    }

    attestations.sort((a, b) => {
      if (a.attestationId === b.attestationId) return 0;
      return a.attestationId > b.attestationId ? -1 : 1;
    });

    return attestations.slice(0, limit);
  } catch (err) {
    console.warn(
      "[chain/por-registry] fetchOnChainAttestations failed:",
      err,
    );
    return [];
  }
}

