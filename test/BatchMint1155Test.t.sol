// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {BatchMint1155} from "../src/BatchMint1155.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

contract MockERC1155Receiver is IERC1155Receiver {
    // Accept single transfers
    function onERC1155Received(
        address, address, uint256, uint256, bytes calldata
    ) external pure returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    // Accept batch transfers
    function onERC1155BatchReceived(
        address, address, uint256[] calldata, uint256[] calldata, bytes calldata
    ) external pure returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    // support interface check for IERC1155Receiver
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId;
    }
}

// Contract WITHOUT receiving logic (used to test revert)
contract NonReceiver {}

contract BatchMint1155Test is Test {
    BatchMint1155 token;
    address owner;

    function setUp() public {
        owner = address(this); // test contract deploys and is owner
        token = new BatchMint1155("https://token-cdn-domain/{id}.json");
    }

    function test_mintAndDistributeSameAmount_works_for_EOAs() public {
        address a = address(0x100);
        address b = address(0x101);

        address[] memory recipients = new address[](2);
        recipients[0] = a;
        recipients[1] = b;

        token.mintAndDistributeSameAmount(recipients, 1);

        assertEq(token.balanceOf(a, 1), 1);
        assertEq(token.balanceOf(b, 1), 1);
    }

    function test_mintAndDistributeSameAmount_fails_if_exceed_max() public {
        // set a low max to force revert
        token.setMaxRecipients(1);

        address[] memory recipients = new address[](2);
        recipients[0] = address(0x1);
        recipients[1] = address(0x2);

        vm.expectRevert(bytes("BatchMint1155: too many recipients"));
        token.mintAndDistributeSameAmount(recipients, 1);
    }

    function test_onlyOwner_can_call_mint() public {
        address attacker = address(0xBEEF);
        address[] memory recipients = new address[](1);
        recipients[0] = address(0x10);

        vm.prank(attacker);
        vm.expectRevert(); // generic revert (OwnableUnauthorizedAccount)
        token.mintAndDistributeSameAmount(recipients, 1);
    }

    function test_variableAmounts_reverts_on_mismatch() public {
        address[] memory recipients = new address[](2);
        recipients[0] = address(0x1);
        recipients[1] = address(0x2);

        // Make amounts length 1 to cause mismatch (recipients len != amounts len)
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1;

        vm.expectRevert(bytes("BatchMint1155: length mismatch"));
        token.mintAndDistributeVariableAmounts(recipients, amounts);
    }

    function test_mint_to_contract_without_receiver_reverts() public {
        NonReceiver bad = new NonReceiver();

        address[] memory recipients = new address[](1);
        recipients[0] = address(bad);

        vm.expectRevert(); // acceptance check will revert (ERC1155InvalidReceiver)
        token.mintAndDistributeSameAmount(recipients, 1);
    }

    function test_mint_to_contract_with_receiver_succeeds() public {
        MockERC1155Receiver good = new MockERC1155Receiver();

        address[] memory recipients = new address[](1);
        recipients[0] = address(good);

        token.mintAndDistributeSameAmount(recipients, 2);

        assertEq(token.balanceOf(address(good), 1), 2);
    }
}
