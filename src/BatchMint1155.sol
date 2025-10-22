//SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import { ERC1155 } from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import { Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title BatchMint1155
/// @dev ERC-1155 token with owner-only batch minting to multiple addresses
contract BatchMint1155 is ERC1155, Ownable { 
    uint256 public constant TOKEN_ID = 1;

    /// @param uri_ Base URI for metadata (use {id} substitution)
    constructor (string memory uri_) Ownable(msg.sender) ERC1155(uri_) {

    }

    /// @notice Mint token ID `id` (amount 1) to each address in `to[]`
    /// @dev Only callable by the owner. Uses _mint (emits TransferSingle for each).
    function mintBatch(address[] calldata to, uint256 id) external onlyOwner {
        require(to.length > 0, "BatchMint1155: empty address list");
        for (uint256 i = 0; i < to.length; i++) {
            _mint(to[i], id, 1, "");
        }
    }
}

