'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Button } from '@/components/ui/button'
import { Wallet, ChevronDown, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useWallet } from '@/hooks/useWallet'
import { WalletErrorInline } from '@/components/WalletError'
import { useAuthentication } from '@/hooks/useAuthentication'

export function CustomConnectButton() {
  const [showWalletMenu, setShowWalletMenu] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [hasTriggeredAuth, setHasTriggeredAuth] = useState(false)
  const [userCancelledAuth, setUserCancelledAuth] = useState(false)
  
  // Use unified wallet system
  const { 
    wallet, 
    connectNEAR, 
    disconnect, 
    clearError 
  } = useWallet()
  
  // Use authentication hook
  const { 
    isAuthenticated,
    authenticate,
    logout: authLogout,
    reset: resetAuth
  } = useAuthentication()

  // Auto-trigger authentication when EVM wallet connects
  useEffect(() => {
    const triggerAuth = async () => {
      if (wallet.isConnected && wallet.activeWallet?.type === 'evm' && !isAuthenticated && !hasTriggeredAuth && !userCancelledAuth) {
        console.log('🔐 EVM wallet connected, starting authentication...')
        setHasTriggeredAuth(true)
        
        // Small delay to ensure wallet is fully connected
        setTimeout(async () => {
          const success = await authenticate()
          
          if (!success) {
            // Authentication failed or was cancelled
            console.log('❌ Authentication failed or cancelled, disconnecting wallet...')
            setUserCancelledAuth(true)
            
            // Immediately disconnect wallet if authentication fails
            await disconnect()
            setHasTriggeredAuth(false)
            setUserCancelledAuth(false)
          }
        }, 500)
      }
    }
    
    triggerAuth()
  }, [wallet.isConnected, wallet.activeWallet?.type, isAuthenticated, hasTriggeredAuth, userCancelledAuth, authenticate, disconnect])

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

  // Handle disconnect
  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true)
      // Logout from authentication first
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
  }



  // Handle NEAR wallet connection  
  const handleConnectNEAR = async () => {
    setShowWalletMenu(false)
    await connectNEAR()
  }

  // If wallet is connected, show wallet info
  if (wallet.isConnected && wallet.activeWallet) {
    return (
      <>
        <div className="flex items-center gap-2">
          {/* Show error if any */}
          {wallet.error && (
            <WalletErrorInline
              error={wallet.error}
              onRetry={wallet.activeWallet?.type === 'near' ? connectNEAR : undefined}
              onDismiss={clearError}
            />
          )}



          {/* Wallet Info */}
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
        
          {/* Disconnect Button */}
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
      </>
    )
  }

  // If connecting, show loading state
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
      {/* Show error if any */}
      {wallet.error && (
        <div className="absolute top-full mt-2 left-0 z-50 w-full min-w-[300px]">
          <WalletErrorInline
            error={wallet.error}
            onRetry={() => {
              // Retry last attempted connection type
              // For now, just clear error and let user try again
              clearError()
            }}
            onDismiss={clearError}
          />
        </div>
      )}

      {/* Connect Button */}
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
      
      {/* Wallet Selection Menu */}
      {showWalletMenu && (
        <div className="absolute top-full mt-2 left-0 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-2xl z-50 w-full min-w-[200px]">
          <div className="p-2">
            {/* EVM Wallet Option - Use RainbowKit's ConnectButton */}
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
            
            {/* NEAR Wallet Option */}
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

// For EVM-specific connections that need RainbowKit modal
export function EVMConnectButton() {
  return (
    <ConnectButton.Custom>
      {({ openConnectModal }) => (
        <Button
          onClick={openConnectModal}
          variant="outline"
          className="gap-2 border-primary/50 hover:bg-primary/10 hover:border-primary transition-all duration-300"
        >
          <Wallet className="w-4 h-4" />
          Connect EVM Wallet
        </Button>
      )}
    </ConnectButton.Custom>
  )
}
