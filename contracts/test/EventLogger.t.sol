// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {EventLogger} from "../src/EventLogger.sol";

contract EventLoggerTest is Test {
    EventLogger internal logger;

    address internal publisher = makeAddr("publisher");
    address internal stranger = makeAddr("stranger");

    // Mirror the contract event so we can expect it.
    event HearstEvent(
        uint256 indexed eventId,
        EventLogger.EventKind indexed kind,
        bytes32 indexed contextHash,
        address publisher,
        uint64 timestamp,
        string payloadCid
    );

    function setUp() public {
        logger = new EventLogger(publisher);
    }

    /* ------------------------------- constructor ------------------------------ */

    function test_constructor_storesPublisher() public view {
        assertEq(logger.publisher(), publisher);
        assertEq(logger.lastEventId(), 0);
    }

    function test_constructor_revertsOnZeroPublisher() public {
        vm.expectRevert(EventLogger.InvalidPublisher.selector);
        new EventLogger(address(0));
    }

    /* --------------------------------- auth ---------------------------------- */

    function test_logEvent_revertsIfNotPublisher() public {
        vm.prank(stranger);
        vm.expectRevert(EventLogger.NotAuthorizedPublisher.selector);
        logger.logEvent(EventLogger.EventKind.Rebalance, bytes32("ctx"), "cid");
    }

    /* --------------------------------- happy --------------------------------- */

    function test_logEvent_incrementsIdAndEmits() public {
        bytes32 ctx = keccak256("payload-1");
        string memory cid = "bafy1";

        vm.warp(1_700_000_000);
        vm.expectEmit(true, true, true, true, address(logger));
        emit HearstEvent(1, EventLogger.EventKind.Rebalance, ctx, publisher, uint64(block.timestamp), cid);

        vm.prank(publisher);
        uint256 id = logger.logEvent(EventLogger.EventKind.Rebalance, ctx, cid);

        assertEq(id, 1);
        assertEq(logger.lastEventId(), 1);
    }

    function test_logEvent_multipleIncrementsCorrectly() public {
        vm.startPrank(publisher);
        uint256 id1 = logger.logEvent(EventLogger.EventKind.Rebalance, bytes32("a"), "cidA");
        uint256 id2 = logger.logEvent(EventLogger.EventKind.Distribution, bytes32("b"), "cidB");
        uint256 id3 = logger.logEvent(EventLogger.EventKind.ModeChange, bytes32("c"), "cidC");
        vm.stopPrank();

        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(id3, 3);
        assertEq(logger.lastEventId(), 3);
    }

    function test_logEvent_acceptsAllEventKinds() public {
        EventLogger.EventKind[6] memory kinds = [
            EventLogger.EventKind.Rebalance,
            EventLogger.EventKind.Distribution,
            EventLogger.EventKind.ModeChange,
            EventLogger.EventKind.GuardrailBreach,
            EventLogger.EventKind.TriggerArmed,
            EventLogger.EventKind.AttestationPublished
        ];

        vm.startPrank(publisher);
        for (uint256 i = 0; i < kinds.length; i++) {
            uint256 id = logger.logEvent(kinds[i], bytes32(uint256(i + 1)), "cid");
            assertEq(id, i + 1);
        }
        vm.stopPrank();
        assertEq(logger.lastEventId(), kinds.length);
    }

    /* ----------------------------- edge inputs ------------------------------- */

    function test_logEvent_acceptsEmptyCid() public {
        bytes32 ctx = keccak256("payload-empty-cid");
        vm.warp(1_700_000_000);
        vm.expectEmit(true, true, true, true, address(logger));
        emit HearstEvent(1, EventLogger.EventKind.Rebalance, ctx, publisher, uint64(block.timestamp), "");

        vm.prank(publisher);
        uint256 id = logger.logEvent(EventLogger.EventKind.Rebalance, ctx, "");
        assertEq(id, 1);
    }

    function test_logEvent_acceptsZeroContextHash() public {
        // contextHash == 0 is a legitimate (if degenerate) call; nothing in the contract bans it.
        vm.expectEmit(true, true, true, true, address(logger));
        emit HearstEvent(
            1, EventLogger.EventKind.GuardrailBreach, bytes32(0), publisher, uint64(block.timestamp), "cidZero"
        );

        vm.prank(publisher);
        uint256 id = logger.logEvent(EventLogger.EventKind.GuardrailBreach, bytes32(0), "cidZero");
        assertEq(id, 1);
    }

    function test_logEvent_acceptsLongCid() public {
        // Realistic CID v1 base32 is ~59 chars. We use a longer-than-realistic value to ensure
        // the dynamic string payload is handled without truncation.
        string memory longCid =
            "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi-extra-padding-to-stress-encoding-xxxxxxxxxxxxxxxx";
        bytes32 ctx = keccak256(bytes(longCid));

        vm.expectEmit(true, true, true, true, address(logger));
        emit HearstEvent(
            1, EventLogger.EventKind.AttestationPublished, ctx, publisher, uint64(block.timestamp), longCid
        );

        vm.prank(publisher);
        uint256 id = logger.logEvent(EventLogger.EventKind.AttestationPublished, ctx, longCid);
        assertEq(id, 1);
    }

    function test_logEvent_recordsBlockTimestamp() public {
        vm.warp(2_000_000_000);
        vm.prank(publisher);

        // We can't read the timestamp back from storage (events only), but we can
        // assert via expectEmit that the emitted timestamp matches block.timestamp at call time.
        vm.expectEmit(true, true, true, true, address(logger));
        emit HearstEvent(
            1, EventLogger.EventKind.TriggerArmed, bytes32("ts"), publisher, uint64(2_000_000_000), "cidTs"
        );
        logger.logEvent(EventLogger.EventKind.TriggerArmed, bytes32("ts"), "cidTs");
    }

    /* --------------------------------- fuzz ---------------------------------- */

    function testFuzz_logEvent_onlyPublisher(address caller) public {
        vm.assume(caller != publisher);
        vm.prank(caller);
        vm.expectRevert(EventLogger.NotAuthorizedPublisher.selector);
        logger.logEvent(EventLogger.EventKind.Rebalance, bytes32(0), "");
    }

    function testFuzz_logEvent_recordsAnyContextHash(bytes32 ctx, uint8 kindRaw) public {
        EventLogger.EventKind kind = EventLogger.EventKind(uint8(bound(kindRaw, 0, 5)));
        vm.prank(publisher);
        uint256 id = logger.logEvent(kind, ctx, "cid");
        assertEq(id, 1);
        assertEq(logger.lastEventId(), 1);
    }
}
