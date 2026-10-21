// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SettlementKernel} from "../contracts/SettlementKernel.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AcceptanceTest is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address musdAddress = vm.envAddress("NEXT_PUBLIC_MUSD_ADDRESS");
        address kernelAddress = vm.envAddress("NEXT_PUBLIC_SETTLEMENT_KERNEL_ADDRESS");

        IERC20 musd = IERC20(musdAddress);
        SettlementKernel kernel = SettlementKernel(kernelAddress);

        address debtorA = vm.addr(deployerKey);
        address creditorB = address(0x000000000000000000000000000000000000B001);
        address creditorC = address(0x000000000000000000000000000000000000c002);

        uint256 BASE = 10 ** 18;
        uint256 netDebitA = 80 * BASE;
        uint256 netCreditB = 20 * BASE;
        uint256 netCreditC = 60 * BASE;
        uint256 grossTotal = 200 * BASE;

        bytes32 cycleId = keccak256(abi.encodePacked("canonical-acceptance-cycle-", block.timestamp));
        bytes32 snapshotCommitment = keccak256(abi.encodePacked("acceptance-commitment-hash-", block.timestamp));

        console.log("=== Starting Live Mezo Testnet Acceptance Test ===");
        console.log("Debtor A (Deployer):", debtorA);
        console.log("Creditor B:", creditorB);
        console.log("Creditor C:", creditorC);
        console.log("Cycle ID:", vm.toString(cycleId));

        vm.startBroadcast(deployerKey);

        // 1. Approve token spending
        musd.approve(kernelAddress, netDebitA);
        console.log("Step 1: Approved 80 MUSD allowance to SettlementKernel");

        // 2. Prepare Cycle Input
        address[] memory debtors = new address[](1);
        debtors[0] = debtorA;

        uint256[] memory debitAmounts = new uint256[](1);
        debitAmounts[0] = netDebitA;

        address[] memory creditors = new address[](2);
        creditors[0] = creditorB;
        creditors[1] = creditorC;

        uint256[] memory creditAmounts = new uint256[](2);
        creditAmounts[0] = netCreditB;
        creditAmounts[1] = netCreditC;

        SettlementKernel.CycleInput memory input = SettlementKernel.CycleInput({
            cycleId: cycleId,
            snapshotCommitment: snapshotCommitment,
            algorithmVersion: "netteo-v1.0-deterministic",
            grossObligationTotal: grossTotal,
            debtors: debtors,
            debitAmounts: debitAmounts,
            creditors: creditors,
            creditAmounts: creditAmounts,
            fundingDuration: 72 hours
        });

        // 3. Create Cycle
        kernel.createCycle(input);
        console.log("Step 2: Cycle created on-chain in Funding state");

        // 4. Deposit net debtor funds
        kernel.deposit(cycleId, netDebitA);
        console.log("Step 3: Debtor A deposited 80 MUSD (Cycle is now 100% funded and ReadyToSettle)");

        // 5. Execute settlement
        kernel.executeSettlement(cycleId);
        console.log("Step 4: Settlement executed! Transferred 20 MUSD to Creditor B, 60 MUSD to Creditor C");

        vm.stopBroadcast();

        // 6. Verify balances and state
        uint256 balanceB = musd.balanceOf(creditorB);
        uint256 balanceC = musd.balanceOf(creditorC);

        console.log("=== Verification Results ===");
        console.log("Creditor B final MUSD balance:", balanceB / BASE);
        console.log("Creditor C final MUSD balance:", balanceC / BASE);
        require(balanceB == netCreditB, "Creditor B balance mismatch");
        require(balanceC == netCreditC, "Creditor C balance mismatch");

        (,,,,,,,,SettlementKernel.CycleState state,) = kernel.getCycle(cycleId);
        console.log("Cycle final state (3 = Completed):", uint256(state));
        require(state == SettlementKernel.CycleState.Completed, "Cycle not in Completed state");

        console.log("SUCCESS! All on-chain invariants verified on Mezo Testnet.");
    }
}
