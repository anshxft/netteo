import assert from 'node:assert/strict';
import { computeCycleId, randomSalt } from './cycleId';

// Vector produced with the contract's own formula, `cast keccak $(cast abi-encode "f(address,bytes32)" ...)`,
// i.e. keccak256(abi.encode(creator, salt)) exactly as SettlementKernel.computeCycleId does.
const CREATOR = '0xb31B137c24e5f020bF07D93BBa99DAf950908a9e';
const SALT = '0x0000000000000000000000000000000000000000000000000000000000003039'; // 12345
const EXPECTED = '0xaaf56085c8aa447f5a1ffc5148ac79dca76635d7ed82561615476087392a1133';

assert.equal(computeCycleId(CREATOR, SALT), EXPECTED, 'TypeScript and Solidity must derive the same cycle id');

// The creator is part of the identity: the same salt from another wallet gives another id.
assert.notEqual(computeCycleId('0x000000000000000000000000000000000000bad0', SALT), EXPECTED);
// A wrongly checksummed address is rejected rather than silently hashed to the wrong id.
assert.throws(() => computeCycleId('0x000000000000000000000000000000000000bAD0', SALT), /checksum/);
// Address casing never matters.
assert.equal(computeCycleId(CREATOR.toLowerCase() as `0x${string}`, SALT), EXPECTED);

// Salts are 32 bytes and do not repeat.
const salts = new Set(Array.from({ length: 200 }, () => randomSalt()));
assert.equal(salts.size, 200);
for (const salt of salts) assert.match(salt, /^0x[0-9a-f]{64}$/);

console.log('Cycle id derivation matches the contract.');
