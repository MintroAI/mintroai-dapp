// Wallet Types and Interfaces

export type WalletType = 'evm' | 'near'

export type WalletError = 
  | 'wallet_not_found'
  | 'connection_rejected'
  | 'network_unsupported'
  | 'insufficient_balance'
  | 'transaction_failed'
  | 'unknown_error'

export interface ActiveWallet {
  type: WalletType
  address: string
  balance: string | null
  chainId?: number        // EVM only
  chainName?: string      // EVM only
}

export interface WalletErrorState {
  type: WalletError
  message: string
  timestamp: number
}

export interface WalletState {
  // Connection Status
  isConnected: boolean
  isConnecting: boolean
  
  // Active Wallet (only one at a time)
  activeWallet: ActiveWallet | null
  
  // Error State
  error: WalletErrorState | null
  
  // Wallet Availability
  available: {
    evm: boolean
    near: boolean
  }
}

export interface WalletContextType {
  // State
  wallet: WalletState
  
  // Actions
  connectEVM: () => Promise<void>
  connectNEAR: () => Promise<void>
  disconnect: () => Promise<void>
  clearError: () => void
  
  // Utilities
  switchNetwork?: (chainId: number) => Promise<void>
}

// Event types for wallet state changes
export type WalletEvent = 
  | 'wallet_connected'
  | 'wallet_disconnected'
  | 'network_changed'
  | 'account_changed'
  | 'balance_updated'
  | 'error_occurred'

export interface WalletEventData {
  type: WalletEvent
  wallet?: ActiveWallet
  error?: WalletErrorState
  timestamp: number
}
