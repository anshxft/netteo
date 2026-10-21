import { createPublicClient, http, parseEventLogs, type Address } from 'viem';
import { mezoTestnet, MEZO_TESTNET_CHAIN_ID, CONTRACT_ADDRESSES } from '../chain/config';
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
 * Server-side event indexer worker for Netteo SettlementKernel on Mezo Testnet.
 * Conforms to architecture.md §8:
 * - Filter logs by SettlementKernel address and chain ID 31611.
 * - Idempotent event persistence keyed by (chain_id, transaction_hash, log_index).
 * - Updates read-optimized projections (cycle_projection, participant_position_projection).
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

  const startBlockEnv = BigInt(process.env.INDEXER_START_BLOCK || '0');
  const fromBlock = cursorData?.last_processed_block
    ? BigInt(cursorData.last_processed_block) + 1n
    : startBlockEnv;

  // 2. Get latest block from Mezo RPC
  const currentBlock = await client.getBlockNumber();
  if (fromBlock > currentBlock) {
    return {
      fromBlock,
      toBlock: currentBlock,
      logsCount: 0,
      eventsProcessed: 0,
      skipped: true,
      message: 'Indexer is already caught up to the latest block.',
    };
  }

  // Bound batch size to 2000 blocks to prevent RPC timeouts
  const maxBatch = 2000n;
  const toBlock = currentBlock > fromBlock + maxBatch ? fromBlock + maxBatch : currentBlock;

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

  for (const log of parsedLogs) {
    const txHash = log.transactionHash;
    const logIndex = log.logIndex;
    const blockNum = log.blockNumber;
    const eventName = log.eventName;
    const args = log.args as any;

    if (!txHash || logIndex === undefined || !blockNum) continue;

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
      console.error(`[Indexer] Failed to insert event ${eventName}:`, insertError.message);
      continue;
    }

    // Update Projections according to event type
    const cycleId = args.cycleId as string;

    if (eventName === 'CycleCreated' && cycleId) {
      await db.from('cycle_projection').upsert(
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
          creator: args.creator.toLowerCase(),
          last_updated_block: Number(blockNum),
        },
        { onConflict: 'cycle_id' }
      );
    } else if (eventName === 'DepositReceived' && cycleId) {
      const participant = (args.participant as string).toLowerCase();
      const amount = args.amount as bigint;
      const totalFunded = args.cycleTotalFunded as bigint;
      const participantTotal = args.totalFundedByParticipant as bigint;

      // Update cycle projection
      await db
        .from('cycle_projection')
        .update({
          total_funded: totalFunded.toString(),
          last_updated_block: Number(blockNum),
          last_updated_at: new Date().toISOString(),
        })
        .eq('cycle_id', cycleId);

      // Update participant position projection
      await db.from('participant_position_projection').upsert(
        {
          cycle_id: cycleId,
          participant_address: participant,
          position_type: 'debtor',
          funded_amount: participantTotal.toString(),
          required_amount: participantTotal.toString(), // will be exact or verified
          last_updated_block: Number(blockNum),
        },
        { onConflict: 'cycle_id,participant_address' }
      );
    } else if (eventName === 'CycleReadyToSettle' && cycleId) {
      await db
        .from('cycle_projection')
        .update({
          state: 'ReadyToSettle',
          last_updated_block: Number(blockNum),
          last_updated_at: new Date().toISOString(),
        })
        .eq('cycle_id', cycleId);
    } else if (eventName === 'CycleSettled' && cycleId) {
      await db
        .from('cycle_projection')
        .update({
          state: 'Completed',
          total_distributed: args.totalDistributed.toString(),
          last_updated_block: Number(blockNum),
          last_updated_at: new Date().toISOString(),
        })
        .eq('cycle_id', cycleId);
    } else if (eventName === 'CycleExpired' && cycleId) {
      await db
        .from('cycle_projection')
        .update({
          state: 'Expired',
          last_updated_block: Number(blockNum),
          last_updated_at: new Date().toISOString(),
        })
        .eq('cycle_id', cycleId);
    } else if (eventName === 'RefundClaimed' && cycleId) {
      const participant = (args.participant as string).toLowerCase();
      const amount = (args.amount as bigint).toString();

      await db
        .from('cycle_projection')
        .update({
          last_updated_block: Number(blockNum),
          last_updated_at: new Date().toISOString(),
        })
        .eq('cycle_id', cycleId);

      await db
        .from('participant_position_projection')
        .update({
          refunded_amount: amount,
          last_updated_block: Number(blockNum),
        })
        .eq('cycle_id', cycleId)
        .eq('participant_address', participant);
    }

    processedCount++;
  }

  // 5. Update indexer cursor
  await db.from('indexer_cursor').upsert(
    {
      id: cursorId,
      chain_id: MEZO_TESTNET_CHAIN_ID,
      contract_address: contractAddress.toLowerCase(),
      last_processed_block: Number(toBlock),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  return {
    fromBlock,
    toBlock,
    logsCount: rawLogs.length,
    eventsProcessed: processedCount,
    skipped: false,
  };
}
