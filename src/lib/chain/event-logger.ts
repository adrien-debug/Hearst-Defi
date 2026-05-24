import "server-only";

import { EVENT_KIND_LABELS, EVENT_LOGGER_ABI, type EventKind } from "./abis";
import { getEventLoggerAddress, getHearstPublisherAddress, getPublicClient } from "./client";

export type { EventKind };

export interface OnChainEvent {
  eventId: bigint;
  kind: EventKind;
  contextHash: `0x${string}`;
  publisher: `0x${string}`;
  timestamp: Date;
  payloadCid: string;
  txHash: `0x${string}`;
  blockNumber: bigint;
}

function labelKind(raw: number): EventKind {
  const label = EVENT_KIND_LABELS[raw];
  // Unknown enum values shouldn't reach us if the on-chain enum stays in sync,
  // but fall back deterministically rather than throwing.
  return label ?? "Rebalance";
}

export interface FetchEventsOptions {
  limit?: number;
  fromBlock?: bigint | "earliest";
}

/**
 * Reads `HearstEvent` logs from the EventLogger contract.
 *
 * Filters events by the authorized HEARST_PUBLISHER address to prevent
 * spoofed events from unknown publishers.
 *
 * Never throws: if the contract address is not configured or the RPC call
 * fails, returns an empty list so the Proof Center can fall back to off-chain
 * mocks.
 */
export async function fetchOnChainEvents(
  opts: FetchEventsOptions = {},
): Promise<OnChainEvent[]> {
  const addr = getEventLoggerAddress();
  if (!addr) return [];

  const authorizedPublisher = getHearstPublisherAddress();

  const limit = opts.limit ?? 50;
  const fromBlock = opts.fromBlock ?? "earliest";

  try {
    const client = getPublicClient();
    const logs = await client.getContractEvents({
      address: addr,
      abi: EVENT_LOGGER_ABI,
      eventName: "HearstEvent",
      fromBlock,
      toBlock: "latest",
    });

    const events: OnChainEvent[] = [];
    for (const log of logs) {
      const args = log.args;
      if (
        args.eventId === undefined ||
        args.kind === undefined ||
        args.contextHash === undefined ||
        args.publisher === undefined ||
        args.timestamp === undefined ||
        args.payloadCid === undefined
      ) {
        continue;
      }

      // Filter: only accept events from the authorized publisher
      if (
        authorizedPublisher &&
        args.publisher.toLowerCase() !== authorizedPublisher.toLowerCase()
      ) {
        continue;
      }

      events.push({
        eventId: args.eventId,
        kind: labelKind(Number(args.kind)),
        contextHash: args.contextHash,
        publisher: args.publisher,
        timestamp: new Date(Number(args.timestamp) * 1000),
        payloadCid: args.payloadCid,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
      });
    }

    events.sort((a, b) => {
      // Descending by eventId (most recent first).
      if (a.eventId === b.eventId) return 0;
      return a.eventId > b.eventId ? -1 : 1;
    });

    return events.slice(0, limit);
  } catch (err) {
    console.warn("[chain/event-logger] fetchOnChainEvents failed:", err instanceof Error ? err.message : String(err));
    return [];
  }
}
