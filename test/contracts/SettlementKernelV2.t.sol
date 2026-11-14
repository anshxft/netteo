// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SettlementKernel} from "../../contracts/SettlementKernel.sol";
import {MockERC20Decimals} from "./MockERC20Decimals.sol";

/// A token that can refuse to pay one address, like a token with a blocklist or a frozen account.
contract BlockableToken is MockERC20Decimals {
    mapping(address => bool) public blocked;

    constructor() MockERC20Decimals("Blockable", "BLK", 6) {}

    function setBlocked(address account, bool isBlocked) external {
        blocked[account] = isBlocked;
    }

    function _update(address from, address to, uint256 value) internal override {
        require(!blocked[to], "recipient blocked");
        super._update(from, to, value);
    }
}

/// A token that can switch on a 1% transfer fee, like USDT's dormant fee switch.
contract FeeToken is MockERC20Decimals {
    bool public feeOn;

    constructor() MockERC20Decimals("Fee", "FEE", 6) {}

    function setFee(bool on) external {
        feeOn = on;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (feeOn && from != address(0) && to != address(0)) {
            uint256 fee = value / 100;
            super._update(from, address(0xdead), fee);
            super._update(from, to, value - fee);
        } else {
            super._update(from, to, value);
        }
    }
}

/// Tests for the v2 hardening: refund out of a funded cycle, fee-on-transfer rejection, creator-bound cycle ids.
contract SettlementKernelV2Test is Test {
    address internal creator = address(0xC001);
    address internal debtorA = address(0xAAAA);
    address internal debtorB = address(0xAAAB);
    address internal creditor = address(0xBBBB);
    bytes32 internal constant SALT = keccak256("v2-salt");

    // --- helpers ---

    function _input(bytes32 salt, address[] memory debtors, uint256[] memory debits, uint256 credit)
        internal
        pure
        returns (SettlementKernel.CycleInput memory)
    {
        address[] memory creditors = new address[](1);
        creditors[0] = address(0xBBBB);
        uint256[] memory credits = new uint256[](1);
        credits[0] = credit;
        return SettlementKernel.CycleInput(salt, keccak256("c"), "v", credit * 2, debtors, debits, creditors, credits, 72 hours);
    }

    function _single(uint256 amount) internal pure returns (address[] memory d, uint256[] memory a) {
        d = new address[](1);
        d[0] = address(0xAAAA);
        a = new uint256[](1);
        a[0] = amount;
    }

    function _id(address who, bytes32 salt) internal pure returns (bytes32) {
        // Local on purpose: an external call here would consume a pending vm.prank.
        return keccak256(abi.encode(who, salt));
    }

    function _fundedBlockableCycle()
        internal
        returns (BlockableToken token, SettlementKernel kernel, bytes32 id, uint256 deadline)
    {
        token = new BlockableToken();
        kernel = new SettlementKernel(address(token));
        token.mint(debtorA, 100e6);
        vm.prank(debtorA);
        token.approve(address(kernel), type(uint256).max);

        (address[] memory d, uint256[] memory a) = _single(100e6);
        vm.prank(creator);
        id = kernel.createCycle(_input(SALT, d, a, 100e6));
        (,,,,,,, deadline,,) = kernel.getCycle(id);

        vm.prank(debtorA);
        kernel.deposit(id, 100e6); // fully funded: ReadyToSettle
    }

    // --- cycle ids bind the creator (finding 5) ---

    function test_CycleIdMatchesLocalFormula() public {
        SettlementKernel kernel = new SettlementKernel(address(new MockERC20Decimals("T", "T", 6)));
        assertEq(kernel.computeCycleId(creator, SALT), keccak256(abi.encode(creator, SALT)));
        assertTrue(kernel.computeCycleId(creator, SALT) != kernel.computeCycleId(address(0xBAD), SALT));
    }

    function test_AttackerCannotSquatAnotherCreatorsCycleId() public {
        MockERC20Decimals token = new MockERC20Decimals("T", "T", 6);
        SettlementKernel kernel = new SettlementKernel(address(token));
        (address[] memory d, uint256[] memory a) = _single(50e6);

        // The attacker sees the victim's salt in the mempool and creates a cycle with it first.
        address attacker = address(0xBAD);
        vm.prank(attacker);
        bytes32 attackerId = kernel.createCycle(_input(SALT, d, a, 50e6));

        // The victim's own cycle with the same salt still gets created, under a different id.
        vm.prank(creator);
        bytes32 victimId = kernel.createCycle(_input(SALT, d, a, 50e6));

        assertEq(victimId, _id(creator, SALT));
        assertEq(attackerId, _id(attacker, SALT));
        assertTrue(victimId != attackerId, "ids must differ");
        (,,,,,,,,, address recordedCreator) = kernel.getCycle(victimId);
        assertEq(recordedCreator, creator, "the victim's cycle is the victim's");
    }

    function test_CreatorCannotCreateTheSameCycleTwice() public {
        MockERC20Decimals token = new MockERC20Decimals("T", "T", 6);
        SettlementKernel kernel = new SettlementKernel(address(token));
        (address[] memory d, uint256[] memory a) = _single(50e6);

        vm.startPrank(creator);
        bytes32 id = kernel.createCycle(_input(SALT, d, a, 50e6));
        vm.expectRevert(abi.encodeWithSelector(SettlementKernel.CycleAlreadyExists.selector, id));
        kernel.createCycle(_input(SALT, d, a, 50e6));
        vm.stopPrank();
    }

    // --- a funded cycle is no longer stuck (finding 3) ---

    function test_FundedCycleThatCannotPayOutRefundsAfterGrace() public {
        (BlockableToken token, SettlementKernel kernel, bytes32 id, uint256 deadline) = _fundedBlockableCycle();
        token.setBlocked(creditor, true); // the payout can no longer succeed

        vm.expectRevert();
        kernel.executeSettlement(id);

        // Inside the grace window refunds stay closed, so a slow keeper can still settle.
        uint256 opensAt = deadline + kernel.REFUND_GRACE();
        vm.warp(opensAt);
        vm.prank(debtorA);
        vm.expectRevert(abi.encodeWithSelector(SettlementKernel.RefundNotYetOpen.selector, id, opensAt, opensAt));
        kernel.claimRefund(id);

        // One second later the deposit comes back.
        vm.warp(opensAt + 1);
        vm.prank(debtorA);
        kernel.claimRefund(id);

        assertEq(token.balanceOf(debtorA), 100e6, "the full deposit is returned");
        assertEq(token.balanceOf(address(kernel)), 0, "nothing is left in the kernel");
        (,,,,,,,, SettlementKernel.CycleState state,) = kernel.getCycle(id);
        assertEq(uint8(state), uint8(SettlementKernel.CycleState.Refunded));
    }

    /// The property that makes the fix safe: once a refund has started the cycle can never ALSO pay out,
    /// even if the blocked creditor is unblocked afterwards.
    function test_SettlementIsImpossibleOnceRefundsHaveStarted() public {
        (BlockableToken token, SettlementKernel kernel, bytes32 id, uint256 deadline) = _fundedBlockableCycle();
        token.setBlocked(creditor, true);
        vm.warp(deadline + kernel.REFUND_GRACE() + 1);

        vm.prank(debtorA);
        kernel.claimRefund(id);

        token.setBlocked(creditor, false); // the creditor can now receive again
        vm.expectRevert();
        kernel.executeSettlement(id);
        assertEq(token.balanceOf(creditor), 0, "no payout after a refund");
        assertEq(token.balanceOf(debtorA), 100e6);
    }

    /// The double-payout case. With two debtors the first refund leaves the cycle Expired while totalFunded still
    /// equals netDebtTotal. A guard that only asked "is it fully funded?" would then let the creditor be paid in
    /// full, and the second debtor's refund would find the kernel empty.
    function test_PartialRefundsCannotBeFollowedByAPayout() public {
        BlockableToken token = new BlockableToken();
        SettlementKernel kernel = new SettlementKernel(address(token));
        token.mint(debtorA, 60e6);
        token.mint(debtorB, 40e6);
        vm.prank(debtorA);
        token.approve(address(kernel), type(uint256).max);
        vm.prank(debtorB);
        token.approve(address(kernel), type(uint256).max);

        address[] memory d = new address[](2);
        d[0] = debtorA;
        d[1] = debtorB;
        uint256[] memory a = new uint256[](2);
        a[0] = 60e6;
        a[1] = 40e6;
        vm.prank(creator);
        bytes32 id = kernel.createCycle(_input(SALT, d, a, 100e6));
        (,,,,,,, uint256 deadline,,) = kernel.getCycle(id);

        vm.prank(debtorA);
        kernel.deposit(id, 60e6);
        vm.prank(debtorB);
        kernel.deposit(id, 40e6);

        // A kernel holds money for many cycles at once. Another, unrelated cycle has 100 deposited in the same
        // kernel. Without a strict guard, paying this cycle out would be taken from THAT cycle's funds.
        address debtorC = address(0xAAAC);
        token.mint(debtorC, 100e6);
        vm.prank(debtorC);
        token.approve(address(kernel), type(uint256).max);
        address[] memory otherDebtors = new address[](1);
        otherDebtors[0] = debtorC;
        uint256[] memory otherAmounts = new uint256[](1);
        otherAmounts[0] = 100e6;
        vm.prank(creator);
        bytes32 otherId = kernel.createCycle(_input(keccak256("other-cycle"), otherDebtors, otherAmounts, 100e6));
        vm.prank(debtorC);
        kernel.deposit(otherId, 100e6);

        token.setBlocked(creditor, true);

        vm.warp(deadline + kernel.REFUND_GRACE() + 1);
        vm.prank(debtorA);
        kernel.claimRefund(id); // Expired, but debtor B has not claimed yet

        (,,,, uint256 funded,,,, SettlementKernel.CycleState state,) = kernel.getCycle(id);
        assertEq(uint8(state), uint8(SettlementKernel.CycleState.Expired));
        assertEq(funded, 100e6, "still booked as fully funded");

        token.setBlocked(creditor, false);
        vm.expectRevert();
        kernel.executeSettlement(id); // must not pay out

        assertEq(token.balanceOf(creditor), 0, "creditor must not be paid");
        vm.prank(debtorB);
        kernel.claimRefund(id); // and the second debtor still gets everything back
        assertEq(token.balanceOf(debtorB), 40e6);
        assertEq(token.balanceOf(address(kernel)), 100e6, "the other cycle's deposit is untouched");
    }

    function test_AllDebtorsCanRefundAFundedCycle() public {
        BlockableToken token = new BlockableToken();
        SettlementKernel kernel = new SettlementKernel(address(token));
        token.mint(debtorA, 60e6);
        token.mint(debtorB, 40e6);
        vm.prank(debtorA);
        token.approve(address(kernel), type(uint256).max);
        vm.prank(debtorB);
        token.approve(address(kernel), type(uint256).max);

        address[] memory d = new address[](2);
        d[0] = debtorA;
        d[1] = debtorB;
        uint256[] memory a = new uint256[](2);
        a[0] = 60e6;
        a[1] = 40e6;
        vm.prank(creator);
        bytes32 id = kernel.createCycle(_input(SALT, d, a, 100e6));
        (,,,,,,, uint256 deadline,,) = kernel.getCycle(id);

        vm.prank(debtorA);
        kernel.deposit(id, 60e6);
        vm.prank(debtorB);
        kernel.deposit(id, 40e6);
        token.setBlocked(creditor, true);

        vm.warp(deadline + kernel.REFUND_GRACE() + 1);
        vm.prank(debtorA);
        kernel.claimRefund(id); // moves ReadyToSettle -> Expired
        vm.prank(debtorB);
        kernel.claimRefund(id); // the second debtor still gets theirs

        assertEq(token.balanceOf(debtorA), 60e6);
        assertEq(token.balanceOf(debtorB), 40e6);
        assertEq(token.balanceOf(address(kernel)), 0);
        (,,,,,,,, SettlementKernel.CycleState state,) = kernel.getCycle(id);
        assertEq(uint8(state), uint8(SettlementKernel.CycleState.Refunded));
    }

    /// Liveness is preserved: a funded cycle can still settle after the deadline, until the grace runs out.
    function test_FundedCycleStillSettlesAfterDeadlineWithinGrace() public {
        (BlockableToken token, SettlementKernel kernel, bytes32 id, uint256 deadline) = _fundedBlockableCycle();
        vm.warp(deadline + kernel.REFUND_GRACE()); // last second of the grace window
        kernel.executeSettlement(id);
        assertEq(token.balanceOf(creditor), 100e6);
        (,,,,,,,, SettlementKernel.CycleState state,) = kernel.getCycle(id);
        assertEq(uint8(state), uint8(SettlementKernel.CycleState.Completed));
    }

    function testFuzz_RefundOpensExactlyAfterGrace(uint256 offset) public {
        (, SettlementKernel kernel, bytes32 id, uint256 deadline) = _fundedBlockableCycle();
        uint256 opensAt = deadline + kernel.REFUND_GRACE();
        offset = bound(offset, 0, 30 days);

        vm.warp(deadline + offset);
        vm.prank(debtorA);
        if (deadline + offset <= opensAt) {
            vm.expectRevert();
            kernel.claimRefund(id);
        } else {
            kernel.claimRefund(id);
            (,,,,,,,, SettlementKernel.CycleState state,) = kernel.getCycle(id);
            assertEq(uint8(state), uint8(SettlementKernel.CycleState.Refunded));
        }
    }

    // --- fee-on-transfer tokens are rejected (finding 4) ---

    function test_DepositRevertsIfTokenTakesAFee() public {
        FeeToken token = new FeeToken();
        SettlementKernel kernel = new SettlementKernel(address(token));
        token.mint(debtorA, 100e6);
        vm.prank(debtorA);
        token.approve(address(kernel), type(uint256).max);

        (address[] memory d, uint256[] memory a) = _single(100e6);
        vm.prank(creator);
        bytes32 id = kernel.createCycle(_input(SALT, d, a, 100e6));

        token.setFee(true); // the token owner switches a 1% fee on after the cycle was created

        vm.prank(debtorA);
        vm.expectRevert(abi.encodeWithSelector(SettlementKernel.UnexpectedTransferAmount.selector, 100e6, 99e6));
        kernel.deposit(id, 100e6);

        // The revert undid everything: nothing is booked and the kernel holds nothing.
        (,,,, uint256 funded,,,,,) = kernel.getCycle(id);
        assertEq(funded, 0, "nothing may be booked");
        assertEq(token.balanceOf(address(kernel)), 0);
        assertEq(token.balanceOf(debtorA), 100e6);
        (uint256 required, uint256 debtorFunded,) = kernel.getDebtorStatus(id, debtorA);
        assertEq(required, 100e6);
        assertEq(debtorFunded, 0);

        // With the fee off again the same deposit goes through.
        token.setFee(false);
        vm.prank(debtorA);
        kernel.deposit(id, 100e6);
        assertTrue(kernel.isCycleFullyFunded(id));
    }

    function test_DepositWithPermitAlsoRejectsAFee() public {
        FeeToken token = new FeeToken();
        SettlementKernel kernel = new SettlementKernel(address(token));
        uint256 pk = 0xB0B;
        address signer = vm.addr(pk);
        token.mint(signer, 100e6);

        address[] memory d = new address[](1);
        d[0] = signer;
        uint256[] memory a = new uint256[](1);
        a[0] = 100e6;
        vm.prank(creator);
        bytes32 id = kernel.createCycle(_input(SALT, d, a, 100e6));
        token.setFee(true);

        uint256 deadline = block.timestamp + 1 hours;
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                signer,
                address(kernel),
                100e6,
                token.nonces(signer),
                deadline
            )
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, keccak256(abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash)));

        vm.prank(signer);
        vm.expectRevert(abi.encodeWithSelector(SettlementKernel.UnexpectedTransferAmount.selector, 100e6, 99e6));
        kernel.depositWithPermit(id, 100e6, deadline, v, r, s);
    }
}
