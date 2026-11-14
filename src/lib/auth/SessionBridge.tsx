'use client';

import { useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { setSessionSigner } from './clientSession';

/**
 * Hands the connected wallet to the session module so API reads can sign in on demand.
 * Renders nothing and never prompts by itself: the prompt appears only when a page first asks for private data.
 */
export function SessionBridge() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    if (isConnected && address) {
      setSessionSigner({ address, sign: (message) => signMessageAsync({ message }) });
    } else {
      setSessionSigner(null);
    }
    return () => setSessionSigner(null);
  }, [isConnected, address, signMessageAsync]);

  return null;
}
