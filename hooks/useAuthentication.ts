'use client'

import { useState, useCallback } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { useAuth } from '@/contexts/AuthContext'
import { 
  AuthChallenge, 
  SignatureResponse, 
  AuthenticationResult, 
  AuthState,
  AuthError 
} from '@/types/authentication'

const AUTH_RETRY_LIMIT = 2
const RETRY_DELAY = 2000 // 2 seconds between retries
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

// Helper function for NEAR wallet signing
async function signWithNEARWallet(message: string, nonce: string): Promise<string> {
  interface SignedMessage {
    accountId: string
    publicKey: string
    signature: string
  }

  interface NearWallet {
    signMessage?: (params: {
      message: string
      recipient: string
      nonce: Buffer | Uint8Array
      callbackUrl?: string
    }) => Promise<SignedMessage>
  }

  interface NearWalletSelector {
    wallet: () => Promise<NearWallet | null>
  }

  interface NearWalletWindow extends Window {
    nearWalletSelector?: { selector: NearWalletSelector }
  }
  
  const walletSelector = (window as NearWalletWindow).nearWalletSelector
  
  if (!walletSelector?.selector) {
    throw new Error('NEAR wallet selector not initialized')
  }
  
  const nearWallet = await walletSelector.selector.wallet()
  
  if (!nearWallet) {
    throw new Error('No NEAR wallet connected')
  }
  
  if (!nearWallet.signMessage) {
    throw new Error('NEAR wallet does not support message signing')
  }

  // Convert nonce from hex string to Buffer for NEAR standard
  // Remove '0x' prefix if present
  const cleanNonce = nonce.startsWith('0x') ? nonce.slice(2) : nonce
  const nonceBuffer = Buffer.from(cleanNonce, 'hex')
  
  // Validate nonce is 32 bytes
  if (nonceBuffer.length !== 32) {
    throw new Error(`Invalid nonce length: ${nonceBuffer.length} bytes. Expected 32 bytes.`)
  }
  
  // Get the app domain for recipient field
  const recipient = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'http://localhost:3000'
  
  // Sign message according to NEAR standard
  console.log('🔏 NEAR signing request:', {
    message,
    recipient,
    originalNonce: nonce,
    cleanNonce: cleanNonce,
    nonceBufferLength: nonceBuffer.length,
    nonceBufferHex: nonceBuffer.toString('hex')
  })
  
  const signedMessage = await nearWallet.signMessage({
    message,
    recipient,
    nonce: nonceBuffer,
    callbackUrl: undefined // We handle verification directly, no callback needed
  })
  
  console.log('✍️ NEAR signature received:', signedMessage)
  
  // Return in format expected by backend
  return JSON.stringify({
    accountId: signedMessage.accountId,
    publicKey: signedMessage.publicKey,
    signature: signedMessage.signature
  })
}

export function useAuthentication() {
  const { wallet } = useWallet()
  const { setAuthToken, clearAuth, authToken, isAuthenticated } = useAuth()
  const [authState, setAuthState] = useState<AuthState>('idle')
  const [authError, setAuthError] = useState<AuthError | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [currentChallenge, setCurrentChallenge] = useState<AuthChallenge | null>(null)
  const [lastAttemptTime, setLastAttemptTime] = useState<number>(0)
  const [isRateLimited, setIsRateLimited] = useState(false)

  // Helper function to set error with proper typing
  const setError = useCallback((code: AuthError['code'], message: string, retryable = true) => {
    const error: AuthError = { code, message, retryable }
    setAuthError(error)
    setAuthState('failed')
    return error
  }, [])

  // Request authentication challenge from backend
  const requestChallenge = useCallback(async (): Promise<AuthChallenge | null> => {
    if (!wallet.activeWallet) {
      setError('WALLET_MISMATCH', 'No wallet connected', false)
      return null
    }

    try {
      setAuthState('requesting_challenge')
      setAuthError(null)
      
      const requestBody = {
        protocol: wallet.activeWallet.type === 'evm' ? 'evm' : 'near',
        wallet_address: wallet.activeWallet.address
      }
      
      console.log('📤 Requesting challenge:', {
        url: `${BACKEND_URL}/api/v1/auth/challenge`,
        body: requestBody
      })
      
      const response = await fetch(`${BACKEND_URL}/api/v1/auth/challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Challenge request failed:', errorData)
        throw new Error(errorData.detail || 'Failed to get authentication challenge')
      }

      const challenge: AuthChallenge = await response.json()
      console.log('📥 Challenge received:', challenge)
      
      // Validate challenge
      if (!challenge.nonce || !challenge.message) {
        throw new Error('Invalid challenge format')
      }

      setCurrentChallenge(challenge)
      return challenge
    } catch (error) {
      setError('NETWORK_ERROR', error instanceof Error ? error.message : 'Failed to request challenge')
      return null
    }
  }, [wallet.activeWallet, setError])

  // Format message for signing - use the exact message from backend
  const formatSignatureMessage = useCallback((challenge: AuthChallenge): string => {
    return challenge.message || ''
  }, [])

  // Request signature from wallet
  const requestSignature = useCallback(async (challenge: AuthChallenge): Promise<SignatureResponse | null> => {
    if (!wallet.activeWallet) {
      setError('WALLET_MISMATCH', 'No wallet connected', false)
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
        signature = await signWithNEARWallet(message, challenge.nonce)
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
        setError('USER_CANCELLED', 'Signature request cancelled')
      } else {
        setError('SIGNATURE_INVALID', errorObj?.message || 'Failed to sign message')
      }
      return null
    }
  }, [wallet.activeWallet, formatSignatureMessage, setError])

  // Verify signature with backend
  const verifySignature = useCallback(async (
    challenge: AuthChallenge,
    signature: SignatureResponse
  ): Promise<AuthenticationResult> => {
    try {
      setAuthState('verifying')
      setAuthError(null)

      const verifyBody = {
        protocol: signature.walletType === 'evm' ? 'evm' : 'near',
        wallet_address: signature.walletAddress,
        signature: signature.walletType === 'near' 
          ? JSON.parse(signature.signature) // NEAR sends a JSON object with accountId, publicKey, signature
          : signature.signature, // EVM sends just the signature string
        nonce: signature.nonce
      }
      
      console.log('📤 Verifying signature:', {
        url: `${BACKEND_URL}/api/v1/auth/verify`,
        body: verifyBody
      })

      const response = await fetch(`${BACKEND_URL}/api/v1/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verifyBody),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('❌ Verification failed:', error)
        throw new Error(error.detail || error.message || 'Verification failed')
      }

      const result = await response.json()
      console.log('📥 Verification response:', result)
      
      // Backend returns access_token and expires_in (seconds from now)
      if (result.access_token) {
        setAuthState('authenticated')
        
        // Calculate expiry time: current time + expires_in seconds
        const expiresAtMs = Date.now() + (result.expires_in * 1000)
        
        // Store auth token in memory via AuthContext
        setAuthToken(result.access_token, expiresAtMs)
        
        console.log('🎉 Authentication successful! Token stored.')
        
        return {
          success: true,
          token: result.access_token,
          expiresAt: expiresAtMs
        }
      } else {
        throw new Error('No access token received')
      }
    } catch (error) {
      setError('SIGNATURE_INVALID', error instanceof Error ? error.message : 'Verification failed')
      return { success: false, error: error instanceof Error ? error.message : 'Verification failed' }
    }
  }, [setAuthToken, setError])

  // Main authentication flow
  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!wallet.activeWallet) {
      setError('WALLET_MISMATCH', 'Please connect a wallet first', false)
      return false
    }

    // Check rate limiting
    const now = Date.now()
    if (now - lastAttemptTime < RETRY_DELAY) {
      console.log('⏳ Rate limited - waiting before retry')
      setIsRateLimited(true)
      return false
    }

    // Check retry limit
    if (retryCount >= AUTH_RETRY_LIMIT) {
      setError('NETWORK_ERROR', `Maximum retry attempts (${AUTH_RETRY_LIMIT}) reached. Please try again later.`, false)
      return false
    }

    setLastAttemptTime(now)
    setIsRateLimited(false)

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
          setError('CHALLENGE_EXPIRED', 'Challenge expired. Please try again.')
          setRetryCount(prev => prev + 1)
          return false
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
  }, [wallet.activeWallet, retryCount, lastAttemptTime, requestChallenge, requestSignature, verifySignature, setError])

  // Reset authentication state
  const reset = useCallback(() => {
    setAuthState('idle')
    setAuthError(null)
    setRetryCount(0)
    setCurrentChallenge(null)
    setLastAttemptTime(0)
    setIsRateLimited(false)
    clearAuth() // Clear auth from context
  }, [clearAuth])

  // Logout function
  const logout = useCallback(async () => {
    try {
      if (authToken && wallet.activeWallet) {
        await fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
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

  return {
    authState,
    authError,
    authToken,
    authenticate,
    logout,
    reset,
    isAuthenticated, // Now from AuthContext
    retryCount,
    maxRetries: AUTH_RETRY_LIMIT,
    currentChallenge,
    formatSignatureMessage,
    isRateLimited,
    lastAttemptTime
  }
}
