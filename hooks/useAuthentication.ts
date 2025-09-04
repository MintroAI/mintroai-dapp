'use client'

import { useState, useCallback, useEffect } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { 
  AuthChallenge, 
  SignatureResponse, 
  AuthenticationResult, 
  AuthState,
  AuthError 
} from '@/types/authentication'

const AUTH_RETRY_LIMIT = 3

export function useAuthentication() {
  const { wallet } = useWallet()
  const [authState, setAuthState] = useState<AuthState>('idle')
  const [authError, setAuthError] = useState<AuthError | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [currentChallenge, setCurrentChallenge] = useState<AuthChallenge | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)

  // Request authentication challenge from backend
  const requestChallenge = useCallback(async (): Promise<AuthChallenge | null> => {
    if (!wallet.activeWallet) {
      setAuthError({
        code: 'WALLET_MISMATCH',
        message: 'No wallet connected',
        retryable: false
      })
      return null
    }

    try {
      setAuthState('requesting_challenge')
      setAuthError(null)
      
      // Use the actual backend URL
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'
      const response = await fetch(`${backendUrl}/api/v1/auth/challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          protocol: wallet.activeWallet.type === 'evm' ? 'evm' : 'near',
          wallet_address: wallet.activeWallet.address
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to get authentication challenge')
      }

      const challenge: AuthChallenge = await response.json()
      
      // Validate challenge
      if (!challenge.nonce || !challenge.message) {
        throw new Error('Invalid challenge format')
      }

      setCurrentChallenge(challenge)
      return challenge
    } catch (error) {
      setAuthError({
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Failed to request challenge',
        retryable: true
      })
      setAuthState('failed')
      return null
    }
  }, [wallet.activeWallet])

  // Format message for signing - use the exact message from backend
  const formatSignatureMessage = useCallback((challenge: AuthChallenge): string => {
    // Backend sends the formatted message directly
    return challenge.message || ''
  }, [])

  // Request signature from wallet
  const requestSignature = useCallback(async (challenge: AuthChallenge): Promise<SignatureResponse | null> => {
    if (!wallet.activeWallet) {
      setAuthError({
        code: 'WALLET_MISMATCH',
        message: 'No wallet connected',
        retryable: false
      })
      return null
    }

    try {
      setAuthState('awaiting_signature')
      setAuthError(null)

      const message = formatSignatureMessage(challenge)
      let signature = ''

      if (wallet.activeWallet.type === 'evm') {
        // EVM wallet signature using personal_sign (MetaMask, etc.)
        if (!window.ethereum) {
          throw new Error('EVM wallet not available')
        }

        // Use personal_sign method like in test_metamask.html
        signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [message, wallet.activeWallet.address]
        })
      } else if (wallet.activeWallet.type === 'near') {
        // NEAR wallet signature
        // This would need NEAR-specific signing implementation
        // For now, we'll throw an informative error
        throw new Error('NEAR wallet signatures coming soon')
      }

      const response: SignatureResponse = {
        signature,
        walletAddress: wallet.activeWallet.address,
        walletType: wallet.activeWallet.type,
        timestamp: Date.now(),
        nonce: challenge.nonce // Include nonce for verification
      }

      return response
    } catch (error: unknown) {
      // Check if user cancelled
      const errorObj = error as { code?: number; message?: string }
      if (errorObj?.code === 4001 || errorObj?.message?.includes('rejected') || errorObj?.message?.includes('User denied')) {
        setAuthError({
          code: 'USER_CANCELLED',
          message: 'Signature request cancelled',
          retryable: true
        })
      } else {
        setAuthError({
          code: 'SIGNATURE_INVALID',
          message: errorObj?.message || 'Failed to sign message',
          retryable: true
        })
      }
      setAuthState('failed')
      return null
    }
  }, [wallet.activeWallet, formatSignatureMessage])

  // Verify signature with backend
  const verifySignature = useCallback(async (
    challenge: AuthChallenge,
    signature: SignatureResponse
  ): Promise<AuthenticationResult> => {
    try {
      setAuthState('verifying')
      setAuthError(null)

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'
      const response = await fetch(`${backendUrl}/api/v1/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          protocol: signature.walletType === 'evm' ? 'evm' : 'near',
          wallet_address: signature.walletAddress,
          signature: signature.signature,
          nonce: signature.nonce
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || error.message || 'Verification failed')
      }

      const result = await response.json()
      
      // Backend returns access_token and expires_at
      if (result.access_token) {
        setAuthState('authenticated')
        setAuthToken(result.access_token)
        
        // Store auth token
        localStorage.setItem('auth_token', result.access_token)
        if (result.expires_at) {
          localStorage.setItem('auth_expires', result.expires_at)
        }
        
        return {
          success: true,
          token: result.access_token,
          expiresAt: result.expires_at ? new Date(result.expires_at).getTime() : undefined
        }
      } else {
        throw new Error('No access token received')
      }
    } catch (error) {
      setAuthError({
        code: 'SIGNATURE_INVALID',
        message: error instanceof Error ? error.message : 'Verification failed',
        retryable: true
      })
      setAuthState('failed')
      return { success: false, error: error instanceof Error ? error.message : 'Verification failed' }
    }
  }, [])

  // Main authentication flow
  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!wallet.activeWallet) {
      setAuthError({
        code: 'WALLET_MISMATCH',
        message: 'Please connect a wallet first',
        retryable: false
      })
      return false
    }

    // Check retry limit
    if (retryCount >= AUTH_RETRY_LIMIT) {
      setAuthError({
        code: 'NETWORK_ERROR',
        message: 'Maximum retry attempts reached. Please try again later.',
        retryable: false
      })
      return false
    }

    try {
      // Step 1: Request challenge
      const challenge = await requestChallenge()
      if (!challenge) return false

      // Check if challenge is expired
      if (challenge.expiresAt) {
        const expiresAtMs = typeof challenge.expiresAt === 'number'
          ? challenge.expiresAt
          : new Date(challenge.expiresAt).getTime();
        if (Date.now() > expiresAtMs) {
          setAuthError({
            code: 'CHALLENGE_EXPIRED',
            message: 'Challenge expired. Please try again.',
            retryable: true
          })
          setRetryCount(prev => prev + 1)
          return false // Don't auto-retry
        }
      }

      // Step 2: Request signature
      const signature = await requestSignature(challenge)
      if (!signature) return false

      // Step 3: Verify signature
      const result = await verifySignature(challenge, signature)
      
      if (result.success) {
        setRetryCount(0) // Reset retry count on success
        return true
      }

      setRetryCount(prev => prev + 1)
      return false
    } catch (error) {
      console.error('Authentication error:', error)
      setRetryCount(prev => prev + 1)
      return false
    }
  }, [wallet.activeWallet, retryCount, requestChallenge, requestSignature, verifySignature])

  // Reset authentication state
  const reset = useCallback(() => {
    setAuthState('idle')
    setAuthError(null)
    setRetryCount(0)
    setCurrentChallenge(null)
    setAuthToken(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_expires')
  }, [])

  // Logout function
  const logout = useCallback(async () => {
    try {
      if (authToken && wallet.activeWallet) {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'
        await fetch(`${backendUrl}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            wallet_address: wallet.activeWallet.address,
            protocol: wallet.activeWallet.type === 'evm' ? 'evm' : 'near'
          })
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      reset()
    }
  }, [authToken, wallet.activeWallet, reset])

  // Calculate authentication status
  const [isAuthenticatedState, setIsAuthenticatedState] = useState(false)
  
  // Update authentication state when token changes
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('auth_token')
      const expires = localStorage.getItem('auth_expires')
      
      if (!token || !expires) {
        setIsAuthenticatedState(false)
        return
      }
      
      // Parse expires_at - it might be a date string or timestamp
      let expiresAt: number
      if (expires.includes('-') || expires.includes('T')) {
        // It's a date string
        expiresAt = new Date(expires).getTime()
      } else {
        // It's already a timestamp
        expiresAt = parseInt(expires)
      }
      
      setIsAuthenticatedState(Date.now() < expiresAt)
    }
    
    checkAuth()
    // Check periodically
    const interval = setInterval(checkAuth, 5000)
    return () => clearInterval(interval)
  }, [authToken, authState])

  return {
    authState,
    authError,
    authToken,
    authenticate,
    logout,
    reset,
    isAuthenticated: isAuthenticatedState,
    retryCount,
    maxRetries: AUTH_RETRY_LIMIT,
    currentChallenge,
    formatSignatureMessage
  }
}
