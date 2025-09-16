'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { setupWalletSelector } from '@near-wallet-selector/core'
import type { WalletSelector, WalletSelectorState } from '@near-wallet-selector/core'
import { setupModal } from '@near-wallet-selector/modal-ui'
import type { WalletSelectorModal } from '@near-wallet-selector/modal-ui'
import { setupMeteorWallet } from '@near-wallet-selector/meteor-wallet'
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet'
import { setupHereWallet } from '@near-wallet-selector/here-wallet'
import { setupSender } from '@near-wallet-selector/sender'

// NEAR Wallet Context Types
interface NearWalletContextType {
  selector: WalletSelector | null
  modal: WalletSelectorModal | null
  accounts: Array<{ accountId: string }> | null
  accountId: string | null
  isConnected: boolean
  isLoading: boolean
  signOut: () => Promise<void>
  signIn: () => void
}

const NearWalletContext = createContext<NearWalletContextType | null>(null)

// NEAR Configuration
const MPC_CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ID || 'v1.signer-prod.testnet'
const NETWORK_ID = process.env.NEXT_PUBLIC_NEAR_NETWORK_ID || 'testnet'

interface NearWalletProviderProps {
  children: ReactNode
}

export function NearWalletProvider({ children }: NearWalletProviderProps) {
  const [selector, setSelector] = useState<WalletSelector | null>(null)
  const [modal, setModal] = useState<WalletSelectorModal | null>(null)
  const [accounts, setAccounts] = useState<Array<{ accountId: string }> | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isConnected = !!accountId

  useEffect(() => {
    const initWalletSelector = async () => {
      try {
        setIsLoading(true)
        
        // Setup wallet selector
        const walletSelector = await setupWalletSelector({
          network: NETWORK_ID as 'testnet' | 'mainnet',
          modules: [
            setupMeteorWallet(),
            setupMyNearWallet(),
            setupHereWallet(),
            setupSender(),
          ],
        })

        // Setup modal
        const walletModal = setupModal(walletSelector, {
          contractId: MPC_CONTRACT,
        })

        setSelector(walletSelector)
        setModal(walletModal)
        
        // Expose selector globally for authentication
        if (typeof window !== 'undefined') {
          interface GlobalWindow extends Window {
            nearWalletSelector?: { selector: WalletSelector }
          }
          (window as GlobalWindow).nearWalletSelector = { selector: walletSelector }
        }

        // Subscribe to wallet state changes
        const subscription = walletSelector.store.observable.subscribe(
          (state: WalletSelectorState) => {
            setAccounts(state.accounts || [])
            setAccountId(state.accounts?.[0]?.accountId || null)
          }
        )

        // Cleanup subscription on unmount
        return () => subscription.unsubscribe()
      } catch (error) {
        console.error('Failed to initialize NEAR wallet selector:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initWalletSelector()
  }, [])

  const signIn = () => {
    if (modal) {
      modal.show()
    }
  }

  const signOut = async () => {
    if (selector) {
      const wallet = await selector.wallet()
      if (wallet) {
        await wallet.signOut()
      }
    }
  }

  const contextValue: NearWalletContextType = {
    selector,
    modal,
    accounts,
    accountId,
    isConnected,
    isLoading,
    signOut,
    signIn,
  }

  return (
    <NearWalletContext.Provider value={contextValue}>
      {children}
    </NearWalletContext.Provider>
  )
}

// Custom hook to use NEAR wallet context
export function useNearWallet() {
  const context = useContext(NearWalletContext)
  if (!context) {
    throw new Error('useNearWallet must be used within a NearWalletProvider')
  }
  return context
}
