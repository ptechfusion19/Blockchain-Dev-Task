// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MyGovernor} from "../src/MyGovernor.sol";
import {console2} from "forge-std/console2.sol";
import {Box} from "../src/Box.sol";
import {Timelock} from "../src/Timelock.sol";
import {GovToken} from "../src/GovToken.sol";

contract MyGovernorTest is Test {
    GovToken token;
    Timelock timelock;
    MyGovernor governor;
    Box box;

    uint256 public constant MIN_DELAY = 3600; // 1 hour - after a vote passes, you have 1 hour before you can enact
    uint256 public constant QUORUM_PERCENTAGE = 4; // Need 4% of voters to pass
    uint256 public constant VOTING_PERIOD = 50400; // This is how long voting lasts
    uint256 public constant VOTING_DELAY = 1; // How many blocks till a proposal vote becomes active

    address[] proposers;
    address[] executors;

    bytes[] functionCalls;
    address[] addressesToCall;
    uint256[] values;

    address public constant VOTER = address(1);

    function setUp() public {
        token = new GovToken();
        token.mint(VOTER, 100e18);

        vm.prank(VOTER);
        token.delegate(VOTER);

        timelock = new Timelock(MIN_DELAY, proposers, executors);
        governor = new MyGovernor(token, timelock);

        bytes32 proposerRole = timelock.PROPOSER_ROLE();
        bytes32 executorRole = timelock.EXECUTOR_ROLE();
        bytes32 adminRole = timelock.DEFAULT_ADMIN_ROLE();

        timelock.grantRole(proposerRole, address(governor));
        timelock.grantRole(executorRole, address(0));
        // Revoke admin from this test contract so timelock is controlled by roles only
        timelock.revokeRole(adminRole, address(this));

        box = new Box();
        // transfer ownership of Box to timelock, so governance can execute store()
        box.transferOwnership(address(timelock));
    }

    function testCantUpdateBoxWithoutGovernance() public {
        vm.expectRevert();
        box.store(1);
    }

    function testGovernanceUpdatesBox() public {
        uint256 valueToStore = 777;
        string memory description = "Store 777 in Box";
        bytes memory encodedFunctionCall = abi.encodeWithSignature("store(uint256)", valueToStore);

        // Ensure arrays are fresh (avoid accidental duplicates between tests)
        delete addressesToCall;
        delete values;
        delete functionCalls;

        addressesToCall.push(address(box));
        values.push(0);
        functionCalls.push(encodedFunctionCall);

        // 1. Propose to the DAO
        uint256 proposalId = governor.propose(addressesToCall, values, functionCalls, description);

        console2.log("Proposal State (after propose):", uint256(governor.state(proposalId))); // Pending, 0
        assertEq(uint256(governor.state(proposalId)), 0);

        // Advance to voting start — go one block past the snapshot so the proposal becomes Active
        uint256 snapshot = governor.proposalSnapshot(proposalId);
        console2.log("proposalSnapshot:", snapshot);
        vm.roll(snapshot + 1);
        vm.warp(block.timestamp + 1);

        console2.log("Proposal State (after roll to snapshot+1):", uint256(governor.state(proposalId))); // Active, 1
        assertEq(uint256(governor.state(proposalId)), 1);

        // 2. Vote
        string memory reason = "I like a do da cha cha";
        // 0 = Against, 1 = For, 2 = Abstain for this example
        uint8 voteWay = 1;
        vm.prank(VOTER);
        governor.castVoteWithReason(proposalId, voteWay, reason);

        // Advance to voting end — go one block past the deadline so the proposal becomes Succeeded (if quorum & votes met)
        uint256 deadline = governor.proposalDeadline(proposalId);
        console2.log("proposalDeadline:", deadline);
        vm.roll(deadline + 1);
        vm.warp(block.timestamp + 1);

        console2.log("Proposal State (after roll to deadline+1):", uint256(governor.state(proposalId))); // Succeeded, 4
        assertEq(uint256(governor.state(proposalId)), 4);

        // 3. Queue
        bytes32 descriptionHash = keccak256(abi.encodePacked(description));
        governor.queue(addressesToCall, values, functionCalls, descriptionHash);

        // Advance time and blocks past timelock delay to be able to execute
        vm.roll(block.number + MIN_DELAY + 1);
        vm.warp(block.timestamp + MIN_DELAY + 1);

        console2.log("Proposal State (after waiting timelock):", uint256(governor.state(proposalId))); // Queued, 5
        assertEq(uint256(governor.state(proposalId)), 5);

        // 4. Execute
        governor.execute(addressesToCall, values, functionCalls, descriptionHash);

        console2.log("Proposal State (after execute):", uint256(governor.state(proposalId))); // Executed, 7
        assertEq(uint256(governor.state(proposalId)), 7);
        assert(box.getNumber() == valueToStore);
    }
}
