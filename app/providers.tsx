'use client'

import * as React from 'react'
import {
  RainbowKitProvider,
  getDefaultConfig,
  darkTheme,
} from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { /* mainnet, polygon, optimism, */ arbitrum, /* base, zora, */ bsc, bscTestnet, auroraTestnet } from 'viem/chains'
import { hyperEVM } from '@/config/customChains'
import { SUPPORTED_NETWORKS } from '@/config/networks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NearWalletProvider } from '@/contexts/NearWalletContext'

if (!process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID) {
  throw new Error('You need to provide NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID env variable')
}

// Extract the custom BSC chain from our networks config
const customBSC = SUPPORTED_NETWORKS[56].chain

const config = getDefaultConfig({
  appName: 'MintroAI DApp',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  chains: [/* mainnet, polygon, optimism, */ arbitrum, /* base, zora, */ customBSC, bscTestnet, auroraTestnet, hyperEVM],
  ssr: true,
  appIcon: '/assets/logo-small.png',
})

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()} modalSize="compact">
          <NearWalletProvider>
            {mounted && children}
          </NearWalletProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
} 