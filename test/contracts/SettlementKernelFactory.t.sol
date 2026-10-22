// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SettlementKernelFactory} from "../../contracts/SettlementKernelFactory.sol";
import {SettlementKernel} from "../../contracts/SettlementKernel.sol";
import {MockERC20} from "./MockERC20.sol";

contract SettlementKernelFactoryTest is Test {
    SettlementKernelFactory public factory;
    MockERC20 public musd;
    MockERC20 public tbtc;
    MockERC20 public musdc;

    address public creator = address(0xC001);
    address public debtor = address(0xAAAA);
    address public creditor = address(0xBBBB);

    uint256 public constant BASE = 10 ** 18;

    function setUp() public {
        musd = new MockERC20("Mezo USD", "MUSD");
        tbtc = new MockERC20("Mezo Bitcoin", "tBTC");
        musdc = new MockERC20("Bridged USDC", "mUSDC");

        // Deploy factory pre-seeded with MUSD
        vm.prank(creator);
        factory = new SettlementKernelFactory(address(musd));
    }

    function test_DeployDefaultMusdKernel() public view {
        address musdKernel = factory.getKernel(address(musd));
        assertTrue(musdKernel != address(0), "MUSD kernel should be deployed in constructor");

        SettlementKernel kernel = SettlementKernel(musdKernel);
        assertEq(address(kernel.musdToken()), address(musd), "Kernel token must match MUSD");

        address[] memory tokens = factory.getSupportedTokens();
        assertEq(tokens.length, 1, "Should have 1 registered token");
        assertEq(tokens[0], address(musd), "First token should be MUSD");
    }

    function test_CreateKernelForNewToken() public {
        vm.prank(creator);
        address tbtcKernel = factory.createKernel(address(tbtc));

        assertTrue(tbtcKernel != address(0), "tBTC kernel should be deployed");
        assertEq(factory.getKernel(address(tbtc)), tbtcKernel, "Factory mapping must store tBTC kernel");

        SettlementKernel kernel = SettlementKernel(tbtcKernel);
        assertEq(address(kernel.musdToken()), address(tbtc), "Kernel token must match tBTC");

        assertEq(factory.getSupportedTokenCount(), 2, "Should have 2 registered tokens");
    }

    function test_GetOrCreateKernel_Idempotency() public {
        // First call should deploy
        address kernel1 = factory.getOrCreateKernel(address(musdc));
        assertTrue(kernel1 != address(0), "First call must deploy mUSDC kernel");

        // Second call should return identical address without reverting
        address kernel2 = factory.getOrCreateKernel(address(musdc));
        assertEq(kernel1, kernel2, "Second call must return identical kernel address");
        assertEq(factory.getSupportedTokenCount(), 2, "Token count should only increase once");
    }

    function test_RevertIf_DuplicateCreation() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                SettlementKernelFactory.KernelAlreadyExists.selector,
                address(musd),
                factory.getKernel(address(musd))
            )
        );
        factory.createKernel(address(musd));
    }

    function test_RevertIf_ZeroAddressToken() public {
        vm.expectRevert(SettlementKernelFactory.ZeroAddressToken.selector);
        factory.createKernel(address(0));

        vm.expectRevert(SettlementKernelFactory.ZeroAddressToken.selector);
        factory.getOrCreateKernel(address(0));
    }

    function test_MultiTokenIsolation() public {
        // Deploy tBTC kernel
        address tbtcKernelAddr = factory.createKernel(address(tbtc));
        SettlementKernel tbtcKernel = SettlementKernel(tbtcKernelAddr);
        SettlementKernel musdKernel = SettlementKernel(factory.getKernel(address(musd)));

        // Fund debtor with tBTC only, no MUSD
        tbtc.mint(debtor, 10 * BASE);
        vm.prank(debtor);
        tbtc.approve(tbtcKernelAddr, type(uint256).max);

        // Build cycle input for tBTC settlement
        bytes32 cycleId = keccak256("tbtc-cycle-001");
        address[] memory debtors = new address[](1);
        debtors[0] = debtor;
        uint256[] memory debitAmounts = new uint256[](1);
        debitAmounts[0] = 1 * BASE;

        address[] memory creditors = new address[](1);
        creditors[0] = creditor;
        uint256[] memory creditAmounts = new uint256[](1);
        creditAmounts[0] = 1 * BASE;

        SettlementKernel.CycleInput memory input = SettlementKernel.CycleInput({
            cycleId: cycleId,
            snapshotCommitment: keccak256("tbtc-snapshot-hash"),
            algorithmVersion: "netteo-v1.0-deterministic",
            grossObligationTotal: 2 * BASE,
            debtors: debtors,
            debitAmounts: debitAmounts,
            creditors: creditors,
            creditAmounts: creditAmounts,
            fundingDuration: 72 hours
        });

        // Create cycle on tBTC kernel
        vm.prank(creator);
        tbtcKernel.createCycle(input);

        // Debtor deposits tBTC into tBTC kernel
        vm.prank(debtor);
        tbtcKernel.deposit(cycleId, 1 * BASE);

        // Verify tBTC kernel is ReadyToSettle
        (
            ,
            ,
            ,
            uint256 netDebtTotal,
            uint256 totalFunded,
            ,
            ,
            ,
            SettlementKernel.CycleState state,
            
        ) = tbtcKernel.getCycle(cycleId);
        assertEq(uint8(state), uint8(SettlementKernel.CycleState.ReadyToSettle));
        assertEq(totalFunded, netDebtTotal);
        assertEq(tbtc.balanceOf(debtor), 9 * BASE);
        assertEq(tbtc.balanceOf(tbtcKernelAddr), 1 * BASE);

        // Execute settlement in tBTC
        tbtcKernel.executeSettlement(cycleId);
        assertEq(tbtc.balanceOf(creditor), 1 * BASE, "Creditor must receive tBTC payout");

        // Verify MUSD kernel balance remained 0 (complete asset isolation)
        assertEq(musd.balanceOf(address(musdKernel)), 0, "MUSD kernel must have zero balance");
        assertEq(tbtc.balanceOf(address(musdKernel)), 0, "MUSD kernel must have zero tBTC balance");
    }
}
