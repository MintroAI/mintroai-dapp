'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Button } from '@/components/ui/button'
import { Wallet, ChevronDown, LogOut } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useWallet } from '@/hooks/useWallet'
import { WalletErrorInline } from '@/components/WalletError'
import { useAuthentication } from '@/hooks/useAuthentication'

export function CustomConnectButton() {
  const [showWalletMenu, setShowWalletMenu] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [hasTriggeredAuth, setHasTriggeredAuth] = useState(false)
  const [userCancelledAuth, setUserCancelledAuth] = useState(false)
  
  const { wallet, connectNEAR, disconnect, clearError } = useWallet()
  const { 
    isAuthenticated, 
    authenticate, 
    logout: authLogout, 
    reset: resetAuth, 
    authError,
    retryCount,
    maxRetries,
    isRateLimited
  } = useAuthentication()

  // Auto-trigger authentication for both EVM and NEAR wallets
  useEffect(() => {
    const triggerAuth = async () => {
      // Prevent infinite loop - check retry limits and rate limiting
      if (retryCount >= maxRetries) {
        console.log('🛑 Max retries reached, stopping auto-authentication')
        return
      }

      if (isRateLimited) {
        console.log('⏳ Rate limited, skipping authentication attempt')
        return
      }

      if (wallet.isConnected && wallet.activeWallet && !isAuthenticated && !hasTriggeredAuth && !userCancelledAuth) {
        console.log(`🔐 ${wallet.activeWallet.type.toUpperCase()} wallet connected:`, wallet.activeWallet.address)
        console.log('📡 Backend URL:', process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000')
        console.log(`🚀 Starting authentication flow... (Attempt ${retryCount + 1}/${maxRetries})`)
        
        setHasTriggeredAuth(true)
        
        setTimeout(async () => {
          try {
            const success = await authenticate()
            console.log('✅ Authentication result:', success)
            
            if (!success) {
              if (authError?.code === 'USER_CANCELLED') {
                console.log('❌ User cancelled authentication')
                setUserCancelledAuth(true)
              } else {
                console.log('❌ Authentication failed:', authError)
                // Only disconnect EVM wallets on auth failure
                // NEAR wallets can work without auth
                if (wallet.activeWallet?.type === 'evm') {
                  await disconnect()
                }
              }
              setHasTriggeredAuth(false)
            } else {
              console.log('🎉 Authentication successful!')
            }
          } catch (error) {
            console.error('❌ Authentication error:', error)
            setHasTriggeredAuth(false)
          }
        }, 500)
      }
    }
    
    triggerAuth()
  }, [wallet.isConnected, wallet.activeWallet, isAuthenticated, hasTriggeredAuth, userCancelledAuth, authenticate, disconnect, authError, retryCount, maxRetries, isRateLimited])

  // Reset auth trigger flag when wallet disconnects
  useEffect(() => {
    if (!wallet.isConnected) {
      setHasTriggeredAuth(false)
      setUserCancelledAuth(false)
    }
  }, [wallet.isConnected])

  // Handle wallet menu click outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showWalletMenu) {
        setShowWalletMenu(false)
      }
    }

    if (showWalletMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showWalletMenu])

  const handleDisconnect = useCallback(async () => {
    try {
      setIsDisconnecting(true)
      if (isAuthenticated) {
        await authLogout()
      }
      await disconnect()
      resetAuth()
    } catch (error) {
      console.error('Disconnect error:', error)
    } finally {
      setIsDisconnecting(false)
    }
  }, [isAuthenticated, authLogout, disconnect, resetAuth])

  const handleConnectNEAR = useCallback(async () => {
    setShowWalletMenu(false)
    await connectNEAR()
  }, [connectNEAR])

  // If wallet is connected
  if (wallet.isConnected && wallet.activeWallet) {
    return (
      <div className="flex items-center gap-2">
        {wallet.error && (
          <WalletErrorInline
            error={wallet.error}
            onRetry={wallet.activeWallet?.type === 'near' ? connectNEAR : undefined}
            onDismiss={clearError}
          />
        )}

        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-primary/50 hover:bg-primary/10 hover:border-primary transition-all duration-300"
        >
          <Wallet className="w-4 h-4" />
          <div className="flex flex-col items-start">
            <span className="text-xs">
              {wallet.activeWallet.address.slice(0, 8)}...{wallet.activeWallet.address.slice(-6)}
            </span>
            {wallet.activeWallet.balance && (
              <span className="text-xs text-primary">
                {wallet.activeWallet.balance}
              </span>
            )}
            {wallet.activeWallet.chainName && (
              <span className="text-xs text-muted-foreground">
                {wallet.activeWallet.chainName}
              </span>
            )}
          </div>
        </Button>
        
        <Button
          onClick={handleDisconnect}
          disabled={isDisconnecting}
          variant="outline"
          size="sm"
          className="gap-2 border-red-500/50 hover:bg-red-500/10 hover:border-red-500 transition-all duration-300 disabled:opacity-50"
        >
          <LogOut className="w-4 h-4" />
          {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
        </Button>
      </div>
    )
  }

  // If connecting
  if (wallet.isConnecting) {
    return (
      <Button
        variant="outline"
        disabled
        className="gap-2 border-primary/50"
      >
        <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        Connecting...
      </Button>
    )
  }

  // Show wallet selection menu
  return (
    <div className="relative">
      {wallet.error && (
        <div className="absolute top-full mt-2 left-0 z-50 w-full min-w-[300px]">
          <WalletErrorInline
            error={wallet.error}
            onRetry={() => clearError()}
            onDismiss={clearError}
          />
        </div>
      )}

      <Button
        onClick={(e) => {
          e.stopPropagation()
          setShowWalletMenu(!showWalletMenu)
        }}
        variant="outline"
        className="gap-2 border-primary/50 hover:bg-primary/10 hover:border-primary transition-all duration-300"
      >
        <Wallet className="w-4 h-4" />
        Connect Wallet
        <ChevronDown className="w-4 h-4" />
      </Button>
      
      {showWalletMenu && (
        <div className="absolute top-full mt-2 left-0 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-2xl z-50 w-full min-w-[200px]">
          <div className="p-2">
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <Button
                  onClick={() => {
                    setShowWalletMenu(false)
                    openConnectModal()
                  }}
                  disabled={!wallet.available.evm}
                  variant="ghost"
                  className="w-full justify-start gap-3 h-10 hover:bg-gray-800/60 px-3 py-2 text-white rounded-lg transition-all duration-200 disabled:opacity-50"
                >
                  <div className="w-6 h-6 flex items-center justify-center bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-lg border border-orange-500/30">
                    <span className="text-lg">🦊</span>
                  </div>
                  <div className="font-medium text-sm text-white">
                    EVM Wallet
                    {!wallet.available.evm && (
                      <span className="text-xs text-red-400 block">Not Available</span>
                    )}
                  </div>
                </Button>
              )}
            </ConnectButton.Custom>
            
            <div className="h-px bg-gradient-to-r from-transparent via-gray-700/50 to-transparent my-1"></div>
            
            <Button
              onClick={handleConnectNEAR}
              disabled={!wallet.available.near}
              variant="ghost"
              className="w-full justify-start gap-3 h-10 hover:bg-gray-800/60 px-3 py-2 text-white rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              <div className="w-6 h-6 flex items-center justify-center bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg border border-green-500/30">
                <Image 
                  src="/assets/near-protocol-near-logo.svg"
                  alt="NEAR Protocol"
                  width={16}
                  height={16}
                  className="w-4 h-4 opacity-80"
                />
              </div>
              <div className="font-medium text-sm text-white">
                NEAR Protocol
                {!wallet.available.near && (
                  <span className="text-xs text-red-400 block">Not Available</span>
                )}
              </div>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
