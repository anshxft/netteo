import { createPublicClient, http, parseEventLogs, type Address } from 'viem';
import {
  mezoTestnet,
  MEZO_TESTNET_CHAIN_ID,
  CONTRACT_ADDRESSES,
  CANONICAL_SETTLEMENT_KERNEL_DEPLOY_BLOCK,
  DEFAULT_INDEXER_CONFIRMATION_DEPTH,
} from '../chain/config';
import { settlementKernelAbi } from '../chain/abi';
import { getServiceRoleClient } from '../db/supabase';

export interface IndexerResult {
  fromBlock: bigint;
  toBlock: bigint;
  logsCount: number;
  eventsProcessed: number;
  skipped: boolean;
  message?: string;
}

/**
 * Apply state projection for a single parsed contract event into Supabase tables.
 * Separated as an exported unit for direct testability and replay safety.
 */
export async function applyEventProjection(
  db: any,
  client: any,
  contractAddress: string,
  log: { blockNumber: bigint; eventName: string; args: any }
): Promise<void> {
  const { blockNumber, eventName, args } = log;
  const cycleId = args.cycleId as string;
  if (!cycleId) return;

  const blockNum = Number(blockNumber);

  if (eventName === 'CycleCreated') {
    const { error } = await db.from('cycle_projection').upsert(
      {
        cycle_id: cycleId,
        chain_id: MEZO_TESTNET_CHAIN_ID,
        snapshot_commitment: args.snapshotCommitment,
        gross_obligation_total: args.grossObligationTotal.toString(),
        net_debt_total: args.netDebtTotal.toString(),
        total_funded: '0',
        total_distributed: '0',
        total_refunded: '0',
        funding_deadline: Number(args.fundingDeadline),
        state: 'Funding',
        creator: (args.creator as string).toLowerCase(),
        last_updated_block: blockNum,
      },
      { onConflict: 'cycle_id' }
    );
    if (error) throw new Error(`CycleCreated projection failed: ${error.message}`);

    // Initialize participant positions from contract if client is available
    if (client && typeof client.readContract === 'function') {
      try {
        const [debtors, creditors] = (await client.readContract({
          address: contractAddress as Address,
          abi: settlementKernelAbi,
          functionName: 'getCycleParticipants',
          args: [cycleId as `0x${string}`],
        })) as [Address[], Address[]];

        // 1. Initialize debtors with authoritative required amounts
        if (Array.isArray(debtors)) {
          for (const debtor of debtors) {
            const debtorAddr = debtor.toLowerCase();
            const debtorStatus = (await client.readContract({
              address: contractAddress as Address,
              abi: settlementKernelAbi,
              functionName: 'getDebtorStatus',
              args: [cycleId as `0x${string}`, debtor],
            })) as [bigint, bigint, boolean];

            const requiredAmount = debtorStatus?.[0] !== undefined ? debtorStatus[0].toString() : '0';
            const fundedAmount = debtorStatus?.[1] !== undefined ? debtorStatus[1].toString() : '0';
            const isFullyFunded = !!debtorStatus?.[2];

            const { error: debErr } = await db.from('participant_position_projection').upsert(
              {
                cycle_id: cycleId,
                participant_address: debtorAddr,
                position_type: 'debtor',
                required_amount: requiredAmount,
                funded_amount: fundedAmount,
                is_fully_funded: isFullyFunded,
                last_updated_block: blockNum,
              },
              { onConflict: 'cycle_id,participant_address' }
            );
            if (debErr) throw new Error(`CycleCreated debtor participant projection failed: ${debErr.message}`);
          }
        }

        // 2. Initialize creditors with calculated payout amounts
        if (Array.isArray(creditors)) {
          for (const creditor of creditors) {
            const creditorAddr = creditor.toLowerCase();
            const payout = (await client.readContract({
              address: contractAddress as Address,
              abi: settlementKernelAbi,
              functionName: 'getCreditorPayout',
              args: [cycleId as `0x${string}`, creditor],
            })) as bigint;

            const { error: credErr } = await db.from('participant_position_projection').upsert(
              {
                cycle_id: cycleId,
                participant_address: creditorAddr,
                position_type: 'creditor',
                required_amount: payout ? payout.toString() : '0',
                distributed_amount: '0',
                refunded_amount: '0',
                is_fully_funded: false,
                last_updated_block: blockNum,
              },
              { onConflict: 'cycle_id,participant_address' }
            );
            if (credErr) throw new Error(`CycleCreated creditor participant projection failed: ${credErr.message}`);
          }
        }
      } catch (readErr: any) {
        // Log cleanly without leaking internal internals
        console.warn(`[Indexer] Could not read cycle participants during CycleCreated:`, readErr?.message || readErr);
      }
    }
  } else if (eventName === 'DepositReceived') {
    // Aligns with SettlementKernel.sol: (cycleId, debtor, amount, totalDebtorFunded, totalCycleFunded)
    const debtor = (args.debtor as string).toLowerCase();
    const totalCycleFunded = (args.totalCycleFunded as bigint).toString();
    const totalDebtorFunded = (args.totalDebtorFunded as bigint).toString();

    // 1. Update cycle projection total funded
    const { error: cycleErr } = await db
      .from('cycle_projection')
      .update({
        total_funded: totalCycleFunded,
        last_updated_block: blockNum,
        last_updated_at: new Date().toISOString(),
      })
      .eq('cycle_id', cycleId);
    if (cycleErr) throw new Error(`DepositReceived cycle_projection failed: ${cycleErr.message}`);

    // 2. Fetch authoritative required debtor amount from contract if client is available
    let requiredAmount: string | null = null;
    let isFullyFunded = false;

    if (client && typeof client.readContract === 'function') {
      try {
        const debtorStatus = (await client.readContract({
          address: contractAddress as Address,
          abi: settlementKernelAbi,
          functionName: 'getDebtorStatus',
          args: [cycleId as `0x${string}`, args.debtor as Address],
        })) as [bigint, bigint, boolean];

        requiredAmount = debtorStatus[0].toString();
        isFullyFunded = debtorStatus[2];
      } catch (readErr: any) {
        console.warn(`[Indexer] Authoritative debtor read failed:`, readErr?.message || readErr);
      }
    }

    // If client read was not available or failed, check existing DB row to preserve required_amount
    if (!requiredAmount) {
      const { data: existingPos } = await db
        .from('participant_position_projection')
        .select('required_amount')
        .eq('cycle_id', cycleId)
        .eq('participant_address', debtor)
        .single();

      if (existingPos?.required_amount) {
        const reqStr = existingPos.required_amount.toString();
        requiredAmount = reqStr;
        isFullyFunded = BigInt(totalDebtorFunded) >= BigInt(reqStr);
      } else {
        // Fallback default: set to totalDebtorFunded with unverified status
        requiredAmount = totalDebtorFunded;
        isFullyFunded = false;
      }
    }

    // 3. Update participant position projection
    const { error: posErr } = await db.from('participant_position_projection').upsert(
      {
        cycle_id: cycleId,
        participant_address: debtor,
        position_type: 'debtor',
        funded_amount: totalDebtorFunded,
        required_amount: requiredAmount,
        is_fully_funded: isFullyFunded,
        last_updated_block: blockNum,
      },
      { onConflict: 'cycle_id,participant_address' }
    );
    if (posErr) throw new Error(`DepositReceived participant_position_projection failed: ${posErr.message}`);
  } else if (eventName === 'CycleReadyToSettle') {
    const totalFunded = args.totalFunded ? (args.totalFunded as bigint).toString() : undefined;
    const updates: Record<string, any> = {
      state: 'ReadyToSettle',
      last_updated_block: blockNum,
      last_updated_at: new Date().toISOString(),
    };
    if (totalFunded !== undefined) {
      updates.total_funded = totalFunded;
    }
    const { error } = await db
      .from('cycle_projection')
      .update(updates)
      .eq('cycle_id', cycleId);
    if (error) throw new Error(`CycleReadyToSettle projection failed: ${error.message}`);
  } else if (eventName === 'CycleSettled') {
    const totalDistributed = (args.totalDistributed as bigint).toString();
    const { error } = await db
      .from('cycle_projection')
      .update({
        state: 'Completed',
        total_distributed: totalDistributed,
        last_updated_block: blockNum,
        last_updated_at: new Date().toISOString(),
      })
      .eq('cycle_id', cycleId);
    if (error) throw new Error(`CycleSettled projection failed: ${error.message}`);

    // Update creditor distributed amounts in participant_position_projection if client is available
    if (client && typeof client.readContract === 'function') {
      try {
        const [, creditors] = (await client.readContract({
          address: contractAddress as Address,
          abi: settlementKernelAbi,
          functionName: 'getCycleParticipants',
          args: [cycleId as `0x${string}`],
        })) as [Address[], Address[]];

        if (Array.isArray(creditors)) {
          for (const creditor of creditors) {
            const creditorAddr = creditor.toLowerCase();
            const payout = (await client.readContract({
              address: contractAddress as Address,
              abi: settlementKernelAbi,
              functionName: 'getCreditorPayout',
              args: [cycleId as `0x${string}`, creditor],
            })) as bigint;

            const distributedAmount = payout ? payout.toString() : '0';
            await db
              .from('participant_position_projection')
              .update({
                distributed_amount: distributedAmount,
                last_updated_block: blockNum,
              })
              .eq('cycle_id', cycleId)
              .eq('participant_address', creditorAddr);
          }
        }
      } catch (readErr: any) {
        console.warn(`[Indexer] Could not read creditor payouts during CycleSettled:`, readErr?.message || readErr);
      }
    }
  } else if (eventName === 'CycleExpired') {
    const { error } = await db
      .from('cycle_projection')
      .update({
        state: 'Expired',
        last_updated_block: blockNum,
        last_updated_at: new Date().toISOString(),
      })
      .eq('cycle_id', cycleId);
    if (error) throw new Error(`CycleExpired projection failed: ${error.message}`);
  } else if (eventName === 'RefundClaimed') {
    const participant = (args.participant as string).toLowerCase();
    const amount = (args.amount as bigint).toString();

    const { error: cycleErr } = await db
      .from('cycle_projection')
      .update({
        last_updated_block: blockNum,
        last_updated_at: new Date().toISOString(),
      })
      .eq('cycle_id', cycleId);
    if (cycleErr) throw new Error(`RefundClaimed cycle_projection failed: ${cycleErr.message}`);

    const { error: posErr } = await db
      .from('participant_position_projection')
      .update({
        refunded_amount: amount,
        last_updated_block: blockNum,
      })
      .eq('cycle_id', cycleId)
      .eq('participant_address', participant);
    if (posErr) throw new Error(`RefundClaimed participant_position_projection failed: ${posErr.message}`);
  }
}

/**
 * Server-side event indexer worker for Netteo SettlementKernel on Mezo Testnet.
 * Conforms to architecture.md §8 & Prompt 5:
 * - Filter logs by SettlementKernel address and chain ID 31611.
 * - Reorg/confirmation window: only indexes blocks with at least N confirmations.
 * - Idempotent event persistence keyed by (chain_id, transaction_hash, log_index).
 * - Projection updates with strict failure atomicity: never advance cursor past a failed block.
 */
export async function runIndexerWorker(): Promise<IndexerResult> {
  const contractAddress = CONTRACT_ADDRESSES.settlementKernel;
  if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
    return {
      fromBlock: 0n,
      toBlock: 0n,
      logsCount: 0,
      eventsProcessed: 0,
      skipped: true,
      message: 'SettlementKernel contract address is not configured. Indexer skipped.',
    };
  }

  const db = getServiceRoleClient();
  if (!db) {
    return {
      fromBlock: 0n,
      toBlock: 0n,
      logsCount: 0,
      eventsProcessed: 0,
      skipped: true,
      message: 'Supabase service role credentials not configured. Indexer skipped.',
    };
  }

  const client = createPublicClient({
    chain: mezoTestnet,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.test.mezo.org'),
  });

  const cursorId = `mezo_testnet_${contractAddress.toLowerCase()}`;

  // 1. Retrieve last indexed block from cursor
  const { data: cursorData } = await db
    .from('indexer_cursor')
    .select('last_processed_block')
    .eq('id', cursorId)
    .single();

  const startBlockEnv = BigInt(
    process.env.INDEXER_START_BLOCK ||
    process.env.NEXT_PUBLIC_SETTLEMENT_KERNEL_DEPLOY_BLOCK ||
    CANONICAL_SETTLEMENT_KERNEL_DEPLOY_BLOCK.toString()
  );
  const fromBlock = cursorData?.last_processed_block !== undefined && cursorData?.last_processed_block !== null
    ? BigInt(cursorData.last_processed_block) + 1n
    : startBlockEnv;

  // 2. Reorg protection: require confirmation depth
  const confirmationDepth = BigInt(
    process.env.INDEXER_CONFIRMATION_DEPTH ||
    DEFAULT_INDEXER_CONFIRMATION_DEPTH.toString()
  );
  const currentBlock = await client.getBlockNumber();
  const safeTargetBlock = currentBlock > confirmationDepth ? currentBlock - confirmationDepth : currentBlock;

  if (fromBlock > safeTargetBlock) {
    return {
      fromBlock,
      toBlock: safeTargetBlock,
      logsCount: 0,
      eventsProcessed: 0,
      skipped: true,
      message: 'Indexer is already caught up to the latest confirmed block.',
    };
  }

  // Bound batch size to 2000 blocks to prevent RPC timeouts
  const maxBatch = 2000n;
  const toBlock = safeTargetBlock > fromBlock + maxBatch ? fromBlock + maxBatch : safeTargetBlock;

  // 3. Fetch contract logs
  const rawLogs = await client.getLogs({
    address: contractAddress,
    fromBlock,
    toBlock,
  });

  // 4. Parse known events via typed ABI
  const parsedLogs = parseEventLogs({
    abi: settlementKernelAbi,
    logs: rawLogs,
  });

  let processedCount = 0;
  let lastFullyCompletedBlock = fromBlock - 1n;
  let currentBlockUnderProcess: bigint | null = null;
  let batchError: Error | null = null;

  for (const log of parsedLogs) {
    const txHash = log.transactionHash;
    const logIndex = log.logIndex;
    const blockNum = log.blockNumber;
    const eventName = log.eventName;
    const args = log.args as any;

    if (!txHash || logIndex === undefined || !blockNum) continue;

    // Track block completion: when transitioning to a higher block, the previous block is fully done!
    if (currentBlockUnderProcess !== null && blockNum > currentBlockUnderProcess) {
      lastFullyCompletedBlock = currentBlockUnderProcess;
    }
    currentBlockUnderProcess = blockNum;

    try {
      // Idempotent record insert in indexed_events
      const { error: insertError } = await db.from('indexed_events').upsert(
        {
          chain_id: MEZO_TESTNET_CHAIN_ID,
          contract_address: contractAddress.toLowerCase(),
          block_number: Number(blockNum),
          transaction_hash: txHash,
          log_index: logIndex,
          event_name: eventName,
          event_data: JSON.parse(
            JSON.stringify(args, (_key, value) =>
              typeof value === 'bigint' ? value.toString() : value
            )
          ),
        },
        { onConflict: 'chain_id,transaction_hash,log_index', ignoreDuplicates: true }
      );

      if (insertError) {
        throw new Error(`Indexed event insert error: ${insertError.message}`);
      }

      // Update projections
      await applyEventProjection(db, client, contractAddress, {
        blockNumber: blockNum,
        eventName,
        args,
      });

      processedCount++;
    } catch (err: any) {
      console.error(`[Indexer] Failure at block ${blockNum} on event ${eventName}:`, err?.message || err);
      batchError = err;
      break; // Halt batch immediately; do NOT advance cursor past the failed block!
    }
  }

  // If no error occurred during processing:
  if (!batchError) {
    if (currentBlockUnderProcess !== null) {
      lastFullyCompletedBlock = currentBlockUnderProcess;
    } else {
      // No events in range: the entire range up to toBlock is completed
      lastFullyCompletedBlock = toBlock;
    }
  }

  // 5. Update indexer cursor: hold at lastFullyCompletedBlock on error, or advance to toBlock
  const cursorBlock = batchError ? lastFullyCompletedBlock : toBlock;

  if (cursorBlock >= fromBlock) {
    await db.from('indexer_cursor').upsert(
      {
        id: cursorId,
        chain_id: MEZO_TESTNET_CHAIN_ID,
        contract_address: contractAddress.toLowerCase(),
        last_processed_block: Number(cursorBlock),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  }

  if (batchError) {
    throw new Error(
      `Indexer batch failed during block ${currentBlockUnderProcess}. Cursor held safely at ${cursorBlock}: ${batchError.message}`
    );
  }

  return {
    fromBlock,
    toBlock,
    logsCount: rawLogs.length,
    eventsProcessed: processedCount,
    skipped: false,
  };
}
