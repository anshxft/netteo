// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SettlementKernel} from "../contracts/SettlementKernel.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @notice Runs one real three-party settlement cycle (the canonical example) end to end, in one token.
 *
 * The canonical example scaled to 1 token: A owes B 0.50, B owes C 0.40, C owes A 0.10.
 * Net: A pays 0.40, B receives 0.10, C receives 0.30. Gross 1.00, so 3 obligations settle as 2 payouts.
 * Only A signs (DEPLOYER_PRIVATE_KEY). B and C merely receive, so you need just one funded wallet.
 *
 * Required environment:
 *   DEPLOYER_PRIVATE_KEY               key of debtor A (must hold >= 0.40 of the token plus BTC for gas)
 *   ACCEPTANCE_TOKEN                   MUSD | mUSDC | mUSDT
 *   ACCEPTANCE_CREDITOR_B              address that will receive 0.10 (a wallet YOU control)
 *   ACCEPTANCE_CREDITOR_C              address that will receive 0.30 (a wallet YOU control)
 *   NEXT_PUBLIC_SETTLEMENT_KERNEL_<MUSD|MUSDC|MUSDT>   the deployed kernel for that token
 *   CONFIRM_MAINNET_ACCEPTANCE=true    mainnet only: moves real funds, cannot be undone
 *   ACCEPTANCE_PERCENT                 optional, 1 to 100 (default 100). Scales the whole cycle: 80 settles
 *                                      A pays 0.32, B receives 0.08, C receives 0.24 (gross 0.80).
 *
 * There are deliberately NO default creditor addresses: a default would send real funds to an
 * address nobody controls on mainnet.
 *
 * Post-checks run against the script's simulated state, not the live chain. After broadcasting,
 * verify the transaction hashes and balances on the explorer; do not treat this log as the evidence.
 */
contract AcceptanceTest is Script {
    address public constant MAINNET_MUSD = 0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186;
    address public constant MAINNET_MUSDC = 0x04671C72Aab5AC02A03c1098314b1BB6B560c197;
    address public constant MAINNET_MUSDT = 0xeB5a5d39dE4Ea42C2Aa6A57EcA2894376683bB8E;
    address public constant TESTNET_MUSD = 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503;

    struct Plan {
        address token;
        address kernel;
        address debtor;
        address creditorB;
        address creditorC;
        uint256 unit;
        uint256 netDebit;
        uint256 creditB;
        uint256 creditC;
        uint256 gross;
    }

    function run() external returns (bytes32 cycleId) {
        // Check the confirmation first, so the irreversibility guard is the first thing a mainnet run hits.
        if (block.chainid == 31612) {
            require(
                _mainnetConfirmed(),
                "This moves real funds and cannot be undone. Re-run with CONFIRM_MAINNET_ACCEPTANCE=true"
            );
        }

        // 0 means the signer comes from the command line (--account NAME --sender ADDRESS), keeping the key out of env files.
        uint256 key = _deployerKey();
        Plan memory p = _plan(key);

        SettlementKernel kernel = SettlementKernel(p.kernel);
        // The kernel stores keccak256(creator, salt), so the id to deposit into and settle is derived, not the salt.
        bytes32 salt = keccak256(abi.encodePacked("netteo-acceptance-", p.token, p.debtor, block.timestamp));
        cycleId = kernel.computeCycleId(p.debtor, salt);

        uint256 beforeB = IERC20(p.token).balanceOf(p.creditorB);
        uint256 beforeC = IERC20(p.token).balanceOf(p.creditorC);

        console.log("Chain ID:", block.chainid);
        console.log("Token:", p.token);
        console.log("Kernel:", p.kernel);
        console.log("Debtor A:", p.debtor);
        console.log("Creditor B:", p.creditorB);
        console.log("Creditor C:", p.creditorC);
        console.log("Net debit (base units):", p.netDebit);
        console.log("Cycle ID:", vm.toString(cycleId));

        if (key != 0) vm.startBroadcast(key);
        else vm.startBroadcast();
        IERC20(p.token).approve(p.kernel, p.netDebit);
        kernel.createCycle(_input(p, salt));
        kernel.deposit(cycleId, p.netDebit);
        kernel.executeSettlement(cycleId);
        vm.stopBroadcast();

        // Simulated-state checks (see the contract note: not a substitute for explorer verification).
        require(IERC20(p.token).balanceOf(p.creditorB) - beforeB == p.creditB, "Creditor B payout mismatch");
        require(IERC20(p.token).balanceOf(p.creditorC) - beforeC == p.creditC, "Creditor C payout mismatch");
        require(IERC20(p.token).balanceOf(p.kernel) == 0, "Kernel retained funds");
        (,,,,,,,, SettlementKernel.CycleState state,) = kernel.getCycle(cycleId);
        require(state == SettlementKernel.CycleState.Completed, "Cycle not Completed");

        console.log("Simulated run completed. VERIFY the broadcast tx hashes and balances on the explorer.");
    }

    function _plan(uint256 key) internal view virtual returns (Plan memory p) {
        string memory symbol = _tokenSymbol();
        (p.token, p.kernel) = _resolve(symbol);
        require(p.token.code.length > 0, "Token has no code");
        require(p.kernel.code.length > 0, "Kernel has no code (is the kernel env var set?)");
        require(address(SettlementKernel(p.kernel).musdToken()) == p.token, "Kernel is not bound to this token");

        p.debtor = key != 0 ? vm.addr(key) : msg.sender;
        p.creditorB = _creditorB();
        p.creditorC = _creditorC();
        require(p.creditorB != address(0) && p.creditorC != address(0), "Creditor addresses are required");
        require(p.creditorB != p.creditorC, "Creditors must be distinct");
        require(p.creditorB != p.debtor && p.creditorC != p.debtor, "A creditor cannot be the debtor");

        uint256 pct = _percent();
        require(pct >= 1 && pct <= 100, "ACCEPTANCE_PERCENT must be 1 to 100");
        p.unit = 10 ** IERC20Metadata(p.token).decimals();
        p.netDebit = (p.unit * 4 * pct) / 1000; // 0.40 of a token at 100%
        p.creditB = (p.unit * pct) / 1000; // 0.10
        p.creditC = (p.unit * 3 * pct) / 1000; // 0.30
        p.gross = (p.unit * pct) / 100; // 0.50 + 0.40 + 0.10 = 1.00
        require(p.netDebit == p.creditB + p.creditC, "Net positions must balance (amount too small for this token)");
        require(IERC20(p.token).balanceOf(p.debtor) >= p.netDebit, "Debtor A holds less than the net debit");
    }

    function _input(Plan memory p, bytes32 salt) internal pure returns (SettlementKernel.CycleInput memory) {
        address[] memory debtors = new address[](1);
        debtors[0] = p.debtor;
        uint256[] memory debits = new uint256[](1);
        debits[0] = p.netDebit;
        address[] memory creditors = new address[](2);
        creditors[0] = p.creditorB;
        creditors[1] = p.creditorC;
        uint256[] memory credits = new uint256[](2);
        credits[0] = p.creditB;
        credits[1] = p.creditC;
        return SettlementKernel.CycleInput({
            cycleId: salt,
            snapshotCommitment: keccak256(abi.encodePacked("acceptance-commitment-", salt)),
            algorithmVersion: "netteo-v1.0-deterministic",
            grossObligationTotal: p.gross,
            debtors: debtors,
            debitAmounts: debits,
            creditors: creditors,
            creditAmounts: credits,
            fundingDuration: 72 hours
        });
    }

    /// @dev Token and kernel for a symbol on the current chain. Virtual so tests can supply mocks.
    function _resolve(string memory symbol) internal view virtual returns (address token, address kernel) {
        bytes32 h = keccak256(bytes(symbol));
        string memory suffix;
        if (block.chainid == 31612) {
            if (h == keccak256("MUSD")) (token, suffix) = (MAINNET_MUSD, "MUSD");
            else if (h == keccak256("mUSDC")) (token, suffix) = (MAINNET_MUSDC, "MUSDC");
            else if (h == keccak256("mUSDT")) (token, suffix) = (MAINNET_MUSDT, "MUSDT");
            else revert("ACCEPTANCE_TOKEN must be MUSD, mUSDC or mUSDT");
        } else if (block.chainid == 31611) {
            require(h == keccak256("MUSD"), "Only MUSD has a known canonical token on testnet");
            (token, suffix) = (TESTNET_MUSD, "MUSD");
        } else {
            revert("Acceptance runs only on Mezo Mainnet (31612) or Testnet (31611)");
        }
        kernel = vm.envAddress(string.concat("NEXT_PUBLIC_SETTLEMENT_KERNEL_", suffix));
    }

    // Env reads, virtual so tests can inject values (env vars are process-wide and tests run in parallel).
    function _deployerKey() internal view virtual returns (uint256) {
        return vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0));
    }

    function _tokenSymbol() internal view virtual returns (string memory) {
        return vm.envString("ACCEPTANCE_TOKEN");
    }

    function _creditorB() internal view virtual returns (address) {
        return vm.envOr("ACCEPTANCE_CREDITOR_B", address(0));
    }

    function _creditorC() internal view virtual returns (address) {
        return vm.envOr("ACCEPTANCE_CREDITOR_C", address(0));
    }

    function _mainnetConfirmed() internal view virtual returns (bool) {
        return vm.envOr("CONFIRM_MAINNET_ACCEPTANCE", false);
    }

    function _percent() internal view virtual returns (uint256) {
        return vm.envOr("ACCEPTANCE_PERCENT", uint256(100));
    }
}
