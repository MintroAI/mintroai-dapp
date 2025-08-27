import * as React from "react"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import confetti from 'canvas-confetti'
import { useChainId } from 'wagmi'
import { type Chain, /* mainnet, polygon, optimism, */ arbitrum, /* base, zora, */ bscTestnet, /* bsc */ } from 'viem/chains'
import { hyperEVM } from '@/config/customChains'
import { ExternalLink } from 'lucide-react'
import { useNearWallet } from '@/contexts/NearWalletContext'

interface TokenSuccessDialogProps {
  isOpen: boolean
  onClose: () => void
  tokenAddress: string
  tokenName: string
  tokenSymbol: string
}

export function TokenSuccessDialog({
  isOpen,
  onClose,
  tokenAddress,
  tokenName,
  tokenSymbol
}: TokenSuccessDialogProps) {
  const chainId = useChainId()
  const { isConnected: nearConnected } = useNearWallet()

  // Chain'e göre block explorer URL'ini bul
  const getExplorerUrl = () => {
    // Eğer Near cüzdanı bağlıysa Near explorer'ını kullan
    if (nearConnected) {
      const network = process.env.NEXT_PUBLIC_NEAR_NETWORK_ID || 'testnet'
      const explorerUrl = network === 'mainnet' 
        ? 'https://nearblocks.io' 
        : 'https://testnet.nearblocks.io'
      return `${explorerUrl}/address/${tokenAddress}`
    }

    // Diğer EVM chainleri için mevcut logic
    const chains: Record<number, Chain> = {
      // [mainnet.id]: mainnet,
      // [polygon.id]: polygon,
      // [optimism.id]: optimism,
      [arbitrum.id]: arbitrum,
      // [base.id]: base,
      // [zora.id]: zora,
      [bscTestnet.id]: bscTestnet,
      // [bsc.id]: bsc,
      [hyperEVM.id]: hyperEVM,
    }
    
    const chain = chains[chainId]
    if (!chain?.blockExplorers?.default?.url) return null
    
    return `${chain.blockExplorers.default.url}/address/${tokenAddress}`
  }

  const explorerUrl = getExplorerUrl()

  React.useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      })
    }
  }, [isOpen])

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="bg-black/90 border-white/10 backdrop-blur-xl text-white p-6 w-[90vw] md:w-[500px]">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <AlertDialogHeader className="space-y-3">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <AlertDialogTitle className="text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-400">
              Congratulations!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-white/70">
              Your token has been successfully created and deployed to the blockchain!
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-6 space-y-4">
            <div className="bg-white/5 rounded-lg p-4 space-y-3">
              <div className="space-y-2">
                <div className="text-sm text-white/50">Token Name</div>
                <div className="font-medium">{tokenName}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-white/50">Token Symbol</div>
                <div className="font-medium">{tokenSymbol}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-white/50">Contract Address</div>
                <div className="font-mono text-sm break-all bg-white/5 p-2 rounded border border-white/10">
                  {tokenAddress}
                </div>
                {explorerUrl && (
                  <a 
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors mt-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View on Block Explorer</span>
                  </a>
                )}
              </div>
            </div>

            <div className="text-center text-sm text-white/50">
              You can now add this token to your wallet and start using it!
            </div>
          </div>

          <AlertDialogFooter className="mt-6 flex gap-3">
            <Button
              className="flex-1 bg-white/5 hover:bg-white/10 text-white"
              onClick={() => {
                navigator.clipboard.writeText(tokenAddress)
              }}
            >
              Copy Address
            </Button>
            <Button
              className={cn(
                "flex-1",
                "bg-gradient-to-r from-green-400 to-emerald-400",
                "hover:from-green-500 hover:to-emerald-500",
                "text-white font-medium"
              )}
              onClick={onClose}
            >
              Done
            </Button>
          </AlertDialogFooter>
        </motion.div>
      </AlertDialogContent>
    </AlertDialog>
  )
} 