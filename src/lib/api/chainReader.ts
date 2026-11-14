import { createPublicClient, type Address, type Hex } from 'viem';
import { mezoMainnet } from '@/lib/chain/config';
import { settlementKernelAbi } from '@/lib/chain/abi';
import { mezoTransport } from '@/lib/chain/transport';
import { ChainUnavailableError } from './access';
import type { ChainReader } from './cycles';

/** Reads cycle data straight from a SettlementKernel on Mezo Mainnet. */
export function viemChainReader(): ChainReader {
  const client = createPublicClient({ chain: mezoMainnet, transport: mezoTransport() });
  const read = <T>(kernel: string, functionName: string, args: unknown[]) =>
    client.readContract({ address: kernel as Address, abi: settlementKernelAbi, functionName: functionName as any, args: args as any }) as Promise<T>;

  const isRevert = (err: any) => typeof err?.walk === 'function' && !!err.walk((e: any) => e?.name === 'ContractFunctionRevertedError');

  /** Any failure that is not a contract revert is a network problem, never a statement about the cycle. */
  const readOrUnavailable = async <T>(kernel: string, functionName: string, args: unknown[]): Promise<T> => {
    try {
      return await read<T>(kernel, functionName, args);
    } catch {
      throw new ChainUnavailableError();
    }
  };

  return {
    async getCycle(kernel, cycleId) {
      try {
        const r = await read<readonly unknown[]>(kernel, 'getCycle', [cycleId as Hex]);
        return {
          snapshotCommitment: r[0] as string,
          grossObligationTotal: r[2] as bigint,
          netDebtTotal: r[3] as bigint,
          fundingDeadline: r[7] as bigint,
          state: Number(r[8]),
          creator: r[9] as string,
        };
      } catch (err: any) {
        // A contract revert (CycleNotFound) means "no such cycle". Anything else must not be reported as "not found".
        if (isRevert(err)) return null;
        throw new ChainUnavailableError();
      }
    },
    async getParticipants(kernel, cycleId) {
      const [debtors, creditors] = await readOrUnavailable<readonly [string[], string[]]>(kernel, 'getCycleParticipants', [cycleId as Hex]);
      return { debtors: [...debtors], creditors: [...creditors] };
    },
    async getDebtorRequired(kernel, cycleId, debtor) {
      const r = await readOrUnavailable<readonly [bigint, bigint, boolean]>(kernel, 'getDebtorStatus', [cycleId as Hex, debtor as Address]);
      return r[0];
    },
    async getCreditorPayout(kernel, cycleId, creditor) {
      return readOrUnavailable<bigint>(kernel, 'getCreditorPayout', [cycleId as Hex, creditor as Address]);
    },
  };
}
