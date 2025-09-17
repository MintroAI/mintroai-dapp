"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, Send, User, AlertCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useSession } from "@/hooks/useSession"
import { useWebSocket } from "@/hooks/useWebSocket"
import { useGuestMode } from "@/hooks/useGuestMode"
import { useWallet } from "@/hooks/useWallet"
import { useAuth } from "@/contexts/AuthContext"
import { Badge } from "@/components/ui/badge"

// Random ID oluşturmak için basit bir fonksiyon
function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

interface Message {
  id: string
  role: "assistant" | "user"
  content: string
}

interface AIChatProps {
  creationType: string
  inputValue: string
  setInputValue: (val: string) => void
}

export function AIChat({ creationType, inputValue, setInputValue }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: `Hello! I'm your AI assistant for ${creationType} creation. How can I help you today?`,
    },
  ])
  // const [input, setInput] = useState("") // Remove internal state
  const [isTyping, setIsTyping] = useState(false)
  const [showWalletPrompt, setShowWalletPrompt] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Session yönetimi
  const { sessionId, isInitialized } = useSession()
  
  // Guest mode management
  const guestMode = useGuestMode(creationType as 'token' | 'vesting' | 'general')
  const { wallet } = useWallet()
  const { authToken } = useAuth()

  // WebSocket bağlantısı
  useWebSocket(sessionId, isInitialized, (config) => {
    if (config && typeof config === 'object') {
      console.log('Received config update:', config)
      // Form güncellemesi için event emit edilebilir
      const event = new CustomEvent('formUpdate', { detail: config })
      window.dispatchEvent(event)
    }
  })

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }

  useEffect(() => {
    // Her yeni mesajda scroll yap
    if (messages.length > 0) {
      scrollToBottom()
    }
  }, [messages])

  const sendMessage = async (message: string) => {
    if (!message.trim()) return
    
    // Check guest mode limits
    if (!guestMode.canSendMessage) {
      setShowWalletPrompt(true)
      return
    }

    try {
      // Kullanıcı mesajını ekle
      setMessages(prev => [...prev, { 
        id: generateId(),
        role: 'user', 
        content: message 
      }])
      setInputValue("")
      setIsTyping(true)
      
      // Increment guest message counter if not authenticated
      if (!wallet.isConnected) {
        guestMode.incrementMessageCount()
      }

      const maxRetries = 3
      let retryCount = 0
      let success = false

      while (retryCount < maxRetries && !success) {
        try {
          // Prepare headers with optional JWT token
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          }
          
          // Add JWT token if user is authenticated
          if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`
          }

          const response = await fetch('/api/chat', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              sessionId,
              chatInput: message,
              mode: creationType,
            }),
          })

          const data = await response.json()

          // Handle rate limit exceeded
          if (response.status === 429) {
            const resetTime = data.rateLimitInfo?.resetTime 
              ? new Date(data.rateLimitInfo.resetTime).toLocaleTimeString() 
              : 'later'
            setMessages(prev => [
              ...prev,
              { 
                id: generateId(),
                role: 'assistant', 
                content: `⚠️ Rate limit exceeded. You can send more messages after ${resetTime}. ${data.message || ''}` 
              }
            ])
            success = true
            break
          }

          // Handle authentication required
          if (response.status === 401) {
            setMessages(prev => [
              ...prev,
              { 
                id: generateId(),
                role: 'assistant', 
                content: `🔒 ${data.message || 'Please connect your wallet to continue.'}` 
              }
            ])
            setShowWalletPrompt(true)
            success = true
            break
          }

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          success = true

          // Store rate limit info if available and sync with guest mode
          if (data.rateLimitInfo && !wallet.isConnected) {
            const { remaining, limit } = data.rateLimitInfo
            console.log(`Backend rate limit: ${remaining}/${limit} messages remaining`)
            
            // Sync frontend guest mode with backend rate limit
            guestMode.syncWithBackend(remaining, limit)
          }

          setMessages(prev => [
            ...prev,
            { 
              id: generateId(),
              role: 'assistant', 
              content: data.output || data.message || "I understand your message. Let me help you with that..." 
            }
          ])
        } catch (error) {
          console.error('Chat error:', error)
          retryCount++
          
          if (retryCount === maxRetries) {
            setMessages(prev => [
              ...prev,
              { 
                id: generateId(),
                role: 'assistant', 
                content: "I'm sorry, but I'm having trouble responding right now. Please try again in a moment." 
              }
            ])
          } else {
            // Exponential backoff: 1s, 2s, 4s
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
          }
        }
      }
    } finally {
      setIsTyping(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return
    sendMessage(inputValue)
  }

  return (
    <div className="flex flex-col h-[70vh] lg:h-[75vh] overflow-hidden">
      <ScrollArea className="flex-1 px-4 overflow-y-auto">
        <div className="py-4 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={`flex items-start gap-3`}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                  ${message.role === "assistant" ? "bg-primary/10" : "bg-white/10"}`}
                >
                  {message.role === "assistant" ? (
                    <Bot className="w-5 h-5 text-primary" />
                  ) : (
                    <User className="w-5 h-5 text-white/90" />
                  )}
                </div>
                <Card
                  className={`flex-1 p-3 text-white/90 whitespace-pre-wrap
                  ${message.role === "assistant" ? "bg-primary/10 border-primary/20" : "bg-white/10 border-white/10"}`}
                >
                  {message.content}
                </Card>
              </motion.div>
            ))}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-primary"
              >
                <Bot className="w-6 h-6" />
                <div className="flex gap-1">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce delay-100">●</span>
                  <span className="animate-bounce delay-200">●</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} className="h-0" />
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-white/10 space-y-2">
        {/* Guest mode counter */}
        {guestMode.shouldShowCounter && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between px-2"
          >
            <div className="flex items-center gap-2">
              {guestMode.remainingMessages <= 1 && (
                <AlertCircle className="w-4 h-4 text-yellow-500" />
              )}
              <span className={`text-sm ${
                guestMode.remainingMessages <= 1 
                  ? 'text-yellow-500 font-medium' 
                  : 'text-white/60'
              }`}>
                {guestMode.getCounterText()}
              </span>
            </div>
            {guestMode.remainingMessages === 0 && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowWalletPrompt(true)}
                className="text-xs"
              >
                Connect Wallet
              </Button>
            )}
          </motion.div>
        )}

        {/* Chat input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={guestMode.isLimitReached ? "Connect wallet to continue..." : "Type your message..."}
              disabled={guestMode.isLimitReached}
              className="flex-1 bg-white/5 border-white/10 text-white/90 placeholder:text-white/50 disabled:opacity-50 disabled:cursor-not-allowed pr-20"
            />
            {guestMode.shouldShowCounter && guestMode.remainingMessages > 0 && (
              <Badge 
                variant="secondary" 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-white/10 text-white/70"
              >
                {guestMode.remainingMessages}/{3}
              </Badge>
            )}
          </div>
          <Button 
            type="submit" 
            size="icon" 
            disabled={guestMode.isLimitReached}
            className="bg-primary hover:bg-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
      
      {/* Wallet Connection Modal for Guest Limit */}
      {showWalletPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full"
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-primary" />
              </div>
              
              <h3 className="text-xl font-semibold text-white">
                You&apos;ve reached the free message limit
              </h3>
              
              <p className="text-white/70 text-sm">
                Connect your wallet to continue using the AI assistant with unlimited messages.
              </p>
              
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowWalletPrompt(false)}
                  className="flex-1"
                >
                  Maybe Later
                </Button>
                <Button
                  onClick={() => {
                    setShowWalletPrompt(false)
                    // Trigger wallet connection
                    const connectButton = document.querySelector('[data-wallet-connect]') as HTMLButtonElement
                    if (connectButton) {
                      connectButton.click()
                    }
                  }}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  Connect Wallet
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

