// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockMUSD
 * @notice Testnet MUSD token for local offline Anvil testing only.
 * @custom:deprecated Deprecated: Canonical Mezo Testnet MUSD is 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503.
 * Do not deploy this mock contract to live networks or public testnets.
 */
contract MockMUSD is ERC20 {
    constructor() ERC20("Mezo USD Testnet", "MUSD") {
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
