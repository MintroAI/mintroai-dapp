"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, Send, User } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useSession } from "@/hooks/useSession"
import { useWebSocket } from "@/hooks/useWebSocket"

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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Session yönetimi
  const { sessionId, isInitialized } = useSession()

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

    try {
      // Kullanıcı mesajını ekle
      setMessages(prev => [...prev, { 
        id: generateId(),
        role: 'user', 
        content: message 
      }])
      setInputValue("")
      setIsTyping(true)

      const maxRetries = 3
      let retryCount = 0
      let success = false

      while (retryCount < maxRetries && !success) {
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId,
              chatInput: message,
              mode: creationType,
            }),
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const data = await response.json()
          success = true

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

      <div className="p-3 border-t border-white/10">
        <div className="relative group">
          <div className="absolute -inset-[2px] bg-gradient-to-r from-pink-500 via-purple-500 to-red-500 rounded-lg opacity-75 blur-sm group-hover:opacity-100 animate-gradient-xy transition-opacity duration-500"></div>
          <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-lg opacity-70 animate-pulse-slow"></div>
          
          <div className="relative bg-black/95 rounded-lg p-[2px] backdrop-blur-xl">
            <form onSubmit={handleSubmit} className="flex gap-2 bg-black/90 rounded-md p-1 backdrop-blur-sm">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-white/5 border-0 text-white/90 placeholder:text-white/50 focus:ring-0 focus:ring-offset-0 focus:bg-white/10 transition-all duration-300 h-9 text-sm"
              />
              <Button 
                type="submit" 
                size="icon" 
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border border-white/20 hover:border-white/40 
                  transition-all duration-300 rounded-md h-9 w-9 flex items-center justify-center
                  hover:shadow-lg hover:shadow-white/10 group"
              >
                <Send className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

