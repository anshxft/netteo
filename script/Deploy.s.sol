// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SettlementKernel} from "../contracts/SettlementKernel.sol";
import {MockMUSD} from "../contracts/MockMUSD.sol";

contract Deploy is Script {
    function run() external returns (address musdAddress, address kernelAddress) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Check or deploy MUSD
        address envMusd = vm.envOr("NEXT_PUBLIC_MUSD_ADDRESS", address(0));
        if (envMusd != address(0)) {
            musdAddress = envMusd;
            console.log("Using existing MUSD token at:", musdAddress);
        } else {
            MockMUSD mock = new MockMUSD();
            musdAddress = address(mock);
            console.log("Deployed MockMUSD token at:", musdAddress);
        }

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
