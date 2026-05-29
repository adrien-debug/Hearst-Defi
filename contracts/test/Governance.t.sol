// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

/// @title GovernanceTest
/// @notice Covers the OZ TimelockController as it will be deployed for the Hearst Yield Vault.
///         Validates: minDelay == 48h, role assignments, admin renunciation, and the
///         `hashOperation` parity vector used to align off-chain TypeScript governance code.
///
/// PARITY VECTOR for src/lib/governance/eip712.ts timelockOperationId
/// ─────────────────────────────────────────────────────────────────────
///  target      = address(0x0000000000000000000000000000000000000001)
///  value       = 0
///  data        = "" (empty bytes)
///  predecessor = bytes32(0)
///  salt        = bytes32(0)
///
///  expected hash (keccak256(abi.encode(target, value, data, predecessor, salt))):
///    see PARITY_HASH constant below — confirmed by test_hashOperation_parityVector.
/// ─────────────────────────────────────────────────────────────────────
contract GovernanceTest is Test {
    // ─── constants ────────────────────────────────────────────────────────────

    uint256 constant MIN_DELAY = 172_800; // 48 hours

    // Parity vector for timelockOperationId alignment with TS governance layer.
    // Computed deterministically by test_hashOperation_parityVector and pinned here.
    // DO NOT change these inputs without updating src/lib/governance/eip712.ts.
    address constant PARITY_TARGET = address(0x0000000000000000000000000000000000000001);
    uint256 constant PARITY_VALUE = 0;
    bytes32 constant PARITY_PREDECESSOR = bytes32(0);
    bytes32 constant PARITY_SALT = bytes32(0);
    // PARITY_DATA is "" (empty bytes - see test body)
    // Canonical hash pinned below. Produced by:
    //   keccak256(abi.encode(address(1), uint256(0), bytes(""), bytes32(0), bytes32(0)))
    // Copy this literal into src/lib/governance/eip712.ts timelockOperationId parity check.
    bytes32 constant PARITY_HASH = 0xe13ea3a1e2109dd41ea773534291e0672cfdb9c44dfafc023132149975a9a036;

    // ─── state ────────────────────────────────────────────────────────────────

    TimelockController internal timelock;
    address internal safe = makeAddr("governance_safe_3_of_5");

    // ─── setup ────────────────────────────────────────────────────────────────

    function setUp() public {
        address[] memory proposers = new address[](1);
        proposers[0] = safe;

        address[] memory executors = new address[](1);
        executors[0] = safe;

        // admin = address(0): renounces external admin → self-administered via timelock.
        timelock = new TimelockController(MIN_DELAY, proposers, executors, address(0));
    }

    // ─── minDelay ─────────────────────────────────────────────────────────────

    /// Deployed delay must equal exactly 48 hours (172 800 seconds).
    function test_minDelay_is48Hours() public view {
        assertEq(timelock.getMinDelay(), MIN_DELAY, "minDelay != 172800");
    }

    // ─── role assignments ─────────────────────────────────────────────────────

    /// The Safe multisig must hold PROPOSER_ROLE.
    function test_safe_hasProposerRole() public view {
        assertTrue(timelock.hasRole(timelock.PROPOSER_ROLE(), safe), "safe missing PROPOSER_ROLE");
    }

    /// The Safe multisig must hold EXECUTOR_ROLE.
    function test_safe_hasExecutorRole() public view {
        assertTrue(timelock.hasRole(timelock.EXECUTOR_ROLE(), safe), "safe missing EXECUTOR_ROLE");
    }

    /// The Safe multisig must hold CANCELLER_ROLE (OZ grants it alongside PROPOSER_ROLE).
    function test_safe_hasCancellerRole() public view {
        assertTrue(timelock.hasRole(timelock.CANCELLER_ROLE(), safe), "safe missing CANCELLER_ROLE");
    }

    // ─── admin renunciation ───────────────────────────────────────────────────

    /// address(0) must NOT have DEFAULT_ADMIN_ROLE — that would open admin to everyone.
    function test_zeroAddress_lacksAdminRole() public view {
        assertFalse(
            timelock.hasRole(timelock.DEFAULT_ADMIN_ROLE(), address(0)),
            "address(0) must not hold DEFAULT_ADMIN_ROLE"
        );
    }

    /// The deployer (this test contract) must NOT have DEFAULT_ADMIN_ROLE.
    function test_deployer_lacksAdminRole() public view {
        assertFalse(
            timelock.hasRole(timelock.DEFAULT_ADMIN_ROLE(), address(this)),
            "deployer must not hold DEFAULT_ADMIN_ROLE after deploy"
        );
    }

    /// The timelock itself holds DEFAULT_ADMIN_ROLE (self-administration pattern).
    function test_timelockItself_holdsAdminRole() public view {
        assertTrue(
            timelock.hasRole(timelock.DEFAULT_ADMIN_ROLE(), address(timelock)),
            "timelock must self-hold DEFAULT_ADMIN_ROLE"
        );
    }

    // ─── hashOperation parity vector ──────────────────────────────────────────

    /// Pins the canonical keccak256 hash for the parity vector.
    /// The logged value must be copy-pasted into src/lib/governance/eip712.ts as
    /// the reference for timelockOperationId with these exact inputs.
    function test_hashOperation_parityVector() public view {
        bytes memory emptyData = "";
        bytes32 computed = timelock.hashOperation(
            PARITY_TARGET,
            PARITY_VALUE,
            emptyData,
            PARITY_PREDECESSOR,
            PARITY_SALT
        );

        // Derive the same hash locally so we can pin an assertion on a literal.
        bytes32 expected = keccak256(
            abi.encode(PARITY_TARGET, PARITY_VALUE, emptyData, PARITY_PREDECESSOR, PARITY_SALT)
        );

        // Both derivations must agree.
        assertEq(computed, expected, "hashOperation mismatch vs local abi.encode");

        // Assert against the pinned literal constant — this is the parity anchor for the TS layer.
        // If this assertion ever fails after an OZ upgrade, the TS timelockOperationId must be
        // updated in lockstep before any new governance proposals are submitted.
        assertEq(computed, PARITY_HASH, "hashOperation diverged from pinned PARITY_HASH");

        // Log for TS pinning. Copy this value into timelockOperationId parity check.
        console.log("PARITY VECTOR hash (pin in timelockOperationId):");
        console.logBytes32(computed);
    }

    /// hashOperation must be deterministic: identical inputs always yield the same id.
    function test_hashOperation_isDeterministic() public view {
        bytes memory emptyData = "";
        bytes32 h1 = timelock.hashOperation(PARITY_TARGET, PARITY_VALUE, emptyData, PARITY_PREDECESSOR, PARITY_SALT);
        bytes32 h2 = timelock.hashOperation(PARITY_TARGET, PARITY_VALUE, emptyData, PARITY_PREDECESSOR, PARITY_SALT);
        assertEq(h1, h2, "hashOperation is not deterministic");
    }

    /// hashOperation must produce different hashes when target differs.
    function test_hashOperation_differentTarget_differentHash() public view {
        bytes memory emptyData = "";
        bytes32 h1 = timelock.hashOperation(PARITY_TARGET, PARITY_VALUE, emptyData, PARITY_PREDECESSOR, PARITY_SALT);
        bytes32 h2 = timelock.hashOperation(address(2), PARITY_VALUE, emptyData, PARITY_PREDECESSOR, PARITY_SALT);
        assertTrue(h1 != h2, "different targets must produce different hashes");
    }

    /// hashOperation must produce different hashes when salt differs.
    function test_hashOperation_differentSalt_differentHash() public view {
        bytes memory emptyData = "";
        bytes32 h1 = timelock.hashOperation(PARITY_TARGET, PARITY_VALUE, emptyData, PARITY_PREDECESSOR, PARITY_SALT);
        bytes32 h2 =
            timelock.hashOperation(PARITY_TARGET, PARITY_VALUE, emptyData, PARITY_PREDECESSOR, bytes32(uint256(1)));
        assertTrue(h1 != h2, "different salts must produce different hashes");
    }

    // ─── hashOperationBatch parity ────────────────────────────────────────────

    /// Parity check for batch hashing (used when multiple vault calls are bundled in one proposal).
    function test_hashOperationBatch_isDeterministic() public view {
        address[] memory targets = new address[](1);
        targets[0] = PARITY_TARGET;

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory payloads = new bytes[](1);
        payloads[0] = "";

        bytes32 h1 = timelock.hashOperationBatch(targets, values, payloads, PARITY_PREDECESSOR, PARITY_SALT);
        bytes32 h2 = timelock.hashOperationBatch(targets, values, payloads, PARITY_PREDECESSOR, PARITY_SALT);
        assertEq(h1, h2, "hashOperationBatch is not deterministic");
    }

    /// Single-item batch hash must differ from single-op hash (different encoding).
    function test_hashOperationBatch_differsFromSingleOpHash() public view {
        bytes memory emptyData = "";

        bytes32 singleHash =
            timelock.hashOperation(PARITY_TARGET, PARITY_VALUE, emptyData, PARITY_PREDECESSOR, PARITY_SALT);

        address[] memory targets = new address[](1);
        targets[0] = PARITY_TARGET;
        uint256[] memory values = new uint256[](1);
        values[0] = PARITY_VALUE;
        bytes[] memory payloads = new bytes[](1);
        payloads[0] = emptyData;

        bytes32 batchHash = timelock.hashOperationBatch(targets, values, payloads, PARITY_PREDECESSOR, PARITY_SALT);

        assertTrue(singleHash != batchHash, "single and batch hashes must differ");
    }
}
