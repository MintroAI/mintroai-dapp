import { useState, useEffect } from 'react'

// Random ID oluşturmak için basit bir fonksiyon
function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

// Global session state
let globalSessionId: string | null = null

export function useSession() {
  const [sessionId, setSessionId] = useState<string>(() => {
    // Component ilk mount edildiğinde çalışır
    if (!globalSessionId) {
      globalSessionId = generateId()

    }
    return globalSessionId
  })

  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    setIsInitialized(true)
  }, [])

  return { sessionId, isInitialized }
} 