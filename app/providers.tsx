'use client'

import * as React from 'react'
import {
  RainbowKitProvider,
  getDefaultConfig,
  darkTheme,
} from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { /* mainnet, polygon, optimism, */ arbitrum, /* base, zora, */ bscTestnet } from 'viem/chains'
import { hyperEVM } from '@/config/customChains'
import { SUPPORTED_NETWORKS } from '@/config/networks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NearWalletProvider } from '@/contexts/NearWalletContext'
import { WalletProvider } from '@/contexts/WalletContext'

if (!process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID) {
  throw new Error('You need to provide NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID env variable')
}

// Extract the custom BSC chain from our networks config
const customBSC = SUPPORTED_NETWORKS[56].chain
const customAuroraTestnet = SUPPORTED_NETWORKS[1313161555].chain
const theta = SUPPORTED_NETWORKS[361].chain
const soneium = SUPPORTED_NETWORKS[1868].chain
const config = getDefaultConfig({
  appName: 'MintroAI DApp',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  chains: [/* mainnet, polygon, optimism, */ arbitrum, /* base, zora, */ customBSC, hyperEVM, soneium, theta, bscTestnet, customAuroraTestnet],
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
            <WalletProvider>
              {mounted && children}
            </WalletProvider>
          </NearWalletProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
} 