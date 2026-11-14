// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SettlementKernel} from "../contracts/SettlementKernel.sol";
import {SettlementKernelFactory} from "../contracts/SettlementKernelFactory.sol";
import {MockERC20Decimals} from "../test/contracts/MockERC20Decimals.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @notice Deploys SettlementKernelFactory and one SettlementKernel per supported settlement token.
 *
 * Mezo Mainnet (31612): canonical MUSD, mUSDC, mUSDT. Each token's code, decimals and symbol are
 *   verified on-chain BEFORE anything is broadcast, and the script refuses to run without
 *   CONFIRM_MAINNET_DEPLOY=true because a deployment is irreversible.
 * Mezo Testnet (31611): canonical testnet MUSD only (no other canonical testnet tokens are known).
 * Local Anvil (31337): 18/6/6-decimal mocks, so the 6-decimal code path is exercised offline.
 *
 * Token addresses and decimals below were read from chain 31612 via eth_call and are re-checked
 * at runtime; a mismatch aborts the deployment.
 */
contract Deploy is Script {
    // --- Mezo Mainnet (31612) ---
    address public constant MAINNET_MUSD = 0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186;
    address public constant MAINNET_MUSDC = 0x04671C72Aab5AC02A03c1098314b1BB6B560c197;
    address public constant MAINNET_MUSDT = 0xeB5a5d39dE4Ea42C2Aa6A57EcA2894376683bB8E;

    // --- Mezo Testnet (31611) ---
    address public constant TESTNET_MUSD = 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503;

    struct TokenSpec {
        string symbol;
        address token;
        uint8 decimals;
    }

    function run() external returns (address factoryAddress, address[] memory kernelAddresses) {
        // Key from the environment, or 0 when signing with a Foundry keystore (--account NAME --sender ADDRESS), which
        // keeps the private key out of plain-text env files.
        uint256 deployerKey = _deployerKey();
        address deployer = deployerKey != 0 ? vm.addr(deployerKey) : msg.sender;

        if (block.chainid == 31612) {
            require(_mainnetConfirmed(), "Mainnet deployment is irreversible. Re-run with CONFIRM_MAINNET_DEPLOY=true");
        }

        TokenSpec[] memory specs = _specsForChain(deployerKey);

        // Verify every token BEFORE broadcasting so a wrong address never costs gas.
        for (uint256 i = 0; i < specs.length; i++) {
            _verifyToken(specs[i]);
        }

        // Gas on Mezo is paid in BTC; a zero balance would fail mid-deployment and strand a half-built set.
        require(deployer.balance > 0, "Deployer has no native BTC for gas");

        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);

        _startBroadcast(deployerKey);
        SettlementKernelFactory factory = new SettlementKernelFactory(address(0));
        factoryAddress = address(factory);
        kernelAddresses = new address[](specs.length);
        for (uint256 i = 0; i < specs.length; i++) {
            kernelAddresses[i] = factory.createKernel(specs[i].token);
        }
        vm.stopBroadcast();

        // Re-read what was deployed: each kernel must exist and be bound to exactly its token.
        for (uint256 i = 0; i < specs.length; i++) {
            require(kernelAddresses[i].code.length > 0, "Kernel has no code");
            require(factory.getKernel(specs[i].token) == kernelAddresses[i], "Factory registry mismatch");
            require(address(SettlementKernel(kernelAddresses[i]).musdToken()) == specs[i].token, "Kernel token mismatch");
        }
        require(factory.getSupportedTokenCount() == specs.length, "Unexpected registered token count");

        console.log("-----------------------------------------");
        console.log("Add these to your environment (.env.local / hosting provider):");
        console.log("NEXT_PUBLIC_SETTLEMENT_KERNEL_FACTORY_ADDRESS=", factoryAddress);
        for (uint256 i = 0; i < specs.length; i++) {
            console.log(string.concat("NEXT_PUBLIC_SETTLEMENT_KERNEL_", _envSuffix(specs[i].symbol), "="), kernelAddresses[i]);
        }
        console.log("Set NEXT_PUBLIC_SETTLEMENT_KERNEL_DEPLOY_BLOCK to the factory deployment block");
        console.log("(see the receipt in broadcast/Deploy.s.sol/<chainId>/run-latest.json).");
        console.log("-----------------------------------------");
    }

    /// @dev Read from the environment in real runs. Virtual so tests can inject values: environment
    /// variables are process-wide and Forge runs tests in parallel, so env-driven tests race each other.
    function _deployerKey() internal view virtual returns (uint256) {
        return vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0));
    }

    function _startBroadcast(uint256 key) internal {
        if (key != 0) vm.startBroadcast(key);
        else vm.startBroadcast(); // signer supplied on the command line (--account / --ledger)
    }

    function _mainnetConfirmed() internal view virtual returns (bool) {
        return vm.envOr("CONFIRM_MAINNET_DEPLOY", false);
    }

    function _specsForChain(uint256 deployerKey) internal returns (TokenSpec[] memory specs) {
        if (block.chainid == 31612) {
            specs = new TokenSpec[](3);
            specs[0] = TokenSpec("MUSD", MAINNET_MUSD, 18);
            specs[1] = TokenSpec("mUSDC", MAINNET_MUSDC, 6);
            specs[2] = TokenSpec("mUSDT", MAINNET_MUSDT, 6);
        } else if (block.chainid == 31611) {
            specs = new TokenSpec[](1);
            specs[0] = TokenSpec("MUSD", TESTNET_MUSD, 18);
        } else if (block.chainid == 31337) {
            // Mocks are permitted only on a local Anvil chain.
            _startBroadcast(deployerKey);
            address musd = address(new MockERC20Decimals("Mezo USD", "MUSD", 18));
            address musdc = address(new MockERC20Decimals("Bridged USDC", "mUSDC", 6));
            address musdt = address(new MockERC20Decimals("Bridged USDT", "mUSDT", 6));
            vm.stopBroadcast();
            specs = new TokenSpec[](3);
            specs[0] = TokenSpec("MUSD", musd, 18);
            specs[1] = TokenSpec("mUSDC", musdc, 6);
            specs[2] = TokenSpec("mUSDT", musdt, 6);
        } else {
            revert("Unsupported chain. Deploy only to Mezo Mainnet (31612), Testnet (31611), or local Anvil (31337).");
        }
    }

    function _verifyToken(TokenSpec memory spec) internal view {
        require(spec.token.code.length > 0, string.concat(spec.symbol, ": token contract has no code"));
        require(
            IERC20Metadata(spec.token).decimals() == spec.decimals,
            string.concat(spec.symbol, ": on-chain decimals differ from expected")
        );
        require(
            keccak256(bytes(IERC20Metadata(spec.token).symbol())) == keccak256(bytes(spec.symbol)),
            string.concat(spec.symbol, ": on-chain symbol differs from expected")
        );
    }

    /// @dev Matches the NEXT_PUBLIC_SETTLEMENT_KERNEL_<SUFFIX> names read by src/lib/chain/config.ts.
    function _envSuffix(string memory symbol) internal pure returns (string memory) {
        bytes32 h = keccak256(bytes(symbol));
        if (h == keccak256("MUSD")) return "MUSD";
        if (h == keccak256("mUSDC")) return "MUSDC";
        if (h == keccak256("mUSDT")) return "MUSDT";
        revert("No env suffix for symbol");
    }
}
