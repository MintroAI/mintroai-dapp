import { useEffect, useState } from 'react'
import { useAccount, useConfig, useBalance } from 'wagmi'

export function useWallet() {
  const account = useAccount()
  const config = useConfig()
  const { data: balance } = useBalance({
    address: account.address,
  })
  
  const [connectionState, setConnectionState] = useState<{
    isConnecting: boolean
    hasConnected: boolean
    lastError: string | null
    errorType: 'connection' | 'network' | 'rejection' | 'timeout' | null
    retryCount: number
    userInitiated: boolean
  }>({
    isConnecting: false,
    hasConnected: false,
    lastError: null,
    errorType: null,
    retryCount: 0,
    userInitiated: false
  })

  useEffect(() => {
    // Account change handler with enhanced error handling
    if (account.status === 'connecting') {
      setConnectionState(prev => ({
        ...prev,
        isConnecting: true,
        lastError: null,
        errorType: null
      }))
      console.log('Wallet connecting...')
      
      // Set timeout for connection
      const timeout = setTimeout(() => {
        if (account.status === 'connecting') {
          setConnectionState(prev => ({
            ...prev,
            isConnecting: false,
            lastError: 'Connection timeout. Please try again.',
            errorType: 'timeout'
          }))
        }
      }, 30000) // 30 second timeout
      
      return () => clearTimeout(timeout)
    } else if (account.status === 'connected') {
      setConnectionState(prev => ({
        ...prev,
        isConnecting: false,
        hasConnected: true,
        lastError: null,
        errorType: null,
        retryCount: 0
      }))
      console.log('Wallet connected:', account.address)
    } else if (account.status === 'disconnected') {
      // Check if this was an error disconnection
      if (connectionState.isConnecting) {
        setConnectionState(prev => ({
          ...prev,
          isConnecting: false,
          hasConnected: false,
          lastError: 'Connection was rejected or failed. Please try again.',
          errorType: 'rejection'
        }))
      } else {
        setConnectionState(prev => ({
          ...prev,
          isConnecting: false,
          hasConnected: false,
          lastError: null,
          errorType: null
        }))
      }
      console.log('Wallet disconnected')
    }
  }, [account.status, account.address, connectionState.isConnecting])

  useEffect(() => {
    // Network change handler
    const chain = config.chains.find(c => c.id === config.state.chainId)
    if (chain) {
      console.log('Network changed:', chain.name)
    }
  }, [config.state.chainId, config.chains])

  // Retry connection function
  const retryConnection = () => {
    setConnectionState(prev => ({
      ...prev,
      lastError: null,
      errorType: null,
      retryCount: prev.retryCount + 1,
      userInitiated: true
    }))
  }

  // Clear error function
  const clearError = () => {
    setConnectionState(prev => ({
      ...prev,
      lastError: null,
      errorType: null
    }))
  }

  return {
    address: account.address,
    isConnecting: connectionState.userInitiated && (connectionState.isConnecting || account.status === 'connecting'),
    isDisconnected: account.status === 'disconnected',
    isConnected: account.status === 'connected',
    hasConnected: connectionState.hasConnected,
    lastError: connectionState.lastError,
    errorType: connectionState.errorType,
    retryCount: connectionState.retryCount,
    chain: config.chains.find(c => c.id === config.state.chainId),
    balance,
    // Connection status helpers
    isReady: account.status !== 'connecting' && account.status !== 'reconnecting',
    connectionStatus: account.status,
    // Error handling functions
    retryConnection,
    clearError,
  }
} 