'use client';

import { useCallback, useReducer, useRef } from 'react';
import { txReducer, type MezoTxState } from './txMachine';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePublicClient, useWriteContract } from 'wagmi';
import { erc20Abi, type Address, type Hex } from 'viem';
import { MEZO_MAINNET_CHAIN_ID, MEZO_MAINNET_MUSD } from '../chain/config';
import { planBorrow, type BorrowPlan } from './borrow';
import { buildWithdrawHints, readMusdAllowance, readProtocolParams, readSavings, readTrove } from './chain';
import { MEZO_PROTOCOL, borrowerOperationsAbi, savingsVaultAbi } from './protocol';

/** Live Mezo protocol state for one wallet. Read-only: nothing here can move funds. */
export function useMezoFunding(owner?: Address) {
  const client = usePublicClient({ chainId: MEZO_MAINNET_CHAIN_ID });

  const params = useQuery({
    queryKey: ['mezo', 'params'],
    queryFn: () => readProtocolParams(client!),
    enabled: !!client,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const trove = useQuery({
    queryKey: ['mezo', 'trove', owner],
    queryFn: () => readTrove(client!, owner!),
    enabled: !!client && !!owner,
    refetchInterval: 30_000,
  });
  const savings = useQuery({
    queryKey: ['mezo', 'savings', owner],
    queryFn: () => readSavings(client!, owner!),
    enabled: !!client && !!owner,
    refetchInterval: 30_000,
  });
  const allowance = useQuery({
    queryKey: ['mezo', 'vault-allowance', owner],
    queryFn: () => readMusdAllowance(client!, owner!, MEZO_PROTOCOL.savingsVault, MEZO_MAINNET_MUSD),
    enabled: !!client && !!owner,
  });

  const isLoading = params.isLoading || trove.isLoading || savings.isLoading;
  const error = params.error || trove.error || savings.error;
  const refetch = () => Promise.all([params.refetch(), trove.refetch(), savings.refetch(), allowance.refetch()]);

  return {
    params: params.data,
    trove: trove.data,
    savings: savings.data,
    vaultAllowance: allowance.data ?? 0n,
    isLoading,
    hasError: !!error && !isLoading,
    refetch,
  };
}

export type { MezoTxState } from './txMachine';

/** Plain-language messages only: no stack traces, contract internals or RPC details reach the screen. */
export function sanitizeMezoError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  if (/user rejected|user denied|rejected the request/i.test(msg)) return 'Cancelled in your wallet. Nothing was sent.';
  if (/insufficient funds/i.test(msg)) return 'Not enough BTC for gas on Mezo Mainnet.';
  if (err instanceof NetteoGuardError) return err.message;
  return 'Mezo did not accept this transaction, so nothing was sent. Your position is unchanged. Refresh and try again.';
}

/** Raised by our own pre-flight checks, whose messages are written for users. */
export class NetteoGuardError extends Error {}

export function useMezoActions(owner: Address | undefined, onConfirmed?: () => void) {
  const client = usePublicClient({ chainId: MEZO_MAINNET_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const [tx, dispatch] = useReducer(txReducer, { status: 'idle' } as MezoTxState);
  const busy = useRef(false); // blocks a second submit before React re-renders

  const run = useCallback(
    async (label: string, send: () => Promise<Hex>) => {
      if (busy.current) return;
      if (!client || !owner) {
        dispatch({ type: 'failed', label, message: 'Connect your wallet on Mezo Mainnet first.' });
        return;
      }
      busy.current = true;
      dispatch({ type: 'start', label });
      try {
        const hash = await send();
        dispatch({ type: 'submitted', hash });
        const receipt = await client.waitForTransactionReceipt({ hash });
        if (receipt.status !== 'success') throw new NetteoGuardError('The transaction was mined but reverted. Nothing changed.');
        dispatch({ type: 'confirmed' });
        await queryClient.invalidateQueries({ queryKey: ['mezo'] });
        onConfirmed?.();
      } catch (err) {
        dispatch({ type: 'failed', label, message: sanitizeMezoError(err) });
      } finally {
        busy.current = false;
      }
    },
    [client, owner, queryClient, onConfirmed]
  );

  /**
   * Borrow `amount` MUSD against the wallet's existing BTC loan. Everything is re-read and re-checked at click
   * time (a plan built a minute ago can be stale), then simulated, before the wallet is asked to sign.
   */
  const borrow = (amount: bigint) =>
    run('Borrow MUSD', async () => {
      const [params, trove] = await Promise.all([readProtocolParams(client!), readTrove(client!, owner!)]);
      const plan: BorrowPlan = planBorrow(amount, trove, params);
      if (plan.kind === 'no-trove') throw new NetteoGuardError('This wallet has no active BTC loan on Mezo.');
      if (plan.kind === 'recovery-mode') throw new NetteoGuardError('Mezo is in Recovery Mode, so new borrowing is paused.');
      if (plan.kind === 'unsafe') {
        throw new NetteoGuardError('Prices moved: this borrow would now leave your loan under the 150% safety floor. Review again.');
      }
      const hints = await buildWithdrawHints(client!, trove.coll, plan.newDebt);
      const { request } = await client!.simulateContract({
        account: owner,
        address: MEZO_PROTOCOL.borrowerOperations,
        abi: borrowerOperationsAbi,
        functionName: 'withdrawMUSD',
        args: [amount, hints.upperHint, hints.lowerHint],
      });
      return writeContractAsync(request);
    });

  const withdrawSavings = (amount: bigint) =>
    run('Withdraw from Savings', async () => {
      const { request } = await client!.simulateContract({
        account: owner,
        address: MEZO_PROTOCOL.savingsVault,
        abi: savingsVaultAbi,
        functionName: 'withdraw',
        args: [amount],
      });
      return writeContractAsync(request);
    });

  const approveVault = (amount: bigint) =>
    run('Approve MUSD for Savings', async () => {
      const { request } = await client!.simulateContract({
        account: owner,
        address: MEZO_MAINNET_MUSD,
        abi: erc20Abi,
        functionName: 'approve',
        args: [MEZO_PROTOCOL.savingsVault, amount],
      });
      return writeContractAsync(request);
    });

  const depositSavings = (amount: bigint) =>
    run('Deposit to Savings', async () => {
      const { request } = await client!.simulateContract({
        account: owner,
        address: MEZO_PROTOCOL.savingsVault,
        abi: savingsVaultAbi,
        functionName: 'deposit',
        args: [amount],
      });
      return writeContractAsync(request);
    });

  const claimYield = () =>
    run('Claim yield', async () => {
      const { request } = await client!.simulateContract({
        account: owner,
        address: MEZO_PROTOCOL.savingsVault,
        abi: savingsVaultAbi,
        functionName: 'claimYield',
      });
      return writeContractAsync(request);
    });

  return { tx, reset: () => dispatch({ type: 'reset' }), borrow, withdrawSavings, approveVault, depositSavings, claimYield };
}
