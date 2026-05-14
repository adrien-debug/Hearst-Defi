// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {EventLogger} from "../src/EventLogger.sol";
import {PoRRegistry} from "../src/PoRRegistry.sol";

/// @title DeployBaseSepolia
/// @notice Deploys EventLogger + PoRRegistry to Base Sepolia. Phase 2 only — never run against
///         mainnet. The audited ERC-4626 vault (Phase 3) ships its own deploy script.
/// @dev    Requires env var `HEARST_PUBLISHER` set to the manager multisig address.
contract DeployBaseSepolia is Script {
    function run() external returns (EventLogger eventLogger, PoRRegistry porRegistry) {
        address publisher = vm.envAddress("HEARST_PUBLISHER");
        require(publisher != address(0), "HEARST_PUBLISHER unset");

        vm.startBroadcast();
        eventLogger = new EventLogger(publisher);
        porRegistry = new PoRRegistry(publisher);
        vm.stopBroadcast();

        console.log("EventLogger:", address(eventLogger));
        console.log("PoRRegistry:", address(porRegistry));
        console.log("Publisher:  ", publisher);
    }
}
