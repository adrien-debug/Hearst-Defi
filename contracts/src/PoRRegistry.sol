// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PoRRegistry
/// @notice Proof-of-Reserves attestation registry for Hearst Connect. One attestation per period
///         (YYYYMM), each pinning a signed off-chain evidence document (PDF) via its hash and CID.
/// @dev    Immutable in Phase 2: no admin, no upgrade, no pause, no overwrite. If a published
///         attestation is wrong, the only remedy is to publish the next period's attestation with
///         corrected figures and to keep the off-chain trail. This matches the Spearbit-audit
///         posture for Phase 3 where amendments will go through the timelock.
contract PoRRegistry {
    struct Attestation {
        uint64 timestamp;
        uint256 totalAumUsd; // 6 decimals (USDC convention) — total AUM in USD
        uint256 minedBtcSats; // satoshis, signed mining output attributed to the vault for the period
        bytes32 evidenceHash; // keccak256 of the canonical evidence document (PDF / signed report)
        string evidenceCid; // IPFS CID of the evidence document
        address attestor;
    }

    /// @notice Emitted whenever a new attestation is published.
    /// @param attestationId Monotonically increasing id (starts at 1).
    /// @param period        Calendar period encoded as YYYYMM (e.g. 202605).
    /// @param attestor      Address that submitted the attestation (always `publisher`).
    /// @param totalAumUsd   Total AUM in USD with 6 decimals.
    /// @param minedBtcSats  Mining output in satoshis attributed to the vault for the period.
    /// @param evidenceHash  keccak256 of the canonical evidence document.
    /// @param evidenceCid   IPFS CID of the evidence document.
    event AttestationPublished(
        uint256 indexed attestationId,
        uint64 indexed period,
        address indexed attestor,
        uint256 totalAumUsd,
        uint256 minedBtcSats,
        bytes32 evidenceHash,
        string evidenceCid
    );

    /// @notice Immutable address authorized to publish attestations (Hearst manager multisig).
    address public immutable publisher;

    /// @notice Last attestation id minted. Zero means no attestation has ever been published.
    uint256 public lastAttestationId;

    /// @notice attestationId => full attestation struct.
    mapping(uint256 => Attestation) public attestations;

    /// @notice period (YYYYMM) => attestationId (0 if not yet published).
    mapping(uint64 => uint256) public attestationIdByPeriod;

    error NotAuthorizedPublisher();
    error PeriodAlreadyAttested();
    error InvalidPublisher();
    error InvalidPeriod();

    modifier onlyPublisher() {
        if (msg.sender != publisher) revert NotAuthorizedPublisher();
        _;
    }

    /// @param _publisher Address allowed to call `publish`. Must be non-zero.
    constructor(address _publisher) {
        if (_publisher == address(0)) revert InvalidPublisher();
        publisher = _publisher;
    }

    /// @notice Publish a new attestation for a period. One-shot per period.
    /// @param period         YYYYMM identifier of the attested period. Must be non-zero.
    /// @param totalAumUsd    Total AUM in USD with 6 decimals.
    /// @param minedBtcSats   Mining output in satoshis attributed to the vault for the period.
    /// @param evidenceHash   keccak256 of the canonical evidence document.
    /// @param evidenceCid    IPFS CID of the evidence document.
    /// @return attestationId The freshly minted attestation id.
    function publish(
        uint64 period,
        uint256 totalAumUsd,
        uint256 minedBtcSats,
        bytes32 evidenceHash,
        string calldata evidenceCid
    ) external onlyPublisher returns (uint256 attestationId) {
        if (period == 0) revert InvalidPeriod();
        if (attestationIdByPeriod[period] != 0) revert PeriodAlreadyAttested();

        unchecked {
            attestationId = ++lastAttestationId;
        }

        attestations[attestationId] = Attestation({
            timestamp: uint64(block.timestamp),
            totalAumUsd: totalAumUsd,
            minedBtcSats: minedBtcSats,
            evidenceHash: evidenceHash,
            evidenceCid: evidenceCid,
            attestor: msg.sender
        });
        attestationIdByPeriod[period] = attestationId;

        emit AttestationPublished(
            attestationId, period, msg.sender, totalAumUsd, minedBtcSats, evidenceHash, evidenceCid
        );
    }

    /// @notice Convenience getter for the attestation tied to a given period.
    /// @param period YYYYMM identifier of the period.
    /// @return att   The full attestation struct (zero-initialized if absent).
    function getAttestationByPeriod(uint64 period) external view returns (Attestation memory att) {
        uint256 id = attestationIdByPeriod[period];
        if (id != 0) att = attestations[id];
    }
}
