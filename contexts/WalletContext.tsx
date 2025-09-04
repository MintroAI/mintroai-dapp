'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAccount, useBalance, useChainId, useDisconnect } from 'wagmi'
import { useNearWallet } from './NearWalletContext'
import { 
  WalletState, 
  WalletContextType, 
  ActiveWallet, 
  WalletErrorState,
  WalletType,
  WalletError 
} from '@/types/wallet'

const WalletContext = createContext<WalletContextType | null>(null)

interface WalletProviderProps {
  children: React.ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
  // EVM Wallet State (Wagmi)
  const evmAccount = useAccount()
  const chainId = useChainId()
  const { data: evmBalance } = useBalance({
    address: evmAccount.address,
  })
  const { disconnect: disconnectEVM } = useDisconnect()

  // NEAR Wallet State
  const { 
    accountId: nearAccountId, 
    isConnected: nearConnected, 
    signIn: nearSignIn, 
    signOut: nearSignOut 
  } = useNearWallet()

  // Unified Wallet State
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    isConnecting: false,
    activeWallet: null,
    error: null,
    available: {
      evm: false,
      near: false
    }
  })

  // Detect available wallets
  useEffect(() => {
    const detectWallets = () => {
      const evmAvailable = typeof window !== 'undefined' && typeof window.ethereum !== 'undefined'
      const nearAvailable = true // NEAR wallet selector is always available
      
      setWalletState(prev => ({
        ...prev,
        available: {
          evm: evmAvailable,
          near: nearAvailable
        }
      }))
    }

    detectWallets()
  }, [])

  // Update wallet state based on EVM connection
  useEffect(() => {
    if (evmAccount.isConnected && evmAccount.address) {
      const activeWallet: ActiveWallet = {
        type: 'evm',
        address: evmAccount.address,
        balance: evmBalance ? `${parseFloat(evmBalance.formatted).toFixed(4)} ${evmBalance.symbol}` : null,
        chainId: chainId,
        chainName: evmAccount.chain?.name
      }

      setWalletState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        activeWallet,
        error: null
      }))
    } else if (evmAccount.isConnecting) {
      // Only set connecting state if not already connected or disconnected
      // This prevents stuck "connecting" state from RainbowKit's auto-connect
      if (!walletState.isConnected && !evmAccount.isDisconnected) {
        setWalletState(prev => ({
          ...prev,
          isConnecting: true,
          error: null
        }))
      }
    } else if (evmAccount.isDisconnected) {
      // Clear state when disconnected
      if (walletState.activeWallet?.type === 'evm' || walletState.isConnecting) {
        setWalletState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          activeWallet: null
        }))
      }
    }
  }, [evmAccount, evmBalance, chainId, walletState.activeWallet?.type, walletState.isConnected, walletState.isConnecting])

  // Update wallet state based on NEAR connection
  useEffect(() => {
    if (nearConnected && nearAccountId) {
      const activeWallet: ActiveWallet = {
        type: 'near',
        address: nearAccountId,
        balance: null // Will be fetched separately if needed
      }

      setWalletState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        activeWallet,
        error: null
      }))
    } else if (!nearConnected && walletState.activeWallet?.type === 'near') {
      setWalletState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        activeWallet: null
      }))
    }
  }, [nearConnected, nearAccountId, walletState.activeWallet?.type])

  // Error handler
  const handleError = useCallback((type: WalletError, message: string) => {
    const error: WalletErrorState = {
      type,
      message,
      timestamp: Date.now()
    }

    setWalletState(prev => ({
      ...prev,
      isConnecting: false,
      error
    }))
  }, [])

  // Connect EVM Wallet
  const connectEVM = useCallback(async () => {
    try {
      // If NEAR is connected, disconnect it first
      if (walletState.activeWallet?.type === 'near') {
        await nearSignOut()
      }

      if (!walletState.available.evm) {
        handleError('wallet_not_found', 'MetaMask or compatible wallet not found. Please install a Web3 wallet.')
        return
      }

      setWalletState(prev => ({ ...prev, isConnecting: true, error: null }))
      
      // Wagmi will handle the connection through RainbowKit
      // The useEffect above will update the state when connection succeeds
      
    } catch (error: any) {
      handleError('connection_rejected', error?.message || 'Failed to connect EVM wallet')
    }
  }, [walletState.activeWallet?.type, walletState.available.evm, nearSignOut, handleError])

  // Connect NEAR Wallet
  const connectNEAR = useCallback(async () => {
    try {
      // If EVM is connected, disconnect it first
      if (walletState.activeWallet?.type === 'evm') {
        disconnectEVM()
      }

      if (!walletState.available.near) {
        handleError('wallet_not_found', 'NEAR wallet not available')
        return
      }

      setWalletState(prev => ({ ...prev, isConnecting: true, error: null }))
      
      // Connect NEAR wallet
      nearSignIn()
      
    } catch (error: any) {
      handleError('connection_rejected', error?.message || 'Failed to connect NEAR wallet')
    }
  }, [walletState.activeWallet?.type, walletState.available.near, disconnectEVM, nearSignIn, handleError])

  // Disconnect current wallet
  const disconnect = useCallback(async () => {
    try {
      if (walletState.activeWallet?.type === 'evm') {
        disconnectEVM()
      } else if (walletState.activeWallet?.type === 'near') {
        await nearSignOut()
      }

      setWalletState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        activeWallet: null,
        error: null
      }))
    } catch (error: any) {
      handleError('unknown_error', error?.message || 'Failed to disconnect wallet')
    }
  }, [walletState.activeWallet?.type, disconnectEVM, nearSignOut, handleError])

  // Clear error
  const clearError = useCallback(() => {
    setWalletState(prev => ({ ...prev, error: null }))
  }, [])

  // Switch network (EVM only)
  const switchNetwork = useCallback(async (chainId: number) => {
    if (walletState.activeWallet?.type !== 'evm') {
      handleError('network_unsupported', 'Network switching is only available for EVM wallets')
      return
    }

    try {
      // This would be handled by wagmi/RainbowKit
      // Implementation depends on the specific network switching logic
      console.log('Switching to network:', chainId)
    } catch (error: any) {
      handleError('network_unsupported', error?.message || 'Failed to switch network')
    }
  }, [walletState.activeWallet?.type, handleError])

  const contextValue: WalletContextType = {
    wallet: walletState,
    connectEVM,
    connectNEAR,
    disconnect,
    clearError,
    switchNetwork
  }

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  )
}

// Custom hook to use wallet context
export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

// Export context for advanced usage
export { WalletContext }
