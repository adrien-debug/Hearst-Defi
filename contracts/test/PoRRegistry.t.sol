// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PoRRegistry} from "../src/PoRRegistry.sol";

contract PoRRegistryTest is Test {
    PoRRegistry internal registry;

    address internal publisher = makeAddr("publisher");
    address internal stranger = makeAddr("stranger");

    event AttestationPublished(
        uint256 indexed attestationId,
        uint64 indexed period,
        address indexed attestor,
        uint256 totalAumUsd,
        uint256 minedBtcSats,
        bytes32 evidenceHash,
        string evidenceCid
    );

    function setUp() public {
        registry = new PoRRegistry(publisher);
    }

    /* ------------------------------- constructor ------------------------------ */

    function test_constructor_storesPublisher() public view {
        assertEq(registry.publisher(), publisher);
        assertEq(registry.lastAttestationId(), 0);
    }

    function test_constructor_revertsOnZeroPublisher() public {
        vm.expectRevert(PoRRegistry.InvalidPublisher.selector);
        new PoRRegistry(address(0));
    }

    /* --------------------------------- auth ---------------------------------- */

    function test_publish_revertsIfNotPublisher() public {
        vm.prank(stranger);
        vm.expectRevert(PoRRegistry.NotAuthorizedPublisher.selector);
        registry.publish(202_605, 1_000_000e6, 100_000_000, bytes32("ev"), "cid");
    }

    /* --------------------------------- happy --------------------------------- */

    function test_publish_storesAttestationAndPeriodMap() public {
        uint64 period = 202_605;
        uint256 aum = 5_000_000e6; // 5M USD with 6 decimals
        uint256 sats = 250_000_000; // 2.5 BTC
        bytes32 evHash = keccak256("evidence.pdf");
        string memory cid = "bafyPoR1";

        vm.warp(1_700_000_000);
        vm.expectEmit(true, true, true, true, address(registry));
        emit AttestationPublished(1, period, publisher, aum, sats, evHash, cid);

        vm.prank(publisher);
        uint256 id = registry.publish(period, aum, sats, evHash, cid);

        assertEq(id, 1);
        assertEq(registry.lastAttestationId(), 1);
        assertEq(registry.attestationIdByPeriod(period), 1);

        (uint64 ts, uint256 aumStored, uint256 satsStored, bytes32 evStored, string memory cidStored, address attestor)
        = registry.attestations(1);
        assertEq(ts, uint64(block.timestamp));
        assertEq(aumStored, aum);
        assertEq(satsStored, sats);
        assertEq(evStored, evHash);
        assertEq(cidStored, cid);
        assertEq(attestor, publisher);
    }

    function test_publish_revertsIfPeriodAlreadyAttested() public {
        uint64 period = 202_605;
        vm.startPrank(publisher);
        registry.publish(period, 1, 1, bytes32("a"), "cidA");
        vm.expectRevert(PoRRegistry.PeriodAlreadyAttested.selector);
        registry.publish(period, 2, 2, bytes32("b"), "cidB");
        vm.stopPrank();
    }

    function test_publish_revertsOnZeroPeriod() public {
        vm.prank(publisher);
        vm.expectRevert(PoRRegistry.InvalidPeriod.selector);
        registry.publish(0, 1, 1, bytes32("a"), "cid");
    }

    function test_publish_multiplePeriodsIncrementId() public {
        vm.startPrank(publisher);
        uint256 id1 = registry.publish(202_604, 1, 1, bytes32("a"), "cidA");
        uint256 id2 = registry.publish(202_605, 2, 2, bytes32("b"), "cidB");
        uint256 id3 = registry.publish(202_606, 3, 3, bytes32("c"), "cidC");
        vm.stopPrank();

        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(id3, 3);
        assertEq(registry.lastAttestationId(), 3);
        assertEq(registry.attestationIdByPeriod(202_604), 1);
        assertEq(registry.attestationIdByPeriod(202_605), 2);
        assertEq(registry.attestationIdByPeriod(202_606), 3);
    }

    function test_getAttestationByPeriod_returnsZeroIfAbsent() public view {
        PoRRegistry.Attestation memory att = registry.getAttestationByPeriod(199_001);
        assertEq(att.timestamp, 0);
        assertEq(att.totalAumUsd, 0);
        assertEq(att.minedBtcSats, 0);
        assertEq(att.evidenceHash, bytes32(0));
        assertEq(att.attestor, address(0));
        assertEq(bytes(att.evidenceCid).length, 0);
    }

    function test_getAttestationByPeriod_returnsStored() public {
        vm.prank(publisher);
        registry.publish(202_607, 42e6, 7, bytes32("hash"), "cidZ");

        PoRRegistry.Attestation memory att = registry.getAttestationByPeriod(202_607);
        assertEq(att.totalAumUsd, 42e6);
        assertEq(att.minedBtcSats, 7);
        assertEq(att.evidenceHash, bytes32("hash"));
        assertEq(att.evidenceCid, "cidZ");
        assertEq(att.attestor, publisher);
    }

    /* ----------------------------- edge inputs ------------------------------- */

    function test_publish_acceptsZeroAumAndZeroSats() public {
        // Zero AUM / zero mined sats is a valid degenerate case (e.g. a frozen-period attestation
        // documenting that no mining output was attributed). The contract intentionally does not
        // ban it — only `period == 0` is banned.
        vm.prank(publisher);
        uint256 id = registry.publish(202_605, 0, 0, bytes32("ev"), "cidZero");
        assertEq(id, 1);

        PoRRegistry.Attestation memory att = registry.getAttestationByPeriod(202_605);
        assertEq(att.totalAumUsd, 0);
        assertEq(att.minedBtcSats, 0);
        assertEq(att.evidenceHash, bytes32("ev"));
    }

    function test_publish_acceptsEmptyCid() public {
        // An attestation may legitimately reference an evidence pinned via a different scheme.
        vm.prank(publisher);
        registry.publish(202_605, 1, 1, bytes32("h"), "");

        PoRRegistry.Attestation memory att = registry.getAttestationByPeriod(202_605);
        assertEq(bytes(att.evidenceCid).length, 0);
    }

    function test_getAttestationByPeriod_zeroPeriodReturnsEmpty() public view {
        // Sanity check: period 0 is unreachable because `publish` rejects it; the getter must
        // therefore always return the zero struct for it.
        PoRRegistry.Attestation memory att = registry.getAttestationByPeriod(0);
        assertEq(att.timestamp, 0);
        assertEq(att.attestor, address(0));
    }

    function test_publish_recordsBlockTimestamp() public {
        vm.warp(2_000_000_000);
        vm.prank(publisher);
        registry.publish(202_605, 1, 1, bytes32("h"), "cid");

        PoRRegistry.Attestation memory att = registry.getAttestationByPeriod(202_605);
        assertEq(att.timestamp, uint64(2_000_000_000));
    }

    function test_publish_duplicateRejectionPreservesFirstAttestation() public {
        vm.startPrank(publisher);
        registry.publish(202_605, 100, 200, bytes32("first"), "cidFirst");

        vm.expectRevert(PoRRegistry.PeriodAlreadyAttested.selector);
        registry.publish(202_605, 999, 999, bytes32("second"), "cidSecond");
        vm.stopPrank();

        // First attestation must remain untouched.
        PoRRegistry.Attestation memory att = registry.getAttestationByPeriod(202_605);
        assertEq(att.totalAumUsd, 100);
        assertEq(att.minedBtcSats, 200);
        assertEq(att.evidenceHash, bytes32("first"));
        assertEq(att.evidenceCid, "cidFirst");
        assertEq(registry.lastAttestationId(), 1);
    }

    /* --------------------------------- fuzz ---------------------------------- */

    function testFuzz_publish_onlyPublisher(address caller) public {
        vm.assume(caller != publisher);
        vm.prank(caller);
        vm.expectRevert(PoRRegistry.NotAuthorizedPublisher.selector);
        registry.publish(202_605, 1, 1, bytes32(0), "");
    }

    function testFuzz_publish_recordsAnyValues(
        uint64 period,
        uint256 aum,
        uint256 sats,
        bytes32 evHash
    ) public {
        vm.assume(period != 0);
        vm.prank(publisher);
        uint256 id = registry.publish(period, aum, sats, evHash, "cid");

        assertEq(id, 1);
        assertEq(registry.attestationIdByPeriod(period), 1);

        PoRRegistry.Attestation memory att = registry.getAttestationByPeriod(period);
        assertEq(att.totalAumUsd, aum);
        assertEq(att.minedBtcSats, sats);
        assertEq(att.evidenceHash, evHash);
    }
}
