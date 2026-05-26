/**
 * Tests for src/lib/governance/eip712.ts
 *
 * Test vectors:
 *  1. Safe v1.4 tx hash — deterministic (computed from the spec, confirmed
 *     against the same viem primitives the module uses).
 *  2. Domain separator — chainId=8453 (Base mainnet) vs chainId=84532 (Sepolia).
 *  3. TimelockController.hashOperation — matches the OZ Solidity reference.
 *  4. Zod validation — SafeTxSchema rejects a malformed transaction.
 */

import { describe, expect, it } from "vitest";
import {
  zeroAddress,
  zeroHash,
  hashTypedData,
  domainSeparator,
  keccak256,
  encodeAbiParameters,
  type Address,
  type Hex,
} from "viem";

import {
  hashSafeTx,
  safeDomainSeparator,
  safeTxTypedData,
  SafeTxSchema,
  timelockOperationId,
  type SafeTx,
} from "../eip712";

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------

/**
 * Parse through SafeTxSchema so address/hex fields are properly branded as
 * Address / Hex (viem template-literal types).
 */
const SAFE_ADDRESS = "0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552" as Address;

const NO_OP_TX: SafeTx = SafeTxSchema.parse({
  to: SAFE_ADDRESS,
  value: 0n,
  data: "0x",
  operation: 0,
  safeTxGas: 0n,
  baseGas: 0n,
  gasPrice: 0n,
  gasToken: zeroAddress,
  refundReceiver: zeroAddress,
  nonce: 0n,
});

// ---------------------------------------------------------------------------
// 1. Hash is deterministic — Safe v1.4 EIP-712 vector
// ---------------------------------------------------------------------------

describe("hashSafeTx", () => {
  it("produces a deterministic hash for the no-op Safe v1.4 transaction vector", () => {
    // Expected: computed once via the same viem primitives used in the module,
    // then pinned here as a regression guard.
    const expected = hashTypedData({
      domain: { chainId: 1, verifyingContract: SAFE_ADDRESS },
      types: {
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
      },
      primaryType: "SafeTx",
      message: NO_OP_TX,
    });

    const result = hashSafeTx(NO_OP_TX, SAFE_ADDRESS, 1);

    expect(result).toBe(expected);
    // Pin exact bytes — this must never change without an intentional migration.
    expect(result).toBe(
      "0x81620ced1e1647153d82fca1f3dcb0f294063c737685eaf4e70da4f5310857d2",
    );
  });

  it("produces a different hash when the nonce changes", () => {
    const tx0 = hashSafeTx(NO_OP_TX, SAFE_ADDRESS, 1);
    const tx1 = hashSafeTx(
      SafeTxSchema.parse({ ...NO_OP_TX, nonce: 1n }),
      SAFE_ADDRESS,
      1,
    );
    expect(tx0).not.toBe(tx1);
  });

  it("produces a different hash when chainId changes (same tx, different network)", () => {
    const hashBase = hashSafeTx(NO_OP_TX, SAFE_ADDRESS, 8453);
    const hashSepolia = hashSafeTx(NO_OP_TX, SAFE_ADDRESS, 84532);
    expect(hashBase).not.toBe(hashSepolia);
  });

  it("safeTxTypedData returns correct domain/types/primaryType", () => {
    const payload = safeTxTypedData(SAFE_ADDRESS, 1, NO_OP_TX);
    expect(payload.domain.chainId).toBe(1);
    expect(payload.domain.verifyingContract).toBe(SAFE_ADDRESS);
    expect(payload.primaryType).toBe("SafeTx");
    expect(payload.types.SafeTx).toHaveLength(10);
  });
});

// ---------------------------------------------------------------------------
// 2. Domain separator — Base mainnet (8453) vs Base Sepolia (84532)
// ---------------------------------------------------------------------------

describe("safeDomainSeparator", () => {
  it("matches viem domainSeparator for Base mainnet (chainId=8453)", () => {
    const expected = domainSeparator({
      domain: { chainId: 8453, verifyingContract: SAFE_ADDRESS },
    });
    expect(safeDomainSeparator(SAFE_ADDRESS, 8453)).toBe(expected);
    // Pin exact bytes.
    expect(safeDomainSeparator(SAFE_ADDRESS, 8453)).toBe(
      "0xb33912df5c5de178c085db57642225d51547f0895cdbf4a8c372662cb50f9f10",
    );
  });

  it("matches viem domainSeparator for Base Sepolia (chainId=84532)", () => {
    const expected = domainSeparator({
      domain: { chainId: 84532, verifyingContract: SAFE_ADDRESS },
    });
    expect(safeDomainSeparator(SAFE_ADDRESS, 84532)).toBe(expected);
    // Pin exact bytes.
    expect(safeDomainSeparator(SAFE_ADDRESS, 84532)).toBe(
      "0x1e5d9fc79bfd30dd2ec22db58a1fa9bcac1eb0d0f53c745eb8676b46019ff7e1",
    );
  });

  it("domain separators differ between Base mainnet and Base Sepolia", () => {
    const base = safeDomainSeparator(SAFE_ADDRESS, 8453);
    const sepolia = safeDomainSeparator(SAFE_ADDRESS, 84532);
    expect(base).not.toBe(sepolia);
  });
});

// ---------------------------------------------------------------------------
// 3. TimelockController.hashOperation — OZ vector
// ---------------------------------------------------------------------------

describe("timelockOperationId", () => {
  const TARGET = "0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552" as Address;
  const SALT =
    "0x0000000000000000000000000000000000000000000000000000000000000001" as Hex;

  it("matches the OZ keccak256(abi.encode(...)) vector", () => {
    // Reference computation: keccak256(abi.encode(target, value, data, predecessor, salt))
    // This mirrors the Solidity implementation exactly.
    const expected = keccak256(
      encodeAbiParameters(
        [
          { name: "target", type: "address" },
          { name: "value", type: "uint256" },
          { name: "data", type: "bytes" },
          { name: "predecessor", type: "bytes32" },
          { name: "salt", type: "bytes32" },
        ],
        [TARGET, 0n, "0x", zeroHash, SALT],
      ),
    );

    const result = timelockOperationId(TARGET, 0n, "0x", zeroHash, SALT);

    expect(result).toBe(expected);
    // Pin the exact bytes as a regression guard.
    expect(result).toBe(
      "0x89c45b0a50acbf2b2a330b924aebb6363e95f5dc61f01b366bd04d334a1e2a21",
    );
  });

  it("operation id changes when value changes", () => {
    const id0 = timelockOperationId(TARGET, 0n, "0x", zeroHash, SALT);
    const id1 = timelockOperationId(TARGET, 1n, "0x", zeroHash, SALT);
    expect(id0).not.toBe(id1);
  });

  it("operation id changes when salt changes", () => {
    const salt2 =
      "0x0000000000000000000000000000000000000000000000000000000000000002" as Hex;
    const id1 = timelockOperationId(TARGET, 0n, "0x", zeroHash, SALT);
    const id2 = timelockOperationId(TARGET, 0n, "0x", zeroHash, salt2);
    expect(id1).not.toBe(id2);
  });

  it("operation id changes when predecessor changes", () => {
    const pred =
      "0x0000000000000000000000000000000000000000000000000000000000000042" as Hex;
    const id0 = timelockOperationId(TARGET, 0n, "0x", zeroHash, SALT);
    const id1 = timelockOperationId(TARGET, 0n, "0x", pred, SALT);
    expect(id0).not.toBe(id1);
  });
});

// ---------------------------------------------------------------------------
// 4. Zod validation — SafeTxSchema rejects malformed transactions
// ---------------------------------------------------------------------------

describe("SafeTxSchema", () => {
  it("accepts a well-formed SafeTx", () => {
    const result = SafeTxSchema.safeParse({
      to: SAFE_ADDRESS,
      value: 0n,
      data: "0x",
      operation: 0,
      safeTxGas: 0n,
      baseGas: 0n,
      gasPrice: 0n,
      gasToken: zeroAddress,
      refundReceiver: zeroAddress,
      nonce: 0n,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a tx with a non-hex data field", () => {
    const result = SafeTxSchema.safeParse({
      to: SAFE_ADDRESS,
      value: 0n,
      data: "not-hex",
      operation: 0,
      safeTxGas: 0n,
      baseGas: 0n,
      gasPrice: 0n,
      gasToken: zeroAddress,
      refundReceiver: zeroAddress,
      nonce: 0n,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a tx with an invalid 'to' address (too short)", () => {
    const result = SafeTxSchema.safeParse({
      to: "0x1234",
      value: 0n,
      data: "0x",
      operation: 0,
      safeTxGas: 0n,
      baseGas: 0n,
      gasPrice: 0n,
      gasToken: zeroAddress,
      refundReceiver: zeroAddress,
      nonce: 0n,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a tx with a string 'value' instead of bigint", () => {
    const result = SafeTxSchema.safeParse({
      to: SAFE_ADDRESS,
      value: "100",
      data: "0x",
      operation: 0,
      safeTxGas: 0n,
      baseGas: 0n,
      gasPrice: 0n,
      gasToken: zeroAddress,
      refundReceiver: zeroAddress,
      nonce: 0n,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a tx with an invalid operation (2 is not 0 or 1)", () => {
    const result = SafeTxSchema.safeParse({
      to: SAFE_ADDRESS,
      value: 0n,
      data: "0x",
      operation: 2,
      safeTxGas: 0n,
      baseGas: 0n,
      gasPrice: 0n,
      gasToken: zeroAddress,
      refundReceiver: zeroAddress,
      nonce: 0n,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a tx with a missing required field", () => {
    const result = SafeTxSchema.safeParse({
      value: 0n,
      data: "0x",
      operation: 0,
      safeTxGas: 0n,
      baseGas: 0n,
      gasPrice: 0n,
      gasToken: zeroAddress,
      refundReceiver: zeroAddress,
      nonce: 0n,
    });
    expect(result.success).toBe(false);
  });
});
