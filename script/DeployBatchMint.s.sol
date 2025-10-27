// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Script} from "forge-std/Script.sol";
import {BatchMint1155} from "../src/BatchMint1155.sol";

contract DeployBatchMint is Script {
    function run() external {
        // Provide URI here (or pass via environment or CLI override)
        string memory uri = "https://token-cdn-domain/{id}.json";

        vm.startBroadcast();
        new BatchMint1155(uri);
        // Example: set a custom max recipients (optional)
        // token.setMaxRecipients(500);
        vm.stopBroadcast();
    }
}
