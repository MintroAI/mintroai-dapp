'use client'

import React from 'react'
import { AlertTriangle, X, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { WalletErrorState, type WalletError } from '@/types/wallet'

interface WalletErrorProps {
  error: WalletErrorState
  onRetry?: () => void
  onDismiss: () => void
  className?: string
}

export function WalletError({ error, onRetry, onDismiss, className }: WalletErrorProps) {
  // Get user-friendly error messages and actions
  const getErrorInfo = (errorType: WalletError) => {
    switch (errorType) {
      case 'wallet_not_found':
        return {
          title: 'Wallet Not Found',
          description: 'Please install MetaMask or a compatible Web3 wallet to continue.',
          action: 'Install Wallet',
          actionUrl: 'https://metamask.io/download/',
          canRetry: true
        }
      
      case 'connection_rejected':
        return {
          title: 'Connection Rejected',
          description: 'You rejected the wallet connection request. Please try again and approve the connection.',
          action: 'Try Again',
          canRetry: true
        }
      
      case 'network_unsupported':
        return {
          title: 'Network Not Supported',
          description: 'Please switch to a supported network (Arbitrum, BSC Testnet, or Aurora Testnet).',
          action: 'Switch Network',
          canRetry: true
        }
      
      case 'insufficient_balance':
        return {
          title: 'Insufficient Balance',
          description: 'You don\'t have enough balance to complete this transaction.',
          action: 'Add Funds',
          canRetry: false
        }
      
      case 'transaction_failed':
        return {
          title: 'Transaction Failed',
          description: 'The transaction was rejected or failed. Please try again.',
          action: 'Retry Transaction',
          canRetry: true
        }
      
      default:
        return {
          title: 'Connection Error',
          description: 'An unexpected error occurred. Please try again.',
          action: 'Try Again',
          canRetry: true
        }
    }
  }

  const errorInfo = getErrorInfo(error.type)

  const handleAction = () => {
    if (errorInfo.actionUrl) {
      window.open(errorInfo.actionUrl, '_blank', 'noopener,noreferrer')
    } else if (onRetry && errorInfo.canRetry) {
      onRetry()
    }
  }

  return (
    <Alert className={`border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="font-semibold text-red-800 dark:text-red-200 text-sm">
                {errorInfo.title}
              </h4>
              <AlertDescription className="text-red-700 dark:text-red-300 mt-1">
                {error.message || errorInfo.description}
              </AlertDescription>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss error</span>
            </Button>
          </div>
          
          <div className="flex items-center gap-2 mt-3">
            {errorInfo.canRetry && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAction}
                className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                {errorInfo.action}
              </Button>
            )}
            
            {errorInfo.actionUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAction}
                className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900"
              >
                {errorInfo.action}
              </Button>
            )}
            
            <span className="text-xs text-red-600 dark:text-red-400 ml-auto">
              {new Date(error.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </Alert>
  )
}

// Compact version for inline display
interface WalletErrorInlineProps {
  error: WalletErrorState
  onRetry?: () => void
  onDismiss: () => void
}

export function WalletErrorInline({ error, onRetry, onDismiss }: WalletErrorInlineProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
      
      <span className="text-sm text-red-700 dark:text-red-300 flex-1 truncate">
        {error.message}
      </span>
      
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="h-6 w-6 p-0 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        className="h-6 w-6 p-0 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}
