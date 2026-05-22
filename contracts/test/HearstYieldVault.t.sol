// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {HearstYieldVault} from "../src/HearstYieldVault.sol";

/// @dev Minimal 6-decimal mock standing in for USDC on Base Sepolia.
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract HearstYieldVaultTest is Test {
    MockUSDC internal usdc;
    HearstYieldVault internal vault;

    address internal owner = makeAddr("owner");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant ONE_USDC = 1e6;
    uint256 internal constant MIN_DEPOSIT = 100 * ONE_USDC; // 100 USDC indicative floor

    event MinDepositUpdated(uint256 oldMinDeposit, uint256 newMinDeposit);

    function setUp() public {
        usdc = new MockUSDC();
        vault = new HearstYieldVault(IERC20(address(usdc)), "Hearst Yield Vault Share", "hyvUSDC", owner, MIN_DEPOSIT);

        usdc.mint(alice, 1_000_000 * ONE_USDC);
        usdc.mint(bob, 1_000_000 * ONE_USDC);

        vm.prank(alice);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(vault), type(uint256).max);
    }

    /* ------------------------------- constructor ------------------------------ */

    function test_constructor_wiring() public view {
        assertEq(vault.asset(), address(usdc));
        assertEq(vault.owner(), owner);
        assertEq(vault.minDeposit(), MIN_DEPOSIT);
        assertEq(vault.name(), "Hearst Yield Vault Share");
        assertEq(vault.symbol(), "hyvUSDC");
        assertEq(vault.totalAssets(), 0);
        assertEq(vault.totalSupply(), 0);
    }

    /* -------------------------------- decimals -------------------------------- */

    function test_decimals_offsetGivesEighteen() public view {
        // 6 (USDC) + 12 (offset) = 18.
        assertEq(vault.decimals(), 18);
    }

    function test_genesisConversion_oneUsdcMapsToOffset() public view {
        // On an empty vault, 1 USDC converts to 1e12 shares (10 ** offset) thanks to virtual shares.
        assertEq(vault.convertToShares(ONE_USDC), ONE_USDC * 1e12);
        assertEq(vault.convertToAssets(ONE_USDC * 1e12), ONE_USDC);
    }

    /* -------------------------------- deposit --------------------------------- */

    function test_deposit_mintsSharesAndPullsAssets() public {
        uint256 amount = 1_000 * ONE_USDC;

        vm.prank(alice);
        uint256 shares = vault.deposit(amount, alice);

        assertEq(vault.balanceOf(alice), shares);
        assertEq(vault.totalAssets(), amount);
        assertEq(usdc.balanceOf(address(vault)), amount);
        assertEq(shares, amount * 1e12);
    }

    function test_deposit_revertsBelowMinimum() public {
        uint256 amount = MIN_DEPOSIT - 1;
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(HearstYieldVault.DepositBelowMinimum.selector, amount, MIN_DEPOSIT));
        vault.deposit(amount, alice);
    }

    function test_deposit_exactlyMinimumSucceeds() public {
        vm.prank(alice);
        uint256 shares = vault.deposit(MIN_DEPOSIT, alice);
        assertGt(shares, 0);
        assertEq(vault.totalAssets(), MIN_DEPOSIT);
    }

    /* ---------------------------------- mint ---------------------------------- */

    function test_mint_alsoEnforcesMinimum() public {
        // Mint a share amount whose required assets fall below the floor -> revert.
        uint256 tinyShares = (MIN_DEPOSIT - 1) * 1e12;
        uint256 requiredAssets = vault.previewMint(tinyShares);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(HearstYieldVault.DepositBelowMinimum.selector, requiredAssets, MIN_DEPOSIT)
        );
        vault.mint(tinyShares, alice);
    }

    function test_mint_aboveMinimumSucceeds() public {
        uint256 shares = 1_000 * ONE_USDC * 1e12;
        vm.prank(alice);
        uint256 assets = vault.mint(shares, alice);
        assertEq(vault.balanceOf(alice), shares);
        assertEq(vault.totalAssets(), assets);
    }

    /* ------------------------------- round-trip ------------------------------- */

    function test_roundTrip_depositThenRedeem() public {
        uint256 amount = 5_000 * ONE_USDC;

        vm.prank(alice);
        uint256 shares = vault.deposit(amount, alice);

        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        uint256 assetsOut = vault.redeem(shares, alice, alice);

        assertEq(assetsOut, amount);
        assertEq(usdc.balanceOf(alice), balBefore + amount);
        assertEq(vault.balanceOf(alice), 0);
        assertEq(vault.totalSupply(), 0);
    }

    function test_roundTrip_depositThenWithdraw() public {
        uint256 amount = 5_000 * ONE_USDC;

        vm.prank(alice);
        vault.deposit(amount, alice);

        vm.prank(alice);
        uint256 sharesBurned = vault.withdraw(amount, alice, alice);

        assertEq(vault.balanceOf(alice), 0);
        assertEq(sharesBurned, amount * 1e12);
        assertEq(usdc.balanceOf(address(vault)), 0);
    }

    /* ------------------------- yield reflected via balance -------------------- */

    function test_offChainYield_increasesShareValue() public {
        uint256 amount = 1_000 * ONE_USDC;
        vm.prank(alice);
        uint256 shares = vault.deposit(amount, alice);

        // Manager pushes 100 USDC of off-chain-earned yield into the vault (simple transfer).
        uint256 yield = 100 * ONE_USDC;
        usdc.mint(address(this), yield);
        usdc.transfer(address(vault), yield);

        assertEq(vault.totalAssets(), amount + yield);
        // Alice's shares are now worth more assets than she put in. OZ rounds down by the virtual
        // offset (1 wei tolerance) so we assert a strict increase plus near-equality to the target.
        uint256 redeemable = vault.convertToAssets(shares);
        assertGt(redeemable, amount);
        assertApproxEqAbs(redeemable, amount + yield, 1);
    }

    /* --------------------------------- access --------------------------------- */

    function test_setMinDeposit_ownerSucceedsAndEmits() public {
        uint256 newMin = 250 * ONE_USDC;
        vm.expectEmit(false, false, false, true, address(vault));
        emit MinDepositUpdated(MIN_DEPOSIT, newMin);
        vm.prank(owner);
        vault.setMinDeposit(newMin);
        assertEq(vault.minDeposit(), newMin);
    }

    function test_setMinDeposit_revertsForNonOwner() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        vault.setMinDeposit(1);
    }

    function test_setMinDeposit_zeroDisablesFloor() public {
        vm.prank(owner);
        vault.setMinDeposit(0);
        vm.prank(alice);
        uint256 shares = vault.deposit(1, alice); // 1 wei of USDC now allowed
        assertGt(shares, 0);
    }

    /* ---------------------------------- fuzz ---------------------------------- */

    function testFuzz_convertRoundTrip(uint256 assets) public view {
        assets = bound(assets, 1, 1e18);
        uint256 shares = vault.convertToShares(assets);
        uint256 back = vault.convertToAssets(shares);
        // Round-trip never inflates assets (rounding is in the vault's favour).
        assertLe(back, assets);
    }

    function testFuzz_depositRedeem_neverYieldsMoreThanDeposited(uint256 amount) public {
        amount = bound(amount, MIN_DEPOSIT, 500_000 * ONE_USDC);

        vm.prank(alice);
        uint256 shares = vault.deposit(amount, alice);

        vm.prank(alice);
        uint256 assetsOut = vault.redeem(shares, alice, alice);

        // A lone depositor can never extract more than they put in (no free value).
        assertLe(assetsOut, amount);
        // And with no other actors / no yield, they get essentially all of it back.
        assertEq(assetsOut, amount);
    }

    function testFuzz_setMinDeposit_onlyOwner(address caller, uint256 newMin) public {
        vm.assume(caller != owner);
        vm.prank(caller);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, caller));
        vault.setMinDeposit(newMin);
    }

    function testFuzz_depositBelowMinAlwaysReverts(uint256 amount) public {
        amount = bound(amount, 1, MIN_DEPOSIT - 1);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(HearstYieldVault.DepositBelowMinimum.selector, amount, MIN_DEPOSIT));
        vault.deposit(amount, alice);
    }
}
