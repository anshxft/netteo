// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AcceptanceTest} from "../../script/AcceptanceTest.s.sol";
import {SettlementKernel} from "../../contracts/SettlementKernel.sol";
import {MockERC20Decimals} from "./MockERC20Decimals.sol";

/// Injects every input instead of reading process-wide env vars (which race under parallel tests).
contract AcceptanceHarness is AcceptanceTest {
    uint256 internal _key;
    string internal _symbol;
    address internal _b;
    address internal _c;
    bool internal _confirmed;
    address internal _token;
    address internal _kernel;
    uint256 public percent = 100;

    function setPercent(uint256 value) external {
        percent = value;
    }

    constructor(uint256 key, string memory symbol, address b, address c, bool confirmed, address token, address kernel) {
        _key = key;
        _symbol = symbol;
        _b = b;
        _c = c;
        _confirmed = confirmed;
        _token = token;
        _kernel = kernel;
    }

    function _deployerKey() internal view override returns (uint256) {
        return _key;
    }

    function _tokenSymbol() internal view override returns (string memory) {
        return _symbol;
    }

    function _creditorB() internal view override returns (address) {
        return _b;
    }

    function _creditorC() internal view override returns (address) {
        return _c;
    }

    function _mainnetConfirmed() internal view override returns (bool) {
        return _confirmed;
    }

    function _percent() internal view override returns (uint256) {
        return percent;
    }

    function _resolve(string memory) internal view override returns (address, address) {
        return (_token, _kernel);
    }
}

/// Env-driven variant, to exercise the real chain/symbol resolution rather than the mock one.
contract RealResolveHarness is AcceptanceTest {
    string internal _symbol;

    constructor(string memory symbol) {
        _symbol = symbol;
    }

    function _deployerKey() internal pure override returns (uint256) {
        return 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    }

    function _tokenSymbol() internal view override returns (string memory) {
        return _symbol;
    }

    function _creditorB() internal pure override returns (address) {
        return address(0xB0B);
    }

    function _creditorC() internal pure override returns (address) {
        return address(0xC0C);
    }

    function _mainnetConfirmed() internal pure override returns (bool) {
        return true;
    }
}

contract AcceptanceScriptTest is Test {
    uint256 internal constant KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    address internal debtor;
    address internal creditorB = address(0xB0B);
    address internal creditorC = address(0xC0C);

    function setUp() public {
        debtor = vm.addr(KEY);
        vm.deal(debtor, 10 ether);
    }

    function _setup(uint8 decimals, uint256 debtorBalance)
        internal
        returns (MockERC20Decimals token, SettlementKernel kernel)
    {
        token = new MockERC20Decimals("Token", "TKN", decimals);
        kernel = new SettlementKernel(address(token));
        token.mint(debtor, debtorBalance);
    }

    function _harness(MockERC20Decimals token, SettlementKernel kernel, address b, address c, bool confirmed)
        internal
        returns (AcceptanceHarness)
    {
        return new AcceptanceHarness(KEY, "TKN", b, c, confirmed, address(token), address(kernel));
    }

    function test_SixDecimalAcceptanceCyclePaysExactAmounts() public {
        (MockERC20Decimals token, SettlementKernel kernel) = _setup(6, 1_000_000);
        _harness(token, kernel, creditorB, creditorC, false).run();

        assertEq(token.balanceOf(creditorB), 100_000, "B receives 0.10");
        assertEq(token.balanceOf(creditorC), 300_000, "C receives 0.30");
        assertEq(token.balanceOf(address(kernel)), 0);
        assertEq(token.balanceOf(debtor), 600_000, "A paid exactly 0.40");
    }

    function test_EighteenDecimalAcceptanceCyclePaysExactAmounts() public {
        (MockERC20Decimals token, SettlementKernel kernel) = _setup(18, 1 ether);
        _harness(token, kernel, creditorB, creditorC, false).run();

        assertEq(token.balanceOf(creditorB), 0.1 ether);
        assertEq(token.balanceOf(creditorC), 0.3 ether);
        assertEq(token.balanceOf(address(kernel)), 0);
    }

    function test_ScaledCycleSettlesProportionalAmounts() public {
        (MockERC20Decimals token, SettlementKernel kernel) = _setup(6, 1_000_000);
        AcceptanceHarness h = _harness(token, kernel, creditorB, creditorC, false);
        h.setPercent(80);
        h.run();
        assertEq(token.balanceOf(creditorB), 80_000, "B receives 0.08");
        assertEq(token.balanceOf(creditorC), 240_000, "C receives 0.24");
        assertEq(token.balanceOf(debtor), 1_000_000 - 320_000, "A pays 0.32");
        assertEq(token.balanceOf(address(kernel)), 0);
    }

    function test_RevertIf_PercentOutOfRange() public {
        (MockERC20Decimals token, SettlementKernel kernel) = _setup(6, 1_000_000);
        AcceptanceHarness zero = _harness(token, kernel, creditorB, creditorC, false);
        zero.setPercent(0);
        vm.expectRevert(bytes("ACCEPTANCE_PERCENT must be 1 to 100"));
        zero.run();
        AcceptanceHarness big = _harness(token, kernel, creditorB, creditorC, false);
        big.setPercent(101);
        vm.expectRevert(bytes("ACCEPTANCE_PERCENT must be 1 to 100"));
        big.run();
    }

    function test_RevertIf_MainnetWithoutConfirmation() public {
        (MockERC20Decimals token, SettlementKernel kernel) = _setup(6, 1_000_000);
        AcceptanceHarness h = _harness(token, kernel, creditorB, creditorC, false);
        vm.chainId(31612);
        vm.expectRevert(bytes("This moves real funds and cannot be undone. Re-run with CONFIRM_MAINNET_ACCEPTANCE=true"));
        h.run();
        assertEq(token.balanceOf(creditorB), 0, "nothing may move without confirmation");
    }

    function test_MainnetWithConfirmationProceeds() public {
        (MockERC20Decimals token, SettlementKernel kernel) = _setup(6, 1_000_000);
        AcceptanceHarness h = _harness(token, kernel, creditorB, creditorC, true);
        vm.chainId(31612);
        h.run();
        assertEq(token.balanceOf(creditorB), 100_000);
    }

    function test_RevertIf_CreditorMissing() public {
        (MockERC20Decimals token, SettlementKernel kernel) = _setup(6, 1_000_000);
        AcceptanceHarness h = _harness(token, kernel, address(0), creditorC, false);
        vm.expectRevert(bytes("Creditor addresses are required"));
        h.run();
    }

    function test_RevertIf_CreditorsIdentical() public {
        (MockERC20Decimals token, SettlementKernel kernel) = _setup(6, 1_000_000);
        AcceptanceHarness h = _harness(token, kernel, creditorB, creditorB, false);
        vm.expectRevert(bytes("Creditors must be distinct"));
        h.run();
    }

    function test_RevertIf_CreditorIsTheDebtor() public {
        (MockERC20Decimals token, SettlementKernel kernel) = _setup(6, 1_000_000);
        AcceptanceHarness h = _harness(token, kernel, debtor, creditorC, false);
        vm.expectRevert(bytes("A creditor cannot be the debtor"));
        h.run();
    }

    function test_RevertIf_DebtorUnderfunded() public {
        (MockERC20Decimals token, SettlementKernel kernel) = _setup(6, 399_999); // one unit short of 0.40
        AcceptanceHarness h = _harness(token, kernel, creditorB, creditorC, false);
        vm.expectRevert(bytes("Debtor A holds less than the net debit"));
        h.run();
    }

    function test_RevertIf_KernelBoundToDifferentToken() public {
        (MockERC20Decimals token,) = _setup(6, 1_000_000);
        MockERC20Decimals other = new MockERC20Decimals("Other", "OTH", 6);
        SettlementKernel wrongKernel = new SettlementKernel(address(other));
        AcceptanceHarness h = _harness(token, wrongKernel, creditorB, creditorC, false);
        vm.expectRevert(bytes("Kernel is not bound to this token"));
        h.run();
    }

    function test_RevertIf_UnknownSymbolOnMainnet() public {
        vm.chainId(31612);
        RealResolveHarness h = new RealResolveHarness("WBTC");
        vm.expectRevert(bytes("ACCEPTANCE_TOKEN must be MUSD, mUSDC or mUSDT"));
        h.run();
    }

    function test_RevertIf_UnsupportedChain() public {
        RealResolveHarness h = new RealResolveHarness("MUSD"); // default chain is 31337
        vm.expectRevert(bytes("Acceptance runs only on Mezo Mainnet (31612) or Testnet (31611)"));
        h.run();
    }

    function test_RevertIf_TestnetUsesNonMusdSymbol() public {
        vm.chainId(31611);
        RealResolveHarness h = new RealResolveHarness("mUSDC");
        vm.expectRevert(bytes("Only MUSD has a known canonical token on testnet"));
        h.run();
    }
}
