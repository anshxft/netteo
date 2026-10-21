// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SettlementKernel} from "../contracts/SettlementKernel.sol";
import {MockMUSD} from "../contracts/MockMUSD.sol";

contract Deploy is Script {
    address public constant CANONICAL_MEZO_TESTNET_MUSD = 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503;

    function run() external returns (address musdAddress, address kernelAddress) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        // 1. Resolve MUSD Token address
        address envMusd = vm.envOr("NEXT_PUBLIC_MUSD_ADDRESS", address(0));

        if (block.chainid == 31611) {
            // On Mezo Testnet, default to canonical MUSD
            musdAddress = (envMusd != address(0)) ? envMusd : CANONICAL_MEZO_TESTNET_MUSD;
            console.log("Mezo Testnet deployment: Using MUSD token at:", musdAddress);
            if (musdAddress == CANONICAL_MEZO_TESTNET_MUSD) {
                console.log("[VERIFIED] Using official canonical Mezo Testnet MUSD token.");
            } else {
                console.log("[WARNING] Deploying with non-canonical MUSD token override:", musdAddress);
            }
        } else if (envMusd != address(0)) {
            musdAddress = envMusd;
            console.log("Using specified MUSD token at:", musdAddress);
        } else {
            // Local dev / test fork fallback only
            vm.startBroadcast(deployerPrivateKey);
            MockMUSD mock = new MockMUSD();
            vm.stopBroadcast();
            musdAddress = address(mock);
            console.log("Deployed MockMUSD token for local testing at:", musdAddress);
        }

        vm.startBroadcast(deployerPrivateKey);

        // 2. Deploy SettlementKernel
        SettlementKernel kernel = new SettlementKernel(musdAddress);
        kernelAddress = address(kernel);
        console.log("Deployed SettlementKernel at:", kernelAddress);

        vm.stopBroadcast();

        console.log("-----------------------------------------");
        console.log("Add these addresses to your .env.local file:");
        console.log("NEXT_PUBLIC_MUSD_ADDRESS=", musdAddress);
        console.log("NEXT_PUBLIC_SETTLEMENT_KERNEL_ADDRESS=", kernelAddress);
        console.log("-----------------------------------------");
    }
}
