import assert from 'node:assert/strict';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { buildCreateGroupMessage, buildObligationActionMessage, buildProposeObligationMessage, resetConsumedNonces } from '@/lib/auth/challenge';
import { CANONICAL_MEZO_TOKENS } from '@/lib/chain/tokens';
import { calculateNetting } from '@/features/settlement-cycles/netting';
import { FakeDb } from './__support__/fakeDb';
import { changeObligationStatus, listObligations, proposeObligation } from './obligations';
import { createGroup, listGroups, updateGroupParticipants } from './groups';
import { listCycles, registerCycle, type ChainReader } from './cycles';

const MUSD = CANONICAL_MEZO_TOKENS.MUSD.address;
const MUSDC = CANONICAL_MEZO_TOKENS.mUSDC.address;
const KERNEL = '0x' + 'ab'.repeat(20);
const G1 = '11111111-1111-4111-8111-111111111111';
const G2 = '22222222-2222-4222-8222-222222222222';
const E18 = 10n ** 18n;

const wallet = () => privateKeyToAccount(generatePrivateKey());
type Wallet = ReturnType<typeof wallet>;
const lc = (a: Wallet) => a.address.toLowerCase();

const alice = wallet();
const bob = wallet();
const carol = wallet();
const dave = wallet();
const eve = wallet(); // in no group
const frank = wallet(); // in no group

resetConsumedNonces();

function seedDb() {
  return new FakeDb({
    groups: [
      { id: G1, name: 'G1', creator_address: lc(alice) },
      { id: G2, name: 'G2', creator_address: lc(dave) },
    ],
    group_members: [
      { group_id: G1, wallet_address: lc(alice), role: 'admin' },
      { group_id: G1, wallet_address: lc(bob), role: 'member' },
      { group_id: G1, wallet_address: lc(carol), role: 'member' },
      { group_id: G2, wallet_address: lc(dave), role: 'admin' },
    ],
  });
}

let obligationCounter = 0;
function obligation(over: Record<string, any> = {}) {
  obligationCounter += 1;
  return {
    id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(obligationCounter).padStart(12, '0')}`,
    group_id: G1,
    proposer_address: lc(alice),
    debtor_address: lc(bob),
    creditor_address: lc(carol),
    amount_units: (100n * E18).toString(),
    token_address: MUSD.toLowerCase(),
    reference_label: 'work',
    status: 'proposed',
    created_at: new Date(1_700_000_000_000 + obligationCounter).toISOString(),
    ...over,
  };
}

async function signedPropose(signer: Wallet, over: Record<string, any> = {}) {
  const fields = {
    groupId: G1,
    debtorAddress: bob.address,
    creditorAddress: carol.address,
    amountUnits: (100n * E18).toString(),
    tokenAddress: MUSD,
    referenceLabel: 'Design sprint',
    ...over,
  };
  const nonce = over.nonce ?? crypto.randomUUID();
  const timestamp = over.timestamp ?? Date.now();
  const signature = await signer.signMessage({
    message: buildProposeObligationMessage({ action: 'propose', ...fields, nonce, timestamp } as any),
  });
  return { action: 'propose', ...fields, signerAddress: signer.address, signature, nonce, timestamp };
}

async function signedAction(signer: Wallet, action: string, obligationId: string) {
  const nonce = crypto.randomUUID();
  const timestamp = Date.now();
  const signature = await signer.signMessage({ message: buildObligationActionMessage({ action: action as any, obligationId, nonce, timestamp }) });
  return { action, obligationId, signerAddress: signer.address, signature, nonce, timestamp };
}

async function main() {
  // ===========================================================================================
  // 1. READS ARE SCOPED TO THE CALLER (finding 2)
  // ===========================================================================================
  {
    const mine = obligation(); // G1
    const others = obligation({ group_id: G2, proposer_address: lc(dave), debtor_address: lc(dave), creditor_address: lc(eve) });
    const namesAlice = obligation({ group_id: G2, proposer_address: lc(dave), debtor_address: lc(dave), creditor_address: lc(alice) });
    const db: any = seedDb();
    db.tables.obligations = [mine, others, namesAlice];

    const ids = (r: any) => r.body.obligations.map((o: any) => o.id).sort();
    assert.deepEqual(ids(await listObligations(db, lc(alice))), [mine.id, namesAlice.id].sort(), 'alice: her group plus a claim naming her');
    assert.deepEqual(ids(await listObligations(db, lc(bob))), [mine.id], 'bob must not see group 2 data');
    assert.deepEqual(ids(await listObligations(db, lc(dave))), [others.id, namesAlice.id].sort());
    assert.deepEqual(ids(await listObligations(db, lc(frank))), [], 'a wallet in no group sees nothing');

    const groups = async (w: Wallet) => (await listGroups(db, lc(w))).body.groups as any[];
    assert.deepEqual((await groups(alice)).map((g) => g.id), [G1]);
    assert.deepEqual((await groups(dave)).map((g) => g.id), [G2]);
    assert.deepEqual(await groups(frank), []);
    console.log('✔ Reads return only the caller\'s own groups and obligations');
  }

  // ===========================================================================================
  // 2. PROPOSING: validation, membership, replay (findings 9, 14)
  // ===========================================================================================
  {
    const db: any = seedDb();

    const body = await signedPropose(alice);
    const first = await proposeObligation(db, body);
    assert.equal(first.status, 200, JSON.stringify(first.body));
    const row = db.rows('obligations')[0];
    assert.equal(row.status, 'proposed');
    assert.equal(row.token_address, MUSD.toLowerCase(), 'token is stored lowercase');
    assert.equal(row.debtor_address, lc(bob));

    const replay = await proposeObligation(db, body);
    assert.equal(replay.status, 401, 'the same signed request cannot be replayed');
    assert.equal(db.rows('obligations').length, 1);

    const outsider = await proposeObligation(db, await signedPropose(eve, {}));
    assert.equal(outsider.status, 403, 'a non-member cannot propose into a group');

    const outsiderDebtor = await proposeObligation(db, await signedPropose(alice, { debtorAddress: frank.address }));
    assert.equal(outsiderDebtor.status, 400, 'debtor must be a group member');
    const outsiderCreditor = await proposeObligation(db, await signedPropose(alice, { creditorAddress: frank.address }));
    assert.equal(outsiderCreditor.status, 400, 'creditor must be a group member');

    for (const amount of ['0', '0100', '-5', '1.5', '', 'abc', (2n ** 128n).toString(), '9'.repeat(60)]) {
      const r = await proposeObligation(db, await signedPropose(alice, { amountUnits: amount }));
      assert.equal(r.status, 400, `amount ${JSON.stringify(amount)} must be refused`);
    }
    assert.equal((await proposeObligation(db, await signedPropose(alice, { tokenAddress: '0x000000000000000000000000000000000000dEaD' }))).status, 400, 'unknown token');
    assert.equal((await proposeObligation(db, await signedPropose(alice, { debtorAddress: carol.address, creditorAddress: carol.address }))).status, 400, 'self obligation');
    assert.equal((await proposeObligation(db, await signedPropose(alice, { referenceLabel: '   ' }))).status, 400, 'blank reference');
    assert.equal((await proposeObligation(db, await signedPropose(alice, { referenceLabel: 'x'.repeat(151) }))).status, 400, 'reference too long');
    assert.equal((await proposeObligation(db, await signedPropose(alice, { groupId: '00000000-0000-0000-0000-000000000001' }))).status, 400, 'the old seed group id is refused');
    assert.equal((await proposeObligation(db, await signedPropose(alice, { timestamp: Date.now() - 10 * 60 * 1000 }))).status, 401, 'stale challenge');
    assert.equal((await proposeObligation(db, null)).status, 400, 'empty body');

    // The token is part of the signature: a request signed for mUSDC cannot be replayed as MUSD.
    const usdc = await signedPropose(alice, { tokenAddress: MUSDC });
    assert.equal((await proposeObligation(db, { ...usdc, tokenAddress: MUSD })).status, 401, 'swapped token breaks the signature');

    // Someone else's signature does not authorise an action in their name.
    const forged = await signedPropose(eve);
    assert.equal((await proposeObligation(db, { ...forged, signerAddress: alice.address })).status, 401, 'signature must match the claimed signer');

    assert.equal(db.rows('obligations').length, 1, 'no rejected request wrote a row');
    console.log('✔ Proposing enforces membership, amounts, token, freshness and replay protection');
  }

  // ===========================================================================================
  // 3. STATUS MACHINE AND ATOMIC UPDATE (finding 7)
  // ===========================================================================================
  {
    const db: any = seedDb();
    const act = (signer: Wallet, action: string, id: string) => signedAction(signer, action, id).then((b) => changeObligationStatus(db, b));
    const statusOf = (id: string) => db.rows('obligations').find((o: any) => o.id === id).status;

    // Accept: only the debtor, only from proposed.
    const a = obligation();
    db.tables.obligations = [a];
    assert.equal((await act(carol, 'accept', a.id)).status, 403, 'the creditor cannot accept for the debtor');
    assert.equal((await act(carol, 'accept', a.id)).body.code, 'not_debtor', 'refusals carry a machine-readable code');
    assert.equal((await act(alice, 'accept', a.id)).status, 403, 'the proposer cannot accept for the debtor');
    const accepted = await act(bob, 'accept', a.id);
    assert.equal(accepted.status, 200);
    assert.equal(statusOf(a.id), 'accepted');
    assert.ok(db.rows('obligations')[0].accepted_at, 'acceptance is timestamped');

    // Once accepted, it can no longer be disputed, withdrawn or accepted again.
    assert.equal((await act(bob, 'dispute', a.id)).status, 409);
    assert.equal((await act(alice, 'withdraw', a.id)).status, 409, 'an accepted claim cannot be withdrawn');
    assert.equal((await act(carol, 'withdraw', a.id)).status, 409);
    assert.equal((await act(bob, 'accept', a.id)).status, 409);
    assert.equal((await act(bob, 'accept', a.id)).body.code, 'wrong_state');
    assert.equal(statusOf(a.id), 'accepted');

    // The revival attack: withdrawn claims stay withdrawn.
    const w = obligation();
    db.tables.obligations.push(w);
    assert.equal((await act(alice, 'withdraw', w.id)).status, 200);
    assert.equal(statusOf(w.id), 'withdrawn');
    assert.equal((await act(bob, 'accept', w.id)).status, 409, 'a withdrawn claim cannot be accepted');
    assert.equal((await act(bob, 'dispute', w.id)).status, 409);
    assert.equal(statusOf(w.id), 'withdrawn');

    // Disputed is final too, and the creditor can withdraw a pending claim.
    const d = obligation();
    const c = obligation();
    db.tables.obligations.push(d, c);
    assert.equal((await act(bob, 'dispute', d.id)).status, 200);
    assert.ok(db.rows('obligations').find((o: any) => o.id === d.id).disputed_at);
    assert.equal((await act(bob, 'accept', d.id)).status, 409, 'a disputed claim cannot be flipped to accepted');
    assert.equal((await act(carol, 'withdraw', c.id)).status, 200);

    // Frozen and settled claims are never touched by these actions.
    const frozen = obligation({ status: 'frozen' });
    db.tables.obligations.push(frozen);
    assert.equal((await act(bob, 'accept', frozen.id)).status, 409);

    // Unknown ids, bad input, unsupported actions.
    assert.equal((await act(bob, 'accept', 'aaaaaaaa-aaaa-4aaa-8aaa-ffffffffffff')).status, 404);
    assert.equal((await act(bob, 'delete', a.id)).status, 400);
    assert.equal((await changeObligationStatus(db, { action: 'accept', obligationId: 'not-a-uuid' })).status, 400);

    // Atomic: if the row changes after we read it, the update must match nothing and answer 409.
    const race = obligation();
    db.tables.obligations.push(race);
    db.beforeUpdate = (table: string, rows: any[]) => {
      if (table === 'obligations') for (const row of rows) if (row.id === race.id) row.status = 'withdrawn';
    };
    const raced = await act(bob, 'accept', race.id);
    db.beforeUpdate = undefined;
    assert.equal(raced.status, 409, 'a concurrent withdrawal must win, not be overwritten');
    assert.equal(statusOf(race.id), 'withdrawn');

    // Replaying a signed action fails.
    const once = await signedAction(bob, 'dispute', obligation().id);
    const fresh = obligation();
    db.tables.obligations.push(fresh);
    const signed = await signedAction(bob, 'dispute', fresh.id);
    assert.equal((await changeObligationStatus(db, signed)).status, 200);
    assert.equal((await changeObligationStatus(db, signed)).status, 401, 'replayed action is refused');
    void once;
    console.log('✔ Obligation state machine, role checks, atomic update and replay protection');
  }

  // ===========================================================================================
  // 4. GROUPS: create and membership changes (findings 1, 9)
  // ===========================================================================================
  {
    const db: any = new FakeDb();
    const signCreate = async (signer: Wallet, over: Record<string, any> = {}) => {
      const fields = { name: 'Collective', description: 'desc', participants: [signer.address, bob.address], ...over };
      const nonce = crypto.randomUUID();
      const timestamp = Date.now();
      const signature = await signer.signMessage({ message: buildCreateGroupMessage({ action: 'create_group', ...fields, nonce, timestamp } as any) });
      return { action: 'create_group', ...fields, signerAddress: signer.address, signature, nonce, timestamp };
    };

    const made = await createGroup(db, await signCreate(alice));
    assert.equal(made.status, 200, JSON.stringify(made.body));
    assert.equal(db.rows('group_members').length, 2);
    assert.equal(db.rows('group_members').find((m: any) => m.wallet_address === lc(alice)).role, 'admin');

    // The caller cannot claim a reserved id.
    const reserved = await createGroup(db, { ...(await signCreate(alice)), groupId: '00000000-0000-0000-0000-000000000001' });
    assert.equal(reserved.status, 200);
    assert.ok(!(reserved.body.group as any).id.startsWith('00000000-0000-0000'), 'reserved seed ids are never honoured');

    assert.equal((await createGroup(db, await signCreate(alice, { participants: [alice.address, 'not-an-address'] }))).status, 400);
    assert.equal((await createGroup(db, await signCreate(alice, { participants: 'nope' }))).status, 400);
    assert.equal((await createGroup(db, await signCreate(alice, { name: '' }))).status, 400);
    assert.equal((await createGroup(db, await signCreate(alice, { name: 'x'.repeat(101) }))).status, 400);
    const eleven = Array.from({ length: 11 }, () => wallet().address);
    assert.equal((await createGroup(db, await signCreate(alice, { participants: eleven }))).status, 400, 'over the 10 member cap');

    const wrongName = await signCreate(alice);
    assert.equal((await createGroup(db, { ...wrongName, name: 'Another name' })).status, 401, 'signature covers the name');
    const before = db.rows('groups').length;
    assert.equal((await createGroup(db, { ...(await signCreate(alice)), signerAddress: bob.address })).status, 401, 'signature must match the signer');
    assert.equal(db.rows('groups').length, before, 'a rejected request leaves no group behind');

    // Membership changes: admin only, creator permanent, open obligations protect members.
    const g: any = seedDb();
    g.tables.obligations = [obligation({ status: 'accepted' })]; // bob owes carol, accepted
    assert.equal((await updateGroupParticipants(g, lc(bob), { groupId: G1, participants: [bob.address] })).status, 403, 'a plain member cannot change members');
    assert.equal((await updateGroupParticipants(g, lc(eve), { groupId: G1, participants: [] })).status, 403, 'an outsider cannot');
    assert.equal((await updateGroupParticipants(g, lc(alice), { groupId: G1, participants: ['nope'] })).status, 400);
    assert.equal((await updateGroupParticipants(g, lc(alice), { groupId: 'bad', participants: [] })).status, 400);
    assert.equal((await updateGroupParticipants(g, lc(alice), { groupId: G1, participants: eleven })).status, 400);

    const removeBob = await updateGroupParticipants(g, lc(alice), { groupId: G1, participants: [alice.address, carol.address] });
    assert.equal(removeBob.status, 409, 'bob has an open obligation, so he cannot be removed');
    assert.ok(g.rows('group_members').some((m: any) => m.wallet_address === lc(bob)));

    const addFrank = await updateGroupParticipants(g, lc(alice), { groupId: G1, participants: [alice.address, bob.address, carol.address, frank.address] });
    assert.equal(addFrank.status, 200);
    assert.ok(g.rows('group_members').some((m: any) => m.wallet_address === lc(frank)));

    const dropFrank = await updateGroupParticipants(g, lc(alice), { groupId: G1, participants: [bob.address, carol.address] }); // creator omitted on purpose
    assert.equal(dropFrank.status, 200);
    assert.ok(!g.rows('group_members').some((m: any) => m.wallet_address === lc(frank)), 'a member with no open obligations can be removed');
    assert.ok((dropFrank.body.participants as string[]).includes(lc(alice)), 'the creator can never be removed');
    console.log('✔ Group creation validation and admin-only membership changes');
  }

  // ===========================================================================================
  // 5. CYCLE REGISTRATION: the chain must match the group (finding 5)
  // ===========================================================================================
  {
    // The canonical example: A owes B 100, B owes C 80, C owes A 20. Net: alice pays 80, bob +20, carol +60.
    const makeDb = () => {
      const db: any = seedDb();
      db.tables.obligations = [
        obligation({ debtor_address: lc(alice), creditor_address: lc(bob), amount_units: (100n * E18).toString(), status: 'accepted' }),
        obligation({ debtor_address: lc(bob), creditor_address: lc(carol), amount_units: (80n * E18).toString(), status: 'accepted' }),
        obligation({ debtor_address: lc(carol), creditor_address: lc(alice), amount_units: (20n * E18).toString(), status: 'accepted' }),
      ];
      return db;
    };
    const idsOf = (db: any) => db.rows('obligations').map((o: any) => o.id);
    const netOf = (db: any, token = MUSD) =>
      calculateNetting(
        db.rows('obligations').map((o: any) => ({ id: o.id, debtor: o.debtor_address, creditor: o.creditor_address, amount: BigInt(o.amount_units) })),
        10,
        30,
        { chainId: 31612, tokenAddress: token }
      );

    /** A chain that reports what a correct createCycle would have stored, with optional lies. */
    const chainFor = (netting: ReturnType<typeof netOf>, creator: Wallet, lie: Partial<Record<string, any>> = {}): ChainReader => ({
      async getCycle() {
        if (lie.missing) return null;
        return {
          snapshotCommitment: lie.commitment ?? netting.canonicalCommitmentHash,
          grossObligationTotal: lie.gross ?? netting.grossObligationTotal,
          netDebtTotal: lie.net ?? netting.netFundingRequirement,
          fundingDeadline: 1_800_000_000n,
          state: 1,
          creator: (lie.creator ?? creator.address) as string,
        };
      },
      async getParticipants() {
        return {
          debtors: lie.debtors ?? netting.debtors.map((d) => d.address),
          creditors: lie.creditors ?? netting.creditors.map((c) => c.address),
        };
      },
      async getDebtorRequired(_k, _c, debtor) {
        return lie.debtorAmount ?? netting.debtors.find((d) => d.address === debtor.toLowerCase())!.amount;
      },
      async getCreditorPayout(_k, _c, creditor) {
        return lie.creditorAmount ?? netting.creditors.find((c) => c.address === creditor.toLowerCase())!.amount;
      },
    });
    const kernelFor = () => KERNEL;
    const CYCLE = '0x' + '5c'.repeat(32);
    const body = (db: any, over: Record<string, any> = {}) => ({ cycleId: CYCLE, tokenAddress: MUSD, groupId: G1, obligationIds: idsOf(db), ...over });
    const reg = (db: any, signer: Wallet, b: any, chain: ChainReader, k: any = kernelFor) => registerCycle(db, lc(signer), b, { chain, kernelFor: k });

    // Happy path.
    {
      const db = makeDb();
      const result = await reg(db, alice, body(db), chainFor(netOf(db), alice));
      assert.equal(result.status, 201, JSON.stringify(result.body));
      assert.equal(db.rows('cycles').length, 1);
      assert.equal(db.rows('cycles')[0].net_debtor_total, (80n * E18).toString());
      assert.equal(db.rows('cycle_obligations').length, 3);
      assert.ok(db.rows('obligations').every((o: any) => o.status === 'frozen'), 'obligations are frozen once registered');

      const again = await reg(db, alice, body(db), chainFor(netOf(db), alice));
      assert.equal(again.status, 200, 'registering twice is harmless');
      assert.equal(db.rows('cycles').length, 1);

      const mine = await listCycles(db, lc(alice));
      assert.equal((mine.body.cycles as any[]).length, 1);
      assert.equal((mine.body.cycles as any[])[0].obligation_ids.length, 3);
      assert.equal(((await listCycles(db, lc(dave))).body.cycles as any[]).length, 0, 'another group never sees it');
      assert.equal(((await listCycles(db, lc(frank))).body.cycles as any[]).length, 0);
    }

    // Everything below must be refused, and must leave the database untouched.
    const refuse = async (label: string, status: number, run: (db: any) => Promise<{ status: number }>) => {
      const db = makeDb();
      const result = await run(db);
      assert.equal(result.status, status, `${label}: expected ${status}, got ${result.status}`);
      assert.equal(db.rows('cycles').length, 0, `${label}: no cycle row may be written`);
      assert.ok(db.rows('obligations').every((o: any) => o.status === 'accepted'), `${label}: obligations must stay accepted`);
    };

    await refuse('not on chain yet', 404, (db) => reg(db, alice, body(db), chainFor(netOf(db), alice, { missing: true })));
    await refuse('someone else created it', 403, (db) => reg(db, alice, body(db), chainFor(netOf(db), bob)));
    await refuse('caller not in the group', 403, (db) => reg(db, eve, body(db), chainFor(netOf(db), eve)));
    await refuse('commitment differs', 409, (db) => reg(db, alice, body(db), chainFor(netOf(db), alice, { commitment: '0x' + '00'.repeat(32) })));
    await refuse('gross total differs', 409, (db) => reg(db, alice, body(db), chainFor(netOf(db), alice, { gross: 1n })));
    await refuse('net total differs', 409, (db) => reg(db, alice, body(db), chainFor(netOf(db), alice, { net: 79n * E18 })));
    await refuse('debtor owes less on chain', 409, (db) => reg(db, alice, body(db), chainFor(netOf(db), alice, { debtorAmount: 1n })));
    await refuse('creditor paid differently', 409, (db) => reg(db, alice, body(db), chainFor(netOf(db), alice, { creditorAmount: 1n })));
    await refuse('attacker added as creditor', 409, (db) =>
      reg(db, alice, body(db), chainFor(netOf(db), alice, { creditors: [...netOf(db).creditors.map((c) => c.address), lc(eve)] }))
    );
    await refuse('debtor list differs', 409, (db) => reg(db, alice, body(db), chainFor(netOf(db), alice, { debtors: [lc(eve)] })));
    await refuse('no kernel for the token', 400, (db) => reg(db, alice, body(db), chainFor(netOf(db), alice), () => null));
    await refuse('unknown token', 400, (db) => reg(db, alice, body(db, { tokenAddress: '0x000000000000000000000000000000000000dEaD' }), chainFor(netOf(db), alice)));
    await refuse('bad cycle id', 400, (db) => reg(db, alice, body(db, { cycleId: '0x123' }), chainFor(netOf(db), alice)));
    await refuse('duplicate obligation ids', 400, (db) => reg(db, alice, body(db, { obligationIds: [idsOf(db)[0], idsOf(db)[0]] }), chainFor(netOf(db), alice)));
    await refuse('too many obligations', 400, (db) => reg(db, alice, body(db, { obligationIds: Array.from({ length: 31 }, (_, i) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(i + 100).padStart(12, '0')}`) }), chainFor(netOf(db), alice)));
    await refuse('unknown obligation id', 400, (db) => reg(db, alice, body(db, { obligationIds: [...idsOf(db).slice(0, 2), 'aaaaaaaa-aaaa-4aaa-8aaa-eeeeeeeeeeee'] }), chainFor(netOf(db), alice)));
    await refuse('group mismatch', 403, (db) => reg(db, alice, body(db, { groupId: G2 }), chainFor(netOf(db), alice)));

    // One obligation not yet accepted, or in another token, blocks the whole cycle.
    {
      const db = makeDb();
      db.tables.obligations[2].status = 'proposed';
      assert.equal((await reg(db, alice, body(db), chainFor(netOf(db), alice))).status, 409, 'a proposed obligation cannot be settled');
      assert.equal(db.rows('cycles').length, 0);
    }
    {
      const db = makeDb();
      db.tables.obligations[0].token_address = MUSDC.toLowerCase();
      assert.equal((await reg(db, alice, body(db), chainFor(netOf(db), alice))).status, 400, 'mixed currencies cannot be settled together');
    }
    {
      // A cycle id already registered to another group cannot be claimed.
      const db = makeDb();
      db.tables.cycles = [{ cycle_id: CYCLE, group_id: G2, kernel_address: KERNEL }];
      assert.equal((await reg(db, alice, body(db), chainFor(netOf(db), alice))).status, 409);
    }
    console.log('✔ A cycle is registered only when the chain matches the group\'s accepted obligations');
  }

  // ===========================================================================================
  // 6. A DATABASE OUTAGE IS AN ERROR, NEVER AN EMPTY RESULT
  // ===========================================================================================
  {
    // Before this was fixed, a failed read answered "you have no groups / no cycles" (200, empty), and the app
    // then replaced the user's cached data with nothing.
    const down = async (tables: string[], run: (db: any) => Promise<unknown>, label: string) => {
      const db: any = seedDb();
      db.tables.obligations = [obligation()];
      tables.forEach((t) => db.failing.add(t));
      await assert.rejects(() => run(db), (err: any) => err?.name === 'DatabaseUnavailableError', `${label} must raise, not return empty`);
    };

    await down(['group_members'], (db) => listGroups(db, lc(alice)), 'listGroups (members down)');
    await down(['groups'], (db) => listGroups(db, lc(alice)), 'listGroups (groups down)');
    await down(['group_members'], (db) => listObligations(db, lc(alice)), 'listObligations (membership lookup down)');
    await down(['obligations'], (db) => listObligations(db, lc(alice)), 'listObligations (obligations down)');
    await down(['group_members'], (db) => listCycles(db, lc(alice)), 'listCycles (membership lookup down)');
    await down(['cycles'], (db) => listCycles(db, lc(alice)), 'listCycles (cycles down)');

    // A failed read is not "not found": the status change must raise, not answer 404.
    {
      const db: any = seedDb();
      const o = obligation();
      db.tables.obligations = [o];
      db.failing.add('obligations');
      await assert.rejects(
        async () => changeObligationStatus(db, await signedAction(bob, 'accept', o.id)),
        (err: any) => err?.name === 'DatabaseUnavailableError',
        'status change with the database down'
      );
    }
    console.log('✔ Database outages raise errors instead of returning empty results');
  }

  console.log('\nAll API security checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
