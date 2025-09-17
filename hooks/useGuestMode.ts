'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const GUEST_MESSAGE_LIMIT = 3
const STORAGE_KEY = 'mintro_guest_mode_data' // Global key for all chat modes
const RESET_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

interface GuestModeData {
  messageCount: number
  lastResetDate: string
  chatMode?: 'token' | 'vesting' | 'general'
}

interface UseGuestModeReturn {
  messageCount: number
  remainingMessages: number
  isLimitReached: boolean
  canSendMessage: boolean
  incrementMessageCount: () => void
  resetMessageCount: () => void
  syncWithBackend: (remaining: number, limit: number) => void
  getCounterText: () => string
  shouldShowCounter: boolean
}

export function useGuestMode(chatMode?: 'token' | 'vesting' | 'general'): UseGuestModeReturn {
  const { isAuthenticated } = useAuth()
  const [messageCount, setMessageCount] = useState(0)
  const [lastResetDate, setLastResetDate] = useState<string>(new Date().toISOString())
  
  // Load data from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const initializeGuestMode = () => {
      const newResetDate = new Date().toISOString()
      setMessageCount(0)
      setLastResetDate(newResetDate)
      
      if (typeof window !== 'undefined') {
        try {
          const data: GuestModeData = {
            messageCount: 0,
            lastResetDate: newResetDate,
            chatMode
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
          console.log('Guest mode initialized')
        } catch (error) {
          console.error('Error initializing guest mode data:', error)
        }
      }
    }
    
    try {
      const storedData = localStorage.getItem(STORAGE_KEY)
      if (storedData) {
        const data: GuestModeData = JSON.parse(storedData)
        
        // Check if we need to reset based on time
        const lastReset = new Date(data.lastResetDate)
        const now = new Date()
        const timeDiff = now.getTime() - lastReset.getTime()
        
        if (timeDiff >= RESET_INTERVAL) {
          // Reset after 24 hours
          console.log('24 hours passed, resetting guest message count')
          initializeGuestMode()
        } else {
          // Restore previous state
          console.log(`Restoring guest mode: ${data.messageCount} messages used`)
          setMessageCount(data.messageCount)
          setLastResetDate(data.lastResetDate)
        }
      } else {
        // Initialize for first time users
        console.log('First time user, initializing guest mode')
        initializeGuestMode()
      }
    } catch (error) {
      console.error('Error loading guest mode data:', error)
      initializeGuestMode()
    }
  }, [chatMode])
  
  // Save to localStorage whenever count changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    try {
      const data: GuestModeData = {
        messageCount,
        lastResetDate: lastResetDate, // Use the stored reset date, don't update it
        chatMode
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Error saving guest mode data:', error)
    }
  }, [messageCount, lastResetDate, chatMode])
  
  // Reset count when user authenticates
  useEffect(() => {
    if (isAuthenticated) {
      resetMessageCount()
    }
  }, [isAuthenticated])
  
  const incrementMessageCount = useCallback(() => {
    if (!isAuthenticated && messageCount < GUEST_MESSAGE_LIMIT) {
      setMessageCount(prev => Math.min(prev + 1, GUEST_MESSAGE_LIMIT))
    }
  }, [isAuthenticated, messageCount])
  
  const resetMessageCount = useCallback(() => {
    const newResetDate = new Date().toISOString()
    setMessageCount(0)
    setLastResetDate(newResetDate)
    
    if (typeof window !== 'undefined') {
      try {
        const data: GuestModeData = {
          messageCount: 0,
          lastResetDate: newResetDate,
          chatMode
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        console.log('Guest mode reset completed')
      } catch (error) {
        console.error('Error resetting guest mode data:', error)
      }
    }
  }, [chatMode])
  
  // Sync with backend rate limit info
  const syncWithBackend = useCallback((remaining: number, limit: number) => {
    if (!isAuthenticated && limit === GUEST_MESSAGE_LIMIT) {
      const backendMessageCount = limit - remaining
      if (backendMessageCount !== messageCount && backendMessageCount >= 0) {
        console.log(`Syncing with backend: ${backendMessageCount} messages used (was ${messageCount})`)
        setMessageCount(backendMessageCount)
      }
    }
  }, [isAuthenticated, messageCount])
  
  const getCounterText = useCallback(() => {
    if (isAuthenticated) return ''
    
    const remaining = GUEST_MESSAGE_LIMIT - messageCount
    if (remaining === 0) {
      return 'Connect wallet to continue'
    }
    if (remaining === 1) {
      return '1 message remaining'
    }
    return `${remaining}/${GUEST_MESSAGE_LIMIT} messages remaining`
  }, [isAuthenticated, messageCount])
  
  // Computed values
  const remainingMessages = isAuthenticated 
    ? Infinity 
    : Math.max(0, GUEST_MESSAGE_LIMIT - messageCount)
  
  const isLimitReached = !isAuthenticated && messageCount >= GUEST_MESSAGE_LIMIT
  const canSendMessage = isAuthenticated || messageCount < GUEST_MESSAGE_LIMIT
  const shouldShowCounter = !isAuthenticated && messageCount > 0
  
  return {
    messageCount,
    remainingMessages,
    isLimitReached,
    canSendMessage,
    incrementMessageCount,
    resetMessageCount,
    syncWithBackend,
    getCounterText,
    shouldShowCounter
  }
}
