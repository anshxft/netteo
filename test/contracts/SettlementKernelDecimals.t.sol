// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SettlementKernel} from "../../contracts/SettlementKernel.sol";
import {SettlementKernelFactory} from "../../contracts/SettlementKernelFactory.sol";
import {MockERC20Decimals} from "./MockERC20Decimals.sol";

/**
 * @notice Exercises the kernel with 6-decimal tokens (mUSDC, mUSDT) alongside 18-decimal MUSD.
 * The kernel is decimals-agnostic by construction (it only moves integers), and these tests
 * pin that down so a future change cannot quietly assume 18 decimals.
 */
contract SettlementKernelDecimalsTest is Test {
    SettlementKernelFactory public factory;
    MockERC20Decimals public musd; // 18 decimals
    MockERC20Decimals public musdc; // 6 decimals
    SettlementKernel public musdKernel;
    SettlementKernel public musdcKernel;

    address public coordinator = address(0xC001);
    address public debtorA = address(0xAAAA);
    address public creditorB = address(0xBBBB);
    address public creditorC = address(0xCCCC);

    uint256 public constant USDC = 10 ** 6; // 1 mUSDC in base units
    bytes32 public constant SALT = keccak256("decimals-cycle-001");
    bytes32 public constant COMMITMENT = keccak256("decimals-commitment");

    function setUp() public {
        musd = new MockERC20Decimals("Mezo USD", "MUSD", 18);
        musdc = new MockERC20Decimals("Bridged USDC", "mUSDC", 6);

        factory = new SettlementKernelFactory(address(0));
        musdKernel = SettlementKernel(factory.createKernel(address(musd)));
        musdcKernel = SettlementKernel(factory.createKernel(address(musdc)));

        musdc.mint(debtorA, 1000 * USDC);
        vm.prank(debtorA);
        musdc.approve(address(musdcKernel), type(uint256).max);
    }

    /// The id the contract stores for `coordinator`'s cycle with SALT (the same on every kernel). Computed locally:
    /// an external call here would consume a pending vm.prank while a call's arguments are evaluated.
    function _cid() internal view returns (bytes32) {
        return keccak256(abi.encode(coordinator, SALT));
    }

    function _input(bytes32 cycleId, uint256 debit, uint256 creditB, uint256 creditC)
        internal
        view
        returns (SettlementKernel.CycleInput memory)
    {
        address[] memory debtors = new address[](1);
        debtors[0] = debtorA;
        uint256[] memory debitAmounts = new uint256[](1);
        debitAmounts[0] = debit;

        address[] memory creditors = new address[](2);
        creditors[0] = creditorB;
        creditors[1] = creditorC;
        uint256[] memory creditAmounts = new uint256[](2);
        creditAmounts[0] = creditB;
        creditAmounts[1] = creditC;

        return SettlementKernel.CycleInput({
            cycleId: cycleId,
            snapshotCommitment: COMMITMENT,
            algorithmVersion: "netteo-v1.0-deterministic",
            grossObligationTotal: debit * 2,
            debtors: debtors,
            debitAmounts: debitAmounts,
            creditors: creditors,
            creditAmounts: creditAmounts,
            fundingDuration: 72 hours
        });
    }

    function test_FactoryBindsEachKernelToItsOwnToken() public view {
        assertEq(address(musdKernel.musdToken()), address(musd));
        assertEq(address(musdcKernel.musdToken()), address(musdc));
        assertEq(MockERC20Decimals(address(musdKernel.musdToken())).decimals(), 18);
        assertEq(MockERC20Decimals(address(musdcKernel.musdToken())).decimals(), 6);
    }

    /// The netteo PRD example, at 6 decimals: A owes B 0.50, B owes C 0.40, C owes A 0.10
    /// => A pays 0.40, B receives 0.10, C receives 0.30 (gross 1.00).
    function test_SixDecimalSettlementPaysExactAmounts() public {
        uint256 debit = 400_000; // 0.40 mUSDC
        vm.prank(coordinator);
        musdcKernel.createCycle(_input(SALT, debit, 100_000, 300_000));

        vm.prank(debtorA);
        musdcKernel.deposit(_cid(), debit);
        assertTrue(musdcKernel.isCycleFullyFunded(_cid()));

        musdcKernel.executeSettlement(_cid());

        assertEq(musdc.balanceOf(creditorB), 100_000);
        assertEq(musdc.balanceOf(creditorC), 300_000);
        assertEq(musdc.balanceOf(address(musdcKernel)), 0, "kernel must hold no residual funds");
        assertEq(musdc.balanceOf(debtorA), 1000 * USDC - debit);
    }

    /// One base unit (0.000001 mUSDC) must settle exactly, with no rounding anywhere.
    function test_SmallestUnitSettlesExactly() public {
        vm.prank(coordinator);
        musdcKernel.createCycle(_input(SALT, 2, 1, 1));

        vm.prank(debtorA);
        musdcKernel.deposit(_cid(), 2);
        musdcKernel.executeSettlement(_cid());

        assertEq(musdc.balanceOf(creditorB), 1);
        assertEq(musdc.balanceOf(creditorC), 1);
        assertEq(musdc.balanceOf(address(musdcKernel)), 0);
    }

    /// The 18-decimal quantity for the same 0.4 would be 10^12 times larger. Depositing it into
    /// the 6-decimal kernel must be refused, not silently accepted.
    function test_RevertIf_EighteenDecimalAmountDepositedIntoSixDecimalCycle() public {
        uint256 debit = 400_000;
        vm.prank(coordinator);
        musdcKernel.createCycle(_input(SALT, debit, 100_000, 300_000));

        uint256 inflated = 0.4 ether; // 4e17, what an 18-decimal assumption would produce
        vm.prank(debtorA);
        vm.expectRevert(abi.encodeWithSelector(SettlementKernel.ExcessiveDeposit.selector, inflated, debit));
        musdcKernel.deposit(_cid(), inflated);
    }

    function test_SixDecimalRefundAfterExpiryReturnsExactAmount() public {
        uint256 debit = 400_000;
        vm.prank(coordinator);
        // Two debtors would be needed to leave a cycle partially funded; use one debtor depositing part.
        musdcKernel.createCycle(_input(SALT, debit, 100_000, 300_000));

        vm.prank(debtorA);
        musdcKernel.deposit(_cid(), 150_000);

        vm.warp(block.timestamp + 72 hours + 1);
        vm.prank(debtorA);
        musdcKernel.claimRefund(_cid());

        assertEq(musdc.balanceOf(debtorA), 1000 * USDC, "full balance restored");
        assertEq(musdc.balanceOf(address(musdcKernel)), 0);
    }

    /// The same cycleId on two kernels is two independent cycles; funding one never funds the other.
    function test_SameCycleIdOnDifferentKernelsIsIsolated() public {
        musd.mint(debtorA, 1000 ether);
        vm.prank(debtorA);
        musd.approve(address(musdKernel), type(uint256).max);

        vm.startPrank(coordinator);
        musdKernel.createCycle(_input(SALT, 0.4 ether, 0.1 ether, 0.3 ether));
        musdcKernel.createCycle(_input(SALT, 400_000, 100_000, 300_000));
        vm.stopPrank();

        vm.prank(debtorA);
        musdcKernel.deposit(_cid(), 400_000);

        assertTrue(musdcKernel.isCycleFullyFunded(_cid()));
        assertFalse(musdKernel.isCycleFullyFunded(_cid()), "mUSDC funding must not fund the MUSD cycle");
        assertEq(musd.balanceOf(address(musdKernel)), 0);

        // Settling the funded kernel leaves the other cycle untouched and still unfunded.
        musdcKernel.executeSettlement(_cid());
        (,,,, uint256 funded,,,,,) = musdKernel.getCycle(_cid());
        assertEq(funded, 0);
    }

    /// Permit signatures are token-domain-bound: a signature for the mUSDC domain works there.
    function test_DepositWithPermitOnSixDecimalToken() public {
        uint256 signerPk = 0xB0B;
        address permitDebtor = vm.addr(signerPk);
        musdc.mint(permitDebtor, 100 * USDC);

        address[] memory debtors = new address[](1);
        debtors[0] = permitDebtor;
        uint256[] memory debits = new uint256[](1);
        debits[0] = 50 * USDC;
        address[] memory creditors = new address[](1);
        creditors[0] = creditorB;
        uint256[] memory credits = new uint256[](1);
        credits[0] = 50 * USDC;

        bytes32 salt = keccak256("permit-6dec");
        bytes32 cycleId = keccak256(abi.encode(coordinator, salt));
        vm.prank(coordinator);
        musdcKernel.createCycle(
            SettlementKernel.CycleInput({
                cycleId: salt,
                snapshotCommitment: COMMITMENT,
                algorithmVersion: "netteo-v1.0-deterministic",
                grossObligationTotal: 100 * USDC,
                debtors: debtors,
                debitAmounts: debits,
                creditors: creditors,
                creditAmounts: credits,
                fundingDuration: 72 hours
            })
        );

        assertEq(musdc.allowance(permitDebtor, address(musdcKernel)), 0);

        uint256 deadline = block.timestamp + 1 hours;
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                permitDebtor,
                address(musdcKernel),
                50 * USDC,
                musdc.nonces(permitDebtor),
                deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", musdc.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);

        vm.prank(permitDebtor);
        musdcKernel.depositWithPermit(cycleId, 50 * USDC, deadline, v, r, s);

        assertTrue(musdcKernel.isCycleFullyFunded(cycleId));
        musdcKernel.executeSettlement(cycleId);
        assertEq(musdc.balanceOf(creditorB), 50 * USDC);
    }

    /// For any 6-decimal split, settlement pays creditors exactly and leaves the kernel at zero.
    function testFuzz_SixDecimalConservation(uint64 creditBRaw, uint64 creditCRaw) public {
        uint256 creditB = bound(uint256(creditBRaw), 1, 1_000_000 * USDC);
        uint256 creditC = bound(uint256(creditCRaw), 1, 1_000_000 * USDC);
        uint256 debit = creditB + creditC;

        musdc.mint(debtorA, debit);
        vm.prank(coordinator);
        musdcKernel.createCycle(_input(SALT, debit, creditB, creditC));

        uint256 debtorBefore = musdc.balanceOf(debtorA);
        vm.prank(debtorA);
        musdcKernel.deposit(_cid(), debit);
        musdcKernel.executeSettlement(_cid());

        assertEq(musdc.balanceOf(creditorB), creditB);
        assertEq(musdc.balanceOf(creditorC), creditC);
        assertEq(musdc.balanceOf(address(musdcKernel)), 0);
        assertEq(musdc.balanceOf(debtorA), debtorBefore - debit);
    }
}
