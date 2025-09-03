// Re-export the unified wallet hook from WalletContext
export { useWallet } from '@/contexts/WalletContext'

// Legacy hook for backward compatibility (deprecated)
import { useAccount, useConfig, useBalance } from 'wagmi'

/**
 * @deprecated Use the unified useWallet hook from WalletContext instead
 * This hook only works with EVM wallets and will be removed in a future version
 */
export function useEvmWallet() {
  const account = useAccount()
  const config = useConfig()
  const { data: balance } = useBalance({
    address: account.address,
  })

  return {
    address: account.address,
    isConnecting: account.status === 'connecting',
    isDisconnected: account.status === 'disconnected',
    chain: config.chains.find(c => c.id === config.state.chainId),
    balance,
    isConnected: account.status === 'connected',
  }
} 