// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SettlementKernel} from "../../contracts/SettlementKernel.sol";
import {MockERC20} from "./MockERC20.sol";

contract SettlementKernelTest is Test {
    SettlementKernel public kernel;
    MockERC20 public musd;

    address public coordinator = address(0xC001);
    address public debtorA = address(0xAAAA);
    address public creditorB = address(0xBBBB);
    address public creditorC = address(0xCCCC);

    uint256 public constant BASE = 10 ** 18;
    bytes32 public constant CANONICAL_CYCLE_ID = keccak256("canonical-cycle-001");
    bytes32 public constant CANONICAL_COMMITMENT = keccak256("snapshot-commitment-hash");

    function setUp() public {
        musd = new MockERC20("Mezo USD", "MUSD");
        kernel = new SettlementKernel(address(musd));

        // Fund debtor accounts
        musd.mint(debtorA, 1000 * BASE);

        // Approve kernel for token transfers
        vm.prank(debtorA);
        musd.approve(address(kernel), type(uint256).max);
    }

    function _buildCanonicalInput() internal view returns (SettlementKernel.CycleInput memory) {
        address[] memory debtors = new address[](1);
        debtors[0] = debtorA;

        uint256[] memory debitAmounts = new uint256[](1);
        debitAmounts[0] = 80 * BASE;

        address[] memory creditors = new address[](2);
        creditors[0] = creditorB;
        creditors[1] = creditorC;

        uint256[] memory creditAmounts = new uint256[](2);
        creditAmounts[0] = 20 * BASE;
        creditAmounts[1] = 60 * BASE;

        return SettlementKernel.CycleInput({
            cycleId: CANONICAL_CYCLE_ID,
            snapshotCommitment: CANONICAL_COMMITMENT,
            algorithmVersion: "netteo-v1.0-deterministic",
            grossObligationTotal: 200 * BASE,
            debtors: debtors,
            debitAmounts: debitAmounts,
            creditors: creditors,
            creditAmounts: creditAmounts,
            fundingDuration: 72 hours
        });
    }

    function test_CanonicalThreeParticipantSettlement() public {
        SettlementKernel.CycleInput memory input = _buildCanonicalInput();

        vm.prank(coordinator);
        bytes32 cycleId = kernel.createCycle(input);

        assertEq(cycleId, CANONICAL_CYCLE_ID);

        // Verify initial state
        (
            bytes32 commitment,
            ,
            uint256 grossTotal,
            uint256 netTotal,
            uint256 totalFunded,
            uint256 totalDistributed,
            ,
            ,
            SettlementKernel.CycleState state,
            address creator
        ) = kernel.getCycle(CANONICAL_CYCLE_ID);

        assertEq(commitment, CANONICAL_COMMITMENT);
        assertEq(grossTotal, 200 * BASE);
        assertEq(netTotal, 80 * BASE);
        assertEq(totalFunded, 0);
        assertEq(totalDistributed, 0);
        assertEq(uint8(state), uint8(SettlementKernel.CycleState.Funding));
        assertEq(creator, coordinator);

        // Debtor A deposits 80 MUSD
        vm.prank(debtorA);
        kernel.deposit(CANONICAL_CYCLE_ID, 80 * BASE);

        (,,,,, , , , SettlementKernel.CycleState fundedState,) = kernel.getCycle(CANONICAL_CYCLE_ID);
        assertEq(uint8(fundedState), uint8(SettlementKernel.CycleState.ReadyToSettle));
        assertTrue(kernel.isCycleFullyFunded(CANONICAL_CYCLE_ID));

        // Atomic distribution trigger (permissionless, coordinator triggers)
        vm.prank(coordinator);
        kernel.executeSettlement(CANONICAL_CYCLE_ID);

        // Assert terminal state
        (,,,,, uint256 finalDistributed, , , SettlementKernel.CycleState completedState,) = kernel.getCycle(CANONICAL_CYCLE_ID);
        assertEq(uint8(completedState), uint8(SettlementKernel.CycleState.Completed));
        assertEq(finalDistributed, 80 * BASE);

        // Assert creditor payouts received
        assertEq(musd.balanceOf(creditorB), 20 * BASE);
        assertEq(musd.balanceOf(creditorC), 60 * BASE);
        assertEq(musd.balanceOf(address(kernel)), 0);
    }

    function test_RevertIf_ImbalancedNetPositions() public {
        SettlementKernel.CycleInput memory input = _buildCanonicalInput();
        input.creditAmounts[1] = 59 * BASE; // Net credit sum = 79, net debit sum = 80

        vm.expectRevert(
            abi.encodeWithSelector(
                SettlementKernel.ImbalancedNetPositions.selector,
                80 * BASE,
                79 * BASE
            )
        );

        kernel.createCycle(input);
    }

    function test_RevertIf_DebtorIsCreditor() public {
        SettlementKernel.CycleInput memory input = _buildCanonicalInput();
        input.creditors[0] = debtorA; // Same participant as debtor!

        vm.expectRevert(
            abi.encodeWithSelector(
                SettlementKernel.DebtorCannotBeCreditor.selector,
                debtorA
            )
        );

        kernel.createCycle(input);
    }

    function test_RevertIf_ParticipantCapExceeded() public {
        address[] memory debtors = new address[](6);
        uint256[] memory debits = new uint256[](6);
        for (uint160 i = 0; i < 6; i++) {
            debtors[i] = address(0x1000 + i);
            debits[i] = 10 * BASE;
        }

        address[] memory creditors = new address[](5);
        uint256[] memory credits = new uint256[](5);
        for (uint160 j = 0; j < 5; j++) {
            creditors[j] = address(0x2000 + j);
            credits[j] = 12 * BASE;
        }

        SettlementKernel.CycleInput memory input = SettlementKernel.CycleInput({
            cycleId: CANONICAL_CYCLE_ID,
            snapshotCommitment: CANONICAL_COMMITMENT,
            algorithmVersion: "netteo-v1.0",
            grossObligationTotal: 100 * BASE,
            debtors: debtors,
            debitAmounts: debits,
            creditors: creditors,
            creditAmounts: credits,
            fundingDuration: 72 hours
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                SettlementKernel.InvalidParticipantBounds.selector,
                11
            )
        );

        kernel.createCycle(input);
    }

    function test_RevertIf_DepositExceedsRequired() public {
        SettlementKernel.CycleInput memory input = _buildCanonicalInput();
        kernel.createCycle(input);

        vm.prank(debtorA);
        vm.expectRevert(
            abi.encodeWithSelector(
                SettlementKernel.ExcessiveDeposit.selector,
                81 * BASE,
                80 * BASE
            )
        );
        kernel.deposit(CANONICAL_CYCLE_ID, 81 * BASE);
    }

    function test_RefundLifecycleOnExpiry() public {
        SettlementKernel.CycleInput memory input = _buildCanonicalInput();
        kernel.createCycle(input);

        // A deposits partial amount: 50 MUSD
        vm.prank(debtorA);
        kernel.deposit(CANONICAL_CYCLE_ID, 50 * BASE);

        uint256 debtorBalAfterDeposit = musd.balanceOf(debtorA);

        // Fast forward past 72h deadline
        vm.warp(block.timestamp + 73 hours);

        // Cannot deposit after deadline
        vm.prank(debtorA);
        vm.expectRevert();
        kernel.deposit(CANONICAL_CYCLE_ID, 30 * BASE);

        // Cannot execute settlement
        vm.expectRevert();
        kernel.executeSettlement(CANONICAL_CYCLE_ID);

        // Debtor A claims refund
        vm.prank(debtorA);
        kernel.claimRefund(CANONICAL_CYCLE_ID);

        // Assert A received 50 MUSD back
        assertEq(musd.balanceOf(debtorA), debtorBalAfterDeposit + 50 * BASE);

        // Cannot claim refund again
        vm.prank(debtorA);
        vm.expectRevert(
            abi.encodeWithSelector(
                SettlementKernel.NoRefundAvailable.selector,
                CANONICAL_CYCLE_ID,
                debtorA
            )
        );
        kernel.claimRefund(CANONICAL_CYCLE_ID);

        // Cycle state is now Refunded
        (,,,,, , , , SettlementKernel.CycleState state,) = kernel.getCycle(CANONICAL_CYCLE_ID);
        assertEq(uint8(state), uint8(SettlementKernel.CycleState.Refunded));
    }
}
