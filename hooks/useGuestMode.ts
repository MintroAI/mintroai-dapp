'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const GUEST_MESSAGE_LIMIT = 3
const STORAGE_KEY = 'guest_mode_data'
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
  getCounterText: () => string
  shouldShowCounter: boolean
}

export function useGuestMode(chatMode?: 'token' | 'vesting' | 'general'): UseGuestModeReturn {
  const { isAuthenticated } = useAuth()
  const [messageCount, setMessageCount] = useState(0)
  
  // Load data from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    
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
          resetMessageCount()
        } else {
          setMessageCount(data.messageCount)
        }
      } else {
        // Initialize for first time users
        resetMessageCount()
      }
    } catch (error) {
      console.error('Error loading guest mode data:', error)
      resetMessageCount()
    }
  }, [])
  
  // Save to localStorage whenever count changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    try {
      const data: GuestModeData = {
        messageCount,
        lastResetDate: new Date().toISOString(),
        chatMode
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Error saving guest mode data:', error)
    }
  }, [messageCount, chatMode])
  
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
    setMessageCount(0)
    if (typeof window !== 'undefined') {
      try {
        const data: GuestModeData = {
          messageCount: 0,
          lastResetDate: new Date().toISOString(),
          chatMode
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch (error) {
        console.error('Error resetting guest mode data:', error)
      }
    }
  }, [chatMode])
  
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
    getCounterText,
    shouldShowCounter
  }
}
