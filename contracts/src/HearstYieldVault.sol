// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title HearstYieldVault
/// @notice Phase 3 (testnet) ERC-4626 share wrapper for the Hearst Yield Vault. Wraps USDC deposits
///         into transferable vault shares. Real yield is generated OFF-CHAIN (mining-backed
///         structured strategy) and is reflected on-chain only when the manager moves USDC in/out
///         of this contract; there is NO on-chain yield logic, NO auto-rebalancing, NO strategy
///         execution and NO cross-chain behaviour here.
/// @dev    Built entirely on audited OpenZeppelin primitives (`ERC4626` + `ERC20` + `Ownable`).
///         Standard `deposit`/`mint`/`withdraw`/`redeem` are inherited unchanged. The only bespoke
///         surface is an owner-configurable, indicative `minDeposit` ticket floor.
///
///         Decimals: the asset (USDC) uses 6 decimals. We apply a `_decimalsOffset()` of 12 so the
///         vault share token reports 18 decimals (6 + 12) and the OpenZeppelin "virtual shares /
///         virtual assets" defence against inflation/donation front-running on an empty vault is
///         meaningful. Conversions stay 1:1 in human terms at genesis (1 USDC -> 1e12 shares).
///
///         Governance posture: a single `Ownable` owner gates the indicative setters. On testnet
///         this is an EOA; for any real deployment the owner is expected to be the manager multisig
///         (Safe 3/5) behind a 48h timelock, mirroring the EventLogger / PoRRegistry posture. The
///         heavier role split (GUARDIAN pause, ORACLE_REPORTER, fee/regime modules) and the
///         withdrawal queue land only after the Spearbit audit — they are intentionally NOT here.
contract HearstYieldVault is ERC4626, Ownable {
    /// @notice Decimal offset between the underlying asset and the vault share token. Share token
    ///         decimals == asset decimals + this value. Chosen to harden the empty-vault inflation
    ///         defence for a 6-decimal asset. Immutable by design.
    uint8 private constant DECIMALS_OFFSET = 12;

    /// @notice Indicative minimum deposit in asset units (USDC, 6 decimals). A deposit/mint whose
    ///         resulting asset inflow is strictly below this floor reverts. This mirrors the $250k
    ///         soft min ticket off-chain; it is a UX guardrail, NOT a legal/compliance control.
    uint256 public minDeposit;

    /// @notice Emitted when the owner updates the indicative minimum deposit.
    /// @param oldMinDeposit Previous floor (asset units, 6 decimals).
    /// @param newMinDeposit New floor (asset units, 6 decimals).
    event MinDepositUpdated(uint256 oldMinDeposit, uint256 newMinDeposit);

    /// @notice Deposit (in asset units) was below the indicative `minDeposit` floor.
    error DepositBelowMinimum(uint256 provided, uint256 required);

    /// @param asset_        The underlying asset (USDC on Base Sepolia — passed in, never hardcoded).
    /// @param name_         ERC-20 name of the vault share token (e.g. "Hearst Yield Vault Share").
    /// @param symbol_       ERC-20 symbol of the vault share token (e.g. "hyvUSDC").
    /// @param owner_        Initial owner (manager multisig in production; EOA on testnet). Non-zero.
    /// @param initialMinDeposit Initial indicative minimum deposit in asset units (6 decimals).
    constructor(
        IERC20 asset_,
        string memory name_,
        string memory symbol_,
        address owner_,
        uint256 initialMinDeposit
    ) ERC4626(asset_) ERC20(name_, symbol_) Ownable(owner_) {
        minDeposit = initialMinDeposit;
        emit MinDepositUpdated(0, initialMinDeposit);
    }

    /// @notice Update the indicative minimum deposit floor. Owner-only.
    /// @param newMinDeposit New floor in asset units (6 decimals). Zero disables the floor.
    function setMinDeposit(uint256 newMinDeposit) external onlyOwner {
        uint256 old = minDeposit;
        minDeposit = newMinDeposit;
        emit MinDepositUpdated(old, newMinDeposit);
    }

    /// @inheritdoc ERC4626
    /// @dev Returns 18 (USDC 6 decimals + 12 offset).
    function decimals() public view virtual override(ERC4626) returns (uint8) {
        return super.decimals();
    }

    /// @inheritdoc ERC4626
    function _decimalsOffset() internal pure virtual override returns (uint8) {
        return DECIMALS_OFFSET;
    }

    /// @dev Single chokepoint for the min-ticket check. Both `deposit` and `mint` route their asset
    ///      inflow through `_deposit`, so enforcing here covers every entry path in one place while
    ///      leaving OpenZeppelin's share math untouched.
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares)
        internal
        virtual
        override
    {
        if (assets < minDeposit) revert DepositBelowMinimum(assets, minDeposit);
        super._deposit(caller, receiver, assets, shares);
    }
}
