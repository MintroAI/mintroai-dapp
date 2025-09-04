// Authentication Types and Interfaces

export interface AuthChallenge {
  challenge?: string
  nonce: string
  timestamp?: number
  expiresAt?: number
  message: string
}

export interface SignatureRequest {
  challenge: AuthChallenge
  walletAddress: string
  walletType: 'evm' | 'near'
}

export interface SignatureResponse {
  signature: string
  walletAddress: string
  walletType: 'evm' | 'near'
  timestamp: number
  nonce: string
}

export interface AuthenticationResult {
  success: boolean
  token?: string
  expiresAt?: number
  error?: string
}

export type AuthState = 
  | 'idle'
  | 'requesting_challenge'
  | 'awaiting_signature'
  | 'verifying'
  | 'authenticated'
  | 'failed'

export interface AuthError {
  code: 'CHALLENGE_EXPIRED' | 'SIGNATURE_INVALID' | 'WALLET_MISMATCH' | 'NETWORK_ERROR' | 'USER_CANCELLED'
  message: string
  retryable: boolean
}
