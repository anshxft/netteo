'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { AppHeader } from './AppHeader';
import { NetworkGuard } from '../wallet/NetworkGuard';
import { WalletConnectModal } from '../wallet/WalletConnectModal';
import { AlertTriangle, WifiOff } from 'lucide-react';
import { Icon } from '../icons/Icon';
import { DemoExplainerBanner } from '@/features/workspace/DemoExplainerBanner';

export interface AppLayoutProps {
  children: React.ReactNode;
  walletAddress?: string | null;
  chainId?: number | null;
  onConnectWallet?: () => void;
  onDisconnectWallet?: () => void;
}

export function AppLayout({
  children,
  walletAddress,
  chainId,
  onConnectWallet,
  onDisconnectWallet,
}: AppLayoutProps) {
  const { address: wagmiAddress, chainId: wagmiChainId, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Active address & chain fallbacks
  const activeAddress = walletAddress !== undefined ? walletAddress : (isConnected ? wagmiAddress : null);
  const activeChainId = chainId !== undefined ? chainId : wagmiChainId;
  const handleConnect = onConnectWallet || (() => setIsWalletModalOpen(true));
  const handleDisconnect = onDisconnectWallet || (() => disconnect());

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-page)',
        color: 'var(--color-ink)',
      }}
    >
      {/* Network Guard: Displays wrong-network warning if chain != 31611 */}
      <NetworkGuard />

      {/* Offline Banner (Prototype Checklist §4) */}
      {isOffline && (
        <aside
          role="alert"
          style={{
            backgroundColor: 'var(--color-warning-bg)',
            borderBottom: '1px solid var(--color-warning-border)',
            color: 'var(--color-warning)',
            padding: 'var(--space-xs) var(--space-xl)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-xs)',
            fontWeight: 500,
          }}
        >
          <Icon icon={WifiOff} size="sm" color="var(--color-warning)" />
          <span>You are currently offline. On-chain settlement transactions and ledger updates are queued.</span>
        </aside>
      )}

      {/* Header & Nav */}
      <AppHeader
        walletAddress={activeAddress}
        chainId={activeChainId}
        onConnectWallet={handleConnect}
        onDisconnectWallet={handleDisconnect}
      />

      {/* Demo Explainer Banner: Shows simple English netting breakdown in Demo Mode */}
      <DemoExplainerBanner />

      {/* Connect Wallet Modal */}
      <WalletConnectModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />

      {/* Main Content Landmark */}
      <main
        id="main-content"
        style={{
          flex: 1,
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: 'var(--space-2xl) var(--space-xl)',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </main>
    </div>
  );
}
