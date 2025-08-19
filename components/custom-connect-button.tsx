import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Wallet, Loader2, CheckCircle, AlertCircle, RefreshCw, X, ChevronDown } from 'lucide-react'
import { useWallet } from '@/hooks/useWallet'
import { useEffect, useState } from 'react'

export function CustomConnectButton() {
  const { 
    isConnecting, 
    isConnected, 
    hasConnected, 
    address, 
    lastError, 
    errorType, 
    retryCount,
    retryConnection,
    clearError 
  } = useWallet()
  const [showSuccessAlert, setShowSuccessAlert] = useState(false)
  const [showWalletMenu, setShowWalletMenu] = useState(false)
  
  // Function to handle user-initiated connection
  const handleConnectClick = (openConnectModal: () => void) => {
    retryConnection() // This sets userInitiated to true
    openConnectModal()
    setShowWalletMenu(false) // Close menu after selection
  }

  // Handle wallet menu toggle
  const toggleWalletMenu = () => {
    setShowWalletMenu(!showWalletMenu)
  }

  // Handle NEAR wallet selection (placeholder)
  const handleNearWallet = () => {
    // TODO: Implement NEAR wallet connection
    console.log('NEAR wallet selected - not implemented yet')
    setShowWalletMenu(false)
  }
  
  // Show success alert when wallet connects
  useEffect(() => {
    if (isConnected && hasConnected && address) {
      setShowSuccessAlert(true)
      const timer = setTimeout(() => setShowSuccessAlert(false), 4000)
      return () => clearTimeout(timer)
    }
  }, [isConnected, hasConnected, address])

  // Close menu when clicking outside
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
  
  // Get error message and instructions based on error type
  const getErrorContent = () => {
    switch (errorType) {
      case 'rejection':
        return {
          title: 'Connection Rejected',
          message: 'You rejected the wallet connection. Please try again and approve the connection.',
          instruction: 'Click "Retry" and approve the connection in your wallet.'
        }
      case 'timeout':
        return {
          title: 'Connection Timeout',
          message: 'The connection took too long. Please check your wallet and try again.',
          instruction: 'Make sure your wallet is unlocked and try again.'
        }
      case 'network':
        return {
          title: 'Network Error',
          message: 'Wrong network detected. Please switch to a supported network.',
          instruction: 'Switch to Arbitrum or BSC Testnet in your wallet.'
        }
      default:
        return {
          title: 'Connection Error',
          message: lastError || 'An unknown error occurred.',
          instruction: 'Please try connecting again.'
        }
    }
  }

  const errorContent = getErrorContent()

  return (
    <div className="relative">
      {/* Success Alert */}
      {showSuccessAlert && (
        <Alert className="absolute top-full mt-2 z-50 border-green-200 bg-green-50 text-green-800 shadow-lg">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Wallet connected successfully! Address: {address?.slice(0, 6)}...{address?.slice(-4)}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {lastError && (
        <Alert className="absolute top-full mt-2 z-50 border-red-200 bg-red-50 text-red-800 shadow-lg min-w-80">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <strong>{errorContent.title}</strong>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="h-6 w-6 p-0 hover:bg-red-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="text-sm">{errorContent.message}</div>
            <div className="text-xs text-red-600">{errorContent.instruction}</div>
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  retryConnection()
                  clearError()
                }}
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry {retryCount > 0 && `(${retryCount})`}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}


    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted
        if (!ready) {
          return (
            <Button variant="outline" disabled className="gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </Button>
          )
        }

        return (
          <div className="flex items-center gap-2">
            {(() => {
              if (!mounted || !account || !chain) {
                return (
                  <div className="relative">
                    <Button
                      onClick={toggleWalletMenu}
                      variant="outline"
                      disabled={isConnecting}
                      className="gap-2 border-primary/50 hover:bg-primary/10 hover:border-primary transition-all duration-300"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Wallet className="w-4 h-4" />
                          Connect Wallet
                          <ChevronDown className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                    
                    {/* Wallet Selection Menu */}
                    {showWalletMenu && (
                      <div className="absolute top-full mt-2 right-0 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 min-w-56">
                        <div className="p-1">
                          <Button
                            onClick={() => handleConnectClick(openConnectModal)}
                            variant="ghost"
                            className="w-full justify-start gap-3 h-14 hover:bg-gray-800 p-3 text-white"
                          >
                            <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg">
                              <span className="text-white font-bold text-xs">EVM</span>
                            </div>
                            <div className="text-left flex-1">
                              <div className="font-medium text-sm text-white">EVM Wallets</div>
                              <div className="text-xs text-gray-400">MetaMask, WalletConnect</div>
                            </div>
                          </Button>
                          
                          <Button
                            onClick={handleNearWallet}
                            variant="ghost"
                            className="w-full justify-start gap-3 h-14 hover:bg-gray-800 p-3 text-white opacity-50"
                          >
                            <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-green-500 to-teal-600 rounded-lg">
                              <span className="text-white font-bold text-xs">NEAR</span>
                            </div>
                            <div className="text-left flex-1">
                              <div className="font-medium text-sm text-white">NEAR Protocol</div>
                              <div className="text-xs text-gray-400">Coming soon</div>
                            </div>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              }

              if (chain.unsupported) {
                return (
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={openChainModal}
                      variant="destructive"
                      className="gap-2 animate-pulse"
                    >
                      <AlertCircle className="w-4 h-4" />
                      Wrong Network
                    </Button>
                    <Alert className="border-orange-200 bg-orange-50 text-orange-800">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Please switch to Arbitrum or BSC Testnet
                      </AlertDescription>
                    </Alert>
                  </div>
                )
              }

              return (
                <>
                  <Button
                    onClick={openChainModal}
                    variant="outline"
                    size="sm"
                    className="gap-2 border-primary/50 hover:bg-primary/10 hover:border-primary transition-all duration-300"
                  >
                    {chain.hasIcon && (
                      <div className="w-4 h-4 overflow-hidden rounded-full">
                        {chain.iconUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            className="w-full h-full"
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </Button>

                  <Button
                    onClick={openAccountModal}
                    variant="outline"
                    size="sm"
                    className="gap-2 border-green-500/50 hover:bg-green-50 hover:border-green-500 transition-all duration-300"
                  >
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {account.displayBalance ? `${account.displayBalance}  ` : ''} 
                    {account.displayName}
                  </Button>
                </>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
    </div>
  )
} 