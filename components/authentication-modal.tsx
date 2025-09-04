'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthentication } from '@/hooks/useAuthentication'
import { useWallet } from '@/contexts/WalletContext'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Shield, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Loader2,
  Key,
  Clock
} from 'lucide-react'

interface AuthenticationModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  trigger?: 'manual' | 'auto'
}

export function AuthenticationModal({ 
  open, 
  onClose, 
  onSuccess,
  trigger = 'manual' 
}: AuthenticationModalProps) {
  const { wallet } = useWallet()
  const { 
    authState, 
    authError, 
    authenticate, 
    reset,
    retryCount,
    maxRetries,
    currentChallenge,
    formatSignatureMessage
  } = useAuthentication()

  const [showMessage, setShowMessage] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleAuthenticate = useCallback(async () => {
    setShowMessage(false)
    const success = await authenticate()
    if (!success && authError?.retryable) {
      setShowMessage(true)
    }
  }, [authenticate, authError?.retryable])

  // Handle authentication flow
  useEffect(() => {
    if (open && wallet.activeWallet && trigger === 'auto') {
      handleAuthenticate()
    }
  }, [open, wallet.activeWallet, trigger, handleAuthenticate])

  // Update progress based on state
  useEffect(() => {
    switch (authState) {
      case 'idle':
        setProgress(0)
        break
      case 'requesting_challenge':
        setProgress(25)
        break
      case 'awaiting_signature':
        setProgress(50)
        break
      case 'verifying':
        setProgress(75)
        break
      case 'authenticated':
        setProgress(100)
        break
      case 'failed':
        setProgress(0)
        break
    }
  }, [authState])

  // Handle successful authentication
  useEffect(() => {
    if (authState === 'authenticated') {
      setTimeout(() => {
        onSuccess?.()
        onClose()
        reset()
      }, 1500)
    }
  }, [authState, onSuccess, onClose, reset])


  const handleRetry = () => {
    reset()
    handleAuthenticate()
  }

  const handleCancel = () => {
    reset()
    onClose()
  }

  const getStateIcon = () => {
    switch (authState) {
      case 'requesting_challenge':
        return <Key className="w-12 h-12 text-blue-500 animate-pulse" />
      case 'awaiting_signature':
        return <Shield className="w-12 h-12 text-purple-500 animate-bounce" />
      case 'verifying':
        return <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
      case 'authenticated':
        return <CheckCircle className="w-12 h-12 text-green-500" />
      case 'failed':
        return <XCircle className="w-12 h-12 text-red-500" />
      default:
        return <Shield className="w-12 h-12 text-gray-500" />
    }
  }

  const getStateTitle = () => {
    switch (authState) {
      case 'requesting_challenge':
        return 'Requesting Authentication'
      case 'awaiting_signature':
        return 'Sign Authentication Message'
      case 'verifying':
        return 'Verifying Signature'
      case 'authenticated':
        return 'Authentication Successful!'
      case 'failed':
        return 'Authentication Failed'
      default:
        return 'Authentication Required'
    }
  }

  const getStateDescription = () => {
    switch (authState) {
      case 'requesting_challenge':
        return 'Requesting secure challenge from server...'
      case 'awaiting_signature':
        return 'Please sign the message in your wallet to authenticate.'
      case 'verifying':
        return 'Verifying your signature with the server...'
      case 'authenticated':
        return 'You have been successfully authenticated!'
      case 'failed':
        return authError?.message || 'Authentication failed. Please try again.'
      default:
        return 'To continue, please authenticate with your wallet.'
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {getStateIcon()}
            <AlertDialogTitle className="text-center">
              {getStateTitle()}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-center space-y-4">
            <p>{getStateDescription()}</p>
            
            {/* Progress indicator */}
            {authState !== 'idle' && authState !== 'failed' && (
              <div className="w-full space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Step {Math.ceil(progress / 25)} of 4
                </p>
              </div>
            )}

            {/* Wallet info */}
            {wallet.activeWallet && (
              <div className="bg-muted/50 rounded-lg p-3 text-left">
                <p className="text-xs font-medium mb-1">Connected Wallet:</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {wallet.activeWallet.address.slice(0, 8)}...{wallet.activeWallet.address.slice(-6)}
                </p>
                <p className="text-xs text-muted-foreground capitalize mt-1">
                  Type: {wallet.activeWallet.type}
                </p>
              </div>
            )}

            {/* Show signature message preview */}
            {authState === 'awaiting_signature' && currentChallenge && (
              <Alert className="text-left border-purple-500/20 bg-purple-500/5">
                <Shield className="h-4 w-4 text-purple-500" />
                <AlertDescription className="text-xs">
                  <p className="font-medium mb-2 text-purple-500">Signature Request Details:</p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>• This is a read-only signature request</p>
                    <p>• No funds will be transferred</p>
                    <p>• Used only for authentication</p>
                    {showMessage && (
                      <div className="mt-2 p-2 bg-background/50 rounded">
                        <p className="font-mono text-xs break-all">
                          {formatSignatureMessage(currentChallenge)}
                        </p>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Error details */}
            {authError && authState === 'failed' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium">{authError.message}</p>
                  {authError.retryable && retryCount < maxRetries && (
                    <p className="text-xs mt-1">
                      Attempt {retryCount} of {maxRetries}
                    </p>
                  )}
                  {authError.code === 'USER_CANCELLED' && (
                    <p className="text-xs mt-1">
                      You cancelled the signature request. Click retry to try again.
                    </p>
                  )}
                  {authError.code === 'CHALLENGE_EXPIRED' && (
                    <p className="text-xs mt-1">
                      The authentication challenge expired. A new one will be requested.
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Challenge expiry warning */}
            {currentChallenge && authState === 'awaiting_signature' && (
              <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>
                  Expires in {Math.max(0, Math.floor((currentChallenge.expiresAt ?? Date.now() - Date.now()) / 1000))} seconds
                </span>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          {authState === 'idle' && (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleAuthenticate}>
                <Shield className="w-4 h-4 mr-2" />
                Authenticate
              </Button>
            </>
          )}

          {authState === 'failed' && (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              {authError?.retryable && retryCount < maxRetries ? (
                <Button onClick={handleRetry}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              ) : (
                <Button variant="outline" onClick={handleCancel}>
                  Close
                </Button>
              )}
            </>
          )}

          {authState === 'awaiting_signature' && (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="outline" onClick={() => setShowMessage(!showMessage)}>
                {showMessage ? 'Hide' : 'Show'} Message
              </Button>
            </>
          )}

          {(authState === 'requesting_challenge' || authState === 'verifying') && (
            <Button variant="outline" disabled>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </Button>
          )}

          {authState === 'authenticated' && (
            <Button className="w-full" disabled>
              <CheckCircle className="w-4 h-4 mr-2" />
              Authenticated!
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
