// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title BatchMint1155
/// @notice Mint the same ERC-1155 token (TOKEN_ID = 1) to multiple recipients in a single transaction.
contract BatchMint1155 is ERC1155, Ownable, ReentrancyGuard {
    uint256 public constant TOKEN_ID = 1;

    uint256 public maxRecipients = 200;

    event BatchMinted(
        address indexed operator, uint256 indexed id, uint256 amountPerRecipient, uint256 recipientsCount
    );

    // <-- FIXED: pass deployer as initial owner for OZ Ownable (v5 style)
    constructor(string memory uri_) ERC1155(uri_) Ownable(msg.sender) {}

    function mintAndDistributeSameAmount(address[] calldata recipients, uint256 amount)
        external
        onlyOwner
        nonReentrant
    {
        uint256 len = recipients.length;
        require(len > 0, "BatchMint1155: no recipients");
        require(amount > 0, "BatchMint1155: amount must be > 0");
        require(len <= maxRecipients, "BatchMint1155: too many recipients");

        for (uint256 i = 0; i < len;) {
            address to = recipients[i];
            require(to != address(0), "BatchMint1155: zero address");

            _mint(to, TOKEN_ID, amount, "");

            unchecked {
                ++i;
            }
        }

        emit BatchMinted(msg.sender, TOKEN_ID, amount, len);
    }

    function mintAndDistributeVariableAmounts(address[] calldata recipients, uint256[] calldata amounts)
        external
        onlyOwner
        nonReentrant
    {
        uint256 len = recipients.length;
        require(len > 0, "BatchMint1155: no recipients");
        require(len == amounts.length, "BatchMint1155: length mismatch");
        require(len <= maxRecipients, "BatchMint1155: too many recipients");

        for (uint256 i = 0; i < len;) {
            address to = recipients[i];
            uint256 amt = amounts[i];
            require(to != address(0), "BatchMint1155: zero address");
            require(amt > 0, "BatchMint1155: amount must be > 0");

            _mint(to, TOKEN_ID, amt, "");

            unchecked {
                ++i;
            }
        }

        emit BatchMinted(msg.sender, TOKEN_ID, 0, len);
    }

    function setMaxRecipients(uint256 newMax) external onlyOwner {
        require(newMax > 0, "BatchMint1155: max must be > 0");
        maxRecipients = newMax;
    }

    function balanceOfToken(address account) external view returns (uint256) {
        return balanceOf(account, TOKEN_ID);
    }
}
