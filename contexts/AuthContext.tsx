'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useWallet } from './WalletContext'

interface AuthToken {
  token: string
  expiresAt: number
  refreshToken?: string
}

interface AuthContextType {
  authToken: string | null
  isAuthenticated: boolean
  setAuthToken: (token: string | null, expiresAt?: string | number) => void
  clearAuth: () => void
  getAuthHeader: () => { Authorization: string } | Record<string, never>
  checkTokenExpiry: () => boolean
  refreshAuthToken: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Token refresh threshold - refresh 5 minutes before expiry
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000 // 5 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { wallet } = useWallet()
  
  // Store tokens in memory only (not in localStorage for XSS protection)
  const [authData, setAuthData] = useState<AuthToken | null>(null)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Parse expiry time from different formats
  const parseExpiryTime = useCallback((expires: string | number | undefined): number => {
    if (!expires) return Date.now()
    
    if (typeof expires === 'number') {
      return expires
    }
    
    if (expires.includes('-') || expires.includes('T')) {
      return new Date(expires).getTime()
    }
    
    return parseInt(expires)
  }, [])

  // Set auth token in memory
  const setAuthToken = useCallback((token: string | null, expiresAt?: string | number) => {
    if (!token) {
      setAuthData(null)
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
      return
    }

    const expiryTime = parseExpiryTime(expiresAt)
    const newAuthData: AuthToken = {
      token,
      expiresAt: expiryTime
    }
    
    setAuthData(newAuthData)
    
    // Set up automatic refresh timer
    const timeUntilRefresh = expiryTime - Date.now() - TOKEN_REFRESH_THRESHOLD
    if (timeUntilRefresh > 0) {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
      
      refreshTimerRef.current = setTimeout(() => {
        refreshAuthToken()
      }, timeUntilRefresh)
    }
  }, [parseExpiryTime])

  // Refresh token
  const refreshAuthToken = useCallback(async (): Promise<boolean> => {
    if (isRefreshing || !authData?.token || !wallet.activeWallet) {
      return false
    }

    setIsRefreshing(true)
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'
      const response = await fetch(`${backendUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authData.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: wallet.activeWallet.address,
          protocol: wallet.activeWallet.type === 'evm' ? 'evm' : 'near'
        })
      })

      if (!response.ok) {
        // If refresh fails, clear auth
        setAuthData(null)
        return false
      }

      const result = await response.json()
      
      if (result.access_token) {
        setAuthToken(result.access_token, result.expires_at)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Token refresh failed:', error)
      setAuthData(null)
      return false
    } finally {
      setIsRefreshing(false)
    }
  }, [authData?.token, wallet.activeWallet, isRefreshing, setAuthToken])

  // Check if token is expired
  const checkTokenExpiry = useCallback((): boolean => {
    if (!authData) return false
    return Date.now() < authData.expiresAt
  }, [authData])

  // Clear all auth data
  const clearAuth = useCallback(() => {
    setAuthData(null)
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  // Get auth header for API requests
  const getAuthHeader = useCallback((): { Authorization: string } | Record<string, never> => {
    if (!authData?.token || !checkTokenExpiry()) {
      return {} as Record<string, never>
    }
    return { Authorization: `Bearer ${authData.token}` }
  }, [authData?.token, checkTokenExpiry])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
    }
  }, [])

  // Clear auth when wallet disconnects
  useEffect(() => {
    if (!wallet.activeWallet) {
      clearAuth()
    }
  }, [wallet.activeWallet, clearAuth])

  // Optional: Session persistence using sessionStorage (safer than localStorage)
  // This allows tokens to persist during the browser session but not after closing
  useEffect(() => {
    // On mount, check sessionStorage for existing session
    const sessionToken = sessionStorage.getItem('session_token')
    const sessionExpires = sessionStorage.getItem('session_expires')
    
    if (sessionToken && sessionExpires && !authData) {
      const expiryTime = parseExpiryTime(sessionExpires)
      if (Date.now() < expiryTime) {
        setAuthToken(sessionToken, expiryTime)
      } else {
        // Clear expired session data
        sessionStorage.removeItem('session_token')
        sessionStorage.removeItem('session_expires')
      }
    }
  }, []) // Only run on mount

  // Save to sessionStorage when auth changes
  useEffect(() => {
    if (authData) {
      // Store in sessionStorage for session persistence (safer than localStorage)
      sessionStorage.setItem('session_token', authData.token)
      sessionStorage.setItem('session_expires', authData.expiresAt.toString())
    } else {
      // Clear session storage on logout
      sessionStorage.removeItem('session_token')
      sessionStorage.removeItem('session_expires')
    }
  }, [authData])

  const isAuthenticatedValue = !!authData && checkTokenExpiry()
  
  const value: AuthContextType = {
    authToken: authData?.token || null,
    isAuthenticated: isAuthenticatedValue,
    setAuthToken,
    clearAuth,
    getAuthHeader,
    checkTokenExpiry,
    refreshAuthToken
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
