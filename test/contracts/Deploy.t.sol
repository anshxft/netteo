// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Deploy} from "../../script/Deploy.s.sol";
import {SettlementKernel} from "../../contracts/SettlementKernel.sol";
import {SettlementKernelFactory} from "../../contracts/SettlementKernelFactory.sol";
import {MockERC20Decimals} from "./MockERC20Decimals.sol";

/// Injects the key and the mainnet confirmation instead of reading process-wide env vars, which
/// race when Forge runs tests in parallel.
contract DeployHarness is Deploy {
    uint256 public key;
    bool public confirmed;

    constructor(uint256 key_, bool confirmed_) {
        key = key_;
        confirmed = confirmed_;
    }

    function _deployerKey() internal view override returns (uint256) {
        return key;
    }

    function _mainnetConfirmed() internal view override returns (bool) {
        return confirmed;
    }
}

/// Proves the deploy script's safety checks. None of these touch a real network.
contract DeployScriptTest is Test {
    // Well-known Anvil accounts #0 and #1 keys. Public, test-only.
    uint256 internal constant FUNDED_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256 internal constant UNFUNDED_KEY = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;

    function setUp() public {
        vm.deal(vm.addr(FUNDED_KEY), 10 ether);
    }

    function _harness(bool confirmed) internal returns (DeployHarness) {
        return new DeployHarness(FUNDED_KEY, confirmed);
    }

    function test_LocalDeployCreatesFactoryAndThreeBoundKernels() public {
        vm.chainId(31337);
        (address factoryAddress, address[] memory kernels) = _harness(false).run();

        SettlementKernelFactory factory = SettlementKernelFactory(factoryAddress);
        assertEq(kernels.length, 3);
        assertEq(factory.getSupportedTokenCount(), 3);

        uint8[3] memory expectedDecimals = [uint8(18), 6, 6];
        for (uint256 i = 0; i < 3; i++) {
            address token = address(SettlementKernel(kernels[i]).musdToken());
            assertEq(factory.getKernel(token), kernels[i], "registry must map token to its kernel");
            assertEq(MockERC20Decimals(token).decimals(), expectedDecimals[i], "unexpected decimals");
        }
        // Each token has its own, distinct kernel.
        assertTrue(kernels[0] != kernels[1] && kernels[1] != kernels[2] && kernels[0] != kernels[2]);
    }

    function test_RevertIf_MainnetWithoutExplicitConfirmation() public {
        vm.chainId(31612);
        DeployHarness d = _harness(false);
        vm.expectRevert(bytes("Mainnet deployment is irreversible. Re-run with CONFIRM_MAINNET_DEPLOY=true"));
        d.run();
    }

    function test_RevertIf_MainnetTokenHasNoCode() public {
        vm.chainId(31612);
        DeployHarness d = _harness(true);
        // No fork and nothing at the canonical address: must abort before broadcasting anything.
        vm.expectRevert(bytes("MUSD: token contract has no code"));
        d.run();
    }

    function test_RevertIf_MainnetTokenDecimalsDiffer() public {
        vm.chainId(31612);
        DeployHarness d = _harness(true);
        // A 6-decimal token sitting at the MUSD address would silently mis-size every cycle.
        vm.etch(d.MAINNET_MUSD(), address(new MockERC20Decimals("Mezo USD", "MUSD", 6)).code);
        vm.expectRevert(bytes("MUSD: on-chain decimals differ from expected"));
        d.run();
    }

    function test_RevertIf_MainnetTokenSymbolDiffers() public {
        vm.chainId(31612);
        DeployHarness d = _harness(true);
        // Correct decimals, but etch does not copy storage so symbol() reads empty: wrong asset.
        vm.etch(d.MAINNET_MUSD(), address(new MockERC20Decimals("Impostor", "IMP", 18)).code);
        vm.expectRevert(bytes("MUSD: on-chain symbol differs from expected"));
        d.run();
    }

    function test_RevertIf_UnsupportedChain() public {
        vm.chainId(1);
        DeployHarness d = _harness(true);
        vm.expectRevert(
            bytes("Unsupported chain. Deploy only to Mezo Mainnet (31612), Testnet (31611), or local Anvil (31337).")
        );
        d.run();
    }

    function test_RevertIf_DeployerHasNoGas() public {
        vm.chainId(31337);
        DeployHarness d = new DeployHarness(UNFUNDED_KEY, false);
        vm.expectRevert(bytes("Deployer has no native BTC for gas"));
        d.run();
    }
}
