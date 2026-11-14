import { encodeAbiParameters, keccak256, toHex, type Address, type Hex } from 'viem';

/**
 * The id a SettlementKernel stores for a cycle: keccak256(abi.encode(creator, salt)).
 *
 * The kernel binds the creator into the id so nobody can squat an id another wallet is about to use, and so a
 * cycle's creator is part of its identity. This must match SettlementKernel.computeCycleId exactly;
 * cycleId.test.ts checks it against a value produced by the contract's own formula.
 */
export function computeCycleId(creator: Address, salt: Hex): Hex {
  return keccak256(encodeAbiParameters([{ type: 'address' }, { type: 'bytes32' }], [creator, salt]));
}

/** A fresh 32-byte salt from the platform's secure random source (never Math.random). */
export function randomSalt(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}
