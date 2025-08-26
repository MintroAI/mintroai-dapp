import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Button } from '@/components/ui/button'
import { Wallet, ChevronDown, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useNearWallet } from '@/contexts/NearWalletContext'

export function CustomConnectButton() {
  const [showWalletMenu, setShowWalletMenu] = useState(false)
  const { signIn, accountId, isConnected: nearConnected, signOut } = useNearWallet()
  const [balance, setBalance] = useState<string | null>(null)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  // Fetching balance when account is connected
  useEffect(() => {
    const fetchBalance = async () => {
      if (accountId) {
        try {
          const network = process.env.NODE_ENV === 'production' ? 'mainnet' : 'testnet'
          const rpcUrl = network === 'mainnet' 
            ? 'https://rpc.mainnet.near.org' 
            : 'https://rpc.testnet.near.org'
          
          const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 'dontcare',
              method: 'query',
              params: {
                request_type: 'view_account',
                finality: 'final',
                account_id: accountId,
              },
            }),
          })

          const data = await response.json()
          if (data.result && data.result.amount) {
            // Converting yoctoNEAR to NEAR
            const nearBalance = (parseFloat(data.result.amount) / Math.pow(10, 24)).toFixed(2)
            setBalance(nearBalance)
          }
        } catch (error) {
          setBalance(null)
        }
      } else {
        setBalance(null)
      }
    }

    fetchBalance()
  }, [accountId])

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

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true)
      await signOut()
      // Small delay then refresh 
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('Disconnect error:', error)
      // Force refresh if disconnect fails
      window.location.reload()
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
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
          return null
        }

        return (
          <div className="flex items-center gap-2">
            {(() => {
              // If NEAR wallet is connected, show NEAR account info
              if (nearConnected && accountId) {
                return (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 border-primary/50 hover:bg-primary/10 hover:border-primary transition-all duration-300"
                    >
                      <Wallet className="w-4 h-4" />
                      <div className="flex flex-col items-start">
                        <span className="text-xs">
                          {accountId ? `${accountId.slice(0, 8)}...${accountId.slice(-6)}` : 'Connected'}
                        </span>
                        {balance && (
                          <span className="text-xs text-primary">
                            {balance} NEAR
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

              if (!mounted || !account || !chain) {
                return (
                  <div className="relative">
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
                      <div className="absolute top-full mt-2 left-0 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-2xl z-50 w-full">
                        <div className="p-2">
                          <Button
                            onClick={() => {
                              setShowWalletMenu(false)
                              openConnectModal()
                            }}
                            variant="ghost"
                            className="w-full justify-start gap-3 h-10 hover:bg-gray-800/60 px-3 py-2 text-white rounded-lg transition-all duration-200"
                          >
                            <div className="w-6 h-6 flex items-center justify-center bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-lg border border-orange-500/30">
                              <span className="text-lg">🦊</span>
                            </div>
                            <div className="font-medium text-sm text-white">MetaMask</div>
                          </Button>
                          
                          <div className="h-px bg-gradient-to-r from-transparent via-gray-700/50 to-transparent my-1"></div>
                          
                          <Button
                            onClick={() => {
                              setShowWalletMenu(false)
                              signIn()
                            }}
                            variant="ghost"
                            className="w-full justify-start gap-3 h-10 hover:bg-gray-800/60 px-3 py-2 text-white rounded-lg transition-all duration-200"
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
                            <div className="font-medium text-sm text-white">NEAR Protocol</div>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              }

              if (chain.unsupported) {
                return (
                  <Button
                    onClick={openChainModal}
                    variant="destructive"
                    className="gap-2"
                  >
                    <Wallet className="w-4 h-4" />
                    Wrong Network
                  </Button>
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
                    className="gap-2 border-primary/50 hover:bg-primary/10 hover:border-primary transition-all duration-300"
                  >
                    <Wallet className="w-4 h-4" />
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
  )
} 