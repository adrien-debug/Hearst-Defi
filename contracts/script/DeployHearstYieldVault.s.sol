// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {HearstYieldVault} from "../src/HearstYieldVault.sol";

/// @title DeployHearstYieldVault
/// @notice Deploys the Phase 3 ERC-4626 Hearst Yield Vault to Base Sepolia (TESTNET ONLY). Never run
///         against mainnet. Phase 2 contracts (EventLogger / PoRRegistry) ship their own script.
/// @dev    Required env vars:
///           - DEPLOYER_PRIVATE_KEY : uint256 private key used to broadcast.
///           - VAULT_ASSET          : address of the underlying USDC token. On Base Sepolia this is
///                                    0x036CbD53842c5426634e7929541eC2318f3dCF7e (Circle test USDC).
///           - VAULT_OWNER          : initial owner (manager multisig in prod; EOA on testnet).
///           - VAULT_MIN_DEPOSIT    : indicative minimum deposit in asset units (USDC, 6 decimals).
///         Run WITHOUT --broadcast first to simulate. Broadcasting is a deliberate operator action.
contract DeployHearstYieldVault is Script {
    function run() external returns (HearstYieldVault vault) {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address asset = vm.envAddress("VAULT_ASSET");
        address owner = vm.envAddress("VAULT_OWNER");
        uint256 minDeposit = vm.envUint("VAULT_MIN_DEPOSIT");

        require(asset != address(0), "VAULT_ASSET unset");
        require(owner != address(0), "VAULT_OWNER unset");

        vm.startBroadcast(deployerKey);
        vault = new HearstYieldVault(IERC20(asset), "Hearst Yield Vault Share", "hyvUSDC", owner, minDeposit);
        vm.stopBroadcast();

        console.log("HearstYieldVault:", address(vault));
        console.log("Asset (USDC):    ", asset);
        console.log("Owner:           ", owner);
        console.log("Min deposit:     ", minDeposit);
    }
}
