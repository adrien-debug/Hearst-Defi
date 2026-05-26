/**
 * EIP-712 off-chain helpers — Safe v1.4 + OpenZeppelin TimelockController.
 *
 * Pure module: no fetch, no signer, no provider, no I/O.
 * Only imports: viem (already a project dependency) and zod.
 */

import {
  domainSeparator,
  encodeAbiParameters,
  hashTypedData,
  keccak256,
  type Address,
  type Hex,
} from "viem";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod schema + type
// ---------------------------------------------------------------------------

/**
 * Validate a 0x-prefixed 20-byte Ethereum address and brand it as
 * viem's `Address` (`0x${string}`) so it flows into viem APIs without casts.
 */
const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, "Invalid Ethereum address")
  .transform((v) => v as Address);

/**
 * Validate a 0x-prefixed hex string (any byte length) and brand it as
 * viem's `Hex` (`0x${string}`).
 */
const hexBytesSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]*$/, "Invalid hex bytes")
  .transform((v) => v as Hex);

/**
 * Zod schema for a Safe v1.4 transaction.
 * All numeric fields use bigint to match on-chain uint256 precision.
 */
export const SafeTxSchema = z.object({
  to: addressSchema,
  value: z.bigint(),
  data: hexBytesSchema,
  /** 0 = Call, 1 = DelegateCall */
  operation: z.union([z.literal(0), z.literal(1)]),
  safeTxGas: z.bigint(),
  baseGas: z.bigint(),
  gasPrice: z.bigint(),
  gasToken: addressSchema,
  refundReceiver: addressSchema,
  nonce: z.bigint(),
});

export type SafeTx = z.infer<typeof SafeTxSchema>;

// ---------------------------------------------------------------------------
// Safe v1.4 EIP-712 type definitions (canonical, never change)
// ---------------------------------------------------------------------------

/**
 * Safe v1.4 uses a stripped EIP-712 domain: only `chainId` + `verifyingContract`.
 * Name and version are intentionally absent (Safe design decision).
 */
const SAFE_TX_TYPES = {
  SafeTx: [
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "data", type: "bytes" },
    { name: "operation", type: "uint8" },
    { name: "safeTxGas", type: "uint256" },
    { name: "baseGas", type: "uint256" },
    { name: "gasPrice", type: "uint256" },
    { name: "gasToken", type: "address" },
    { name: "refundReceiver", type: "address" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

// ---------------------------------------------------------------------------
// Return type for safeTxTypedData
// ---------------------------------------------------------------------------

export interface SafeTxTypedData {
  domain: {
    chainId: number;
    verifyingContract: Address;
  };
  types: typeof SAFE_TX_TYPES;
  primaryType: "SafeTx";
  message: SafeTx;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the full EIP-712 typed-data payload for a Safe v1.4 transaction.
 *
 * The returned object is directly consumable by:
 *  • `viem`'s `signTypedData` / `eth_signTypedData_v4`
 *  • Safe's `buildSignatureBytes` helpers
 *
 * @throws {z.ZodError} when `tx` fails schema validation.
 */
export function safeTxTypedData(
  safeAddress: Address,
  chainId: number,
  tx: SafeTx,
): SafeTxTypedData {
  // Validate at runtime (pure — no I/O side effect).
  SafeTxSchema.parse(tx);

  return {
    domain: {
      chainId,
      verifyingContract: safeAddress,
    },
    types: SAFE_TX_TYPES,
    primaryType: "SafeTx",
    message: tx,
  };
}

/**
 * Compute the deterministic EIP-712 hash of a Safe v1.4 transaction.
 *
 * Equivalent to calling `getTransactionHash(...)` on the Safe contract.
 *
 * @throws {z.ZodError} when `tx` fails schema validation.
 */
export function hashSafeTx(
  tx: SafeTx,
  safeAddress: Address,
  chainId: number,
): Hex {
  const payload = safeTxTypedData(safeAddress, chainId, tx);
  return hashTypedData(payload);
}

/**
 * Compute the domain separator for a Safe v1.4 deployment.
 *
 * Useful for verifying the separator matches the value returned by
 * `GnosisSafe.domainSeparator()` on-chain.
 */
export function safeDomainSeparator(
  safeAddress: Address,
  chainId: number,
): Hex {
  return domainSeparator({
    domain: {
      chainId,
      verifyingContract: safeAddress,
    },
  });
}

// ---------------------------------------------------------------------------
// OpenZeppelin TimelockController — hashOperation equivalent
// ---------------------------------------------------------------------------

/**
 * Compute the operation id as produced by OZ `TimelockController.hashOperation`.
 *
 * Solidity source (v4.x / v5.x):
 * ```solidity
 * function hashOperation(
 *   address target,
 *   uint256 value,
 *   bytes calldata data,
 *   bytes32 predecessor,
 *   bytes32 salt
 * ) public pure returns (bytes32) {
 *   return keccak256(abi.encode(target, value, data, predecessor, salt));
 * }
 * ```
 *
 * @param target      - Contract address to call.
 * @param value       - ETH value (wei) for the call.
 * @param data        - Calldata for the call (0x-prefixed hex).
 * @param predecessor - bytes32 hash of a required prior operation, or bytes32(0).
 * @param salt        - Arbitrary bytes32 for uniqueness / replay protection.
 * @returns           The keccak256 hash that uniquely identifies this operation.
 */
export function timelockOperationId(
  target: Address,
  value: bigint,
  data: Hex,
  predecessor: Hex,
  salt: Hex,
): Hex {
  const encoded = encodeAbiParameters(
    [
      { name: "target", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "predecessor", type: "bytes32" },
      { name: "salt", type: "bytes32" },
    ],
    [target, value, data, predecessor, salt],
  );
  return keccak256(encoded);
}
