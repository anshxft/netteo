// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SettlementKernel} from "./SettlementKernel.sol";

/**
 * @title SettlementKernelFactory
 * @notice Factory registry for deploying and discovering currency-isolated SettlementKernel contracts on Mezo.
 * Maintains a strict 1-to-1 mapping between an ERC20 token (e.g. MUSD, tBTC, mUSDC) and its canonical SettlementKernel.
 * Enforces asset isolation: cycles in one currency pool cannot contaminate or drain another.
 */
contract SettlementKernelFactory {
    // tokenAddress => SettlementKernel address
    mapping(address => address) public kernels;

    // Ordered list of registered tokens
    address[] public supportedTokens;

    // --- Events ---
    event KernelDeployed(
        address indexed token,
        address indexed kernel,
        address indexed creator
    );

    // --- Custom Errors ---
    error ZeroAddressToken();
    error KernelAlreadyExists(address token, address kernel);

    /**
     * @notice Initializes the factory, optionally pre-deploying a kernel for the primary settlement token (e.g. MUSD).
     * @param defaultToken Canonical token address (pass address(0) to skip initial deployment).
     */
    constructor(address defaultToken) {
        if (defaultToken != address(0)) {
            _deployKernel(defaultToken);
        }
    }

    /**
     * @notice Returns the SettlementKernel address associated with the specified token.
     * @param token ERC20 token contract address.
     */
    function getKernel(address token) external view returns (address) {
        return kernels[token];
    }

    /**
     * @notice Returns the list of all tokens currently supported by registered kernels.
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }

    /**
     * @notice Returns the number of registered tokens.
     */
    function getSupportedTokenCount() external view returns (uint256) {
        return supportedTokens.length;
    }

    /**
     * @notice Deploys a new SettlementKernel for the specified token.
     * Reverts if a kernel for the token already exists.
     * @param token ERC20 token contract address.
     */
    function createKernel(address token) external returns (address) {
        if (token == address(0)) revert ZeroAddressToken();
        if (kernels[token] != address(0)) revert KernelAlreadyExists(token, kernels[token]);
        return _deployKernel(token);
    }

    /**
     * @notice Returns the existing SettlementKernel for the token, or deploys one idempotently if none exists.
     * @param token ERC20 token contract address.
     */
    function getOrCreateKernel(address token) external returns (address) {
        if (token == address(0)) revert ZeroAddressToken();
        address existing = kernels[token];
        if (existing != address(0)) {
            return existing;
        }
        return _deployKernel(token);
    }

    /**
     * @dev Internal deployment and registration helper.
     */
    function _deployKernel(address token) internal returns (address) {
        SettlementKernel newKernel = new SettlementKernel(token);
        address kernelAddress = address(newKernel);
        kernels[token] = kernelAddress;
        supportedTokens.push(token);
        emit KernelDeployed(token, kernelAddress, msg.sender);
        return kernelAddress;
    }
}
