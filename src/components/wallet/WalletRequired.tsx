'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import { Wallet } from 'lucide-react';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { openWalletModal } from './WalletConnectModal';
import styles from './WalletRequired.module.css';

/**
 * True when the user is in Live mode with no wallet. Live data is private to a wallet's groups, so an empty
 * list in that state means "not signed in", not "nothing here". A wallet that is still reconnecting is not
 * counted, to avoid flashing the prompt on every page load.
 */
export function useNeedsWallet(): boolean {
  const { mode } = useWorkspace();
  const { isConnected, status } = useAccount();
  return mode === 'live' && !isConnected && status !== 'connecting' && status !== 'reconnecting';
}

export function WalletRequiredState({ what }: { what: string }) {
  return (
    <div className={styles.state} role="status">
      <span className={styles.iconWrap}>
        <Icon icon={Wallet} size="lg" color="var(--color-wine)" />
      </span>
      <h2 className={styles.title}>Connect your wallet to see {what}</h2>
      <p className={styles.desc}>
        Your groups and claims are private to the wallets in them. Connect the wallet you use on Mezo Mainnet to load
        them, or switch to Demo to try Netteo with sample data.
      </p>
      <Button variant="primary" onClick={openWalletModal}>
        Connect Wallet
      </Button>
    </div>
  );
}
