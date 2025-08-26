import { useEffect } from 'react'
import { useAccount, useConfig, useBalance } from 'wagmi'

export function useWallet() {
  const account = useAccount()
  const config = useConfig()
  const { data: balance } = useBalance({
    address: account.address,
  })

  useEffect(() => {
    // Account change handler
    // Wallet connection status changed
  }, [account.status, account.address])

  useEffect(() => {
    // Network change handler
    const chain = config.chains.find(c => c.id === config.state.chainId)
    // Network changed
  }, [config.state.chainId, config.chains])

  return {
    address: account.address,
    isConnecting: account.status === 'connecting',
    isDisconnected: account.status === 'disconnected',
    chain: config.chains.find(c => c.id === config.state.chainId),
    balance,
    isConnected: account.status === 'connected',
  }
} 