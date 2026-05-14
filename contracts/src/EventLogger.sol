// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title EventLogger
/// @notice Phase 2 immutable on-chain journal for Hearst Connect rebalancing, distribution and
///         state-change events. Mirrors the off-chain Proof Center stream so that any LP can
///         independently verify the published payloads against an immutable record.
/// @dev    No admin, no upgrade, no pause. The single `publisher` (Hearst manager multisig) is
///         immutable. The full payload lives off-chain (IPFS); `contextHash` lets a verifier
///         compare it to the on-chain commitment. Heavier governance primitives land in Phase 3
///         alongside the audited ERC-4626 vault.
contract EventLogger {
    enum EventKind {
        Rebalance,
        Distribution,
        ModeChange,
        GuardrailBreach,
        TriggerArmed,
        AttestationPublished
    }

    /// @notice Emitted for every Hearst event. Subgraphs / Proof Center index on `eventId`,
    ///         `kind` and `contextHash`.
    /// @param eventId       Monotonically increasing identifier (starts at 1).
    /// @param kind          EventKind enum value classifying the event.
    /// @param contextHash   keccak256 hash of the canonical off-chain payload (integrity check).
    /// @param publisher     Address that submitted the event (always the immutable `publisher`).
    /// @param timestamp     `block.timestamp` cast to uint64 (safe until year 2554).
    /// @param payloadCid    IPFS CID of the full off-chain payload (UTF-8 string).
    event HearstEvent(
        uint256 indexed eventId,
        EventKind indexed kind,
        bytes32 indexed contextHash,
        address publisher,
        uint64 timestamp,
        string payloadCid
    );

    /// @notice Last event id minted. Zero means no events logged yet.
    uint256 public lastEventId;

    /// @notice Immutable address authorized to log events. Expected to be the Hearst manager
    ///         multisig (Safe 3/5 once Phase 3 lands; an EOA on testnet is acceptable for Phase 2).
    address public immutable publisher;

    error NotAuthorizedPublisher();
    error InvalidPublisher();

    modifier onlyPublisher() {
        if (msg.sender != publisher) revert NotAuthorizedPublisher();
        _;
    }

    /// @param _publisher Address allowed to call `logEvent`. Must be non-zero.
    constructor(address _publisher) {
        if (_publisher == address(0)) revert InvalidPublisher();
        publisher = _publisher;
    }

    /// @notice Log a new event. Only callable by `publisher`.
    /// @param kind         EventKind classifying the event.
    /// @param contextHash  keccak256 of the off-chain canonical payload (integrity anchor).
    /// @param payloadCid   IPFS CID pointing to the full payload (off-chain).
    /// @return eventId     The freshly minted event id.
    function logEvent(EventKind kind, bytes32 contextHash, string calldata payloadCid)
        external
        onlyPublisher
        returns (uint256 eventId)
    {
        unchecked {
            // Cannot realistically overflow; 2^256 events is unreachable.
            eventId = ++lastEventId;
        }
        emit HearstEvent(eventId, kind, contextHash, msg.sender, uint64(block.timestamp), payloadCid);
    }
}
