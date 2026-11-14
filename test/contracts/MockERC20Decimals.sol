// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @notice Test-only ERC-20 with configurable decimals, so the kernel can be exercised with
 * 6-decimal assets (mUSDC, mUSDT) as well as 18-decimal MUSD. Never deploy to a live network.
 */
contract MockERC20Decimals is ERC20, ERC20Permit {
    uint8 private immutable _tokenDecimals;

    constructor(string memory name, string memory symbol, uint8 tokenDecimals) ERC20(name, symbol) ERC20Permit(name) {
        _tokenDecimals = tokenDecimals;
        _mint(msg.sender, 1_000_000 * 10 ** tokenDecimals);
    }

    function decimals() public view override returns (uint8) {
        return _tokenDecimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
