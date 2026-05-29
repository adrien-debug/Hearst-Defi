// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

/// @title DeployGovernance
/// @notice Deploys the OZ TimelockController that will own the Hearst Yield Vault in production.
///
/// ─── Usage (Base Sepolia only — never broadcast against mainnet without audit sign-off) ───
///   GOVERNANCE_SAFE=<safe_address> forge script contracts/script/DeployGovernance.s.sol \
///     --rpc-url base_sepolia --broadcast
///
///   Optional override:
///   TIMELOCK_MIN_DELAY=<seconds> GOVERNANCE_SAFE=<addr> forge script …
///
/// ─── Architecture decision ──────────────────────────────────────────────────────────────
///  - `admin` is set to address(0): the timelock is self-administered from deployment.
///    This is the standard hardened posture (see OZ docs, ADR-006). No EOA holds admin
///    after deploy; all parameter changes must go through a 48h-delayed proposal.
///  - `proposers` == `executors` == [GOVERNANCE_SAFE]: the Safe 3/5 multisig both proposes
///    and executes. A separate guardian can cancel via CANCELLER_ROLE if needed (add later
///    via a timelocked grantRole call from the timelock itself).
///  - TESTNET ONLY: this script must never be run with --broadcast against chain ID 8453
///    (Base mainnet). The mainnet deploy is gated on Spearbit audit completion (ADR-006).
///
/// ─── Safe deployment (out-of-scope for Foundry) ────────────────────────────────────────
///  The Safe 3/5 multisig is deployed separately via the Safe UI / Safe SDK:
///    https://app.safe.global — create a new Safe on Base Sepolia with 5 owners, threshold 3.
///  Set the resulting Safe address as GOVERNANCE_SAFE before running this script.
///  After vault deployment (Phase 3), transfer Vault ownership to this TimelockController
///  address via `vault.transferOwnership(address(timelock))`.
contract DeployGovernance is Script {
    /// @dev Default 48-hour delay (in seconds). Override via TIMELOCK_MIN_DELAY env var.
    uint256 constant DEFAULT_MIN_DELAY = 172_800;

    function run() external returns (TimelockController timelock) {
        // ── Read env ──────────────────────────────────────────────────────────
        address safe = vm.envAddress("GOVERNANCE_SAFE");
        require(safe != address(0), "DeployGovernance: GOVERNANCE_SAFE must be set and non-zero");

        uint256 minDelay = DEFAULT_MIN_DELAY;
        // Allow testnet operators to override delay (e.g. shorter for integration tests).
        try vm.envUint("TIMELOCK_MIN_DELAY") returns (uint256 override_) {
            minDelay = override_;
        } catch {}

        // ── Log intent ────────────────────────────────────────────────────────
        console.log("=== DeployGovernance (Phase 2 - Base Sepolia) ===");
        console.log("GOVERNANCE_SAFE :", safe);
        console.log("minDelay (sec)  :", minDelay);
        console.log("admin           : address(0) - self-administered");

        // ── Role arrays ───────────────────────────────────────────────────────
        // proposers: [safe]   → safe can schedule operations (also gets CANCELLER_ROLE by OZ)
        // executors: [safe]   → safe can execute matured operations
        // admin    : 0        → no external admin; changes go through timelock itself
        address[] memory proposers = new address[](1);
        proposers[0] = safe;

        address[] memory executors = new address[](1);
        executors[0] = safe;

        // ── Deploy ────────────────────────────────────────────────────────────
        vm.startBroadcast();
        timelock = new TimelockController(minDelay, proposers, executors, address(0));
        vm.stopBroadcast();

        // ── Post-deploy log ───────────────────────────────────────────────────
        console.log("TimelockController:", address(timelock));
        console.log("minDelay confirmed:", timelock.getMinDelay());
        console.log("--- NEXT STEPS ---");
        console.log("1. Deploy vault (Phase 3): forge script .../DeployHearstYieldVault.s.sol");
        console.log("2. Transfer vault ownership: vault.transferOwnership(address(timelock))");
        console.log("3. Verify: any privileged vault call now requires a 48h timelock proposal");
        console.log("4. Mainnet: gated on Spearbit audit (ADR-006) - do NOT broadcast on chain 8453");
    }
}
