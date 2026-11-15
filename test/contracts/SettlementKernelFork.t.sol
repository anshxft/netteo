// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SettlementKernel} from "../../contracts/SettlementKernel.sol";

/**
 * @notice Runs the kernel against the REAL deployed Mezo Mainnet token bytecode (to
 * test the exact deployed token behaviour). Skipped unless MEZO_MAINNET_FORK_URL is set, so the
 * default `forge test` never touches the network:
 *
 *   MEZO_MAINNET_FORK_URL=https://mezo-mainnet.boar.network forge test --match-contract Fork -vv
 *
 * Runs on a local fork only; nothing is broadcast to the real chain.
 */
contract SettlementKernelForkTest is Test {
    address internal constant MUSD = 0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186;
    address internal constant MUSDC = 0x04671C72Aab5AC02A03c1098314b1BB6B560c197;
    address internal constant MUSDT = 0xeB5a5d39dE4Ea42C2Aa6A57EcA2894376683bB8E;

    address internal coordinator = makeAddr("coordinator");
    address internal creditorB = makeAddr("creditorB");
    address internal creditorC = makeAddr("creditorC");

    function setUp() public {
        string memory url = vm.envOr("MEZO_MAINNET_FORK_URL", string(""));
        if (bytes(url).length == 0) {
            vm.skip(true);
        }
        vm.createSelectFork(url);
        require(block.chainid == 31612, "Fork is not Mezo Mainnet");
    }

    function _cycle(address debtor, bytes32 id, uint256 debit, uint256 credB, uint256 credC)
        internal
        view
        returns (SettlementKernel.CycleInput memory)
    {
        address[] memory debtors = new address[](1);
        debtors[0] = debtor;
        uint256[] memory debits = new uint256[](1);
        debits[0] = debit;
        address[] memory creditors = new address[](2);
        creditors[0] = creditorB;
        creditors[1] = creditorC;
        uint256[] memory credits = new uint256[](2);
        credits[0] = credB;
        credits[1] = credC;
        return SettlementKernel.CycleInput({
            cycleId: id,
            snapshotCommitment: keccak256("fork-commitment"),
            algorithmVersion: "netteo-v1.0-deterministic",
            grossObligationTotal: debit * 2,
            debtors: debtors,
            debitAmounts: debits,
            creditors: creditors,
            creditAmounts: credits,
            fundingDuration: 72 hours
        });
    }

    /// Full approve -> deposit -> settle round trip with real token code.
    function _roundTrip(address token) internal {
        uint256 unit = 10 ** IERC20Metadata(token).decimals();
        // The canonical example scaled to 1 token: A pays 0.40, B receives 0.10, C receives 0.30.
        uint256 debit = (unit * 4) / 10;
        uint256 credB = unit / 10;
        uint256 credC = (unit * 3) / 10;

        SettlementKernel kernel = new SettlementKernel(token);
        address debtor = makeAddr("debtor");
        deal(token, debtor, debit);
        assertEq(IERC20(token).balanceOf(debtor), debit, "deal() must fund the debtor");

        bytes32 salt = keccak256(abi.encodePacked("fork-roundtrip", token));
        bytes32 id = keccak256(abi.encode(coordinator, salt)); // computed locally: an external call would eat the prank
        vm.prank(coordinator);
        kernel.createCycle(_cycle(debtor, salt, debit, credB, credC));

        vm.startPrank(debtor);
        IERC20(token).approve(address(kernel), debit);
        kernel.deposit(id, debit);
        vm.stopPrank();

        assertTrue(kernel.isCycleFullyFunded(id));
        kernel.executeSettlement(id);

        assertEq(IERC20(token).balanceOf(creditorB), credB, "creditor B payout");
        assertEq(IERC20(token).balanceOf(creditorC), credC, "creditor C payout");
        assertEq(IERC20(token).balanceOf(address(kernel)), 0, "kernel must hold no residual funds");
        assertEq(IERC20(token).balanceOf(debtor), 0, "debtor paid exactly the net amount");
    }

    function test_Fork_RealMUSDRoundTrip() public {
        _roundTrip(MUSD);
    }

    function test_Fork_RealMUSDCRoundTrip() public {
        _roundTrip(MUSDC);
    }

    function test_Fork_RealMUSDTRoundTrip() public {
        _roundTrip(MUSDT);
    }

    /// Refund path against real bytecode: an expired, partly funded cycle returns the exact deposit.
    function _refundRoundTrip(address token) internal {
        uint256 unit = 10 ** IERC20Metadata(token).decimals();
        uint256 debit = (unit * 4) / 10;
        uint256 partial_ = debit / 2;

        SettlementKernel kernel = new SettlementKernel(token);
        address debtor = makeAddr("refundDebtor");
        deal(token, debtor, debit);

        bytes32 salt = keccak256(abi.encodePacked("fork-refund", token));
        bytes32 id = keccak256(abi.encode(coordinator, salt));
        vm.prank(coordinator);
        kernel.createCycle(_cycle(debtor, salt, debit, unit / 10, (unit * 3) / 10));

        vm.startPrank(debtor);
        IERC20(token).approve(address(kernel), partial_);
        kernel.deposit(id, partial_);
        vm.stopPrank();

        vm.warp(block.timestamp + 72 hours + 1);
        vm.prank(debtor);
        kernel.claimRefund(id);

        assertEq(IERC20(token).balanceOf(debtor), debit, "full balance restored");
        assertEq(IERC20(token).balanceOf(address(kernel)), 0);
    }

    function test_Fork_RealMUSDRefund() public {
        _refundRoundTrip(MUSD);
    }

    function test_Fork_RealMUSDCRefund() public {
        _refundRoundTrip(MUSDC);
    }

    function test_Fork_RealMUSDTRefund() public {
        _refundRoundTrip(MUSDT);
    }

    /// The app approves the exact remaining amount. A second non-zero approve on top of a first
    /// reverts on USDT-style tokens, which would break a retry flow; this pins down each real token.
    function _reapproveBehaviour(address token) internal returns (bool ok) {
        address owner = makeAddr("reapprover");
        address spender = makeAddr("spender");
        vm.startPrank(owner);
        IERC20(token).approve(spender, 5);
        (ok,) = token.call(abi.encodeWithSelector(IERC20.approve.selector, spender, 7));
        vm.stopPrank();
    }

    function test_Fork_ReapproveNonZeroToNonZeroBehaviour() public {
        assertTrue(_reapproveBehaviour(MUSD), "MUSD: non-zero -> non-zero approve reverts");
        assertTrue(_reapproveBehaviour(MUSDC), "mUSDC: non-zero -> non-zero approve reverts");
        assertTrue(_reapproveBehaviour(MUSDT), "mUSDT: non-zero -> non-zero approve reverts");
    }

    /// depositWithPermit swallows a failed permit, so prove the permit really succeeded on real
    /// bytecode: the debtor has no prior allowance and the deposit still goes through.
    function _permitRoundTrip(address token) internal {
        uint256 unit = 10 ** IERC20Metadata(token).decimals();
        uint256 debit = (unit * 4) / 10;
        uint256 pk = 0xB0B;
        address debtor = vm.addr(pk);
        deal(token, debtor, debit);

        SettlementKernel kernel = new SettlementKernel(token);
        bytes32 salt = keccak256(abi.encodePacked("fork-permit", token));
        bytes32 id = keccak256(abi.encode(coordinator, salt));
        vm.prank(coordinator);
        kernel.createCycle(_cycle(debtor, salt, debit, unit / 10, (unit * 3) / 10));
        assertEq(IERC20(token).allowance(debtor, address(kernel)), 0, "no prior allowance");

        uint256 nonceBefore = IERC20Permit(token).nonces(debtor);
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                debtor,
                address(kernel),
                debit,
                nonceBefore,
                deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", IERC20Permit(token).DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);

        vm.prank(debtor);
        kernel.depositWithPermit(id, debit, deadline, v, r, s);

        assertEq(IERC20Permit(token).nonces(debtor), nonceBefore + 1, "permit must have consumed the nonce");
        assertTrue(kernel.isCycleFullyFunded(id));
    }

    function test_Fork_RealMUSDPermit() public {
        _permitRoundTrip(MUSD);
    }

    function test_Fork_RealMUSDCPermit() public {
        _permitRoundTrip(MUSDC);
    }

    function test_Fork_RealMUSDTPermit() public {
        _permitRoundTrip(MUSDT);
    }
}
