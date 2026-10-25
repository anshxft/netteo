'use client';

import React, { useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, lightTheme, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { wagmiConfig } from './config';

import { WorkspaceProvider } from '@/features/workspace/WorkspaceContext';
import { useTheme } from '@/context/ThemeContext';

function RainbowKitWithTheme({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();

  return (
    <RainbowKitProvider
      theme={
        isDark
          ? darkTheme({
              accentColor: '#7F011F',
              accentColorForeground: '#FFFFFF',
              borderRadius: 'medium',
            })
          : lightTheme({
              accentColor: '#7F011F',
              accentColorForeground: '#FFFFFF',
              borderRadius: 'medium',
            })
      }
    >
      <WorkspaceProvider>{children}</WorkspaceProvider>
    </RainbowKitProvider>
  );
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitWithTheme>
          {children}
        </RainbowKitWithTheme>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
